-- Migration: 001_barcode_catalog
-- Adds the global (non-shop-scoped) barcode cache used by the online barcode
-- lookup fallback. Safe to run against a DB that already has schema.sql applied
-- (schema.sql now also creates this table for fresh installs).

CREATE TABLE IF NOT EXISTS barcode_catalog (
  barcode       TEXT PRIMARY KEY,
  name          TEXT,
  brand         TEXT,
  category      TEXT,
  mrp           NUMERIC(12,2),
  unit          TEXT,
  image_url     TEXT,
  source        TEXT NOT NULL DEFAULT 'online',
  raw_response  JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_barcode_catalog_updated ON barcode_catalog;
CREATE TRIGGER trg_barcode_catalog_updated BEFORE UPDATE ON barcode_catalog
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
