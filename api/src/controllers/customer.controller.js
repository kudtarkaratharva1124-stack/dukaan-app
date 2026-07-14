import { pool } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listCustomers = asyncHandler(async (req, res) => {
  const { search = "" } = req.query;
  const params = [req.user.shopId];
  let where = "shop_id = $1";
  if (search) {
    params.push(`%${search}%`);
    where += ` AND (name ILIKE $${params.length} OR phone ILIKE $${params.length})`;
  }
  const result = await pool.query(`SELECT * FROM customers WHERE ${where} ORDER BY name`, params);
  res.json({ success: true, customers: result.rows });
});

export const createCustomer = asyncHandler(async (req, res) => {
  const { name, phone, address, creditLimit } = req.body;
  if (!name || !name.trim()) throw new ApiError(400, "Customer name is required");
  const result = await pool.query(
    `INSERT INTO customers (shop_id, name, phone, address, credit_limit) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [req.user.shopId, name.trim(), phone || null, address || null, creditLimit || 0]
  );
  res.status(201).json({ success: true, customer: result.rows[0] });
});
