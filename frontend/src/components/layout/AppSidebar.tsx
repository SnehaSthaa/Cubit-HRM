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
  Sun,
  Moon,
  ChevronDown,
  DollarSign,
  Eye,
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo.png";
import {
  DashboardAction,
  EmployeesAction,
  AttendanceAction,
  LeaveManagementAction,
  PayrollAction,
  AssetsAction,
  OffboardingAction,
  ReportsAction,
  RolesandAccessAction,
  EmployeeSelfServiceAction,
} from "@/permissions/permission"; // ← frontend copy, not backend path

const ALL_NAV = [
  {
    group: "Overview",
    items: [
      {
        to: "/",
        icon: LayoutDashboard,
        label: "Dashboard",
        action: DashboardAction.View,
      },
    ],
  },
  {
    group: "Operations",
    items: [
      {
        to: "/employees",
        icon: Users,
        label: "Employees",
        action: EmployeesAction.View,
      },
      {
        to: "/attendance",
        icon: Clock,
        label: "Attendance",
        action: AttendanceAction.View,
      },
      {
        to: "/leave",
        icon: CalendarDays,
        label: "Leave",
        action: LeaveManagementAction.View,
      },
      {
        to: "/payroll",
        icon: DollarSign,
        label: "Payroll",
        action: PayrollAction.View,
      },
    ],
  },
  {
    group: "Self-Service",
    items: [
      {
        to: "/ess",
        icon: FileText,
        label: "My Profile",
        action: EmployeeSelfServiceAction.View,
      },
    ],
  },
  {
    group: "Administration",
    items: [
      {
        to: "/assets",
        icon: Package,
        label: "Assets",
        action: AssetsAction.View,
      },
      {
        to: "/offboarding",
        icon: LogOut,
        label: "Offboarding",
        action: OffboardingAction.View,
      },
      {
        to: "/reports",
        icon: BarChart3,
        label: "Reports",
        action: ReportsAction.View,
      },
      {
        to: "/roles",
        icon: Shield,
        label: "Roles & Access",
        action: RolesandAccessAction.View,
      },
    ],
  },
];

const roleLabels: Record<UserRole, string> = {
  super_admin: "Super Admin",
  hr_admin: "HR / Admin",
  employee: "Employee",
};

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const {
    role,
    activeRole,
    requireAllPermission,
    previewRole,
    setPreviewRole,
  } = useRole();
  const { user, logout } = useAuth();

  const navGroups = ALL_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => requireAllPermission([item.action])),
  })).filter((group) => group.items.length > 0);

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
          <div key={group.group}>
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 font-semibold px-3 mb-2">
              {group.group}
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
        {/* View As — only real super_admin sees this */}
        {role === "super_admin" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[12px] transition-colors border border-dashed",
                  previewRole
                    ? "border-primary/50 text-primary bg-primary/5"
                    : "border-border text-muted-foreground hover:bg-sidebar-accent/70",
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Eye className="w-3 h-3" />
                  <span>
                    View as:{" "}
                    <span className="font-medium text-foreground">
                      {roleLabels[activeRole]}
                    </span>
                  </span>
                </div>
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem
                onClick={() => setPreviewRole(null)}
                className={cn(!previewRole && "font-semibold text-primary")}
              >
                Super Admin
                {!previewRole && (
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    actual
                  </span>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {(["hr_admin", "employee"] as UserRole[]).map((r) => (
                <DropdownMenuItem
                  key={r}
                  onClick={() => setPreviewRole(r)}
                  className={cn(
                    previewRole === r && "font-semibold text-primary",
                  )}
                >
                  {roleLabels[r]}
                  {previewRole === r && (
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      preview
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Preview banner */}
        {previewRole && (
          <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <span className="text-[11px] text-primary font-medium">
              Previewing: {roleLabels[previewRole]}
            </span>
            <button
              onClick={() => setPreviewRole(null)}
              className="text-[10px] text-primary underline underline-offset-2"
            >
              Exit
            </button>
          </div>
        )}

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
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary overflow-hidden shrink-0">
            {user?.profile_image ? (
              <img
                src={`${user.profile_image}?t=${Date.now()}`}
                alt={user?.name}
                className="w-full h-full object-cover"
              />
            ) : (
              (user?.name?.charAt(0)?.toUpperCase() ?? "U")
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-foreground truncate">
              {user?.name}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {roleLabels[role]}
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
