import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute.jsx";
import PublicRoute from "./PublicRoute.jsx";

import Login from "../pages/Login.jsx";
import Signup from "../pages/Signup.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import Inventory from "../pages/Inventory.jsx";
import Scanner from "../pages/Scanner.jsx";
import Orders from "../pages/Orders.jsx";
import Khata from "../pages/Khata.jsx";
import AIRecognition from "../pages/AIRecognition.jsx";
import Settings from "../pages/Settings.jsx";
import NotFound from "../pages/NotFound.jsx";

export default function Router() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/scanner" element={<Scanner />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/khata" element={<Khata />} />
        <Route path="/ai-recognition" element={<AIRecognition />} />
        <Route path="/settings" element={<Settings />} />
        {/* Billing, Analytics, Customers, Suppliers, Expenses,
            Reports, Subscription — next phase, see handoff notes */}
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
