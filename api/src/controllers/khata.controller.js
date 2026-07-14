import { pool, withTransaction } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// A customer's khata balance is the running sum of their ledger:
// debit  = shop gave goods/credit  -> customer owes more
// credit = customer paid/settled   -> reduces what they owe
// balance > 0  → customer owes the shop
// balance < 0  → shop owes the customer (overpayment / advance)
const BALANCE_EXPR = `COALESCE(SUM(CASE WHEN ke.entry_type = 'debit' THEN ke.amount ELSE -ke.amount END), 0)`;

// GET /api/khata/summary — headline numbers for the top of the Khata page.
export const getSummary = asyncHandler(async (req, res) => {
  const { shopId } = req.user;

  const result = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN ke.entry_type = 'debit' THEN ke.amount ELSE -ke.amount END), 0) AS net,
       COALESCE(SUM(CASE WHEN ke.entry_type = 'debit' THEN ke.amount ELSE 0 END), 0) AS total_debits,
       COALESCE(SUM(CASE WHEN ke.entry_type = 'credit' THEN ke.amount ELSE 0 END), 0) AS total_credits
     FROM khata_entries ke
     WHERE ke.shop_id = $1 AND ke.party_type = 'customer'`,
    [shopId]
  );

  const customersWithDue = await pool.query(
    `SELECT COUNT(*) FROM (
       SELECT ke.customer_id
       FROM khata_entries ke
       WHERE ke.shop_id = $1 AND ke.party_type = 'customer'
       GROUP BY ke.customer_id
       HAVING ${BALANCE_EXPR} > 0
     ) sub`,
    [shopId]
  );

  const row = result.rows[0];
  res.json({
    success: true,
    summary: {
      totalToCollect: Math.max(0, Number(row.net)),
      totalGivenOnCredit: Number(row.total_debits),
      totalCollected: Number(row.total_credits),
      customersWithDue: Number(customersWithDue.rows[0].count)
    }
  });
});

// GET /api/khata/customers — every customer with a computed balance, search + due-only filter.
export const listKhataCustomers = asyncHandler(async (req, res) => {
  const { shopId } = req.user;
  const { search = "", onlyWithDue } = req.query;

  const params = [shopId];
  let where = "c.shop_id = $1";
  if (search) {
    params.push(`%${search}%`);
    where += ` AND (c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length})`;
  }

  const result = await pool.query(
    `SELECT
       c.id, c.name, c.phone, c.credit_limit,
       ${BALANCE_EXPR} AS balance,
       MAX(ke.created_at) AS last_activity
     FROM customers c
     LEFT JOIN khata_entries ke ON ke.customer_id = c.id AND ke.party_type = 'customer'
     WHERE ${where}
     GROUP BY c.id
     ${onlyWithDue === "true" ? `HAVING ${BALANCE_EXPR} > 0` : ""}
     ORDER BY balance DESC, c.name ASC`,
    params
  );

  res.json({
    success: true,
    customers: result.rows.map((r) => ({ ...r, balance: Number(r.balance) }))
  });
});

// GET /api/khata/customers/:customerId — one customer's full ledger.
export const getCustomerLedger = asyncHandler(async (req, res) => {
  const { shopId } = req.user;
  const { customerId } = req.params;

  const customerResult = await pool.query(
    `SELECT id, name, phone, address, credit_limit FROM customers WHERE id = $1 AND shop_id = $2`,
    [customerId, shopId]
  );
  if (customerResult.rows.length === 0) throw new ApiError(404, "Customer not found");

  const entriesResult = await pool.query(
    `SELECT id, entry_type, amount, note, created_at
     FROM khata_entries
     WHERE shop_id = $1 AND party_type = 'customer' AND customer_id = $2
     ORDER BY created_at DESC`,
    [shopId, customerId]
  );

  const balance = entriesResult.rows.reduce(
    (sum, e) => sum + (e.entry_type === "debit" ? Number(e.amount) : -Number(e.amount)),
    0
  );

  res.json({
    success: true,
    customer: customerResult.rows[0],
    balance,
    entries: entriesResult.rows
  });
});

// POST /api/khata/customers/:customerId/entries — add a manual debit (gave on credit) or credit (payment received).
export const addKhataEntry = asyncHandler(async (req, res) => {
  const { shopId, id: userId } = req.user;
  const { customerId } = req.params;
  const { entryType, amount, note } = req.body;

  if (!["debit", "credit"].includes(entryType)) {
    throw new ApiError(400, "entryType must be 'debit' or 'credit'");
  }
  const numericAmount = Number(amount);
  if (!numericAmount || numericAmount <= 0) {
    throw new ApiError(400, "Amount must be a positive number");
  }

  const entry = await withTransaction(async (client) => {
    const customerResult = await client.query(
      `SELECT id FROM customers WHERE id = $1 AND shop_id = $2 FOR UPDATE`,
      [customerId, shopId]
    );
    if (customerResult.rows.length === 0) throw new ApiError(404, "Customer not found");

    const inserted = await client.query(
      `INSERT INTO khata_entries (shop_id, party_type, customer_id, entry_type, amount, note)
       VALUES ($1, 'customer', $2, $3, $4, $5) RETURNING *`,
      [shopId, customerId, entryType, numericAmount, note || null]
    );
    return inserted.rows[0];
  });

  res.status(201).json({ success: true, entry, createdBy: userId });
});

// DELETE /api/khata/entries/:entryId — remove a wrongly-entered ledger line.
export const deleteKhataEntry = asyncHandler(async (req, res) => {
  const { shopId } = req.user;
  const { entryId } = req.params;

  const result = await pool.query(
    `DELETE FROM khata_entries WHERE id = $1 AND shop_id = $2 AND party_type = 'customer' RETURNING id`,
    [entryId, shopId]
  );
  if (result.rows.length === 0) throw new ApiError(404, "Ledger entry not found");

  res.json({ success: true });
});
