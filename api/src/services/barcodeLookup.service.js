import { env } from "../config/env.js";

// Public, no-API-key product database. Good coverage for packaged/FMCG goods,
// which is the bulk of what a kirana/general store scans. If you later get a
// paid key for something with broader non-food coverage (e.g. UPCitemdb,
// barcodelookup.com), add it as a second provider in PROVIDERS below — the
// controller just calls lookupBarcodeOnline() and doesn't care which provider
// answered.
const OFF_URL = (barcode) => `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`;

function normalizeOpenFoodFacts(json, barcode) {
  if (!json || json.status !== 1 || !json.product) return null;
  const p = json.product;

  const name = p.product_name || p.product_name_en || p.generic_name || null;
  if (!name) return null; // not enough to be useful

  const brand = (p.brands || "").split(",")[0].trim() || null;
  const category = (p.categories || "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .pop() || null; // most specific category tag is usually last
  const mrp = null; // OFF doesn't carry retail price data
  const unit = p.quantity || null;
  const image = p.image_front_url || p.image_url || null;

  return {
    barcode,
    name: name.trim(),
    brand,
    category,
    mrp,
    unit,
    imageUrl: image,
    source: "openfoodfacts",
    raw: json
  };
}

// Returns a normalized product shape or null if nothing usable was found.
// Never throws for a "not found" — only for actual network/config failures,
// and even then it degrades to null so a barcode miss never blocks the scan flow.
export async function lookupBarcodeOnline(barcode) {
  if (!env.barcodeLookupEnabled) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.barcodeLookupTimeoutMs);
    let response;
    try {
      response = await fetch(OFF_URL(barcode), {
        headers: { "User-Agent": "DukaanPro/2.0 (barcode-lookup)" },
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) return null;
    const json = await response.json();
    return normalizeOpenFoodFacts(json, barcode);
  } catch (err) {
    // Network failure, timeout, or malformed JSON — treat exactly like "not found"
    // rather than surfacing an error to a shopkeeper mid-scan.
    return null;
  }
}
