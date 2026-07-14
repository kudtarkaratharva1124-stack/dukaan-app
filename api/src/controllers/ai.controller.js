import { pool } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  recognizeProductFromImage,
  extractLineItemsFromImage,
  summarizeInventoryPrediction
} from "../services/gemini.service.js";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BASE64_CHARS = 6_000_000; // ~4.5mb of actual image data, matches the app.js body limit

function validateImagePayload(req) {
  const { imageBase64, mimeType } = req.body;
  if (!imageBase64 || typeof imageBase64 !== "string") {
    throw new ApiError(400, "imageBase64 is required");
  }
  if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new ApiError(400, "mimeType must be one of image/jpeg, image/png, image/webp");
  }
  if (imageBase64.length > MAX_BASE64_CHARS) {
    throw new ApiError(413, "Image is too large. Please retake or choose a smaller photo.");
  }
  // Strip a data: URL prefix if the client sent one by mistake.
  const cleaned = imageBase64.includes(",") && imageBase64.startsWith("data:")
    ? imageBase64.split(",")[1]
    : imageBase64;
  return { imageBase64: cleaned, mimeType };
}

// POST /api/ai/recognize-product  { imageBase64, mimeType }
export const recognizeProduct = asyncHandler(async (req, res) => {
  const { imageBase64, mimeType } = validateImagePayload(req);
  const result = await recognizeProductFromImage(imageBase64, mimeType);
  res.json({ success: true, result });
});

// POST /api/ai/extract-invoice  { imageBase64, mimeType }
export const extractInvoice = asyncHandler(async (req, res) => {
  const { imageBase64, mimeType } = validateImagePayload(req);
  const result = await extractLineItemsFromImage(imageBase64, mimeType);
  res.json({ success: true, result });
});

// GET /api/ai/inventory-prediction?days=30&horizonDays=14
// Deterministic forecast built entirely from real stock_movements + products data.
// The only thing the LLM touches is an optional plain-language summary of these
// already-computed numbers — it never invents the numbers itself.
export const inventoryPrediction = asyncHandler(async (req, res) => {
  const { shopId } = req.user;
  const lookbackDays = Math.min(90, Math.max(7, Number(req.query.days) || 30));
  const horizonDays = Math.min(60, Math.max(1, Number(req.query.horizonDays) || 14));

  const salesResult = await pool.query(
    `SELECT sm.product_id, SUM(-sm.change_qty) AS sold_qty
     FROM stock_movements sm
     WHERE sm.shop_id = $1
       AND sm.reason = 'sale'
       AND sm.change_qty < 0
       AND sm.created_at >= now() - ($2 || ' days')::interval
     GROUP BY sm.product_id`,
    [shopId, String(lookbackDays)]
  );
  const soldByProduct = new Map(salesResult.rows.map((r) => [r.product_id, Number(r.sold_qty)]));

  const productsResult = await pool.query(
    `SELECT id, name, sku, barcode, unit, stock_qty, low_stock_at
     FROM products
     WHERE shop_id = $1 AND is_active = true`,
    [shopId]
  );

  const forecast = productsResult.rows.map((p) => {
    const soldQty = soldByProduct.get(p.id) || 0;
    const avgDailyRate = soldQty / lookbackDays;
    const stockQty = Number(p.stock_qty);
    const lowStockAt = Number(p.low_stock_at);
    const daysRemaining = avgDailyRate > 0 ? Math.floor(stockQty / avgDailyRate) : null;

    let riskLevel = "ok";
    if (stockQty <= lowStockAt || (daysRemaining !== null && daysRemaining <= 3)) {
      riskLevel = "critical";
    } else if (daysRemaining !== null && daysRemaining <= 7) {
      riskLevel = "warning";
    } else if (avgDailyRate === 0 && stockQty <= lowStockAt * 2 && lowStockAt > 0) {
      // No recent sales data but stock is thin relative to its own low-stock threshold.
      riskLevel = "watch";
    }

    const suggestedReorderQty =
      avgDailyRate > 0
        ? Math.max(0, Math.ceil(avgDailyRate * horizonDays - stockQty))
        : (riskLevel === "critical" ? Math.max(0, Math.ceil(lowStockAt * 2 - stockQty)) : 0);

    return {
      productId: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      unit: p.unit,
      stockQty,
      lowStockAt,
      avgDailySales: Number(avgDailyRate.toFixed(2)),
      daysRemaining,
      riskLevel,
      suggestedReorderQty
    };
  });

  const riskOrder = { critical: 0, warning: 1, watch: 2, ok: 3 };
  forecast.sort((a, b) => {
    if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    if (a.daysRemaining === null) return 1;
    if (b.daysRemaining === null) return -1;
    return a.daysRemaining - b.daysRemaining;
  });

  const needsAttention = forecast.filter((f) => f.riskLevel === "critical" || f.riskLevel === "warning");
  const stats = {
    lookbackDays,
    horizonDays,
    totalActiveProducts: forecast.length,
    criticalCount: forecast.filter((f) => f.riskLevel === "critical").length,
    warningCount: forecast.filter((f) => f.riskLevel === "warning").length,
    watchCount: forecast.filter((f) => f.riskLevel === "watch").length
  };

  let summary = null;
  if (needsAttention.length > 0) {
    try {
      summary = await summarizeInventoryPrediction({
        ...stats,
        topItems: needsAttention.slice(0, 8).map(({ name, stockQty, unit, daysRemaining, suggestedReorderQty, riskLevel }) => ({
          name, stockQty, unit, daysRemaining, suggestedReorderQty, riskLevel
        }))
      });
    } catch {
      // Narrative is a nice-to-have; the stats/table below stand on their own.
      summary = null;
    }
  }

  res.json({
    success: true,
    stats,
    summary,
    // Products needing action (critical/warning), pre-sorted by urgency — what the UI leads with.
    atRisk: needsAttention,
    // Everything else, for a "show full forecast" toggle on the frontend.
    fullForecast: forecast
  });
});
