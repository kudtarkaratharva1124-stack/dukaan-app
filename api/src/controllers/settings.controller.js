import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  shopProfileSchema,
  profileSchema,
  passwordSchema,
  inviteTeamMemberSchema,
  updateTeamMemberSchema
} from "../validators/settings.validator.js";

function sanitizeUser(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

// GET /api/settings/shop — the shop's own business profile.
export const getShopProfile = asyncHandler(async (req, res) => {
  const result = await pool.query(`SELECT * FROM shops WHERE id = $1`, [req.user.shopId]);
  if (result.rows.length === 0) throw new ApiError(404, "Shop not found");
  res.json({ success: true, shop: result.rows[0] });
});

// PUT /api/settings/shop — owner/manager only.
export const updateShopProfile = asyncHandler(async (req, res) => {
  const parsed = shopProfileSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Please check the form fields", parsed.error.flatten());
  const { name, ownerPhone, address, gstin } = parsed.data;

  const result = await pool.query(
    `UPDATE shops SET name = $1, owner_phone = $2, address = $3, gstin = $4, updated_at = now()
     WHERE id = $5 RETURNING *`,
    [name, ownerPhone || null, address || null, gstin || null, req.user.shopId]
  );
  if (result.rows.length === 0) throw new ApiError(404, "Shop not found");
  res.json({ success: true, shop: result.rows[0] });
});

// PUT /api/settings/profile — the logged-in user's own name/phone.
export const updateProfile = asyncHandler(async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Please check the form fields", parsed.error.flatten());
  const { name, phone } = parsed.data;

  const result = await pool.query(
    `UPDATE users SET name = $1, phone = $2, updated_at = now() WHERE id = $3 RETURNING *`,
    [name, phone || null, req.user.id]
  );
  if (result.rows.length === 0) throw new ApiError(404, "User not found");
  res.json({ success: true, user: sanitizeUser(result.rows[0]) });
});

// PUT /api/settings/password — change own password; verifies the current one first
// and revokes every other refresh token so other sessions are signed out.
export const changePassword = asyncHandler(async (req, res) => {
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Please check the form fields", parsed.error.flatten());
  const { currentPassword, newPassword } = parsed.data;

  const result = await pool.query(`SELECT * FROM users WHERE id = $1`, [req.user.id]);
  const user = result.rows[0];
  if (!user) throw new ApiError(404, "User not found");

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) throw new ApiError(401, "Current password is incorrect");

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await pool.query(`UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`, [
    passwordHash,
    user.id
  ]);
  await pool.query(`UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, [
    user.id
  ]);

  res.json({ success: true, message: "Password updated. Please log in again on your other devices." });
});

// GET /api/settings/team — everyone on this shop's account (owner/manager only).
export const listTeam = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT id, name, email, phone, role, is_active, created_at
     FROM users WHERE shop_id = $1 ORDER BY created_at ASC`,
    [req.user.shopId]
  );
  res.json({ success: true, team: result.rows });
});

// POST /api/settings/team — owner-only: create a manager/cashier/staff login for this shop.
export const inviteTeamMember = asyncHandler(async (req, res) => {
  const parsed = inviteTeamMemberSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Please check the form fields", parsed.error.flatten());
  const { name, email, phone, password, role } = parsed.data;

  const existing = await pool.query(`SELECT id FROM users WHERE email = $1`, [email.toLowerCase()]);
  if (existing.rows.length > 0) throw new ApiError(409, "An account with this email already exists");

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (shop_id, name, email, phone, password_hash, role)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [req.user.shopId, name, email.toLowerCase(), phone || null, passwordHash, role]
  );
  res.status(201).json({ success: true, user: sanitizeUser(result.rows[0]) });
});

// PATCH /api/settings/team/:userId — owner-only: change a teammate's role or active status.
export const updateTeamMember = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (userId === req.user.id) {
    throw new ApiError(400, "Use your profile settings to change your own account");
  }

  const parsed = updateTeamMemberSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "Please check the form fields", parsed.error.flatten());
  const { role, isActive } = parsed.data;
  if (role === undefined && isActive === undefined) {
    throw new ApiError(400, "Nothing to update");
  }

  const existing = await pool.query(`SELECT * FROM users WHERE id = $1 AND shop_id = $2`, [
    userId,
    req.user.shopId
  ]);
  if (existing.rows.length === 0) throw new ApiError(404, "Team member not found");
  if (existing.rows[0].role === "owner") {
    throw new ApiError(400, "The shop owner's account can't be changed here");
  }

  const next = {
    role: role ?? existing.rows[0].role,
    isActive: isActive ?? existing.rows[0].is_active
  };

  const result = await pool.query(
    `UPDATE users SET role = $1, is_active = $2, updated_at = now() WHERE id = $3 RETURNING *`,
    [next.role, next.isActive, userId]
  );
  res.json({ success: true, user: sanitizeUser(result.rows[0]) });
});
