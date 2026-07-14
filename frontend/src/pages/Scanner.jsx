import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Minus, Trash2, ScanLine, PackageSearch, ShoppingCart, Search, Sparkles } from "lucide-react";
import Header from "../components/layout/Header.jsx";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";
import Badge from "../components/ui/Badge.jsx";
import BarcodeScanner from "../components/scanner/BarcodeScanner.jsx";
import { inventoryService } from "../services/inventory.service.js";
import { formatCurrency } from "../utils/currency.js";
import { notify } from "../components/ui/Toast.jsx";
import { PRODUCT_UNITS } from "../utils/constants.js";
import "../styles/orders.css";
import "../styles/scanner.css";

export default function Scanner() {
  const navigate = useNavigate();
  const [manualCode, setManualCode] = useState("");
  const [looking, setLooking] = useState(false);
  const [notFoundCode, setNotFoundCode] = useState(null);
  const [onlineMatch, setOnlineMatch] = useState(null); // { barcode, name, brand, category, mrp, unit, imageUrl, fromCache }
  const [cart, setCart] = useState([]); // { product, quantity }

  const lookup = async (code) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setLooking(true);
    setNotFoundCode(null);
    setOnlineMatch(null);
    try {
      const { source, product, catalogMatch } = await inventoryService.lookupByBarcode(trimmed);

      if (source === "inventory" && product) {
        addToCart(product);
        notify.success(`${product.name} added`);
        return;
      }

      if (catalogMatch) {
        // Found in the shared barcode cache or freshly fetched online — it's real
        // product data, but this shop hasn't added it to their own inventory yet.
        setOnlineMatch({ ...catalogMatch, barcode: trimmed, fromCache: source === "catalog" });
        notify.info(
          source === "catalog"
            ? `Found "${catalogMatch.name}" — not in your inventory yet`
            : `Found "${catalogMatch.name}" online — not in your inventory yet`
        );
        return;
      }

      setNotFoundCode(trimmed);
      notify.error(`No product found for barcode ${trimmed}`);
    } catch (err) {
      notify.error(err.response?.data?.message || "Lookup failed");
    } finally {
      setLooking(false);
    }
  };

  const addToCart = (product) => {
    setCart((c) => {
      const existing = c.find((line) => line.product.id === product.id);
      if (existing) {
        return c.map((line) =>
          line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line
        );
      }
      return [{ product, quantity: 1 }, ...c];
    });
  };

  const changeQty = (productId, delta) => {
    setCart((c) =>
      c.map((line) =>
        line.product.id === productId ? { ...line, quantity: Math.max(1, line.quantity + delta) } : line
      )
    );
  };

  const removeLine = (productId) => setCart((c) => c.filter((line) => line.product.id !== productId));

  const cartTotal = cart.reduce((sum, l) => sum + Number(l.product.sell_price) * l.quantity, 0);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    lookup(manualCode);
    setManualCode("");
  };

  const sendToOrders = () => {
    if (cart.length === 0) return notify.error("Scan at least one product first");
    // Hand off the scanned cart to the Orders/Billing page rather than duplicating
    // order-placement logic here — Orders.jsx reads this from navigation state.
    navigate("/orders", { state: { scannedCart: cart.map((l) => ({ product: l.product, quantity: l.quantity })) } });
  };

  // "Add inventory" step of the barcode flow: hands the online/cache match off to
  // Inventory.jsx, which pre-fills and opens the Add Product modal (same handoff
  // pattern the AI Tools page already uses for its own recognized-product result).
  const addOnlineMatchToInventory = () => {
    if (!onlineMatch) return;
    navigate("/inventory", {
      state: {
        prefillProduct: {
          name: onlineMatch.name || "",
          barcode: onlineMatch.barcode,
          brandName: onlineMatch.brand || "",
          categoryName: onlineMatch.category || "",
          sellPrice: onlineMatch.mrp || "",
          unit: PRODUCT_UNITS.includes(onlineMatch.unit) ? onlineMatch.unit : "pcs",
          imageUrl: onlineMatch.imageUrl || ""
        }
      }
    });
  };

  return (
    <>
      <Header
        title="Scanner"
        subtitle="Scan a barcode or QR code to look up and add products instantly."
      />

      <div className="scanner-layout">
        <Card title="Live camera" className="scanner-camera-card">
          <BarcodeScanner onDetected={(text) => lookup(text)} />

          <form className="scanner-manual-entry" onSubmit={handleManualSubmit}>
            <Input
              icon={Search}
              placeholder="Or type a barcode manually..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
            />
            <Button type="submit" variant="secondary" loading={looking} disabled={!manualCode.trim()}>
              Look up
            </Button>
          </form>

          {onlineMatch && (
            <div className="scanner-online-match">
              {onlineMatch.imageUrl && (
                <img src={onlineMatch.imageUrl} alt={onlineMatch.name} className="scanner-online-match-img" />
              )}
              <div className="scanner-online-match-info">
                <Sparkles size={16} />
                <div>
                  <strong>{onlineMatch.name}</strong>
                  <span className="text-muted">
                    {[onlineMatch.brand, onlineMatch.category].filter(Boolean).join(" · ") || "Details found"}
                    {onlineMatch.mrp ? ` · MRP ${formatCurrency(onlineMatch.mrp)}` : ""}
                  </span>
                </div>
              </div>
              <Button size="sm" variant="secondary" onClick={addOnlineMatchToInventory}>
                Add to inventory
              </Button>
            </div>
          )}

          {notFoundCode && (
            <div className="scanner-not-found">
              <PackageSearch size={16} />
              <span>
                Barcode <strong>{notFoundCode}</strong> isn't in your inventory yet.
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate("/inventory", { state: { prefillProduct: { barcode: notFoundCode } } })}
              >
                Add product
              </Button>
            </div>
          )}
        </Card>

        <Card
          title="Scanned items"
          className="scanner-cart-card"
          actions={cart.length > 0 && <Badge tone="info">{cart.length} item{cart.length > 1 ? "s" : ""}</Badge>}
        >
          {cart.length === 0 ? (
            <div className="table-empty text-muted">
              <ScanLine size={20} /> Scan a product to see it here.
            </div>
          ) : (
            <>
              <div className="scanner-cart-lines">
                {cart.map((line) => (
                  <div key={line.product.id} className="scanner-cart-line">
                    <div className="scanner-cart-line-info">
                      <strong>{line.product.name}</strong>
                      <span className="text-muted">
                        {formatCurrency(line.product.sell_price)} · {line.product.stock_qty} {line.product.unit} in stock
                      </span>
                    </div>
                    <div className="orders-cart-line-qty">
                      <button onClick={() => changeQty(line.product.id, -1)}><Minus size={14} /></button>
                      <span>{line.quantity}</span>
                      <button onClick={() => changeQty(line.product.id, 1)}><Plus size={14} /></button>
                    </div>
                    <span>{formatCurrency(line.product.sell_price * line.quantity)}</span>
                    <button className="orders-cart-remove" onClick={() => removeLine(line.product.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="orders-totals">
                <div className="orders-total-final">
                  <span>Total</span>
                  <span>{formatCurrency(cartTotal)}</span>
                </div>
              </div>

              <Button icon={ShoppingCart} className="orders-place-btn" onClick={sendToOrders}>
                Continue to billing
              </Button>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
