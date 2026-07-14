import { Router } from "express";
import {
  listProducts, getProduct, createProduct, updateProduct, deleteProduct,
  adjustStock, lookupByBarcode, listCategories, createCategory
} from "../controllers/inventory.controller.js";

const router = Router();

router.get("/lookup", lookupByBarcode);
router.get("/categories", listCategories);
router.post("/categories", createCategory);

router.get("/", listProducts);
router.post("/", createProduct);
router.get("/:id", getProduct);
router.patch("/:id", updateProduct);
router.delete("/:id", deleteProduct);
router.post("/:id/adjust-stock", adjustStock);

export default router;
