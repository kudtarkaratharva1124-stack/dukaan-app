import { Router } from "express";
import { listCustomers, createCustomer } from "../controllers/customer.controller.js";

const router = Router();
router.get("/", listCustomers);
router.post("/", createCustomer);

export default router;
