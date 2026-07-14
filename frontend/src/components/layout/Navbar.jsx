import { Bell, Menu, Search } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";

export default function Navbar({ onMenuClick }) {
  const { user } = useAuth();

  return (
    <header className="navbar">
      <button className="navbar-menu-btn" onClick={onMenuClick} aria-label="Toggle menu">
        <Menu size={20} />
      </button>

      <div className="navbar-search">
        <Search size={16} />
        <input type="text" placeholder="Search products, orders, customers..." />
      </div>

      <div className="navbar-actions">
        <button className="navbar-icon-btn" aria-label="Notifications">
          <Bell size={18} />
        </button>
        <div className="navbar-user">
          <div className="navbar-user-avatar">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="navbar-user-info">
            <span className="navbar-user-name">{user?.name || "Shop Owner"}</span>
            <span className="navbar-user-role text-muted">{user?.role || "Owner"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
