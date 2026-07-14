import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const GEMINI_URL = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

function assertConfigured() {
  if (!env.geminiApiKey) {
    throw new ApiError(
      503,
      "AI features aren't configured yet. Ask the shop owner to add a GEMINI_API_KEY in the server .env file."
    );
  }
}

// Calls Gemini's generateContent REST endpoint directly (no SDK dependency).
// `parts` follows the Gemini content-parts format, e.g.
// [{ text: "..." }, { inline_data: { mime_type, data } }]
async function callGemini({ parts, jsonResponse = true, temperature = 0.2 }) {
  assertConfigured();

  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature,
      ...(jsonResponse ? { responseMimeType: "application/json" } : {})
    }
  };

  let response;
  try {
    response = await fetch(`${GEMINI_URL(env.geminiModel)}?key=${env.geminiApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch (err) {
    throw new ApiError(502, "Couldn't reach the AI service. Check your network connection and try again.");
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    if (response.status === 400 && errText.includes("API key")) {
      throw new ApiError(502, "The configured GEMINI_API_KEY was rejected. Check it's correct and active.");
    }
    throw new ApiError(502, `AI service error (${response.status}). Please try again in a moment.`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";

  if (!text) {
    // Most common cause: the image was blocked by Gemini's safety filters.
    const finishReason = data?.candidates?.[0]?.finishReason;
    throw new ApiError(422, `AI couldn't process that image${finishReason ? ` (${finishReason})` : ""}. Try a clearer photo.`);
  }

  if (!jsonResponse) return text.trim();

  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(502, "AI returned an unexpected response format. Please try again.");
  }
}

function imagePart(base64Data, mimeType) {
  return { inline_data: { mime_type: mimeType, data: base64Data } };
}

// ---- Product recognition: point a camera at an item, get back catalog-ready fields ----
export async function recognizeProductFromImage(base64Data, mimeType) {
  const prompt = `You are a cataloguing assistant for an Indian kirana/general store's inventory system.
Look at this product photo and identify it. Respond with ONLY a JSON object (no markdown, no commentary) with these exact keys:
{
  "name": string,            // best-guess product name, include size/weight/variant if visible, e.g. "Tata Salt 1kg"
  "category": string | null, // a short general category, e.g. "Groceries", "Dairy", "Stationery", "Seeds & Fertilizer"
  "brand": string | null,    // brand name if visible/known, else null
  "unit": string,            // one of: pcs, kg, g, litre, ml, bag, box, dozen — best guess for how this is sold
  "visibleBarcode": string | null, // digits only if a barcode/EAN/UPC number is clearly readable in the image, else null
  "description": string,     // one short sentence describing the item
  "confidence": "high" | "medium" | "low"
}
If the image doesn't clearly show a real, identifiable product, set "name" to null and confidence to "low".`;

  return callGemini({ parts: [{ text: prompt }, imagePart(base64Data, mimeType)] });
}

// ---- OCR / bulk import: photo of a supplier invoice, handwritten stock list, or price list ----
export async function extractLineItemsFromImage(base64Data, mimeType) {
  const prompt = `You are an OCR assistant for an Indian small-business inventory system.
This image is a supplier invoice, handwritten stock list, or price list. Extract every product line item you can read.
Respond with ONLY a JSON object (no markdown, no commentary) with this exact shape:
{
  "supplierNameGuess": string | null,
  "documentDateGuess": string | null,  // ISO date "YYYY-MM-DD" if a date is visible, else null
  "items": [
    {
      "name": string,
      "quantity": number,     // best-guess numeric quantity, default 1 if not stated
      "unit": string,         // one of: pcs, kg, g, litre, ml, bag, box, dozen
      "price": number         // per-unit price in rupees if visible, else 0
    }
  ]
}
If the image is unreadable or contains no line items, return an empty "items" array.`;

  return callGemini({ parts: [{ text: prompt }, imagePart(base64Data, mimeType)] });
}

// ---- Inventory prediction narrative: turns the deterministic stats into a short summary ----
// This is best-effort only — the actual restock numbers come from real stock_movements math
// in the controller, never from the model. If this fails or isn't configured, the caller
// should just skip the narrative and show the stats table on its own.
export async function summarizeInventoryPrediction(stats) {
  const prompt = `You are an inventory assistant for an Indian small shop. Based on this JSON stock forecast data,
write a short, plain-language summary (2-4 sentences, no markdown, no bullet points) highlighting the most urgent
restocking priorities and any notable pattern. Be specific with product names and numbers already given to you —
do not invent numbers that aren't in the data.

DATA:
${JSON.stringify(stats)}`;

  return callGemini({ parts: [{ text: prompt }], jsonResponse: false, temperature: 0.4 });
}
