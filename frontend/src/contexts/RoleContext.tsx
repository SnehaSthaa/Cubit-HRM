import { createContext, useContext, ReactNode, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { allPermission } from "@/permissions/allowed-permission";

export type UserRole = "super_admin" | "hr_admin" | "employee";

interface RoleContextValue {
  role: UserRole;
  activeRole: UserRole;

  isAdmin: boolean;
  isHR: boolean;
  isEmployee: boolean;

  // Permission helpers
  requireAllPermission: (actions: string[]) => boolean;
  requireAnyPermission: (actions: string[]) => boolean;

  previewRole: UserRole | null;
  setPreviewRole: (role: UserRole | null) => void;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [previewRole, setPreviewRole] = useState<UserRole | null>(null);

  const roles = (user?.role ?? ["employee"]) as UserRole[];
  const role: UserRole =
    (user?.activeRole as UserRole) ?? roles[0] ?? "employee";

  const activeRole: UserRole = previewRole ?? role;

  const permissions = allPermission[activeRole] ?? allPermission["employee"];

  // Get all allowed actions
  const allowedActions = useMemo(() => {
    if (!permissions) return [];
    return Object.values(permissions).flatMap((mod) =>
      Object.entries(mod)
        .filter(([, value]) => value === true)
        .map(([key]) => key),
    );
  }, [permissions]);

  // Check if ALL permissions exist
  const requireAllPermission = (actions: string[]): boolean => {
    return actions.every((action) => allowedActions.includes(action));
  };

  // Check if ANY permission exists
  const requireAnyPermission = (actions: string[]): boolean => {
    return actions.some((action) => allowedActions.includes(action));
  };

  return (
    <RoleContext.Provider
      value={{
        role,
        activeRole,

        isAdmin: activeRole === "super_admin",
        isHR: activeRole === "super_admin" || activeRole === "hr_admin",
        isEmployee: activeRole === "employee",

        requireAllPermission,
        requireAnyPermission,

        previewRole,
        setPreviewRole,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);

  if (!context) {
    throw new Error("useRole must be used within RoleProvider");
  }

  return context;
}