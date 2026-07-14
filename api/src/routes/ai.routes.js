import { Router } from "express";
import { recognizeProduct, extractInvoice, inventoryPrediction } from "../controllers/ai.controller.js";

const router = Router();

router.post("/recognize-product", recognizeProduct);
router.post("/extract-invoice", extractInvoice);
router.get("/inventory-prediction", inventoryPrediction);

export default router;
