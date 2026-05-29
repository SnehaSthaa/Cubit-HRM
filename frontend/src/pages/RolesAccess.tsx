import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Users,
  Check,
  Crown,
  UserCog,
  User,
  ChevronDown,
  ChevronUp,
  Delete,
  Trash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useRole } from "@/contexts/RoleContext";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/services/apiClient";
import Dashboard from "./Dashboard";
import { useNavigate } from "react-router-dom";

const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const ALL_MODULES = [
  "Dashboard",
  "Employees",
  "Attendance",
  "Leave Management",
  "Payroll",
  "Assets",
  "Offboarding",
  "Reports",
  "Roles & Access",
  "Employee Self-Service",
] as const;

type Module = (typeof ALL_MODULES)[number];
type Permission = "view" | "create" | "edit" | "delete";
const ALL_PERMISSIONS: Permission[] = ["view", "create", "edit", "delete"];

interface RolePermissions {
  [module: string]: Permission[];
}
interface RoleDef {
  id: string;
  name: string;
  description: string;
  icon: typeof Shield;
  maxUsers: number | null;
  permissions: RolePermissions;
  locked: boolean;
}
interface UserAssignment {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

const ROLE_META: Record<string, Omit<RoleDef, "permissions">> = {
  super_admin: {
    id: "super_admin",
    name: "Super Admin",
    description: "Full system access. Only one Super Admin allowed.",
    icon: Crown,
    maxUsers: 1,
    locked: true,
  },
  hr_admin: {
    id: "hr_admin",
    name: "HR / Admin",
    description:
      "Can manage employees, leaves, payroll, documents, and assets.",
    icon: UserCog,
    maxUsers: null,
    locked: false,
  },
  employee: {
    id: "employee",
    name: "Employee",
    description:
      "Self-service access. Can view own profile, apply leave, and view attendance.",
    icon: User,
    maxUsers: null,
    locked: false,
  },
};

export default function RolesAccess() {
  const { isAdmin } = useRole();
  const { toast } = useToast();

  const [roles, setRoles] = useState<RoleDef[]>([]);
  const [users, setUsers] = useState<UserAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [assignDialog, setAssignDialog] = useState(false);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignRoleId, setAssignRoleId] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingRole, setRemovingRole] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.getEmployees();
      const employees = Array.isArray(res.data) ? res.data : [];

      const mapped: UserAssignment[] = employees.map((e) => ({
        id: e.user?.id,
        name: `${e.personal_details?.first_name ?? ""} ${e.personal_details?.last_name ?? ""}`.trim(),
        email: e.personal_details?.email ?? e.user?.email ?? "",
        roles: Array.isArray(e.user?.role)
          ? e.user.role
          : [e.user?.role ?? "employee"],
      }));
      setUsers(mapped);
      const roleIds = Object.keys(ROLE_META);

      const permResults = await Promise.all(
        roleIds.map((roleId) =>
          apiClient.getPermissionByRole(roleId).then((r) => ({
            roleId,
            permissions: r.data as Record<string, Record<string, boolean>>,
          })),
        ),
      );

      const moduleKeyMap: Record<string, [Module, string]> = {
        dashboard: ["Dashboard", "dashboard"],
        employee: ["Employees", "employee"],
        attendance: ["Attendance", "attendance"],
        leave_management: ["Leave Management", "leavemanagement"],
        payroll: ["Payroll", "payroll"],
        assets: ["Assets", "assets"],
        offboarding: ["Offboarding", "offboarding"],
        reports: ["Reports", "reports"],
        roles_and_access: ["Roles & Access", "rolesandaccess"],
        Employee_self_service: ["Employee Self-Service", "employeeselfservice"],
      };

      const roleDefs: RoleDef[] = permResults.map(({ roleId, permissions }) => {
        const rolePermissions: RolePermissions = {};
        for (const [moduleKey, [label, prefix]] of Object.entries(
          moduleKeyMap,
        )) {
          const modulePerms = permissions[moduleKey] ?? {};
          rolePermissions[label] = ALL_PERMISSIONS.filter(
            (p) => modulePerms[`${prefix}.${p}`] === true,
          );
        }
        return { ...ROLE_META[roleId], permissions: rolePermissions };
      });
      setRoles(roleDefs);
    } catch (err) {
      console.error("Failed to fetch roles data", err);
      toast({ title: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSavePermission = async (role: RoleDef) => {
    try {
      const moduleKeyMap: Record<string, [string, string]> = {
        Dashboard: ["dashboard", "dashboard"],
        Employees: ["employee", "employee"],
        Attendance: ["attendance", "attendance"],
        "Leave Management": ["leave_management", "leavemanagement"],
        Payroll: ["payroll", "payroll"],
        Assets: ["assets", "assets"],
        Offboarding: ["offboarding", "offboarding"],
        Reports: ["reports", "reports"],
        "Roles & Access": ["roles_and_access", "rolesandaccess"],
        "Employee Self-Service": [
          "Employee_self_service",
          "employeeselfservice",
        ],
      };
      const permissions: Record<string, Record<string, boolean>> = {};
      for (const [label, [moduleKey, prefix]] of Object.entries(moduleKeyMap)) {
        const granted = role.permissions[label] ?? [];
        permissions[moduleKey] = Object.fromEntries(
          ALL_PERMISSIONS.map((p) => [`${prefix}.${p}`, granted.includes(p)]),
        );
      }
      await apiClient.updatePermissionByRole(role.id, permissions);
      toast({ title: "Permission Saved" });
      setExpandedRole(null);
    } catch (err) {
      toast({
        title: "Failed to save permissions",
        variant: "destructive",
      });
    }
  };
  const togglePermission = (
    roleId: string,
    module: string,
    perm: Permission,
  ) => {
    setRoles((prev) =>
      prev.map((r) => {
        if (r.id !== roleId || r.locked) return r;
        const current = r.permissions[module] || [];
        const has = current.includes(perm);
        if (perm === "view" && has) {
          return { ...r, permissions: { ...r.permissions, [module]: [] } };
        }
        const updated = has
          ? current.filter((p) => p !== perm)
          : [...current, perm];
        if (!has && perm !== "view" && !updated.includes("view"))
          updated.push("view");
        return { ...r, permissions: { ...r.permissions, [module]: updated } };
      }),
    );
  };

  const getUsersForRole = (roleId: string) =>
    users.filter((u) => u.roles.includes(roleId));

  const handleAssignRole = async () => {
    if (!assignUserId || !assignRoleId) return;
    try {
      setSaving(true);
      await apiClient.assignRole(assignUserId, assignRoleId);
      await fetchData();
      toast({
        title: "Role assigned",
        description: "User role has been updated",
      });
      setAssignDialog(false);
      setAssignUserId("");
      setAssignRoleId("");
    } catch (err) {
      toast({
        title: "Failed to assign role",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRole = async (userId: string, roleId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    if (user.roles.length <= 1) {
      toast({
        title: "Cannot remove",
        description: "User must have at least one role.",
        variant: "destructive",
      });
      return;
    }
    try {
      setRemovingRole(true);
      await apiClient.removeRole(user.id, roleId);
      await fetchData();
      toast({ title: "Role removed" });
    } catch (err) {
      toast({
        title: "Failed to remove role",
        variant: "destructive",
      });
    } finally {
      setRemovingRole(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Roles & Access</h1>
          <p className="text-sm text-muted-foreground">
            Manage system roles, permissions, and user assignments
          </p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setAssignDialog(true)}>
            <UserCog className="w-4 h-4 mr-1.5" /> Assign Role
          </Button>
        )}
      </motion.div>

      <motion.div variants={item} className="space-y-3">
        {roles.map((role) => {
          const isExpanded = expandedRole === role.id;
          const roleUsers = getUsersForRole(role.id);
          const Icon = role.icon;

          return (
            <div
              key={role.id}
              className="bg-card border border-border rounded-lg overflow-hidden"
            >
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedRole(isExpanded ? null : role.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{role.name}</h3>
                      {role.locked && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium">
                          LOCKED
                        </span>
                      )}
                      {role.maxUsers === 1 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground font-medium">
                          MAX 1
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {role.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="w-3 h-3" /> {roleUsers.length}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border">
                  {/* Permission Matrix */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Module Permissions
                      </h4>
                      {isAdmin && !role.locked && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleSavePermission(role)}
                        >
                          <Check className="w-3 h-3 mr-1" /> Save Changes
                        </Button>
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 pr-4 font-medium text-muted-foreground w-48">
                              Module
                            </th>
                            {ALL_PERMISSIONS.map((p) => (
                              <th
                                key={p}
                                className="text-center py-2 px-3 font-medium text-muted-foreground capitalize w-20"
                              >
                                {p}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ALL_MODULES.map((module) => {
                            const perms = role.permissions[module] || [];
                            return (
                              <tr
                                key={module}
                                className="border-b border-border/50 last:border-0"
                              >
                                <td className="py-2.5 pr-4 font-medium">
                                  {module}
                                </td>
                                {ALL_PERMISSIONS.map((p) => (
                                  <td
                                    key={p}
                                    className="text-center py-2.5 px-3"
                                  >
                                    <Checkbox
                                      checked={perms.includes(p)}
                                      disabled={!isAdmin || role.locked}
                                      onCheckedChange={() =>
                                        togglePermission(role.id, module, p)
                                      }
                                      className="mx-auto"
                                    />
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Assigned Users */}
                  <div className="border-t border-border p-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Assigned Users ({roleUsers.length})
                    </h4>
                    {roleUsers.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">
                        No users assigned to this role.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {roleUsers.map((u) => (
                          <div
                            key={u.id}
                            className="flex items-center gap-2 bg-muted rounded-md px-2.5 py-1.5 text-xs"
                          >
                            <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary">
                              {u.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </div>
                            <span className="font-medium">{u.name}</span>
                            <span className="text-muted-foreground">
                              {u.email}
                            </span>
                            {isAdmin && !role.locked && u.roles.length > 1 && (
                              <button
                                className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                                onClick={() => handleRemoveRole(u.id, role.id)}
                              >
                                <Trash className="h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </motion.div>

      {/* Assign Role Dialog */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Role to User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs">Select Employee</Label>
              <Select value={assignUserId} onValueChange={setAssignUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose employee..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} —{" "}
                      <span className="text-muted-foreground">
                        {u.roles.join(", ")}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Assign Role</Label>
              <Select value={assignRoleId} onValueChange={setAssignRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose role..." />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem
                      key={r.id}
                      value={r.id}
                      disabled={
                        r.maxUsers !== null &&
                        getUsersForRole(r.id).length >= r.maxUsers
                      }
                    >
                      {r.name}{" "}
                      {r.maxUsers === 1 && getUsersForRole(r.id).length >= 1
                        ? "(Full)"
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignRole}
              disabled={!assignUserId || !assignRoleId || saving}
            >
              {saving ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
