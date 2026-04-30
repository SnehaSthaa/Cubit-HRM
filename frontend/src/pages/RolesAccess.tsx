import { useState } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Users,
  Edit2,
  Check,
  X,
  Crown,
  UserCog,
  User,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRole } from "@/contexts/RoleContext";
import { useToast } from "@/hooks/use-toast";

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
  maxUsers: number | null; // null = unlimited
  permissions: RolePermissions;
  locked: boolean; // super_admin is locked
}

interface UserAssignment {
  id: string;
  name: string;
  email: string;
  role: string;
}

const defaultRoles: RoleDef[] = [
  {
    id: "super_admin",
    name: "Super Admin",
    description: "Full system access. Only one Super Admin allowed.",
    icon: Crown,
    maxUsers: 1,
    locked: true,
    permissions: Object.fromEntries(
      ALL_MODULES.map((m) => [m, [...ALL_PERMISSIONS]]),
    ),
  },
  {
    id: "hr_admin",
    name: "HR / Admin",
    description:
      "Can manage employees, leaves, payroll, documents, and assets.",
    icon: UserCog,
    maxUsers: null,
    locked: false,
    permissions: {
      Dashboard: ["view"],
      Employees: ["view", "create", "edit", "delete"],
      Attendance: ["view", "create", "edit"],
      "Leave Management": ["view", "create", "edit", "delete"],
      Payroll: ["view", "create", "edit"],
      Assets: ["view", "create", "edit", "delete"],
      Offboarding: ["view", "create", "edit"],
      Reports: ["view"],
      "Roles & Access": ["view"],
      "Employee Self-Service": ["view", "edit"],
    },
  },
  {
    id: "employee",
    name: "Employee",
    description:
      "Self-service access. Can view own profile, apply leave, and view attendance.",
    icon: User,
    maxUsers: null,
    locked: false,
    permissions: {
      Dashboard: ["view"],
      Employees: [],
      Attendance: ["view"],
      "Leave Management": ["view", "create"],
      Payroll: ["view"],
      Assets: ["view", "create"],
      Offboarding: [],
      Reports: [],
      "Roles & Access": [],
      "Employee Self-Service": ["view", "edit"],
    },
  },
];

const mockUsers: UserAssignment[] = [
  {
    id: "1",
    name: "Rajesh Sharma",
    email: "rajesh@cubit.io",
    role: "super_admin",
  },
  { id: "2", name: "Sita Thapa", email: "sita@cubit.io", role: "hr_admin" },
  { id: "3", name: "Binod KC", email: "binod@cubit.io", role: "hr_admin" },
  { id: "4", name: "Priya Gurung", email: "priya@cubit.io", role: "hr_admin" },
  {
    id: "5",
    name: "Aarav Bhandari",
    email: "aarav@cubit.io",
    role: "employee",
  },
  { id: "6", name: "Deepa Rai", email: "deepa@cubit.io", role: "employee" },
  { id: "7", name: "Sunil Tamang", email: "sunil@cubit.io", role: "employee" },
  {
    id: "8",
    name: "Anita Shrestha",
    email: "anita@cubit.io",
    role: "employee",
  },
  {
    id: "9",
    name: "Ramesh Adhikari",
    email: "ramesh@cubit.io",
    role: "employee",
  },
];

export default function RolesAccess() {
  const { isAdmin } = useRole();
  const { toast } = useToast();
  const [roles, setRoles] = useState<RoleDef[]>(defaultRoles);
  const [users, setUsers] = useState<UserAssignment[]>(mockUsers);
  const [editingRole, setEditingRole] = useState<RoleDef | null>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [assignDialog, setAssignDialog] = useState(false);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignRoleId, setAssignRoleId] = useState("");

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
        // If removing "view", remove all permissions for that module
        if (perm === "view" && has) {
          return { ...r, permissions: { ...r.permissions, [module]: [] } };
        }
        // If adding create/edit/delete, ensure "view" is also added
        const updated = has
          ? current.filter((p) => p !== perm)
          : [...current, perm];
        if (!has && perm !== "view" && !updated.includes("view")) {
          updated.push("view");
        }
        return { ...r, permissions: { ...r.permissions, [module]: updated } };
      }),
    );
  };

  const getUserCount = (roleId: string) =>
    users.filter((u) => u.role === roleId).length;

  const handleAssignRole = () => {
    if (!assignUserId || !assignRoleId) return;
    const targetRole = roles.find((r) => r.id === assignRoleId);
    if (
      targetRole?.maxUsers &&
      getUserCount(assignRoleId) >= targetRole.maxUsers
    ) {
      toast({
        title: "Cannot assign",
        description: `${targetRole.name} is limited to ${targetRole.maxUsers} user(s).`,
        variant: "destructive",
      });
      return;
    }
    setUsers((prev) =>
      prev.map((u) =>
        u.id === assignUserId ? { ...u, role: assignRoleId } : u,
      ),
    );
    toast({
      title: "Role updated",
      description: "User role has been reassigned.",
    });
    setAssignDialog(false);
    setAssignUserId("");
    setAssignRoleId("");
  };

  const savePermissions = (roleId: string) => {
    toast({
      title: "Permissions saved",
      description: `Permissions for role updated successfully.`,
    });
  };

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

      {/* Role Cards */}
      <motion.div variants={item} className="space-y-3">
        {roles.map((role) => {
          const isExpanded = expandedRole === role.id;
          const userCount = getUserCount(role.id);
          const roleUsers = users.filter((u) => u.role === role.id);
          const Icon = role.icon;

          return (
            <div
              key={role.id}
              className="bg-card border border-border rounded-lg overflow-hidden"
            >
              {/* Header */}
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
                    <Users className="w-3 h-3" /> {userCount}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Expanded Content */}
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
                          onClick={() => savePermissions(role.id)}
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
                      Assigned Users ({userCount})
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
                        {roles.find((r) => r.id === u.role)?.name}
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
                        r.maxUsers !== null && getUserCount(r.id) >= r.maxUsers
                      }
                    >
                      {r.name}{" "}
                      {r.maxUsers === 1 && getUserCount(r.id) >= 1
                        ? "(Full)"
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {assignRoleId === "super_admin" &&
              getUserCount("super_admin") >= 1 && (
                <p className="text-xs text-destructive">
                  Super Admin is limited to 1 user. The current Super Admin must
                  be reassigned first.
                </p>
              )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignRole}
              disabled={!assignUserId || !assignRoleId}
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
