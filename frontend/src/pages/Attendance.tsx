import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  Wifi,
  WifiOff,
  RefreshCw,
  Settings2,
  AlertCircle,
  CheckCircle2,
  Plus,
  Save,
  Trash2,
  Calendar as CalendarIcon,
  LogIn,
  LogOut,
  Timer,
  TrendingUp,
  Pencil,
  Send,
  FileSpreadsheet,
  History,
  Fingerprint,
  Link2,
  Link2Off,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRole } from "@/contexts/RoleContext";
import { useToast } from "@/hooks/use-toast";

const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

// ───── Types ─────
interface DailyRow {
  id: string;
  name: string;
  department: string;
  checkIn: string;
  checkOut: string;
  hours: string;
  status: "Present" | "Late" | "Absent" | "Complete" | "On Leave";
  source: string;
  edited?: boolean;
  editNote?: string;
}
interface MonthlyRow {
  id: string;
  name: string;
  department: string;
  workingDays: number;
  present: number;
  late: number;
  absent: number;
  leave: number;
  totalHours: string;
  avgHours: string;
  overtime: string;
}
interface Device {
  id: string;
  name: string;
  ip: string;
  model: string;
  status: "online" | "offline";
  lastSync: string;
  port: string;
  protocol: string;
}
interface AuditEntry {
  id: string;
  empId: string;
  date: string;
  field: string;
  oldValue: string;
  newValue: string;
  editor: string;
  reason: string;
  at: string;
}

interface UserMapping {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  deviceId: string;
  deviceName: string;
  biometricId: string;
  enrolledAt: string;
  status: "mapped" | "unmapped" | "pending";
}

// ───── Mock Data ─────
const initialDaily: DailyRow[] = [
  { id: "EMP-1001", name: "Aarav Bhandari", department: "Engineering", checkIn: "08:02", checkOut: "17:10", hours: "9h 08m", status: "Present", source: "ZKTeco K40" },
  { id: "EMP-1002", name: "Priya Sharma", department: "Engineering", checkIn: "08:15", checkOut: "17:25", hours: "9h 10m", status: "Present", source: "ZKTeco K40" },
  { id: "EMP-1004", name: "Sita Magar", department: "HR", checkIn: "08:45", checkOut: "17:00", hours: "8h 15m", status: "Late", source: "ZKTeco K40" },
  { id: "EMP-1007", name: "Dipesh Karki", department: "Engineering", checkIn: "07:58", checkOut: "16:35", hours: "8h 37m", status: "Present", source: "ZKTeco K40" },
  { id: "EMP-1008", name: "Manisha Rai", department: "Design", checkIn: "08:10", checkOut: "—", hours: "Active", status: "Present", source: "ZKTeco K40" },
  { id: "EMP-1009", name: "Suresh Tamang", department: "Engineering", checkIn: "—", checkOut: "—", hours: "—", status: "Absent", source: "—" },
  { id: "EMP-1010", name: "Kavita Shrestha", department: "Support", checkIn: "08:00", checkOut: "16:05", hours: "8h 05m", status: "Complete", source: "ZKTeco K40" },
  { id: "EMP-1003", name: "Raj Thapa", department: "Marketing", checkIn: "—", checkOut: "—", hours: "—", status: "On Leave", source: "—" },
];

const initialMonthly: MonthlyRow[] = [
  { id: "EMP-1001", name: "Aarav Bhandari", department: "Engineering", workingDays: 22, present: 20, late: 1, absent: 0, leave: 1, totalHours: "178h 30m", avgHours: "8h 55m", overtime: "6h 30m" },
  { id: "EMP-1002", name: "Priya Sharma", department: "Engineering", workingDays: 22, present: 21, late: 0, absent: 0, leave: 1, totalHours: "184h 15m", avgHours: "8h 46m", overtime: "8h 15m" },
  { id: "EMP-1003", name: "Raj Thapa", department: "Marketing", workingDays: 22, present: 17, late: 2, absent: 0, leave: 5, totalHours: "146h 00m", avgHours: "8h 35m", overtime: "0h" },
  { id: "EMP-1004", name: "Sita Magar", department: "HR", workingDays: 22, present: 19, late: 3, absent: 0, leave: 0, totalHours: "165h 45m", avgHours: "8h 43m", overtime: "1h 45m" },
  { id: "EMP-1006", name: "Anita KC", department: "Finance", workingDays: 22, present: 22, late: 0, absent: 0, leave: 0, totalHours: "184h 00m", avgHours: "8h 21m", overtime: "0h" },
  { id: "EMP-1007", name: "Dipesh Karki", department: "Engineering", workingDays: 22, present: 18, late: 1, absent: 1, leave: 2, totalHours: "152h 20m", avgHours: "8h 28m", overtime: "0h" },
  { id: "EMP-1008", name: "Manisha Rai", department: "Design", workingDays: 22, present: 20, late: 2, absent: 0, leave: 0, totalHours: "170h 00m", avgHours: "8h 30m", overtime: "2h 00m" },
  { id: "EMP-1009", name: "Suresh Tamang", department: "Engineering", workingDays: 22, present: 15, late: 4, absent: 3, leave: 0, totalHours: "128h 10m", avgHours: "8h 32m", overtime: "0h" },
  { id: "EMP-1010", name: "Kavita Shrestha", department: "Support", workingDays: 22, present: 22, late: 0, absent: 0, leave: 0, totalHours: "176h 30m", avgHours: "8h 01m", overtime: "0h 30m" },
];

const initialMappings: UserMapping[] = [
  { id: "M-001", employeeId: "EMP-1001", employeeName: "Aarav Bhandari", department: "Engineering", deviceId: "1", deviceName: "Main Entrance", biometricId: "1001", enrolledAt: "2024-01-10", status: "mapped" },
  { id: "M-002", employeeId: "EMP-1002", employeeName: "Priya Sharma", department: "Engineering", deviceId: "1", deviceName: "Main Entrance", biometricId: "1002", enrolledAt: "2024-01-10", status: "mapped" },
  { id: "M-003", employeeId: "EMP-1003", employeeName: "Raj Thapa", department: "Marketing", deviceId: "2", deviceName: "Back Gate", biometricId: "2001", enrolledAt: "2024-01-11", status: "mapped" },
  { id: "M-004", employeeId: "EMP-1004", employeeName: "Sita Magar", department: "HR", deviceId: "1", deviceName: "Main Entrance", biometricId: "1004", enrolledAt: "2024-01-10", status: "mapped" },
  { id: "M-005", employeeId: "EMP-1006", employeeName: "Anita KC", department: "Finance", deviceId: "2", deviceName: "Back Gate", biometricId: "2002", enrolledAt: "2024-01-12", status: "mapped" },
  { id: "M-006", employeeId: "EMP-1007", employeeName: "Dipesh Karki", department: "Engineering", deviceId: "1", deviceName: "Main Entrance", biometricId: "1007", enrolledAt: "2024-01-10", status: "mapped" },
  { id: "M-007", employeeId: "EMP-1008", employeeName: "Manisha Rai", department: "Design", deviceId: "2", deviceName: "Back Gate", biometricId: "2003", enrolledAt: "2024-01-15", status: "pending" },
  { id: "M-008", employeeId: "EMP-1009", employeeName: "Suresh Tamang", department: "Engineering", deviceId: "", deviceName: "", biometricId: "", enrolledAt: "", status: "unmapped" },
  { id: "M-009", employeeId: "EMP-1010", employeeName: "Kavita Shrestha", department: "Support", deviceId: "1", deviceName: "Main Entrance", biometricId: "1010", enrolledAt: "2024-01-10", status: "mapped" },
];

const statusColors: Record<string, string> = {
  Present: "status-active",
  Late: "status-pending",
  Absent: "status-resigned",
  Complete: "status-active",
  "On Leave": "status-onleave",
};

const deviceModels = [
  'ZKTeco K40 (4.3" TFT)',
  "ZKTeco K40 Pro",
  "ZKTeco SpeedFace-V5L",
  "ZKTeco ProFace X",
  "ZKTeco MultiBio 800",
  "ZKTeco uFace 800",
];

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// ───── Helpers ─────
const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
function diffHours(inT: string, outT: string): string {
  if (!HHMM_RE.test(inT) || !HHMM_RE.test(outT)) return "—";
  const [ih, im] = inT.split(":").map(Number);
  const [oh, om] = outT.split(":").map(Number);
  const mins = oh * 60 + om - (ih * 60 + im);
  if (mins <= 0) return "—";
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
}

export default function Attendance() {
  const { isHR } = useRole();
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [configDialog, setConfigDialog] = useState(false);
  const [addDeviceDialog, setAddDeviceDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("daily");
  const [selectedMonth, setSelectedMonth] = useState("0");
  const [selectedYear, setSelectedYear] = useState("2024");
  const [selectedEmployee, setSelectedEmployee] = useState("all");

  const [dailyLog, setDailyLog] = useState<DailyRow[]>(initialDaily);
  const [monthlyData] = useState<MonthlyRow[]>(initialMonthly);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [auditDialog, setAuditDialog] = useState(false);

  // User Mapping state
  const [mappings, setMappings] = useState<UserMapping[]>(initialMappings);
  const [mappingSearch, setMappingSearch] = useState("");

  // Add Mapping form state
  const [addForm, setAddForm] = useState({
    employeeId: "",
    biometricId: "",
    deviceId: "",
  });

  // Edit dialog state
  const [editRow, setEditRow] = useState<DailyRow | null>(null);
  const [editDraft, setEditDraft] = useState<{
    checkIn: string;
    checkOut: string;
    status: DailyRow["status"];
    reason: string;
  }>({ checkIn: "", checkOut: "", status: "Present", reason: "" });

  const [devices, setDevices] = useState<Device[]>([
    { id: "1", name: "Main Entrance", ip: "192.168.1.201", model: 'ZKTeco K40 (4.3" TFT)', status: "online", lastSync: "2 min ago", port: "4370", protocol: "TCP" },
    { id: "2", name: "Back Gate", ip: "192.168.1.202", model: "ZKTeco K40 Pro", status: "online", lastSync: "5 min ago", port: "4370", protocol: "TCP" },
    { id: "3", name: "Parking", ip: "192.168.1.203", model: "ZKTeco MultiBio 800", status: "offline", lastSync: "3h ago", port: "4370", protocol: "TCP" },
  ]);
  const [newDevice, setNewDevice] = useState({ name: "", ip: "", port: "4370", model: 'ZKTeco K40 (4.3" TFT)', protocol: "TCP" });

  useEffect(() => {
    const stored = localStorage.getItem("attendance_audit_log");
    if (stored) setAuditLog(JSON.parse(stored));
  }, []);
  useEffect(() => {
    localStorage.setItem("attendance_audit_log", JSON.stringify(auditLog));
  }, [auditLog]);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      toast({ title: "Sync complete", description: "Pulled latest punches from ZKTeco K40 devices via ZKBioAccess." });
    }, 1500);
  };

  const handleAddDevice = () => {
    if (!newDevice.name || !newDevice.ip) {
      toast({ title: "Missing fields", description: "Device name and IP are required.", variant: "destructive" });
      return;
    }
    setDevices((prev) => [...prev, { ...newDevice, id: String(Date.now()), status: "online", lastSync: "Just now" }]);
    setNewDevice({ name: "", ip: "", port: "4370", model: 'ZKTeco K40 (4.3" TFT)', protocol: "TCP" });
    setAddDeviceDialog(false);
    toast({ title: "Device added" });
  };

  const handleDeleteDevice = (id: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
    toast({ title: "Device removed" });
  };

  const openEdit = (row: DailyRow) => {
    setEditRow(row);
    setEditDraft({ checkIn: HHMM_RE.test(row.checkIn) ? row.checkIn : "", checkOut: HHMM_RE.test(row.checkOut) ? row.checkOut : "", status: row.status, reason: "" });
  };

  const saveEdit = () => {
    if (!editRow) return;
    if (!editDraft.reason.trim()) {
      toast({ title: "Reason required", description: "Please enter a reason for the manual edit.", variant: "destructive" });
      return;
    }
    const newHours = editDraft.checkIn && editDraft.checkOut
      ? diffHours(editDraft.checkIn, editDraft.checkOut)
      : editDraft.status === "Absent" || editDraft.status === "On Leave" ? "—" : editRow.hours;

    const entries: AuditEntry[] = [];
    const now = new Date().toISOString();
    const editor = "HR Admin";
    if (editDraft.checkIn !== editRow.checkIn) entries.push({ id: `${Date.now()}-in`, empId: editRow.id, date: "Today", field: "Check-in", oldValue: editRow.checkIn, newValue: editDraft.checkIn || "—", editor, reason: editDraft.reason, at: now });
    if (editDraft.checkOut !== editRow.checkOut) entries.push({ id: `${Date.now()}-out`, empId: editRow.id, date: "Today", field: "Check-out", oldValue: editRow.checkOut, newValue: editDraft.checkOut || "—", editor, reason: editDraft.reason, at: now });
    if (editDraft.status !== editRow.status) entries.push({ id: `${Date.now()}-st`, empId: editRow.id, date: "Today", field: "Status", oldValue: editRow.status, newValue: editDraft.status, editor, reason: editDraft.reason, at: now });
    if (entries.length) setAuditLog((prev) => [...entries, ...prev].slice(0, 200));

    setDailyLog((prev) => prev.map((r) => r.id === editRow.id ? { ...r, checkIn: editDraft.checkIn || "—", checkOut: editDraft.checkOut || "—", hours: newHours, status: editDraft.status, source: "Manual Edit", edited: true, editNote: editDraft.reason } : r));
    toast({ title: "Attendance updated", description: `${editRow.name}'s record was edited successfully.` });
    setEditRow(null);
  };

  // Add Mapping handler
  const handleAddMapping = () => {
    if (!addForm.employeeId || !addForm.biometricId.trim() || !addForm.deviceId) {
      toast({ title: "Missing fields", description: "All fields are required.", variant: "destructive" });
      return;
    }
    // Check duplicate biometric ID on same device
    const duplicate = mappings.find(
      (m) => m.deviceId === addForm.deviceId && m.biometricId === addForm.biometricId && m.status === "mapped"
    );
    if (duplicate) {
      toast({ title: "Conflict", description: `Biometric ID ${addForm.biometricId} is already assigned to ${duplicate.employeeName} on this device.`, variant: "destructive" });
      return;
    }
    const device = devices.find((d) => d.id === addForm.deviceId);
    setMappings((prev) =>
      prev.map((m) =>
        m.id === addForm.employeeId
          ? { ...m, deviceId: addForm.deviceId, deviceName: device?.name ?? "", biometricId: addForm.biometricId, enrolledAt: new Date().toISOString().slice(0, 10), status: "mapped" }
          : m
      )
    );
    toast({ title: "Mapping added", description: `Employee mapped to ${device?.name} · ID ${addForm.biometricId}` });
    setAddForm({ employeeId: "", biometricId: "", deviceId: "" });
  };

  const removeMapping = (id: string) => {
    setMappings((prev) =>
      prev.map((m) => m.id === id ? { ...m, deviceId: "", deviceName: "", biometricId: "", enrolledAt: "", status: "unmapped" } : m)
    );
    toast({ title: "Mapping removed" });
  };

  const handleExport = () => {
    const rows = filteredMonthly;
    const csv = [
      ["Employee ID", "Name", "Department", "Working Days", "Present", "Late", "Absent", "Leave", "Total Hours", "Avg Hours", "Overtime"].join(","),
      ...rows.map((r) => [r.id, r.name, r.department, r.workingDays, r.present, r.late, r.absent, r.leave, `"${r.totalHours}"`, `"${r.avgHours}"`, `"${r.overtime}"`].join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${months[Number(selectedMonth)]}-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Report exported", description: `Downloaded CSV for ${months[Number(selectedMonth)]} ${selectedYear}.` });
  };

  const handlePushToPayroll = () => {
    const payload = { month: months[Number(selectedMonth)], year: selectedYear, generatedAt: new Date().toISOString(), employees: filteredMonthly.map((r) => ({ id: r.id, name: r.name, department: r.department, workingDays: r.workingDays, presentDays: r.present + r.late, absentDays: r.absent, leaveDays: r.leave, totalHours: r.totalHours, overtime: r.overtime })) };
    localStorage.setItem("payroll_attendance_input", JSON.stringify(payload));
    toast({ title: "Pushed to Payroll", description: `${payload.employees.length} employees · ${payload.month} ${payload.year}. Open Payroll to compute salary.` });
  };

  const dailySummary = useMemo(() => ({
    present: dailyLog.filter((r) => r.status === "Present").length,
    complete: dailyLog.filter((r) => r.status === "Complete").length,
    late: dailyLog.filter((r) => r.status === "Late").length,
    absent: dailyLog.filter((r) => r.status === "Absent").length,
    leave: dailyLog.filter((r) => r.status === "On Leave").length,
  }), [dailyLog]);

  const filteredMonthly = useMemo(() => selectedEmployee === "all" ? monthlyData : monthlyData.filter((r) => r.id === selectedEmployee), [selectedEmployee, monthlyData]);

  const monthlyTotals = useMemo(() => ({
    totalPresent: filteredMonthly.reduce((s, r) => s + r.present, 0),
    totalLate: filteredMonthly.reduce((s, r) => s + r.late, 0),
    totalAbsent: filteredMonthly.reduce((s, r) => s + r.absent, 0),
    totalLeave: filteredMonthly.reduce((s, r) => s + r.leave, 0),
  }), [filteredMonthly]);

  const mappingSummary = useMemo(() => ({
    mapped: mappings.filter((m) => m.status === "mapped").length,
    unmapped: mappings.filter((m) => m.status === "unmapped").length,
    pending: mappings.filter((m) => m.status === "pending").length,
  }), [mappings]);

  // Employees available to map (unmapped or pending)
  const unmappedEmployees = useMemo(
    () => mappings.filter((m) => m.status === "unmapped" || m.status === "pending"),
    [mappings]
  );

  // Filtered mapped rows for the table
  const filteredMappedRows = useMemo(() => {
    return mappings
      .filter((m) => m.status === "mapped")
      .filter((m) => {
        if (!mappingSearch) return true;
        const q = mappingSearch.toLowerCase();
        return (
          m.employeeName.toLowerCase().includes(q) ||
          m.employeeId.toLowerCase().includes(q) ||
          m.biometricId.toLowerCase().includes(q) ||
          m.deviceName.toLowerCase().includes(q)
        );
      });
  }, [mappings, mappingSearch]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Attendance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Daily logs · monthly reports · ZKTeco K40 biometric integration via ZKBioAccess
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 press-effect" onClick={() => setAuditDialog(true)}>
            <History className="w-3.5 h-3.5" /> Audit Log
            {auditLog.length > 0 && (
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono-data">{auditLog.length}</span>
            )}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 press-effect" onClick={handleSync}>
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Now"}
          </Button>
          {isHR && (
            <Dialog open={configDialog} onOpenChange={setConfigDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 press-effect">
                  <Settings2 className="w-3.5 h-3.5" /> Device Config
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>ZKTeco Device Configuration</DialogTitle>
                  <DialogDescription>Connect ZKTeco K40 biometric devices via ZKBioAccess Web API.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="bg-muted/30 border border-border rounded-lg p-4">
                    <h4 className="text-sm font-semibold mb-3">ZKBioAccess API Connection</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">API Base URL</label>
                        <Input defaultValue="https://zkbio.company.com/api" className="h-8 text-xs font-mono-data" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">API Key</label>
                        <Input defaultValue="••••••••••••" type="password" className="h-8 text-xs font-mono-data" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Sync Interval</label>
                        <Select defaultValue="5">
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Every 1 minute</SelectItem>
                            <SelectItem value="5">Every 5 minutes</SelectItem>
                            <SelectItem value="15">Every 15 minutes</SelectItem>
                            <SelectItem value="30">Every 30 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Connection Status</label>
                        <div className="flex items-center gap-2 h-8">
                          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                          <span className="text-xs text-success font-medium">Connected</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold">Registered Devices</h4>
                      <Dialog open={addDeviceDialog} onOpenChange={setAddDeviceDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1 h-7 text-xs"><Plus className="w-3 h-3" /> Add Device</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader><DialogTitle>Add ZKTeco Device</DialogTitle></DialogHeader>
                          <div className="space-y-3 pt-2">
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Device Name</label>
                              <Input value={newDevice.name} onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })} placeholder="e.g., Floor 2 Entrance" className="h-8 text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">IP Address</label>
                                <Input value={newDevice.ip} onChange={(e) => setNewDevice({ ...newDevice, ip: e.target.value })} placeholder="192.168.1.xxx" className="h-8 text-xs font-mono-data" />
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Port</label>
                                <Input value={newDevice.port} onChange={(e) => setNewDevice({ ...newDevice, port: e.target.value })} className="h-8 text-xs font-mono-data" />
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Model</label>
                              <Select value={newDevice.model} onValueChange={(v) => setNewDevice({ ...newDevice, model: v })}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {deviceModels.map((m) => (<SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                              <Button variant="outline" size="sm" onClick={() => setAddDeviceDialog(false)}>Cancel</Button>
                              <Button size="sm" onClick={handleAddDevice}>Add Device</Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="space-y-2">
                      {devices.map((device) => (
                        <div key={device.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                          <div className="flex items-center gap-3">
                            {device.status === "online" ? <Wifi className="w-4 h-4 text-success" /> : <WifiOff className="w-4 h-4 text-destructive" />}
                            <div>
                              <p className="text-sm font-medium">{device.name}</p>
                              <p className="text-[11px] text-muted-foreground font-mono-data">{device.ip}:{device.port} · {device.model}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`status-pill ${device.status === "online" ? "status-active" : "status-resigned"}`}>{device.status}</span>
                            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleDeleteDevice(device.id)}>
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setConfigDialog(false)}>Cancel</Button>
                    <Button size="sm" className="gap-1.5" onClick={() => { setConfigDialog(false); toast({ title: "Configuration saved" }); }}>
                      <Save className="w-3.5 h-3.5" /> Save Configuration
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={item}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
          <TabsList>
            <TabsTrigger value="daily" className="gap-1.5"><CalendarIcon className="w-3.5 h-3.5" /> Daily Log</TabsTrigger>
            <TabsTrigger value="monthly" className="gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Monthly Report</TabsTrigger>
            <TabsTrigger value="devices" className="gap-1.5"><Wifi className="w-3.5 h-3.5" /> Devices</TabsTrigger>
            <TabsTrigger value="mapping" className="gap-1.5">
              <Fingerprint className="w-3.5 h-3.5" /> User Mapping
              {mappingSummary.unmapped > 0 && (
                <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-mono-data">{mappingSummary.unmapped}</span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── DAILY TAB ── */}
          <TabsContent value="daily" className="space-y-5">
            <div className="grid grid-cols-5 gap-4">
              {[
                { label: "Present", value: dailySummary.present, icon: CheckCircle2, color: "text-success" },
                { label: "Completed", value: dailySummary.complete, icon: LogOut, color: "text-primary" },
                { label: "Late", value: dailySummary.late, icon: AlertCircle, color: "text-warning" },
                { label: "Absent", value: dailySummary.absent, icon: AlertCircle, color: "text-destructive" },
                { label: "On Leave", value: dailySummary.leave, icon: Clock, color: "text-muted-foreground" },
              ].map((s) => (
                <div key={s.label} className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                  </div>
                  <p className={`text-2xl font-bold font-mono-data ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
            <div className="glass-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Today's Log · <span className="font-mono-data text-muted-foreground">Jan 15, 2024</span></h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Check-in / Check-out & total time present in office. Click <Pencil className="w-3 h-3 inline -mt-0.5" /> to edit.</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="font-mono-data">Shift: 09:00 — 17:00</span>
                </div>
              </div>
              <table className="nexus-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Employee</th>
                    <th>Department</th>
                    <th><div className="flex items-center gap-1"><LogIn className="w-3 h-3" /> Check-in</div></th>
                    <th><div className="flex items-center gap-1"><LogOut className="w-3 h-3" /> Check-out</div></th>
                    <th><div className="flex items-center gap-1"><Timer className="w-3 h-3" /> Total Time</div></th>
                    <th>Source</th>
                    <th>Status</th>
                    {isHR && <th className="text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {dailyLog.map((row) => (
                    <tr key={row.id}>
                      <td className="font-mono-data text-xs text-muted-foreground">{row.id}</td>
                      <td className="text-sm font-medium">
                        {row.name}
                        {row.edited && <span title={row.editNote} className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning font-medium">edited</span>}
                      </td>
                      <td className="text-xs text-muted-foreground">{row.department}</td>
                      <td className="font-mono-data text-xs">{row.checkIn}</td>
                      <td className="font-mono-data text-xs">{row.checkOut}</td>
                      <td className="font-mono-data text-xs font-semibold">{row.hours}</td>
                      <td className="text-xs text-muted-foreground">{row.source}</td>
                      <td><span className={`status-pill ${statusColors[row.status] ?? ""}`}>{row.status}</span></td>
                      {isHR && (
                        <td className="text-right">
                          <Button variant="ghost" size="sm" className="h-7 px-2 gap-1" onClick={() => openEdit(row)}>
                            <Pencil className="w-3 h-3" /> <span className="text-xs">Edit</span>
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ── MONTHLY TAB ── */}
          <TabsContent value="monthly" className="space-y-5">
            <div className="glass-card p-4 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Period</span>
              </div>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {months.map((m, i) => (<SelectItem key={m} value={String(i)} className="text-xs">{m}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["2023", "2024", "2025"].map((y) => (<SelectItem key={y} value={y} className="text-xs">{y}</SelectItem>))}
                </SelectContent>
              </Select>
              <div className="h-6 w-px bg-border" />
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="h-8 w-48 text-xs"><SelectValue placeholder="All employees" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Employees</SelectItem>
                  {monthlyData.map((e) => (<SelectItem key={e.id} value={e.id} className="text-xs">{e.name}</SelectItem>))}
                </SelectContent>
              </Select>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 press-effect" onClick={handleExport}>
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
                </Button>
                {isHR && (
                  <Button size="sm" className="gap-1.5 press-effect" onClick={handlePushToPayroll}>
                    <Send className="w-3.5 h-3.5" /> Push to Payroll
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "Total Present Days", value: monthlyTotals.totalPresent, icon: CheckCircle2, color: "text-success" },
                { label: "Late Arrivals", value: monthlyTotals.totalLate, icon: AlertCircle, color: "text-warning" },
                { label: "Absent Days", value: monthlyTotals.totalAbsent, icon: AlertCircle, color: "text-destructive" },
                { label: "Leave Days", value: monthlyTotals.totalLeave, icon: Clock, color: "text-primary" },
              ].map((s) => (
                <div key={s.label} className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                  </div>
                  <p className={`text-2xl font-bold font-mono-data ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
            <div className="glass-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold">Monthly Attendance Report · <span className="font-mono-data text-muted-foreground">{months[Number(selectedMonth)]} {selectedYear}</span></h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Total time present, leaves, late arrivals, and absences per employee. Push to Payroll to feed salary calculation.</p>
              </div>
              <table className="nexus-table">
                <thead>
                  <tr>
                    <th>ID</th><th>Employee</th><th>Department</th>
                    <th className="text-center">Working Days</th>
                    <th className="text-center text-success">Present</th>
                    <th className="text-center text-warning">Late</th>
                    <th className="text-center text-destructive">Absent</th>
                    <th className="text-center text-primary">Leave</th>
                    <th>Total Hours</th><th>Avg/Day</th><th>Overtime</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMonthly.map((row) => {
                    const attendanceRate = ((row.present / row.workingDays) * 100).toFixed(0);
                    return (
                      <tr key={row.id}>
                        <td className="font-mono-data text-xs text-muted-foreground">{row.id}</td>
                        <td>
                          <div className="text-sm font-medium">{row.name}</div>
                          <div className="text-[11px] text-muted-foreground">{attendanceRate}% attendance</div>
                        </td>
                        <td className="text-xs text-muted-foreground">{row.department}</td>
                        <td className="text-center font-mono-data text-xs">{row.workingDays}</td>
                        <td className="text-center font-mono-data text-xs font-semibold text-success">{row.present}</td>
                        <td className="text-center font-mono-data text-xs font-semibold text-warning">{row.late}</td>
                        <td className="text-center font-mono-data text-xs font-semibold text-destructive">{row.absent}</td>
                        <td className="text-center font-mono-data text-xs font-semibold text-primary">{row.leave}</td>
                        <td className="font-mono-data text-xs font-semibold">{row.totalHours}</td>
                        <td className="font-mono-data text-xs">{row.avgHours}</td>
                        <td className="font-mono-data text-xs text-accent">{row.overtime}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ── DEVICES TAB ── */}
          <TabsContent value="devices" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Biometric Devices</h2>
              {isHR && (
                <Button variant="outline" size="sm" className="gap-1 h-7 text-xs press-effect" onClick={() => setConfigDialog(true)}>
                  <Settings2 className="w-3 h-3" /> Manage Devices
                </Button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              {devices.map((device) => (
                <div key={device.id} className="glass-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {device.status === "online" ? <Wifi className="w-4 h-4 text-success" /> : <WifiOff className="w-4 h-4 text-destructive" />}
                      <span className="text-sm font-medium">{device.name}</span>
                    </div>
                    <span className={`status-pill ${device.status === "online" ? "status-active" : "status-resigned"}`}>{device.status}</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Model</span>
                      <span className="font-mono-data text-[11px]">{device.model}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">IP Address</span>
                      <span className="font-mono-data text-[11px]">{device.ip}:{device.port}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Last Sync</span>
                      <span className="font-mono-data text-[11px]">{device.lastSync}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Mapped Users</span>
                      <span className="font-mono-data text-[11px] text-primary font-semibold">
                        {mappings.filter((m) => m.deviceId === device.id && m.status === "mapped").length}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── USER MAPPING TAB ── */}
          <TabsContent value="mapping">
            <div className="flex gap-5 items-start">
              {/* LEFT COLUMN */}
              <div className="w-80 shrink-0 space-y-4">
                {/* Add Mapping Card */}
                <div className="glass-card p-5">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Fingerprint className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">Add Mapping</h3>
                      <p className="text-[11px] text-muted-foreground">Bind employee → device user</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">Employee</label>
                      <Select
                        value={addForm.employeeId}
                        onValueChange={(v) => setAddForm((f) => ({ ...f, employeeId: v }))}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Select employee..." />
                        </SelectTrigger>
                        <SelectContent>
                          {unmappedEmployees.length === 0 ? (
                            <SelectItem value="__none__" disabled className="text-sm text-muted-foreground">
                              All employees mapped
                            </SelectItem>
                          ) : (
                            unmappedEmployees.map((m) => (
                              <SelectItem key={m.id} value={m.id} className="text-sm">
                                {m.employeeName}
                                {m.status === "pending" && (
                                  <span className="ml-2 text-[10px] text-warning">(pending)</span>
                                )}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs text-muted-foreground">Biometric ID</label>
                        <span className="text-[10px] text-muted-foreground">As enrolled on the device (e.g. 1042)</span>
                      </div>
                      <Input
                        value={addForm.biometricId}
                        onChange={(e) => setAddForm((f) => ({ ...f, biometricId: e.target.value }))}
                        placeholder="BIO-1042"
                        className="h-9 font-mono-data text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">Biometric Device</label>
                      <Select
                        value={addForm.deviceId}
                        onValueChange={(v) => setAddForm((f) => ({ ...f, deviceId: v }))}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Select device..." />
                        </SelectTrigger>
                        <SelectContent>
                          {devices.map((dev) => (
                            <SelectItem key={dev.id} value={dev.id} className="text-sm">
                              <div className="flex items-center gap-2">
                                {dev.status === "online" ? (
                                  <Wifi className="w-3.5 h-3.5 text-success" />
                                ) : (
                                  <WifiOff className="w-3.5 h-3.5 text-destructive" />
                                )}
                                {dev.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button className="w-full gap-2 mt-1" onClick={handleAddMapping}>
                      <Plus className="w-4 h-4" /> Add Mapping
                    </Button>
                  </div>
                </div>

                {/* Connected Devices Card */}
                <div className="glass-card p-4">
                  <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-3">
                    Connected Devices
                  </p>
                  <div className="space-y-2.5">
                    {devices.map((dev, i) => (
                      <div key={dev.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wifi
                            className={`w-3.5 h-3.5 ${
                              dev.status === "online" ? "text-success" : "text-destructive"
                            }`}
                          />
                          <span className="text-sm">{dev.name}</span>
                        </div>
                        <span className="text-[11px] font-mono-data text-muted-foreground">
                          DEV-0{i + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN — Mappings Table */}
              <div className="flex-1 glass-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold">Mappings</h2>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {mappingSummary.mapped} active mappings across {devices.length} devices
                    </p>
                  </div>
                  <div className="relative w-60 shrink-0">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      value={mappingSearch}
                      onChange={(e) => setMappingSearch(e.target.value)}
                      placeholder="Search employee, biometric ID..."
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                </div>

                <table className="nexus-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Employee ID</th>
                      <th>Biometric ID</th>
                      <th>Device</th>
                      <th>Device ID</th>
                      {isHR && <th className="text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMappedRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={isHR ? 6 : 5}
                          className="text-center text-sm text-muted-foreground py-10"
                        >
                          No active mappings found.
                        </td>
                      </tr>
                    ) : (
                      filteredMappedRows.map((m) => {
                        const devIndex = devices.findIndex((d) => d.id === m.deviceId);
                        return (
                          <tr key={m.id}>
                            <td className="text-sm font-medium">{m.employeeName}</td>
                            <td className="font-mono-data text-xs text-muted-foreground">{m.employeeId}</td>
                            <td>
                              <span className="font-mono-data text-xs font-semibold text-primary">
                                BIO-{m.biometricId}
                              </span>
                            </td>
                            <td className="text-sm">{m.deviceName}</td>
                            <td className="font-mono-data text-xs text-muted-foreground">
                              DEV-0{devIndex >= 0 ? devIndex + 1 : "?"}
                            </td>
                            {isHR && (
                              <td className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => removeMapping(m.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span className="text-xs">Remove</span>
                                </Button>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ── Edit Attendance Dialog ── */}
      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Attendance Record</DialogTitle>
            <DialogDescription>
              {editRow && (<span>{editRow.name} · <span className="font-mono-data">{editRow.id}</span></span>)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Check-in</label>
                <Input type="time" value={editDraft.checkIn} onChange={(e) => setEditDraft((d) => ({ ...d, checkIn: e.target.value }))} className="h-9 font-mono-data" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Check-out</label>
                <Input type="time" value={editDraft.checkOut} onChange={(e) => setEditDraft((d) => ({ ...d, checkOut: e.target.value }))} className="h-9 font-mono-data" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <Select value={editDraft.status} onValueChange={(v: DailyRow["status"]) => setEditDraft((d) => ({ ...d, status: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Present">Present</SelectItem>
                  <SelectItem value="Late">Late</SelectItem>
                  <SelectItem value="Complete">Complete</SelectItem>
                  <SelectItem value="Absent">Absent</SelectItem>
                  <SelectItem value="On Leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Reason for edit <span className="text-destructive">*</span></label>
              <Input value={editDraft.reason} onChange={(e) => setEditDraft((d) => ({ ...d, reason: e.target.value }))} placeholder="e.g., Forgot to punch out, Device malfunction" className="h-9 text-sm" />
            </div>
            {editDraft.checkIn && editDraft.checkOut && (
              <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-2 font-mono-data">
                Computed total time: <span className="font-semibold text-foreground">{diffHours(editDraft.checkIn, editDraft.checkOut)}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditRow(null)}>Cancel</Button>
            <Button size="sm" className="gap-1.5" onClick={saveEdit}><Save className="w-3.5 h-3.5" /> Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Audit Log Dialog ── */}
      <Dialog open={auditDialog} onOpenChange={setAuditDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Manual Edit Audit Log</DialogTitle>
            <DialogDescription>All manual changes to attendance records are tracked here.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {auditLog.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-10">No manual edits yet.</div>
            ) : (
              <table className="nexus-table">
                <thead>
                  <tr><th>When</th><th>Employee</th><th>Field</th><th>Old</th><th>New</th><th>Reason</th><th>Editor</th></tr>
                </thead>
                <tbody>
                  {auditLog.map((a) => (
                    <tr key={a.id}>
                      <td className="text-[11px] text-muted-foreground font-mono-data">{new Date(a.at).toLocaleString()}</td>
                      <td className="text-xs font-mono-data">{a.empId}</td>
                      <td className="text-xs">{a.field}</td>
                      <td className="text-xs font-mono-data text-destructive">{a.oldValue}</td>
                      <td className="text-xs font-mono-data text-success">{a.newValue}</td>
                      <td className="text-xs text-muted-foreground">{a.reason}</td>
                      <td className="text-xs">{a.editor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAuditDialog(false)}>Close</Button>
            {auditLog.length > 0 && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setAuditLog([]); toast({ title: "Audit log cleared" }); }}>
                <Trash2 className="w-3.5 h-3.5" /> Clear Log
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}