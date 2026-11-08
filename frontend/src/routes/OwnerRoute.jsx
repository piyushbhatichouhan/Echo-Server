import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../hooks/useAuth";

/**
 * Route guard that strictly restricts access to the Super Admin (Platform Owner).
 * Any non-owner or unauthenticated user is immediately redirected to /dashboard or /login.
 */
export default function OwnerRoute({ children }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isOwner = Boolean(user?.is_owner || user?.isOwner);

  if (!isOwner) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? children : <Outlet />;
}

