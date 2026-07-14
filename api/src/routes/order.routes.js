import { Router } from "express";
import { createOrder, listOrders, getOrder } from "../controllers/order.controller.js";

const router = Router();

router.get("/", listOrders);
router.post("/", createOrder);
router.get("/:id", getOrder);

export default router;
