import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Boxes, ScanLine, ShoppingCart,
  BookOpen, Sparkles, Settings
} from "lucide-react";
import "../../styles/dashboard.css";

// Only pages that are actually built and wired go here. Billing, Analytics,
// Customers, Suppliers, Expenses, Reports, and Subscription aren't built yet —
// see HANDOFF.md — so they're left out rather than linking to dead pages.
const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/inventory", label: "Inventory", icon: Boxes },
  { to: "/scanner", label: "Scanner", icon: ScanLine },
  { to: "/orders", label: "Orders", icon: ShoppingCart },
  { to: "/khata", label: "Khata", icon: BookOpen },
  { to: "/ai-recognition", label: "AI Tools", icon: Sparkles },
  { to: "/settings", label: "Settings", icon: Settings }
];

export default function Sidebar({ onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-mark">D</span>
        <span className="sidebar-logo-text">DukaanPro</span>
      </div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}