-- DukaanPro v2 — Core Schema
-- Multi-tenant: every business table is scoped by shop_id.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============ SHOPS & USERS ============

CREATE TABLE IF NOT EXISTS shops (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  owner_phone   TEXT,
  address       TEXT,
  gstin         TEXT,
  plan          TEXT NOT NULL DEFAULT 'free', -- free | basic | pro | enterprise
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'owner', -- owner | manager | cashier | staff
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at    TIMESTAMPTZ
);

-- ============ CATALOG ============

CREATE TABLE IF NOT EXISTS categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shop_id, name)
);

CREATE TABLE IF NOT EXISTS brands (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shop_id, name)
);

CREATE TABLE IF NOT EXISTS suppliers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  phone         TEXT,
  address       TEXT,
  outstanding   NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  phone         TEXT,
  address       TEXT,
  credit_limit  NUMERIC(12,2) NOT NULL DEFAULT 0,
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id        UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  category_id    UUID REFERENCES categories(id) ON DELETE SET NULL,
  brand_id       UUID REFERENCES brands(id) ON DELETE SET NULL,
  supplier_id    UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  barcode        TEXT,
  sku            TEXT,
  batch_number   TEXT,
  expiry_date    DATE,
  buy_price      NUMERIC(12,2) NOT NULL DEFAULT 0,
  sell_price     NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_percent    NUMERIC(5,2) NOT NULL DEFAULT 0,
  unit           TEXT NOT NULL DEFAULT 'pcs', -- pcs | kg | litre | bag etc
  stock_qty      NUMERIC(12,2) NOT NULL DEFAULT 0,
  low_stock_at   NUMERIC(12,2) NOT NULL DEFAULT 5,
  image_url      TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_shop ON products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(shop_id, barcode);

-- ============ GLOBAL BARCODE CATALOG (shared cache, NOT shop-scoped) ============
-- Populated the first time ANY shop scans a barcode that isn't in their own inventory
-- and an online lookup succeeds. Every shop's scanner checks this table before ever
-- calling the external API again for the same barcode, so the whole install benefits.
CREATE TABLE IF NOT EXISTS barcode_catalog (
  barcode       TEXT PRIMARY KEY,
  name          TEXT,
  brand         TEXT,
  category      TEXT,
  mrp           NUMERIC(12,2),
  unit          TEXT,
  image_url     TEXT,
  source        TEXT NOT NULL DEFAULT 'online', -- online | manual
  raw_response  JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id      UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  change_qty   NUMERIC(12,2) NOT NULL, -- positive = stock in, negative = stock out
  reason       TEXT NOT NULL, -- purchase | sale | adjustment | return
  reference_id UUID, -- order id or purchase id
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);

-- ============ ORDERS / BILLING ============

CREATE TABLE IF NOT EXISTS orders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id        UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  order_number   TEXT NOT NULL,
  customer_id    UUID REFERENCES customers(id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'completed', -- draft | completed | returned | cancelled
  subtotal       NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax            NUMERIC(12,2) NOT NULL DEFAULT 0,
  total          NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash', -- cash | upi | card | split | credit
  amount_paid    NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes          TEXT,
  created_by     UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shop_id, order_number)
);
CREATE INDEX IF NOT EXISTS idx_orders_shop ON orders(shop_id, created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL, -- snapshot at time of sale
  quantity     NUMERIC(12,2) NOT NULL,
  unit_price   NUMERIC(12,2) NOT NULL,
  gst_percent  NUMERIC(5,2) NOT NULL DEFAULT 0,
  line_total   NUMERIC(12,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ============ KHATA (CREDIT LEDGER) ============

CREATE TABLE IF NOT EXISTS khata_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  party_type    TEXT NOT NULL, -- customer | supplier
  customer_id   UUID REFERENCES customers(id) ON DELETE CASCADE,
  supplier_id   UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  entry_type    TEXT NOT NULL, -- debit (they owe more) | credit (settlement)
  amount        NUMERIC(12,2) NOT NULL,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ EXPENSES ============

CREATE TABLE IF NOT EXISTS expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  category    TEXT,
  amount      NUMERIC(12,2) NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shops_updated ON shops;
CREATE TRIGGER trg_shops_updated BEFORE UPDATE ON shops FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated ON products;
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_barcode_catalog_updated ON barcode_catalog;
CREATE TRIGGER trg_barcode_catalog_updated BEFORE UPDATE ON barcode_catalog FOR EACH ROW EXECUTE FUNCTION set_updated_at();
