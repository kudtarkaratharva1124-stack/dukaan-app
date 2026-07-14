import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, MessageCircle, Plus, Minus, Trash2, UserPlus } from "lucide-react";
import Header from "../components/layout/Header.jsx";
import Card from "../components/ui/Card.jsx";
import Table from "../components/ui/Table.jsx";
import Button from "../components/ui/Button.jsx";
import Badge from "../components/ui/Badge.jsx";
import Input from "../components/ui/Input.jsx";
import SearchBox from "../components/ui/SearchBox.jsx";
import Modal from "../components/ui/Modal.jsx";
import Loader from "../components/ui/Loader.jsx";
import { notify } from "../components/ui/Toast.jsx";
import { khataService } from "../services/khata.service.js";
import { customerService } from "../services/customer.service.js";
import { formatCurrency } from "../utils/currency.js";
import { formatDateTime } from "../utils/dates.js";
import { debounce, buildWhatsAppLink } from "../utils/helpers.js";
import { useAuth } from "../hooks/useAuth.js";
import "../styles/khata.css";

export default function Khata() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [onlyWithDue, setOnlyWithDue] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState(null); // ledger modal
  const [ledger, setLedger] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [entryType, setEntryType] = useState("credit"); // credit = payment received, debit = gave on credit
  const [entryAmount, setEntryAmount] = useState("");
  const [entryNote, setEntryNote] = useState("");
  const [savingEntry, setSavingEntry] = useState(false);

  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", creditLimit: "" });
  const [savingCustomer, setSavingCustomer] = useState(false);

  const loadAll = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const [summaryData, customersData] = await Promise.all([
        khataService.summary(),
        khataService.listCustomers(params)
      ]);
      setSummary(summaryData);
      setCustomers(customersData);
    } catch (err) {
      notify.error(err.response?.data?.message || "Couldn't load khata");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSearch = useMemo(
    () =>
      debounce((value, due) => {
        loadAll({ search: value, onlyWithDue: due ? "true" : undefined });
      }, 300),
    [loadAll]
  );

  const onSearchChange = (value) => {
    setSearch(value);
    runSearch(value, onlyWithDue);
  };

  const toggleDueFilter = () => {
    const next = !onlyWithDue;
    setOnlyWithDue(next);
    loadAll({ search, onlyWithDue: next ? "true" : undefined });
  };

  const openLedger = async (customer) => {
    setSelectedCustomer(customer);
    setEntryType("credit");
    setEntryAmount("");
    setEntryNote("");
    setLedgerLoading(true);
    try {
      const data = await khataService.getLedger(customer.id);
      setLedger(data);
    } catch (err) {
      notify.error(err.response?.data?.message || "Couldn't load ledger");
      setSelectedCustomer(null);
    } finally {
      setLedgerLoading(false);
    }
  };

  const closeLedger = () => {
    setSelectedCustomer(null);
    setLedger(null);
  };

  const submitEntry = async (e) => {
    e.preventDefault();
    if (!entryAmount || Number(entryAmount) <= 0) {
      return notify.error("Enter a valid amount");
    }
    setSavingEntry(true);
    try {
      await khataService.addEntry(selectedCustomer.id, {
        entryType,
        amount: Number(entryAmount),
        note: entryNote || undefined
      });
      notify.success(entryType === "credit" ? "Payment recorded" : "Credit entry added");
      const data = await khataService.getLedger(selectedCustomer.id);
      setLedger(data);
      setEntryAmount("");
      setEntryNote("");
      loadAll({ search, onlyWithDue: onlyWithDue ? "true" : undefined });
    } catch (err) {
      notify.error(err.response?.data?.message || "Couldn't save entry");
    } finally {
      setSavingEntry(false);
    }
  };

  const removeEntry = async (entryId) => {
    try {
      await khataService.deleteEntry(entryId);
      notify.success("Entry removed");
      const data = await khataService.getLedger(selectedCustomer.id);
      setLedger(data);
      loadAll({ search, onlyWithDue: onlyWithDue ? "true" : undefined });
    } catch (err) {
      notify.error(err.response?.data?.message || "Couldn't remove entry");
    }
  };

  const submitNewCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomer.name.trim()) return notify.error("Name is required");
    setSavingCustomer(true);
    try {
      await customerService.create({
        name: newCustomer.name.trim(),
        phone: newCustomer.phone || undefined,
        creditLimit: newCustomer.creditLimit ? Number(newCustomer.creditLimit) : undefined
      });
      notify.success("Customer added");
      setShowAddCustomer(false);
      setNewCustomer({ name: "", phone: "", creditLimit: "" });
      loadAll({ search, onlyWithDue: onlyWithDue ? "true" : undefined });
    } catch (err) {
      notify.error(err.response?.data?.message || "Couldn't add customer");
    } finally {
      setSavingCustomer(false);
    }
  };

  const reminderLink = useMemo(() => {
    if (!selectedCustomer || !ledger) return null;
    if (ledger.balance <= 0) return null;
    const message = `Namaste ${selectedCustomer.name}, this is a reminder from ${
      user?.shop_name || "our shop"
    } — your outstanding balance is ${formatCurrency(ledger.balance)}. Please clear it at your earliest convenience. Thank you!`;
    return buildWhatsAppLink(selectedCustomer.phone, message);
  }, [selectedCustomer, ledger, user]);

  return (
    <>
      <Header
        title="Khata Book"
        subtitle="Track customer credit — who owes you, how much, and since when."
        actions={
          <Button icon={UserPlus} variant="secondary" onClick={() => setShowAddCustomer(true)}>
            Add customer
          </Button>
        }
      />

      <div className="stat-grid">
        <Card className="stat-card">
          <BookOpen size={20} className="stat-icon" />
          <div className="stat-value">{formatCurrency(summary?.totalToCollect)}</div>
          <div className="stat-label text-muted">Total to collect</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-value">{summary?.customersWithDue ?? 0}</div>
          <div className="stat-label text-muted">Customers with due</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-value">{formatCurrency(summary?.totalGivenOnCredit)}</div>
          <div className="stat-label text-muted">Given on credit (all time)</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-value">{formatCurrency(summary?.totalCollected)}</div>
          <div className="stat-label text-muted">Collected (all time)</div>
        </Card>
      </div>

      <Card
        title="Customers"
        actions={
          <label className="khata-due-toggle">
            <input type="checkbox" checked={onlyWithDue} onChange={toggleDueFilter} />
            Only show due
          </label>
        }
      >
        <SearchBox placeholder="Search by name or phone..." value={search} onChange={onSearchChange} />

        <Table
          emptyText={loading ? "Loading..." : "No customers found"}
          columns={[
            { key: "name", header: "Customer" },
            { key: "phone", header: "Phone", render: (r) => r.phone || "—" },
            {
              key: "balance",
              header: "Balance",
              render: (r) =>
                r.balance > 0 ? (
                  <Badge tone="danger">{formatCurrency(r.balance)} due</Badge>
                ) : r.balance < 0 ? (
                  <Badge tone="info">{formatCurrency(Math.abs(r.balance))} advance</Badge>
                ) : (
                  <Badge tone="success">Settled</Badge>
                )
            },
            {
              key: "last_activity",
              header: "Last activity",
              render: (r) => (r.last_activity ? formatDateTime(r.last_activity) : "No entries yet")
            }
          ]}
          data={customers}
          onRowClick={openLedger}
        />
      </Card>

      <Modal
        open={!!selectedCustomer}
        onClose={closeLedger}
        title={selectedCustomer ? `${selectedCustomer.name}'s Khata` : ""}
        size="lg"
      >
        {ledgerLoading || !ledger ? (
          <Loader fullscreen={false} label="Loading ledger..." />
        ) : (
          <div className="khata-ledger">
            <div className="khata-ledger-balance">
              <span>Current balance</span>
              <strong className={ledger.balance > 0 ? "text-danger" : ledger.balance < 0 ? "text-info" : ""}>
                {ledger.balance > 0
                  ? `${formatCurrency(ledger.balance)} due`
                  : ledger.balance < 0
                  ? `${formatCurrency(Math.abs(ledger.balance))} advance`
                  : "Settled"}
              </strong>
            </div>

            {reminderLink && (
              <a href={reminderLink} target="_blank" rel="noreferrer" className="khata-reminder-link">
                <Button variant="secondary" icon={MessageCircle} type="button">
                  Send WhatsApp reminder
                </Button>
              </a>
            )}
            {!selectedCustomer?.phone && ledger.balance > 0 && (
              <p className="text-muted khata-reminder-hint">Add a phone number for this customer to send reminders.</p>
            )}

            <form className="khata-entry-form" onSubmit={submitEntry}>
              <div className="khata-entry-type-toggle">
                <button
                  type="button"
                  className={entryType === "credit" ? "active" : ""}
                  onClick={() => setEntryType("credit")}
                >
                  <Minus size={14} /> Payment received
                </button>
                <button
                  type="button"
                  className={entryType === "debit" ? "active" : ""}
                  onClick={() => setEntryType("debit")}
                >
                  <Plus size={14} /> Gave on credit
                </button>
              </div>
              <div className="khata-entry-fields">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Amount"
                  value={entryAmount}
                  onChange={(e) => setEntryAmount(e.target.value)}
                />
                <Input
                  type="text"
                  placeholder="Note (optional)"
                  value={entryNote}
                  onChange={(e) => setEntryNote(e.target.value)}
                />
                <Button type="submit" loading={savingEntry}>
                  Save
                </Button>
              </div>
            </form>

            <Table
              emptyText="No entries yet"
              columns={[
                {
                  key: "entry_type",
                  header: "Type",
                  render: (r) =>
                    r.entry_type === "debit" ? (
                      <Badge tone="warning">Gave on credit</Badge>
                    ) : (
                      <Badge tone="success">Payment received</Badge>
                    )
                },
                { key: "amount", header: "Amount", render: (r) => formatCurrency(r.amount) },
                { key: "note", header: "Note", render: (r) => r.note || "—" },
                { key: "created_at", header: "Date", render: (r) => formatDateTime(r.created_at) },
                {
                  key: "actions",
                  header: "",
                  render: (r) => (
                    <button className="khata-entry-delete" onClick={() => removeEntry(r.id)} aria-label="Delete entry">
                      <Trash2 size={14} />
                    </button>
                  )
                }
              ]}
              data={ledger.entries}
            />
          </div>
        )}
      </Modal>

      <Modal open={showAddCustomer} onClose={() => setShowAddCustomer(false)} title="Add customer">
        <form className="khata-entry-form" onSubmit={submitNewCustomer}>
          <Input
            label="Name"
            value={newCustomer.name}
            onChange={(e) => setNewCustomer((c) => ({ ...c, name: e.target.value }))}
            required
          />
          <Input
            label="Phone"
            value={newCustomer.phone}
            onChange={(e) => setNewCustomer((c) => ({ ...c, phone: e.target.value }))}
          />
          <Input
            label="Credit limit (optional)"
            type="number"
            min="0"
            step="0.01"
            value={newCustomer.creditLimit}
            onChange={(e) => setNewCustomer((c) => ({ ...c, creditLimit: e.target.value }))}
          />
          <Button type="submit" loading={savingCustomer}>
            Add customer
          </Button>
        </form>
      </Modal>
    </>
  );
}
