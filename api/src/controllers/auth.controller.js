import bcrypt from "bcryptjs";
import crypto from "crypto";
import { pool, withTransaction } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import { signupSchema, loginSchema } from "../validators/auth.validator.js";
import { env } from "../config/env.js";

function sanitizeUser(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

async function issueTokens(user) {
  const accessToken = signAccessToken({ sub: user.id, shopId: user.shop_id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id });

  const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt]
  );

  return { accessToken, refreshToken };
}

export const signup = asyncHandler(async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, "Please check the form fields", parsed.error.flatten());
  }
  const { shopName, name, email, phone, password } = parsed.data;

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
  if (existing.rows.length > 0) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const { user } = await withTransaction(async (client) => {
    const shopResult = await client.query(
      `INSERT INTO shops (name) VALUES ($1) RETURNING *`,
      [shopName]
    );
    const shop = shopResult.rows[0];

    const userResult = await client.query(
      `INSERT INTO users (shop_id, name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, 'owner') RETURNING *`,
      [shop.id, name, email.toLowerCase(), phone || null, passwordHash]
    );
    return { user: userResult.rows[0], shop };
  });

  const tokens = await issueTokens(user);
  res.status(201).json({ success: true, user: sanitizeUser(user), ...tokens });
});

export const login = asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, "Please check the form fields", parsed.error.flatten());
  }
  const { email, password } = parsed.data;

  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
  const user = result.rows[0];
  if (!user || !user.is_active) {
    throw new ApiError(401, "Invalid email or password");
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new ApiError(401, "Invalid email or password");
  }

  const tokens = await issueTokens(user);
  res.json({ success: true, user: sanitizeUser(user), ...tokens });
});

export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new ApiError(400, "Refresh token is required");

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, "Refresh token expired, please log in again");
  }

  const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  const stored = await pool.query(
    `SELECT * FROM refresh_tokens WHERE user_id = $1 AND token_hash = $2 AND revoked_at IS NULL AND expires_at > now()`,
    [payload.sub, tokenHash]
  );
  if (stored.rows.length === 0) {
    throw new ApiError(401, "Refresh token is invalid or was revoked");
  }

  const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [payload.sub]);
  const user = userResult.rows[0];
  if (!user || !user.is_active) throw new ApiError(401, "Account not found");

  // Rotate: revoke old, issue new pair.
  await pool.query(`UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1`, [stored.rows[0].id]);
  const tokens = await issueTokens(user);
  res.json({ success: true, ...tokens });
});

export const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    await pool.query(`UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1`, [tokenHash]);
  }
  res.json({ success: true });
});

export const me = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT u.*, s.name AS shop_name, s.plan AS shop_plan
     FROM users u JOIN shops s ON s.id = u.shop_id
     WHERE u.id = $1`,
    [req.user.id]
  );
  if (result.rows.length === 0) throw new ApiError(404, "User not found");
  res.json({ success: true, user: sanitizeUser(result.rows[0]) });
});
