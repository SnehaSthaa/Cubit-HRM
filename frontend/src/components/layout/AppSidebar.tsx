import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Users,
  Clock,
  CalendarDays,
  LayoutDashboard,
  FileText,
  LogOut,
  BarChart3,
  Shield,
  Package,
  Settings,
  Sun,
  Moon,
  ChevronDown,
  DollarSign,
  Image,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "./ThemeProvider";
import { useRole, UserRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo.png";

const adminNav = [
  {
    label: "Overview",
    items: [{ to: "/", icon: LayoutDashboard, label: "Dashboard" }],
  },
  {
    label: "Operations",
    items: [
      { to: "/employees", icon: Users, label: "Employees" },
      { to: "/attendance", icon: Clock, label: "Attendance" },
      { to: "/leave", icon: CalendarDays, label: "Leave" },
      { to: "/payroll", icon: DollarSign, label: "Payroll" },
    ],
  },
  {
    label: "Self-Service",
    items: [{ to: "/ess", icon: FileText, label: "My Profile" }],
  },
  {
    label: "Administration",
    items: [
      { to: "/assets", icon: Package, label: "Assets" },
      { to: "/offboarding", icon: LogOut, label: "Offboarding" },
      { to: "/reports", icon: BarChart3, label: "Reports" },
      { to: "/roles", icon: Shield, label: "Roles & Access" },
    ],
  },
];

const hrNav = [
  {
    label: "Overview",
    items: [{ to: "/", icon: LayoutDashboard, label: "Dashboard" }],
  },
  {
    label: "Operations",
    items: [
      { to: "/employees", icon: Users, label: "Employees" },
      { to: "/attendance", icon: Clock, label: "Attendance" },
      { to: "/leave", icon: CalendarDays, label: "Leave" },
      { to: "/payroll", icon: DollarSign, label: "Payroll" },
    ],
  },
  {
    label: "Self-Service",
    items: [{ to: "/ess", icon: FileText, label: "My Profile" }],
  },
  {
    label: "Management",
    items: [
      { to: "/assets", icon: Package, label: "Assets" },
      { to: "/offboarding", icon: LogOut, label: "Offboarding" },
      { to: "/reports", icon: BarChart3, label: "Reports" },
    ],
  },
];

const employeeNav = [
  {
    label: "Overview",
    items: [{ to: "/", icon: LayoutDashboard, label: "Dashboard" }],
  },
  {
    label: "Self-Service",
    items: [
      { to: "/ess", icon: FileText, label: "My Profile" },
      { to: "/attendance", icon: Clock, label: "My Attendance" },
      { to: "/leave", icon: CalendarDays, label: "Leave" },
      { to: "/payroll", icon: DollarSign, label: "My Payslips" },
      { to: "/assets", icon: Package, label: "My Assets" },
    ],
  },
];

const roleLabels: Record<UserRole, string> = {
  super_admin: "Super Admin",
  hr_admin: "HR / Admin",
  employee: "Employee",
};

const roleInitials: Record<UserRole, string> = {
  super_admin: "SA",
  hr_admin: "HR",
  employee: "AB",
};

const roleEmails: Record<UserRole, string> = {
  super_admin: "admin@cubit.io",
  hr_admin: "hr@cubit.io",
  employee: "aarav@cubit.io",
};

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { role, setRole } = useRole();
  const { user, logout } = useAuth();

  const navGroups =
    role === "super_admin"
      ? adminNav
      : role === "hr_admin"
        ? hrNav
        : employeeNav;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[240px] bg-sidebar border-r border-sidebar-border flex flex-col z-30">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="Cubit HRM" className="w-8 h-8 rounded-lg" />
          <span className="font-semibold text-foreground text-[15px]">
            Cubit HRM
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 font-semibold px-3 mb-2">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((navItem) => {
                const isActive = location.pathname === navItem.to;
                return (
                  <NavLink
                    key={navItem.to}
                    to={navItem.to}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
                      isActive
                        ? "bg-primary/10 text-primary shadow-sm"
                        : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent/70",
                    )}
                  >
                    <navItem.icon
                      className={cn(
                        "w-4 h-4 shrink-0",
                        isActive && "text-primary",
                      )}
                    />
                    <span>{navItem.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        {/* Role Switcher (demo) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[12px] text-muted-foreground hover:bg-sidebar-accent/70 transition-colors border border-dashed border-border">
              <span>
                Role:{" "}
                <span className="font-medium text-foreground">
                  {roleLabels[role]}
                </span>
              </span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => setRole("super_admin")}>
              <span
                className={
                  role === "super_admin" ? "font-semibold text-primary" : ""
                }
              >
                Super Admin
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRole("hr_admin")}>
              <span
                className={
                  role === "hr_admin" ? "font-semibold text-primary" : ""
                }
              >
                HR / Admin
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRole("employee")}>
              <span
                className={
                  role === "employee" ? "font-semibold text-primary" : ""
                }
              >
                Employee
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent/70 transition-colors"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
          <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
        </button>

        {/* User + Logout */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-sidebar-accent/70 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
            {user?.name?.charAt(0)?.toUpperCase() || roleInitials[role]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-foreground truncate">
              {user?.name || roleLabels[role]}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {user?.email || roleEmails[role]}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
