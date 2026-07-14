import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, Camera, Upload, ScanText, TrendingDown, RefreshCw,
  CheckCircle2, AlertTriangle, PackageSearch, X, Trash2
} from "lucide-react";
import Header from "../components/layout/Header.jsx";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import Badge from "../components/ui/Badge.jsx";
import Input from "../components/ui/Input.jsx";
import Loader from "../components/ui/Loader.jsx";
import { notify } from "../components/ui/Toast.jsx";
import { aiService } from "../services/ai.service.js";
import { inventoryService } from "../services/inventory.service.js";
import { fileToResizedBase64 } from "../utils/image.js";
import { PRODUCT_UNITS } from "../utils/constants.js";
import "../styles/ai.css";

const TABS = [
  { key: "recognize", label: "Product Recognition", icon: Camera },
  { key: "ocr", label: "OCR Bulk Import", icon: ScanText },
  { key: "predict", label: "Inventory Prediction", icon: TrendingDown }
];

export default function AIRecognition() {
  const [activeTab, setActiveTab] = useState("recognize");

  return (
    <>
      <Header
        title="AI Tools"
        subtitle="Point a camera at a product, scan a supplier invoice, or let AI flag what's about to run out."
        actions={<Badge tone="info"><Sparkles size={12} /> Powered by Gemini</Badge>}
      />

      <div className="ai-tabs">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={"ai-tab" + (activeTab === key ? " active" : "")}
            onClick={() => setActiveTab(key)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "recognize" && <ProductRecognitionTab />}
      {activeTab === "ocr" && <OcrBulkImportTab />}
      {activeTab === "predict" && <InventoryPredictionTab />}
    </>
  );
}

// ---------------- Shared image capture control ----------------

function ImageCapture({ onImage, previewUrl, onClear, busy }) {
  const fileInputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    try {
      const resized = await fileToResizedBase64(file);
      onImage(resized);
    } catch (err) {
      notify.error(err.message || "Couldn't load that image");
    }
  };

  if (previewUrl) {
    return (
      <div className="ai-preview">
        <img src={previewUrl} alt="Captured" />
        {!busy && (
          <button className="ai-preview-clear" onClick={onClear} aria-label="Remove image">
            <X size={16} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="ai-dropzone">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        hidden
      />
      <PackageSearch size={32} />
      <p>Take a photo or upload an image</p>
      <div className="ai-dropzone-actions">
        <Button icon={Camera} onClick={() => fileInputRef.current?.click()}>Use camera</Button>
        <Button
          variant="secondary"
          icon={Upload}
          onClick={() => {
            fileInputRef.current.removeAttribute("capture");
            fileInputRef.current?.click();
          }}
        >
          Upload file
        </Button>
      </div>
    </div>
  );
}

// ---------------- Tab 1: Product recognition ----------------

function ProductRecognitionTab() {
  const [image, setImage] = useState(null); // { base64, mimeType, previewUrl }
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const reset = () => {
    setImage(null);
    setResult(null);
  };

  const identify = async () => {
    if (!image) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await aiService.recognizeProduct(image.base64, image.mimeType);
      setResult(res);
      if (!res.name) notify.info("Couldn't recognize a product in that photo — try a clearer, closer shot.");
    } catch (err) {
      notify.error(err.response?.data?.message || "Recognition failed");
    } finally {
      setLoading(false);
    }
  };

  const useInInventory = () => {
    navigate("/inventory", {
      state: {
        prefillProduct: {
          name: result.name || "",
          unit: PRODUCT_UNITS.includes(result.unit) ? result.unit : "pcs",
          barcode: result.visibleBarcode || ""
        }
      }
    });
  };

  return (
    <Card title="Identify a product from a photo">
      <div className="ai-recognize-layout">
        <ImageCapture
          onImage={setImage}
          previewUrl={image?.previewUrl}
          onClear={reset}
          busy={loading}
        />

        <div className="ai-recognize-panel">
          {image && !result && (
            <Button icon={Sparkles} loading={loading} onClick={identify} disabled={loading}>
              {loading ? "Identifying..." : "Identify product"}
            </Button>
          )}

          {loading && <Loader label="Asking AI to take a look..." />}

          {result && (
            <div className="ai-result-card">
              {result.name ? (
                <>
                  <div className="ai-result-row">
                    <span className="ai-result-label">Name</span>
                    <span className="ai-result-value">{result.name}</span>
                  </div>
                  <div className="ai-result-row">
                    <span className="ai-result-label">Category</span>
                    <span className="ai-result-value">{result.category || "—"}</span>
                  </div>
                  <div className="ai-result-row">
                    <span className="ai-result-label">Brand</span>
                    <span className="ai-result-value">{result.brand || "—"}</span>
                  </div>
                  <div className="ai-result-row">
                    <span className="ai-result-label">Unit</span>
                    <span className="ai-result-value">{result.unit || "pcs"}</span>
                  </div>
                  {result.visibleBarcode && (
                    <div className="ai-result-row">
                      <span className="ai-result-label">Barcode</span>
                      <span className="ai-result-value">{result.visibleBarcode}</span>
                    </div>
                  )}
                  <p className="ai-result-description">{result.description}</p>
                  <Badge tone={result.confidence === "high" ? "success" : result.confidence === "medium" ? "warning" : "danger"}>
                    {result.confidence} confidence
                  </Badge>
                  <div className="ai-result-actions">
                    <Button icon={CheckCircle2} onClick={useInInventory}>Add to inventory</Button>
                    <Button variant="secondary" onClick={reset}>Try another photo</Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-muted">No product recognized in that image.</p>
                  <Button variant="secondary" onClick={reset}>Try another photo</Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ---------------- Tab 2: OCR bulk import ----------------

function OcrBulkImportTab() {
  const [image, setImage] = useState(null);
  const [extracted, setExtracted] = useState(null); // { supplierNameGuess, documentDateGuess, items }
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);

  const reset = () => {
    setImage(null);
    setExtracted(null);
    setRows([]);
    setImportSummary(null);
  };

  const extract = async () => {
    if (!image) return;
    setLoading(true);
    setExtracted(null);
    setImportSummary(null);
    try {
      const res = await aiService.extractInvoice(image.base64, image.mimeType);
      setExtracted(res);
      setRows((res.items || []).map((it, i) => ({ id: i, ...it })));
      if (!res.items?.length) notify.info("Couldn't read any line items — try a clearer, well-lit photo.");
    } catch (err) {
      notify.error(err.response?.data?.message || "Extraction failed");
    } finally {
      setLoading(false);
    }
  };

  const updateRow = (id, key, value) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  };
  const removeRow = (id) => setRows((rs) => rs.filter((r) => r.id !== id));

  const importAll = async () => {
    const valid = rows.filter((r) => r.name?.trim());
    if (valid.length === 0) return notify.error("Nothing to import");
    setImporting(true);
    let created = 0;
    let failed = 0;
    for (const r of valid) {
      try {
        await inventoryService.create({
          name: r.name.trim(),
          unit: PRODUCT_UNITS.includes(r.unit) ? r.unit : "pcs",
          buyPrice: Number(r.price) || 0,
          sellPrice: Number(r.price) || 0,
          stockQty: Number(r.quantity) || 0,
          gstPercent: 0,
          lowStockAt: 5
        });
        created += 1;
      } catch {
        failed += 1;
      }
    }
    setImporting(false);
    setImportSummary({ created, failed });
    if (created > 0) notify.success(`Added ${created} product${created > 1 ? "s" : ""} to inventory`);
    if (failed > 0) notify.error(`${failed} item${failed > 1 ? "s" : ""} couldn't be added`);
  };

  return (
    <Card title="Extract stock from an invoice or handwritten list">
      {!extracted && (
        <div className="ai-recognize-layout">
          <ImageCapture onImage={setImage} previewUrl={image?.previewUrl} onClear={reset} busy={loading} />
          <div className="ai-recognize-panel">
            {image && (
              <Button icon={Sparkles} loading={loading} onClick={extract} disabled={loading}>
                {loading ? "Reading document..." : "Extract items"}
              </Button>
            )}
            {loading && <Loader label="Reading the document..." />}
            {!image && (
              <p className="text-muted">
                Photograph a supplier invoice, a handwritten stock list, or a price list. AI will pull out
                product names, quantities, and prices so you can bulk-add them without typing each one.
              </p>
            )}
          </div>
        </div>
      )}

      {extracted && (
        <div className="ai-ocr-results">
          <div className="ai-ocr-meta">
            {extracted.supplierNameGuess && <span>Supplier: <strong>{extracted.supplierNameGuess}</strong></span>}
            {extracted.documentDateGuess && <span>Date: <strong>{extracted.documentDateGuess}</strong></span>}
            <Button variant="ghost" size="sm" icon={RefreshCw} onClick={reset}>Start over</Button>
          </div>

          {rows.length === 0 ? (
            <p className="text-muted">No line items were found in that image.</p>
          ) : (
            <>
              <div className="ai-ocr-table">
                <div className="ai-ocr-row ai-ocr-row-head">
                  <span>Item name</span>
                  <span>Qty</span>
                  <span>Unit</span>
                  <span>Price (₹)</span>
                  <span></span>
                </div>
                {rows.map((r) => (
                  <div className="ai-ocr-row" key={r.id}>
                    <Input value={r.name} onChange={(e) => updateRow(r.id, "name", e.target.value)} />
                    <Input type="number" value={r.quantity} onChange={(e) => updateRow(r.id, "quantity", e.target.value)} />
                    <select className="input" value={r.unit} onChange={(e) => updateRow(r.id, "unit", e.target.value)}>
                      {PRODUCT_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <Input type="number" value={r.price} onChange={(e) => updateRow(r.id, "price", e.target.value)} />
                    <button className="ai-ocr-remove" onClick={() => removeRow(r.id)} aria-label="Remove row">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {importSummary ? (
                <div className="ai-import-summary">
                  <CheckCircle2 size={16} />
                  Added {importSummary.created} product{importSummary.created !== 1 ? "s" : ""} to inventory.
                  {importSummary.failed > 0 && ` ${importSummary.failed} failed.`}
                </div>
              ) : (
                <Button icon={Upload} loading={importing} onClick={importAll} disabled={importing}>
                  Add all {rows.length} to inventory
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
}

// ---------------- Tab 3: Inventory prediction ----------------

function InventoryPredictionTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await aiService.getInventoryPrediction();
      setData(res);
    } catch (err) {
      notify.error(err.response?.data?.message || "Couldn't load the forecast");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const riskTone = { critical: "danger", warning: "warning", watch: "info", ok: "success" };

  const list = showAll ? data?.fullForecast : data?.atRisk;

  return (
    <Card
      title="What's about to run out"
      actions={<Button variant="ghost" size="sm" icon={RefreshCw} onClick={load} disabled={loading}>Refresh</Button>}
    >
      {loading && <Loader label="Crunching your sales history..." />}

      {!loading && data && (
        <>
          <div className="ai-predict-stats">
            <div className="ai-predict-stat">
              <span className="ai-predict-stat-num">{data.stats.criticalCount}</span>
              <span className="text-muted">Critical</span>
            </div>
            <div className="ai-predict-stat">
              <span className="ai-predict-stat-num">{data.stats.warningCount}</span>
              <span className="text-muted">Warning</span>
            </div>
            <div className="ai-predict-stat">
              <span className="ai-predict-stat-num">{data.stats.totalActiveProducts}</span>
              <span className="text-muted">Total products</span>
            </div>
          </div>

          {data.summary && (
            <div className="ai-predict-summary">
              <AlertTriangle size={16} />
              <p>{data.summary}</p>
            </div>
          )}

          {(!list || list.length === 0) ? (
            <p className="text-muted">
              {showAll ? "No products found." : "Nothing urgent right now — every product has healthy stock relative to its recent sales pace."}
            </p>
          ) : (
            <div className="ai-predict-table">
              <div className="ai-predict-row ai-predict-row-head">
                <span>Product</span>
                <span>Stock</span>
                <span>Avg daily sales</span>
                <span>Days left</span>
                <span>Reorder suggestion</span>
                <span>Risk</span>
              </div>
              {list.map((p) => (
                <div className="ai-predict-row" key={p.productId}>
                  <span>{p.name}</span>
                  <span>{p.stockQty} {p.unit}</span>
                  <span>{p.avgDailySales > 0 ? `${p.avgDailySales}/day` : "no recent sales"}</span>
                  <span>{p.daysRemaining === null ? "—" : `${p.daysRemaining} days`}</span>
                  <span>{p.suggestedReorderQty > 0 ? `+${p.suggestedReorderQty} ${p.unit}` : "—"}</span>
                  <span><Badge tone={riskTone[p.riskLevel]}>{p.riskLevel}</Badge></span>
                </div>
              ))}
            </div>
          )}

          <Button variant="ghost" size="sm" onClick={() => setShowAll((s) => !s)}>
            {showAll ? "Show only at-risk products" : "Show full forecast for all products"}
          </Button>
        </>
      )}
    </Card>
  );
}
