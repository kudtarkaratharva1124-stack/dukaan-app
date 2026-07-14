import { Router } from "express";
import authRoutes from "./auth.routes.js";
import inventoryRoutes from "./inventory.routes.js";
import orderRoutes from "./order.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import customerRoutes from "./customer.routes.js";
import aiRoutes from "./ai.routes.js";
import khataRoutes from "./khata.routes.js";
import settingsRoutes from "./settings.routes.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use("/auth", authRoutes);
// Everything below this line requires a valid access token.
router.use("/inventory", requireAuth, inventoryRoutes);
router.use("/orders", requireAuth, orderRoutes);
router.use("/dashboard", requireAuth, dashboardRoutes);
router.use("/customers", requireAuth, customerRoutes);
router.use("/ai", requireAuth, aiRoutes);
router.use("/khata", requireAuth, khataRoutes);
router.use("/settings", requireAuth, settingsRoutes);

export default router;
