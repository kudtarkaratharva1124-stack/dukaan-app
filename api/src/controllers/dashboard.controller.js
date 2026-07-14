import { pool } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// GET /api/dashboard/summary — headline numbers for the dashboard page.
export const getSummary = asyncHandler(async (req, res) => {
  const { shopId } = req.user;

  const [todaySales, monthSales, productCount, lowStock, recentOrders] = await Promise.all([
    pool.query(
      `SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS count FROM orders
       WHERE shop_id = $1 AND created_at >= date_trunc('day', now())`,
      [shopId]
    ),
    pool.query(
      `SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS count FROM orders
       WHERE shop_id = $1 AND created_at >= date_trunc('month', now())`,
      [shopId]
    ),
    pool.query(`SELECT COUNT(*) FROM products WHERE shop_id = $1 AND is_active = true`, [shopId]),
    pool.query(
      `SELECT COUNT(*) FROM products WHERE shop_id = $1 AND is_active = true AND stock_qty <= low_stock_at`,
      [shopId]
    ),
    pool.query(
      `SELECT o.id, o.order_number, o.total, o.payment_method, o.created_at, c.name AS customer_name
       FROM orders o LEFT JOIN customers c ON c.id = o.customer_id
       WHERE o.shop_id = $1 ORDER BY o.created_at DESC LIMIT 8`,
      [shopId]
    )
  ]);

  res.json({
    success: true,
    summary: {
      todaySales: Number(todaySales.rows[0].total),
      todayOrderCount: Number(todaySales.rows[0].count),
      monthSales: Number(monthSales.rows[0].total),
      monthOrderCount: Number(monthSales.rows[0].count),
      productCount: Number(productCount.rows[0].count),
      lowStockCount: Number(lowStock.rows[0].count),
      recentOrders: recentOrders.rows
    }
  });
});
