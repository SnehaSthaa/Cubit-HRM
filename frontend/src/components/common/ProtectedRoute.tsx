import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  action?: string;
}

const ProtectedRoute = ({ children, action }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { requireAllPermission } = useRole();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (action && !requireAllPermission([action])) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export { ProtectedRoute };
interface ProtectedProps {
  children: React.ReactNode;
  allPermissions?: string[];
  anyPermissions?: string[];
  fallback?: React.ReactNode;
}

export const Protected = ({
  children,
  allPermissions,
  anyPermissions,
  fallback = null,
}: ProtectedProps) => {
  const { requireAllPermission, requireAnyPermission } = useRole();

  if (allPermissions && !requireAllPermission(allPermissions)) {
    return <>{fallback}</>;
  }

  if (anyPermissions && !requireAnyPermission(anyPermissions)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
