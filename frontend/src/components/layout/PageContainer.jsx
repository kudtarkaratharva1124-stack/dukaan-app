import { useState } from "react";
import Sidebar from "./Sidebar.jsx";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";

export default function PageContainer({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className={"app-layout" + (sidebarOpen ? "" : " sidebar-collapsed")}>
      <Sidebar />
      <div className="app-main">
        <Navbar onMenuClick={() => setSidebarOpen((v) => !v)} />
        <div className="app-content">{children}</div>
        <Footer />
      </div>
    </div>
  );
}
