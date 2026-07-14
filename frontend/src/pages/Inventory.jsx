import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Package } from "lucide-react";
import Header from "../components/layout/Header.jsx";
import Card from "../components/ui/Card.jsx";
import Table from "../components/ui/Table.jsx";
import Button from "../components/ui/Button.jsx";
import SearchBox from "../components/ui/SearchBox.jsx";
import Badge from "../components/ui/Badge.jsx";
import Modal from "../components/ui/Modal.jsx";
import Input from "../components/ui/Input.jsx";
import Pagination from "../components/ui/Pagination.jsx";
import { useInventory } from "../hooks/useInventory.js";
import { inventoryService } from "../services/inventory.service.js";
import { formatCurrency } from "../utils/currency.js";
import { debounce } from "../utils/helpers.js";
import { notify } from "../components/ui/Toast.jsx";
import { PRODUCT_UNITS } from "../utils/constants.js";
import "../styles/inventory.css";

const EMPTY_FORM = {
  name: "", barcode: "", sku: "", buyPrice: "", sellPrice: "",
  gstPercent: "0", unit: "pcs", stockQty: "", lowStockAt: "5",
  brandName: "", categoryName: "", imageUrl: ""
};

export default function Inventory() {
  const { products, loading, params, setParams, totalPages, reload } = useInventory({ page: 1, limit: 20 });
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Arrives from AI Tools → Product Recognition, or the Scanner → online barcode
  // match ("Add to inventory"): pre-fills the Add Product form with whatever was
  // identified, so the user only has to review it.
  useEffect(() => {
    const prefill = location.state?.prefillProduct;
    if (prefill) {
      setForm((f) => ({ ...f, ...prefill }));
      setModalOpen(true);
      notify.info("Review the identified details, then save");
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const handleSearch = debounce((value) => {
    setParams((p) => ({ ...p, search: value, page: 1 }));
  }, 350);

  const handleChange = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return notify.error("Product name is required");
    setSaving(true);
    try {
      await inventoryService.create({
        ...form,
        buyPrice: Number(form.buyPrice) || 0,
        sellPrice: Number(form.sellPrice) || 0,
        gstPercent: Number(form.gstPercent) || 0,
        stockQty: Number(form.stockQty) || 0,
        lowStockAt: Number(form.lowStockAt) || 5
      });
      notify.success("Product added");
      setModalOpen(false);
      setForm(EMPTY_FORM);
      reload();
    } catch (err) {
      notify.error(err.response?.data?.message || "Couldn't save product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header
        title="Inventory"
        subtitle="Every product currently in your shop."
        actions={<Button icon={Plus} onClick={() => setModalOpen(true)}>Add product</Button>}
      />

      <Card
        title="Products"
        actions={<SearchBox placeholder="Search by name, SKU, or barcode..." onChange={handleSearch} />}
      >
        <Table
          emptyText={loading ? "Loading..." : "No products yet — add your first one."}
          columns={[
            { key: "name", header: "Product", render: (r) => (
              <div className="inv-name-cell">
                <Package size={14} />
                <span>{r.name}</span>
              </div>
            ) },
            { key: "sku", header: "SKU / Barcode", render: (r) => r.sku || r.barcode || "—" },
            { key: "stock_qty", header: "Stock", render: (r) => (
              <Badge tone={Number(r.stock_qty) <= Number(r.low_stock_at) ? "danger" : "success"}>
                {r.stock_qty} {r.unit}
              </Badge>
            ) },
            { key: "sell_price", header: "Sell price", render: (r) => formatCurrency(r.sell_price) },
            { key: "gst_percent", header: "GST", render: (r) => `${r.gst_percent}%` }
          ]}
          data={products}
        />
        <Pagination page={params.page} totalPages={totalPages} onPageChange={(page) => setParams((p) => ({ ...p, page }))} />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add product"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={saving} onClick={handleSave}>Save product</Button>
          </>
        }
      >
        <form className="inv-form" onSubmit={handleSave}>
          <Input label="Product name" value={form.name} onChange={handleChange("name")} placeholder="e.g. NPK 19:19:19 Fertilizer 25kg" />
          <div className="inv-form-row">
            <Input label="Barcode" value={form.barcode} onChange={handleChange("barcode")} />
            <Input label="SKU" value={form.sku} onChange={handleChange("sku")} />
          </div>
          <div className="inv-form-row">
            <Input label="Brand" value={form.brandName} onChange={handleChange("brandName")} placeholder="e.g. Amul" />
            <Input label="Category" value={form.categoryName} onChange={handleChange("categoryName")} placeholder="e.g. Dairy" />
          </div>
          {form.imageUrl && (
            <div className="inv-form-image-preview">
              <img src={form.imageUrl} alt={form.name || "Product"} />
              <span className="text-muted">Image found from barcode lookup</span>
            </div>
          )}
          <div className="inv-form-row">
            <Input label="Buy price (₹)" type="number" value={form.buyPrice} onChange={handleChange("buyPrice")} />
            <Input label="Sell price (₹)" type="number" value={form.sellPrice} onChange={handleChange("sellPrice")} />
          </div>
          <div className="inv-form-row">
            <Input label="GST %" type="number" value={form.gstPercent} onChange={handleChange("gstPercent")} />
            <div className="input-wrapper">
              <label className="input-label">Unit</label>
              <select className="input" value={form.unit} onChange={handleChange("unit")}>
                {PRODUCT_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="inv-form-row">
            <Input label="Opening stock" type="number" value={form.stockQty} onChange={handleChange("stockQty")} />
            <Input label="Low stock alert at" type="number" value={form.lowStockAt} onChange={handleChange("lowStockAt")} />
          </div>
        </form>
      </Modal>
    </>
  );
}
