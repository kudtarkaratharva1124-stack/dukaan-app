import { Router } from "express";
import {
  getSummary,
  listKhataCustomers,
  getCustomerLedger,
  addKhataEntry,
  deleteKhataEntry
} from "../controllers/khata.controller.js";

const router = Router();

router.get("/summary", getSummary);
router.get("/customers", listKhataCustomers);
router.get("/customers/:customerId", getCustomerLedger);
router.post("/customers/:customerId/entries", addKhataEntry);
router.delete("/entries/:entryId", deleteKhataEntry);

export default router;
