import { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "super_admin" | "hr_admin" | "employee";

interface RoleContextValue {
  role: UserRole;
  setRole: (role: UserRole) => void;
  isAdmin: boolean;
  isHR: boolean;
  isEmployee: boolean;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>(
    () => (localStorage.getItem("cubit-role") as UserRole) || "super_admin"
  );

  const handleSetRole = (newRole: UserRole) => {
    setRole(newRole);
    localStorage.setItem("cubit-role", newRole);
  };

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole: handleSetRole,
        isAdmin: role === "super_admin",
        isHR: role === "super_admin" || role === "hr_admin",
        isEmployee: role === "employee",
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) throw new Error("useRole must be used within RoleProvider");
  return context;
}
