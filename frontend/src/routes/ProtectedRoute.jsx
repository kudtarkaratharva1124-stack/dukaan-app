import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import Loader from "../components/ui/Loader.jsx";
import PageContainer from "../components/layout/PageContainer.jsx";

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <Loader fullscreen label="Loading DukaanPro..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <PageContainer>
      <Outlet />
    </PageContainer>
  );
}
