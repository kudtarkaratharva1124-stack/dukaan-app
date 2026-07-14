import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Minus, Trash2, ShoppingCart } from "lucide-react";
import Header from "../components/layout/Header.jsx";
import Card from "../components/ui/Card.jsx";
import Table from "../components/ui/Table.jsx";
import Button from "../components/ui/Button.jsx";
import SearchBox from "../components/ui/SearchBox.jsx";
import { useOrders } from "../hooks/useOrders.js";
import { inventoryService } from "../services/inventory.service.js";
import { orderService } from "../services/order.service.js";
import { formatCurrency } from "../utils/currency.js";
import { formatDateTime } from "../utils/dates.js";
import { debounce } from "../utils/helpers.js";
import { notify } from "../components/ui/Toast.jsx";
import { PAYMENT_METHODS } from "../utils/constants.js";
import "../styles/orders.css";

export default function Orders() {
  const { orders, loading, reload } = useOrders({ page: 1, limit: 10 });
  const location = useLocation();
  const navigate = useNavigate();

  // --- Billing cart state ---
  const [searchResults, setSearchResults] = useState([]);
  const [cart, setCart] = useState([]); // { product, quantity }
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [placing, setPlacing] = useState(false);

  // A cart scanned on the Scanner page is handed off here via navigation state.
  useEffect(() => {
    const scannedCart = location.state?.scannedCart;
    if (scannedCart?.length) {
      setCart(scannedCart);
      notify.success(`${scannedCart.length} scanned item${scannedCart.length > 1 ? "s" : ""} loaded into the bill`);
      // Clear the handoff state so refreshing/navigating back doesn't re-apply it.
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const searchProducts = debounce(async (value) => {
    if (!value) return setSearchResults([]);
    const data = await inventoryService.list({ search: value, limit: 6 });
    setSearchResults(data.products);
  }, 300);

  const addToCart = (product) => {
    setCart((c) => {
      const existing = c.find((line) => line.product.id === product.id);
      if (existing) {
        return c.map((line) => line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line);
      }
      return [...c, { product, quantity: 1 }];
    });
    setSearchResults([]);
  };

  const changeQty = (productId, delta) => {
    setCart((c) => c
      .map((line) => line.product.id === productId ? { ...line, quantity: Math.max(1, line.quantity + delta) } : line)
    );
  };

  const removeLine = (productId) => setCart((c) => c.filter((line) => line.product.id !== productId));

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, l) => sum + l.product.sell_price * l.quantity, 0);
    const tax = cart.reduce((sum, l) => sum + (l.product.sell_price * l.quantity) * (l.product.gst_percent / 100), 0);
    return { subtotal, tax, total: subtotal + tax };
  }, [cart]);

  const placeOrder = async () => {
    if (cart.length === 0) return notify.error("Cart is empty");
    setPlacing(true);
    try {
      await orderService.create({
        items: cart.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
        paymentMethod
      });
      notify.success("Order placed!");
      setCart([]);
      reload();
    } catch (err) {
      notify.error(err.response?.data?.message || "Couldn't place order");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <>
      <Header title="Orders & Billing" subtitle="Create a walk-in bill or review past orders." />

      <div className="orders-layout">
        <Card title="New bill" className="orders-cart">
          <SearchBox placeholder="Search product to add..." onChange={searchProducts} />
          {searchResults.length > 0 && (
            <div className="orders-search-results">
              {searchResults.map((p) => (
                <button key={p.id} className="orders-search-item" onClick={() => addToCart(p)}>
                  <span>{p.name}</span>
                  <span className="text-muted">{formatCurrency(p.sell_price)} · {p.stock_qty} {p.unit}</span>
                </button>
              ))}
            </div>
          )}

          {cart.length === 0 ? (
            <div className="table-empty text-muted"><ShoppingCart size={20} /> Cart is empty — search a product above.</div>
          ) : (
            <div className="orders-cart-lines">
              {cart.map((line) => (
                <div key={line.product.id} className="orders-cart-line">
                  <div className="orders-cart-line-info">
                    <strong>{line.product.name}</strong>
                    <span className="text-muted">{formatCurrency(line.product.sell_price)} each</span>
                  </div>
                  <div className="orders-cart-line-qty">
                    <button onClick={() => changeQty(line.product.id, -1)}><Minus size={14} /></button>
                    <span>{line.quantity}</span>
                    <button onClick={() => changeQty(line.product.id, 1)}><Plus size={14} /></button>
                  </div>
                  <span>{formatCurrency(line.product.sell_price * line.quantity)}</span>
                  <button className="orders-cart-remove" onClick={() => removeLine(line.product.id)}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}

          <div className="orders-totals">
            <div><span>Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
            <div><span>Tax</span><span>{formatCurrency(totals.tax)}</span></div>
            <div className="orders-total-final"><span>Total</span><span>{formatCurrency(totals.total)}</span></div>
          </div>

          <div className="input-wrapper">
            <label className="input-label">Payment method</label>
            <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <Button className="orders-place-btn" loading={placing} onClick={placeOrder} disabled={cart.length === 0}>
            Place order — {formatCurrency(totals.total)}
          </Button>
        </Card>

        <Card title="Recent orders" className="orders-history">
          <Table
            emptyText={loading ? "Loading..." : "No orders yet"}
            columns={[
              { key: "order_number", header: "Order #" },
              { key: "customer_name", header: "Customer", render: (r) => r.customer_name || "Walk-in" },
              { key: "total", header: "Total", render: (r) => formatCurrency(r.total) },
              { key: "created_at", header: "When", render: (r) => formatDateTime(r.created_at) }
            ]}
            data={orders}
          />
        </Card>
      </div>
    </>
  );
}
