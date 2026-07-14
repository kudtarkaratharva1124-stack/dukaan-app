import { useContext, useEffect } from "react";
import { TrendingUp, ShoppingBag, Boxes, AlertTriangle } from "lucide-react";
import Header from "../components/layout/Header.jsx";
import Card from "../components/ui/Card.jsx";
import Table from "../components/ui/Table.jsx";
import Loader from "../components/ui/Loader.jsx";
import { ShopContext } from "../context/ShopContext.jsx";
import { formatCurrency } from "../utils/currency.js";
import { formatDateTime } from "../utils/dates.js";
import { useAuth } from "../hooks/useAuth.js";
import "../styles/dashboard.css";

export default function Dashboard() {
  const { user } = useAuth();
  const { summary, summaryLoading, refreshSummary } = useContext(ShopContext);

  useEffect(() => {
    refreshSummary();
  }, [refreshSummary]);

  return (
    <>
      <Header title={`Welcome, ${user?.name || "there"}`} subtitle="Here's how your shop is doing today." />

      {summaryLoading && !summary ? (
        <Loader fullscreen={false} label="Loading dashboard..." />
      ) : (
        <>
          <div className="stat-grid">
            <Card className="stat-card">
              <TrendingUp size={20} className="stat-icon" />
              <div className="stat-value">{formatCurrency(summary?.todaySales)}</div>
              <div className="stat-label text-muted">Today's sales ({summary?.todayOrderCount || 0} orders)</div>
            </Card>
            <Card className="stat-card">
              <ShoppingBag size={20} className="stat-icon" />
              <div className="stat-value">{formatCurrency(summary?.monthSales)}</div>
              <div className="stat-label text-muted">This month ({summary?.monthOrderCount || 0} orders)</div>
            </Card>
            <Card className="stat-card">
              <Boxes size={20} className="stat-icon" />
              <div className="stat-value">{summary?.productCount ?? 0}</div>
              <div className="stat-label text-muted">Active products</div>
            </Card>
            <Card className="stat-card">
              <AlertTriangle size={20} className="stat-icon stat-icon-warning" />
              <div className="stat-value">{summary?.lowStockCount ?? 0}</div>
              <div className="stat-label text-muted">Low stock items</div>
            </Card>
          </div>

          <Card title="Recent orders">
            <Table
              emptyText="No orders yet — head to Orders to create your first bill."
              columns={[
                { key: "order_number", header: "Order #" },
                { key: "customer_name", header: "Customer", render: (r) => r.customer_name || "Walk-in" },
                { key: "payment_method", header: "Payment" },
                { key: "total", header: "Total", render: (r) => formatCurrency(r.total) },
                { key: "created_at", header: "When", render: (r) => formatDateTime(r.created_at) }
              ]}
              data={summary?.recentOrders || []}
            />
          </Card>
        </>
      )}
    </>
  );
}
