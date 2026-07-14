import { ApiError } from "../utils/ApiError.js";
import { verifyAccessToken } from "../utils/jwt.js";

// Verifies the JWT and attaches { id, shopId, role } to req.user.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return next(new ApiError(401, "Missing or invalid Authorization header"));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, shopId: payload.shopId, role: payload.role };
    next();
  } catch {
    next(new ApiError(401, "Session expired or invalid, please log in again"));
  }
}

// Restricts a route to specific roles, e.g. requireRole("owner", "manager")
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, "You don't have permission to do that"));
    }
    next();
  };
}
