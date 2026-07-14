import { pool, withTransaction } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateOrderNumber } from "../utils/orderNumber.js";

// POST /api/orders  — creates a walk-in / billing order and decrements stock atomically.
export const createOrder = asyncHandler(async (req, res) => {
  const { shopId, id: userId } = req.user;
  const { customerId, items, discount = 0, paymentMethod = "cash", amountPaid, notes } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "Order must include at least one item");
  }

  const order = await withTransaction(async (client) => {
    let subtotal = 0;
    let tax = 0;
    const lineItems = [];

    for (const item of items) {
      const productResult = await client.query(
        `SELECT * FROM products WHERE id = $1 AND shop_id = $2 FOR UPDATE`,
        [item.productId, shopId]
      );
      const product = productResult.rows[0];
      if (!product) throw new ApiError(404, `Product not found: ${item.productId}`);
      if (Number(product.stock_qty) < Number(item.quantity)) {
        throw new ApiError(400, `Not enough stock for ${product.name} (have ${product.stock_qty}, need ${item.quantity})`);
      }

      const unitPrice = item.unitPrice ?? product.sell_price;
      const lineSubtotal = unitPrice * item.quantity;
      const lineTax = lineSubtotal * (Number(product.gst_percent) / 100);

      subtotal += lineSubtotal;
      tax += lineTax;
      lineItems.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice,
        gstPercent: product.gst_percent,
        lineTotal: lineSubtotal + lineTax
      });

      await client.query(`UPDATE products SET stock_qty = stock_qty - $1 WHERE id = $2`, [item.quantity, product.id]);
      await client.query(
        `INSERT INTO stock_movements (shop_id, product_id, change_qty, reason, created_by)
         VALUES ($1, $2, $3, 'sale', $4)`,
        [shopId, product.id, -item.quantity, userId]
      );
    }

    const total = Math.max(0, subtotal + tax - Number(discount || 0));
    const orderNumber = generateOrderNumber();

    const orderResult = await client.query(
      `INSERT INTO orders
        (shop_id, order_number, customer_id, subtotal, discount, tax, total, payment_method, amount_paid, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [shopId, orderNumber, customerId || null, subtotal, discount || 0, tax, total,
       paymentMethod, amountPaid ?? total, notes || null, userId]
    );
    const savedOrder = orderResult.rows[0];

    for (const li of lineItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, gst_percent, line_total)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [savedOrder.id, li.productId, li.productName, li.quantity, li.unitPrice, li.gstPercent, li.lineTotal]
      );
    }

    // If paid on credit, log it against the customer's khata.
    if (paymentMethod === "credit" && customerId) {
      await client.query(
        `INSERT INTO khata_entries (shop_id, party_type, customer_id, entry_type, amount, note)
         VALUES ($1, 'customer', $2, 'debit', $3, $4)`,
        [shopId, customerId, total, `Order ${orderNumber}`]
      );
    }

    return { ...savedOrder, items: lineItems };
  });

  res.status(201).json({ success: true, order });
});

export const listOrders = asyncHandler(async (req, res) => {
  const { shopId } = req.user;
  const { page = 1, limit = 20, status } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const conditions = ["shop_id = $1"];
  const params = [shopId];
  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  const where = conditions.join(" AND ");

  const countResult = await pool.query(`SELECT COUNT(*) FROM orders WHERE ${where}`, params);
  params.push(Number(limit), offset);
  const dataResult = await pool.query(
    `SELECT o.*, c.name AS customer_name
     FROM orders o LEFT JOIN customers c ON c.id = o.customer_id
     WHERE ${where} ORDER BY o.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  res.json({
    success: true,
    orders: dataResult.rows,
    total: Number(countResult.rows[0].count),
    page: Number(page),
    totalPages: Math.max(1, Math.ceil(Number(countResult.rows[0].count) / Number(limit)))
  });
});

export const getOrder = asyncHandler(async (req, res) => {
  const { shopId } = req.user;
  const orderResult = await pool.query(`SELECT * FROM orders WHERE id = $1 AND shop_id = $2`, [req.params.id, shopId]);
  if (orderResult.rows.length === 0) throw new ApiError(404, "Order not found");
  const itemsResult = await pool.query(`SELECT * FROM order_items WHERE order_id = $1`, [req.params.id]);
  res.json({ success: true, order: { ...orderResult.rows[0], items: itemsResult.rows } });
});
