import { Router } from "express";
import {
  getShopProfile,
  updateShopProfile,
  updateProfile,
  changePassword,
  listTeam,
  inviteTeamMember,
  updateTeamMember
} from "../controllers/settings.controller.js";
import { requireRole } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/shop", getShopProfile);
router.put("/shop", requireRole("owner", "manager"), updateShopProfile);

router.put("/profile", updateProfile);
router.put("/password", changePassword);

router.get("/team", requireRole("owner", "manager"), listTeam);
router.post("/team", requireRole("owner"), inviteTeamMember);
router.patch("/team/:userId", requireRole("owner"), updateTeamMember);

export default router;
