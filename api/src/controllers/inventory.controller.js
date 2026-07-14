import { pool } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { lookupBarcodeOnline } from "../services/barcodeLookup.service.js";

// GET /api/inventory?search=&categoryId=&lowStock=&page=&limit=
export const listProducts = asyncHandler(async (req, res) => {
  const { shopId } = req.user;
  const { search = "", categoryId, lowStock, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const conditions = ["p.shop_id = $1", "p.is_active = true"];
  const params = [shopId];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(p.name ILIKE $${params.length} OR p.barcode ILIKE $${params.length} OR p.sku ILIKE $${params.length})`);
  }
  if (categoryId) {
    params.push(categoryId);
    conditions.push(`p.category_id = $${params.length}`);
  }
  if (lowStock === "true") {
    conditions.push(`p.stock_qty <= p.low_stock_at`);
  }

  const where = conditions.join(" AND ");
  const countResult = await pool.query(`SELECT COUNT(*) FROM products p WHERE ${where}`, params);

  params.push(Number(limit), offset);
  const dataResult = await pool.query(
    `SELECT p.*, c.name AS category_name, b.name AS brand_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN brands b ON b.id = p.brand_id
     WHERE ${where}
     ORDER BY p.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  res.json({
    success: true,
    products: dataResult.rows,
    total: Number(countResult.rows[0].count),
    page: Number(page),
    totalPages: Math.max(1, Math.ceil(Number(countResult.rows[0].count) / Number(limit)))
  });
});

export const getProduct = asyncHandler(async (req, res) => {
  const { shopId } = req.user;
  const result = await pool.query(
    `SELECT * FROM products WHERE id = $1 AND shop_id = $2`,
    [req.params.id, shopId]
  );
  if (result.rows.length === 0) throw new ApiError(404, "Product not found");
  res.json({ success: true, product: result.rows[0] });
});

export const createProduct = asyncHandler(async (req, res) => {
  const { shopId } = req.user;
  const {
    name, categoryId, brandId, categoryName, brandName, supplierId, barcode, sku, batchNumber,
    expiryDate, buyPrice, sellPrice, gstPercent, unit, stockQty, lowStockAt, imageUrl
  } = req.body;

  if (!name || !name.trim()) throw new ApiError(400, "Product name is required");

  const resolvedCategoryId = categoryId || (await upsertNamed("categories", shopId, categoryName));
  const resolvedBrandId = brandId || (await upsertNamed("brands", shopId, brandName));

  const result = await pool.query(
    `INSERT INTO products
      (shop_id, name, category_id, brand_id, supplier_id, barcode, sku, batch_number,
       expiry_date, buy_price, sell_price, gst_percent, unit, stock_qty, low_stock_at, image_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING *`,
    [shopId, name.trim(), resolvedCategoryId || null, resolvedBrandId || null, supplierId || null,
     barcode || null, sku || null, batchNumber || null, expiryDate || null,
     buyPrice || 0, sellPrice || 0, gstPercent || 0, unit || "pcs",
     stockQty || 0, lowStockAt || 5, imageUrl || null]
  );

  if (Number(stockQty) > 0) {
    await pool.query(
      `INSERT INTO stock_movements (shop_id, product_id, change_qty, reason, created_by)
       VALUES ($1, $2, $3, 'adjustment', $4)`,
      [shopId, result.rows[0].id, stockQty, req.user.id]
    );
  }

  res.status(201).json({ success: true, product: result.rows[0] });
});

// Looks up-or-creates a category/brand by name, scoped to the shop. Lets callers
// (like the scanner's online-match autofill) pass a plain name instead of
// needing to already know the row's id.
async function upsertNamed(table, shopId, name) {
  if (!name || !name.trim()) return null;
  const result = await pool.query(
    `INSERT INTO ${table} (shop_id, name) VALUES ($1, $2)
     ON CONFLICT (shop_id, name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [shopId, name.trim()]
  );
  return result.rows[0].id;
}

export const updateProduct = asyncHandler(async (req, res) => {
  const { shopId } = req.user;
  const existing = await pool.query(`SELECT * FROM products WHERE id = $1 AND shop_id = $2`, [req.params.id, shopId]);
  if (existing.rows.length === 0) throw new ApiError(404, "Product not found");

  const fields = {
    name: "name", categoryId: "category_id", brandId: "brand_id", supplierId: "supplier_id",
    barcode: "barcode", sku: "sku", batchNumber: "batch_number", expiryDate: "expiry_date",
    buyPrice: "buy_price", sellPrice: "sell_price", gstPercent: "gst_percent", unit: "unit",
    lowStockAt: "low_stock_at", imageUrl: "image_url"
  };

  const sets = [];
  const params = [];
  for (const [bodyKey, column] of Object.entries(fields)) {
    if (req.body[bodyKey] !== undefined) {
      params.push(req.body[bodyKey]);
      sets.push(`${column} = $${params.length}`);
    }
  }
  if (sets.length === 0) throw new ApiError(400, "No fields to update");

  params.push(req.params.id, shopId);
  const result = await pool.query(
    `UPDATE products SET ${sets.join(", ")} WHERE id = $${params.length - 1} AND shop_id = $${params.length} RETURNING *`,
    params
  );
  res.json({ success: true, product: result.rows[0] });
});

export const adjustStock = asyncHandler(async (req, res) => {
  const { shopId, id: userId } = req.user;
  const { changeQty, reason = "adjustment" } = req.body;
  if (!changeQty || isNaN(Number(changeQty))) throw new ApiError(400, "changeQty must be a number");

  const product = await pool.query(`SELECT * FROM products WHERE id = $1 AND shop_id = $2`, [req.params.id, shopId]);
  if (product.rows.length === 0) throw new ApiError(404, "Product not found");

  const updated = await pool.query(
    `UPDATE products SET stock_qty = stock_qty + $1 WHERE id = $2 RETURNING *`,
    [changeQty, req.params.id]
  );
  await pool.query(
    `INSERT INTO stock_movements (shop_id, product_id, change_qty, reason, created_by) VALUES ($1,$2,$3,$4,$5)`,
    [shopId, req.params.id, changeQty, reason, userId]
  );

  res.json({ success: true, product: updated.rows[0] });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const { shopId } = req.user;
  const result = await pool.query(
    `UPDATE products SET is_active = false WHERE id = $1 AND shop_id = $2 RETURNING id`,
    [req.params.id, shopId]
  );
  if (result.rows.length === 0) throw new ApiError(404, "Product not found");
  res.json({ success: true });
});

// GET /api/inventory/lookup?barcode=xxxx  (used by the scanner)
//
// Flow (matches the scan → autofill design):
//   1. Search this shop's own products by barcode. If found, it's a real
//      inventory item — return it as `product` so the scanner adds it straight
//      to the cart.
//   2. Not in this shop's inventory? Check the shared `barcode_catalog` cache
//      (built from every shop's past online lookups) — no need to hit the
//      internet again for a barcode someone else already scanned.
//   3. Still nothing? Call the external product database. If that succeeds,
//      save it into `barcode_catalog` permanently so future scans (by any
//      shop) skip the network call.
// In cases 2 and 3 there's no shop-scoped product yet, so we return
// `catalogMatch` (name/brand/category/mrp/image) instead of `product` — the
// frontend uses it to pre-fill the "Add product" form rather than adding to
// the bill.
export const lookupByBarcode = asyncHandler(async (req, res) => {
  const { shopId } = req.user;
  const { barcode } = req.query;
  if (!barcode) throw new ApiError(400, "barcode query param is required");
  const trimmed = String(barcode).trim();

  // 1. This shop's own inventory.
  const ownProduct = await pool.query(
    `SELECT p.*, c.name AS category_name, b.name AS brand_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN brands b ON b.id = p.brand_id
     WHERE p.shop_id = $1 AND p.barcode = $2 AND p.is_active = true LIMIT 1`,
    [shopId, trimmed]
  );
  if (ownProduct.rows.length > 0) {
    return res.json({ success: true, source: "inventory", product: ownProduct.rows[0], catalogMatch: null });
  }

  // 2. Shared cache from earlier online lookups (by any shop).
  const cached = await pool.query(`SELECT * FROM barcode_catalog WHERE barcode = $1 LIMIT 1`, [trimmed]);
  if (cached.rows.length > 0) {
    return res.json({ success: true, source: "catalog", product: null, catalogMatch: toCatalogMatch(cached.rows[0]) });
  }

  // 3. Online lookup, then persist for next time.
  const online = await lookupBarcodeOnline(trimmed);
  if (!online) {
    return res.json({ success: true, source: "none", product: null, catalogMatch: null });
  }

  const saved = await pool.query(
    `INSERT INTO barcode_catalog (barcode, name, brand, category, mrp, unit, image_url, source, raw_response)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (barcode) DO UPDATE SET
       name = EXCLUDED.name, brand = EXCLUDED.brand, category = EXCLUDED.category,
       mrp = EXCLUDED.mrp, unit = EXCLUDED.unit, image_url = EXCLUDED.image_url,
       raw_response = EXCLUDED.raw_response
     RETURNING *`,
    [trimmed, online.name, online.brand, online.category, online.mrp, online.unit, online.imageUrl, online.source, online.raw || null]
  );

  res.json({ success: true, source: "online", product: null, catalogMatch: toCatalogMatch(saved.rows[0]) });
});

function toCatalogMatch(row) {
  return {
    barcode: row.barcode,
    name: row.name,
    brand: row.brand,
    category: row.category,
    mrp: row.mrp,
    unit: row.unit,
    imageUrl: row.image_url
  };
}

export const listCategories = asyncHandler(async (req, res) => {
  const result = await pool.query(`SELECT * FROM categories WHERE shop_id = $1 ORDER BY name`, [req.user.shopId]);
  res.json({ success: true, categories: result.rows });
});

export const createCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) throw new ApiError(400, "Category name is required");
  const result = await pool.query(
    `INSERT INTO categories (shop_id, name) VALUES ($1, $2)
     ON CONFLICT (shop_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING *`,
    [req.user.shopId, name.trim()]
  );
  res.status(201).json({ success: true, category: result.rows[0] });
});
