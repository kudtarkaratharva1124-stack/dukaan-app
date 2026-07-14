import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import Loader from "../components/ui/Loader.jsx";

// Keeps logged-in users out of /login and /signup.
export default function PublicRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <Loader fullscreen />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
