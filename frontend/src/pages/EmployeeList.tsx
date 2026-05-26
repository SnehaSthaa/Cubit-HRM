import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search, Plus, Filter, MoreHorizontal, X, AlertTriangle, AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRole } from "@/contexts/RoleContext";
import { useToast } from "@/hooks/use-toast";
import { apiClient, ApiError } from "@/services/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import {
  Employee, EmployeeAPI, CreateEmployeePayload,
  getLatestDepartment, normalizeEmployee, EmployeeStatus,
} from "@/types/index";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
};
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.2, 0, 0, 1] } },
};

const DEPARTMENTS = [
  "Engineering", "Marketing", "HR", "Operations", "Finance", "Design", "Support",
];
const TYPES = ["Full-time", "Contract", "Part-time"];
const STATUSES: EmployeeStatus[] = [
  "Active", "Inactive", "On Leave", "Resigned", "Notice Period", "Onboarding",
];

function deriveStatus(
  emp: Employee,
  activeMap: Record<string, boolean>,
): EmployeeStatus {
  const latestDept = getLatestDepartment(emp.department);
  const raw = latestDept?.employment_status?.trim().toLowerCase();

  if (raw === "on_leave"      || raw === "on leave")      return "On Leave";
  if (raw === "resigned")                                  return "Resigned";
  if (raw === "notice_period" || raw === "notice period") return "Notice Period";
  if (raw === "onboarding")                               return "Onboarding";
  if (raw === "inactive")                                 return "Inactive";
  if (raw === "active")                                   return "Active";

  return (activeMap[emp.id] ?? true) ? "Active" : "Inactive";
}

function getStatusStyle(status: EmployeeStatus | string): string {
  switch (status) {
    case "Active":        return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20";
    case "Inactive":      return "bg-zinc-500/15 text-zinc-400 border border-zinc-500/20";
    case "On Leave":      return "bg-amber-500/15 text-amber-400 border border-amber-500/20";
    case "Resigned":      return "bg-red-500/15 text-red-400 border border-red-500/20";
    case "Notice Period": return "bg-orange-500/15 text-orange-400 border border-orange-500/20";
    case "Onboarding":    return "bg-blue-500/15 text-blue-400 border border-blue-500/20";
    default:              return "bg-zinc-500/15 text-zinc-400 border border-zinc-500/20";
  }
}

function getInitials(name: string): string {
  return (name || "E").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = [
  "bg-violet-500/20 text-violet-400",
  "bg-blue-500/20 text-blue-400",
  "bg-emerald-500/20 text-emerald-400",
  "bg-rose-500/20 text-rose-400",
  "bg-amber-500/20 text-amber-400",
  "bg-cyan-500/20 text-cyan-400",
  "bg-fuchsia-500/20 text-fuchsia-400",
  "bg-indigo-500/20 text-indigo-400",
];

function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── Field label map for human-readable error list ─────────────────────────────
const FIELD_LABELS: Record<string, string> = {
  email:          "Email",
  date_of_birth:  "Date of Birth",
  first_name:     "Full Name",
  last_name:      "Full Name",
  employee_id:    "Employee ID",
  phone:          "Phone",
  designation:    "Position",
  department_name:"Department",
  joining_date:   "Date of Joining",
};

// ── Component ────────────────────────────────────────────────────────────────
export default function EmployeeList() {
  const navigate = useNavigate();
  const { isHR } = useRole();
  const { user } = useAuth();
  const { toast } = useToast();

  const [search, setSearch]             = useState("");
  const [filterDept, setFilterDept]     = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType]     = useState("all");
  const [showFilters, setShowFilters]   = useState(false);
  const [addDialog, setAddDialog]       = useState(false);

  const [employees, setEmployees]       = useState<Employee[]>([]);
  const [loading, setLoading]           = useState(true);
  const [activeMap, setActiveMap]       = useState<Record<string, boolean>>({});

  const [deleteTarget, setDeleteTarget]           = useState<Employee | null>(null);
  const [deleteLoading, setDeleteLoading]         = useState(false);
  const [deactivateTarget, setDeactivateTarget]   = useState<Employee | null>(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [activateTarget, setActivateTarget]       = useState<Employee | null>(null);
  const [activateLoading, setActivateLoading]     = useState(false);

  const [newEmp, setNewEmp] = useState({
    employeeid: "", name: "", email: "", phone: "",
    dob: "", department: "", position: "", type: "Full-time", joinDate: "",
  });

  // Maps API field names → error messages
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearFieldError = (field: string) =>
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));

  // ── Data fetching ────────────────────────────────────────────────────────
  const fetchEmployees = async () => {
    try {
      const response = await apiClient.getEmployees();
      const data = (response.data ?? []) as EmployeeAPI[];
      setEmployees(data.map(normalizeEmployee));
      const map: Record<string, boolean> = {};
      data.forEach((raw) => { map[raw.id] = raw.user?.is_active ?? true; });
      setActiveMap(map);
    } catch (error) {
      console.error("Error fetching employees:", error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);

  // ── Filtering ────────────────────────────────────────────────────────────
  const filtered = employees.filter((e) => {
    const q        = search.toLowerCase();
    const dept     = getLatestDepartment(e.department);
    const deptName = dept?.department_name ?? "";
    const empType  = dept?.employment_type ?? "Full-time";
    const status   = deriveStatus(e, activeMap);

    const matchSearch =
      e.name?.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q) ||
      deptName.toLowerCase().includes(q);

    return (
      matchSearch &&
      (filterDept   === "all" || deptName === filterDept) &&
      (filterStatus === "all" || status   === filterStatus) &&
      (filterType   === "all" || empType  === filterType)
    );
  });

  const hasFilters = filterDept !== "all" || filterStatus !== "all" || filterType !== "all";

  // ── Add Employee ─────────────────────────────────────────────────────────
  const handleAddEmployee = async () => {
    setFieldErrors({});

    if (!newEmp.name || !newEmp.email || !newEmp.department) {
      toast({ title: "Error", description: "Please fill in required fields" });
      return;
    }

    try {
      const [first_name, ...rest] = newEmp.name.trim().split(" ");
      const payload: CreateEmployeePayload = {
        first_name,
        last_name: rest.join(" ") || "",
        email: newEmp.email,
        department_name: newEmp.department,
        joining_date: newEmp.joinDate || new Date().toISOString().split("T")[0],
        ...(newEmp.employeeid && { employee_id: newEmp.employeeid }),
        ...(newEmp.phone      && { phone: newEmp.phone }),
        ...(newEmp.dob        && { date_of_birth: newEmp.dob }),
        ...(newEmp.position   && { designation: newEmp.position }),
        ...(newEmp.type       && { employment_type: newEmp.type }),
      };
      await apiClient.createEmployee(payload);
      await fetchEmployees();
      setNewEmp({
        employeeid: "", name: "", email: "", phone: "",
        dob: "", department: "", position: "", type: "Full-time", joinDate: "",
      });
      setFieldErrors({});
      setAddDialog(false);
      toast({ title: "Success", description: `${newEmp.name} has been added.` });
    } catch (error: unknown) {
      // ✅ FIX: apiClient interceptor strips `response` and re-throws a plain
      // Error with validation messages attached as `.fields` (ApiError interface).
      // The old code checked `error.response?.data` which is always undefined
      // after the interceptor runs — so field errors were never shown.
      const apiErr = error as ApiError;

      if (apiErr.fields && typeof apiErr.fields === "object") {
        const flat: Record<string, string> = {};
        for (const [field, messages] of Object.entries(apiErr.fields)) {
          flat[field] = Array.isArray(messages) ? messages[0] : String(messages);
        }
        setFieldErrors(flat);
        // No toast — errors are shown in the banner inside the dialog
      } else {
        toast({
          title: "Error",
          description: apiErr.message ?? "Failed to add employee",
        });
      }
    }
  };

  // ── Deactivate / Activate / Delete ───────────────────────────────────────
  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivateLoading(true);
    try {
      await apiClient.updateEmployee(deactivateTarget.id, { is_active: false });
      setActiveMap((prev) => ({ ...prev, [deactivateTarget.id]: false }));
      toast({ title: "Employee deactivated", description: `${deactivateTarget.name} has been deactivated.` });
      setDeactivateTarget(null);
    } catch (error: unknown) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to deactivate" });
    } finally {
      setDeactivateLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!activateTarget) return;
    setActivateLoading(true);
    try {
      await apiClient.updateEmployee(activateTarget.id, { is_active: true });
      setActiveMap((prev) => ({ ...prev, [activateTarget.id]: true }));
      toast({ title: "Employee activated", description: `${activateTarget.name} is now active.` });
      setActivateTarget(null);
    } catch (error: unknown) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to activate" });
    } finally {
      setActivateLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await apiClient.deleteEmployee(deleteTarget.id);
      setEmployees((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      setActiveMap((prev) => {
        const next = { ...prev };
        delete next[deleteTarget.id];
        return next;
      });
      toast({ title: "Employee deleted", description: `${deleteTarget.name} has been removed.` });
      setDeleteTarget(null);
    } catch (error: unknown) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to delete" });
    } finally {
      setDeleteLoading(false);
    }
  };

  const errorEntries = Object.entries(fieldErrors).filter(([, msg]) => !!msg);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">

      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Employees</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono-data">{employees.length}</span> total employees
          </p>
        </div>
        {isHR && (
          <Dialog open={addDialog} onOpenChange={(open) => { setAddDialog(open); if (!open) setFieldErrors({}); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 press-effect">
                <Plus className="w-3.5 h-3.5" /> Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add New Employee</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">

                {/* ── Error banner — shown only when there are API validation errors ── */}
                {errorEntries.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 px-4 py-3 rounded-xl border border-destructive/30 bg-destructive/5"
                  >
                    <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-destructive">
                        {errorEntries.length} field{errorEntries.length > 1 ? "s" : ""} need{errorEntries.length === 1 ? "s" : ""} attention
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {errorEntries.map(([field, message]) => (
                          <li key={field} className="text-xs text-destructive/80 flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-destructive/60 shrink-0" />
                            <span className="font-medium">{FIELD_LABELS[field] ?? field}:</span> {message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}

                <div className="grid grid-cols-2 gap-3">

                  {/* Employee ID */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Employee ID</label>
                    <Input
                      value={newEmp.employeeid}
                      onChange={(e) => { setNewEmp({ ...newEmp, employeeid: e.target.value }); clearFieldError("employee_id"); }}
                      placeholder="EMP001"
                      className={`h-9 text-sm transition-colors ${fieldErrors.employee_id ? "border-destructive focus-visible:ring-destructive/30 bg-destructive/5" : ""}`}
                    />
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Full Name *</label>
                    <Input
                      value={newEmp.name}
                      onChange={(e) => { setNewEmp({ ...newEmp, name: e.target.value }); clearFieldError("first_name"); clearFieldError("last_name"); }}
                      placeholder="Enter full name"
                      className={`h-9 text-sm transition-colors ${fieldErrors.first_name || fieldErrors.last_name ? "border-destructive focus-visible:ring-destructive/30 bg-destructive/5" : ""}`}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Email *</label>
                    <Input
                      type="email"
                      value={newEmp.email}
                      onChange={(e) => { setNewEmp({ ...newEmp, email: e.target.value }); clearFieldError("email"); }}
                      placeholder="email@company.com"
                      className={`h-9 text-sm transition-colors ${fieldErrors.email ? "border-destructive focus-visible:ring-destructive/30 bg-destructive/5" : ""}`}
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
                    <Input
                      value={newEmp.phone}
                      onChange={(e) => { setNewEmp({ ...newEmp, phone: e.target.value }); clearFieldError("phone"); }}
                      placeholder="+977-98XXXXXXXX"
                      className={`h-9 text-sm transition-colors ${fieldErrors.phone ? "border-destructive focus-visible:ring-destructive/30 bg-destructive/5" : ""}`}
                    />
                  </div>

                  {/* Position */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Position</label>
                    <Input
                      value={newEmp.position}
                      onChange={(e) => { setNewEmp({ ...newEmp, position: e.target.value }); clearFieldError("designation"); }}
                      placeholder="e.g., Sr. Developer"
                      className={`h-9 text-sm transition-colors ${fieldErrors.designation ? "border-destructive focus-visible:ring-destructive/30 bg-destructive/5" : ""}`}
                    />
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Date of Birth</label>
                    <Input
                      type="date"
                      value={newEmp.dob}
                      onChange={(e) => { setNewEmp({ ...newEmp, dob: e.target.value }); clearFieldError("date_of_birth"); }}
                      className={`h-9 text-sm transition-colors ${fieldErrors.date_of_birth ? "border-destructive focus-visible:ring-destructive/30 bg-destructive/5" : ""}`}
                      max={(() => {
                        const d = new Date();
                        d.setFullYear(d.getFullYear() - 18);
                        return d.toISOString().split("T")[0];
                      })()}
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Department *</label>
                    <Select value={newEmp.department} onValueChange={(v) => { setNewEmp({ ...newEmp, department: v }); clearFieldError("department_name"); }}>
                      <SelectTrigger className={`h-9 text-sm transition-colors ${fieldErrors.department_name ? "border-destructive focus-visible:ring-destructive/30 bg-destructive/5" : ""}`}>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Employment Type */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Employment Type</label>
                    <Select value={newEmp.type} onValueChange={(v) => setNewEmp({ ...newEmp, type: v })}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date of Joining */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Date of Joining</label>
                    <Input
                      type="date"
                      value={newEmp.joinDate}
                      onChange={(e) => { setNewEmp({ ...newEmp, joinDate: e.target.value }); clearFieldError("joining_date"); }}
                      className={`h-9 text-sm transition-colors ${fieldErrors.joining_date ? "border-destructive focus-visible:ring-destructive/30 bg-destructive/5" : ""}`}
                    />
                  </div>

                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => { setAddDialog(false); setFieldErrors({}); }}>Cancel</Button>
                  <Button size="sm" onClick={handleAddEmployee}>Add Employee</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </motion.div>

      {/* Deactivate Confirmation */}
      <Dialog open={!!deactivateTarget} onOpenChange={(open) => { if (!open) setDeactivateTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Deactivate Employee
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Deactivate <span className="font-medium text-foreground">{deactivateTarget?.name}</span>?
            They will lose system access but all data will be retained.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeactivateTarget(null)} disabled={deactivateLoading}>Cancel</Button>
            <Button size="sm" className="border border-amber-500/50 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20" onClick={handleDeactivate} disabled={deactivateLoading}>
              {deactivateLoading ? "Deactivating…" : "Deactivate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Activate Confirmation */}
      <Dialog open={!!activateTarget} onOpenChange={(open) => { if (!open) setActivateTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-emerald-500" /> Activate Employee
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Re-activate <span className="font-medium text-foreground">{activateTarget?.name}</span>?
            They will regain full system access.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setActivateTarget(null)} disabled={activateLoading}>Cancel</Button>
            <Button size="sm" className="border border-emerald-500/50 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" onClick={handleActivate} disabled={activateLoading}>
              {activateLoading ? "Activating…" : "Activate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" /> Delete Employee
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Permanently delete <span className="font-medium text-foreground">{deleteTarget?.name}</span>?
            This action <span className="text-destructive font-medium">cannot be undone</span>.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search + Filters */}
      <motion.div variants={item} className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID, department…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-sm bg-card border-border"
            />
          </div>
          <Button
            variant={showFilters ? "secondary" : "outline"} size="sm"
            className="gap-1.5 h-8 text-muted-foreground press-effect"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-3.5 h-3.5" /> Filters
            {hasFilters && <span className="ml-1 w-2 h-2 rounded-full bg-primary" />}
          </Button>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground gap-1"
              onClick={() => { setFilterDept("all"); setFilterStatus("all"); setFilterType("all"); }}>
              <X className="w-3 h-3" /> Clear
            </Button>
          )}
        </div>

        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            className="flex flex-wrap items-center gap-4 pb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Department:</span>
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Type:</span>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Status:</span>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Table */}
      <motion.div variants={item} className="bg-card border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <p className="text-sm">Loading employees...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="nexus-table w-full">
              <thead>
                <tr>
                  {["ID", "EMPLOYEE", "DEPARTMENT", "DESIGNATION", "TYPE", "STATUS", "JOINED", ""].map((h) => (
                    <th key={h} className="text-xs font-medium text-muted-foreground tracking-wider px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((emp) => {
                  const latestDept = getLatestDepartment(emp.department);
                  const status     = deriveStatus(emp, activeMap);
                  const isInactive = status === "Inactive";
                  const empType    = latestDept?.employment_type ?? "Full-time";
                  const color      = avatarColor(emp.id);

                  return (
                    <tr
                      key={emp.id}
                      className="cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => navigate(`/employees/${emp.id}`)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {emp.employee_id}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-semibold shrink-0 ${color}`}>
                            {getInitials(emp.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-none truncate">{emp.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{emp.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-sm font-medium">{latestDept?.department_name ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{latestDept?.designation ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{empType}</td>

                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(status)}`}>
                          {status}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {latestDept?.joining_date?.split("T")[0] ?? "—"}
                      </td>

                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded hover:bg-muted transition-colors">
                              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => navigate(`/employees/${emp.id}`)}>
                              View Profile
                            </DropdownMenuItem>
                            {isHR && (
                              <DropdownMenuItem onClick={() => navigate(`/employees/${emp.id}?tab=personal-details`)}>
                                Edit Details
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => navigate(`/employees/${emp.id}?tab=documents`)}>
                              View Documents
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/employees/${emp.id}?tab=attendance`)}>
                              View Attendance
                            </DropdownMenuItem>
                            {isHR && (
                              <>
                                <DropdownMenuSeparator />
                                {isInactive ? (
                                  <DropdownMenuItem
                                    className="text-emerald-500 focus:text-emerald-500"
                                    onClick={() => setActivateTarget(emp)}
                                  >
                                    Activate
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    className="text-amber-500 focus:text-amber-500"
                                    onClick={() => setDeactivateTarget(emp)}
                                  >
                                    Deactivate
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteTarget(emp)}
                                >
                                  Delete Employee
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className="text-center text-sm text-muted-foreground py-12">
                      No employees found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}