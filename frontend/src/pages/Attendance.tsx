import { useState, useMemo, useEffect, useCallback } from "react";
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
  Inbox,
  FileSpreadsheet,
  History,
  Fingerprint,
  Search,
  XCircle,
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
type AttendanceStatus = "present" | "late" | "absent" | "half_day" | "on_leave";
type CorrectionRequestType = "check_in" | "check_out" | "both";
type CorrectionRequestStatus = "pending" | "approved" | "rejected";

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: AttendanceStatus;
  notes: string | null;
  biometric_id?: string | null;
  edited?: boolean;
  employee?: {
    id: string;
    personal_details?: {
      first_name: string;
      last_name: string;
      email: string;
    };
    department?:
      | Array<{ department_name: string } | { name: string }>
      | string
      | { department_name?: string; name?: string };
    departments?: Array<{ department_name: string } | { name: string }>;
  };
}

interface DailyRow {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  checkIn: string;
  checkOut: string;
  hours: string;
  status: string;
  source: string;
  edited?: boolean;
  editNote?: string;
}

interface MonthlySummary {
  employee: {
    id: string;
    personal_details?: { first_name: string; last_name: string };
    department?: Array<{ department_name: string }>;
  };
  present: number;
  absent: number;
  late: number;
  half_day: number;
  on_leave: number;
  total: number;
}

interface Device {
  id: string;
  serial_number: string;
  device_name: string;
  ip: string;
  device_model: string;
  status: "online" | "offline";
  updated_at: string;
  is_active: boolean;
  mappings?: Array<{ id: string }>;
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

interface ApiMapping {
  id: string;
  employee_id: string;
  device_id: string;
  biometric_id: string;
  created_at: string;
  employee?: {
    id: string;
    personal_details?: { first_name: string; last_name: string };
    department?: Array<{ department_name: string }>;
  };
  device?: { id: string; device_name: string };
}

interface MyAttendance {
  id: string | null;
  checkedIn: boolean;
  checkedOut: boolean;
  checkIn: string | null;
  checkOut: string | null;
  status: string | null;
}

interface UnmappedEmployee {
  id: string;
  name: string;
}

interface CorrectionRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  type: CorrectionRequestType;
  requestedCheckIn: string | null;
  requestedCheckOut: string | null;
  reason: string;
  status: CorrectionRequestStatus;
  submittedAt: string;
  actionBy: string | null;
}

// ───── Config ─────
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

const deviceModels = [
  'ZKTeco K40 (4.3" TFT)',
  "ZKTeco K40 Pro",
  "ZKTeco SpeedFace-V5L",
  "ZKTeco ProFace X",
  "ZKTeco MultiBio 800",
  "ZKTeco uFace 800",
];

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const statusColors: Record<string, string> = {
  present:  "status-active",
  late:     "status-pending",
  absent:   "status-resigned",
  half_day: "status-pending",
  on_leave: "status-onleave",
};

const statusLabel: Record<string, string> = {
  present:  "Present",
  late:     "Late",
  absent:   "Absent",
  half_day: "Half Day",
  on_leave: "On Leave",
};

const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

function utcToNepalDate(utcDate: Date): Date {
  return new Date(utcDate.getTime() + NEPAL_OFFSET_MS);
}

function formatTime(isoOrTime: string | null): string {
  if (!isoOrTime) return "—";
  const d = new Date(isoOrTime);
  if (!isNaN(d.getTime())) {
    const nepal = new Date(d.getTime() + NEPAL_OFFSET_MS);
    const h = nepal.getUTCHours().toString().padStart(2, "0");
    const m = nepal.getUTCMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  }
  return isoOrTime;
}

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function diffHours(inT: string, outT: string): string {
  if (!HHMM_RE.test(inT) || !HHMM_RE.test(outT)) return "—";
  const [ih, im] = inT.split(":").map(Number);
  const [oh, om] = outT.split(":").map(Number);
  const mins = oh * 60 + om - (ih * 60 + im);
  if (mins <= 0) return "—";
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
}

function nepalHHMMtoUTCIso(dateStr: string, hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const totalMinutesNPT = h * 60 + m;
  const totalMinutesUTC = totalMinutesNPT - (5 * 60 + 45);
  const date = new Date(dateStr + "T00:00:00Z");
  date.setUTCMinutes(date.getUTCMinutes() + totalMinutesUTC);
  return date.toISOString();
}

function formatLastSync(isoDate: string): string {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString();
}

function getEmployeeName(record: AttendanceRecord): string {
  const pd = record.employee?.personal_details;
  if (pd) return `${pd.first_name} ${pd.last_name}`;
  return record.employee_id;
}

function getDepartment(record: AttendanceRecord): string {
  const emp = record.employee;
  if (!emp) return "—";
  const dept = emp.department ?? emp.departments;
  if (!dept) return "—";
  if (typeof dept === "string") return dept || "—";
  if (Array.isArray(dept)) {
    const first = dept[0] as Record<string, string> | undefined;
    if (!first) return "—";
    return first.department_name ?? first.name ?? "—";
  }
  if (typeof dept === "object") {
    const d = dept as Record<string, string>;
    return d.department_name ?? d.name ?? "—";
  }
  return "—";
}

function getTodayStr(): string {
  const nepal = utcToNepalDate(new Date());
  const y = nepal.getUTCFullYear();
  const m = String(nepal.getUTCMonth() + 1).padStart(2, "0");
  const d = String(nepal.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shortId(id: string): string {
  if (/^EMP-/i.test(id)) return id.toUpperCase();
  return id.length > 12 ? id.slice(0, 8).toUpperCase() : id;
}

function mapRecordToRow(r: AttendanceRecord): DailyRow {
  const checkIn  = formatTime(r.check_in);
  const checkOut = formatTime(r.check_out);

  let hours = "—";
  if (checkIn !== "—" && checkOut !== "—") {
    hours = diffHours(checkIn, checkOut);
  } else if (checkIn !== "—" && r.check_in) {
    const diffMs   = Date.now() - new Date(r.check_in).getTime();
    const totalMin = Math.floor(diffMs / 60000);
    if (totalMin > 0) {
      hours = `${Math.floor(totalMin / 60)}h ${String(totalMin % 60).padStart(2, "0")}m`;
    }
  }

  return {
    id:         r.id,
    employeeId: r.employee_id,
    name:       getEmployeeName(r),
    department: getDepartment(r),
    checkIn,
    checkOut,
    hours,
    status: r.status,
    source: r.biometric_id ? "ZKTeco K40" : "Self Check-in",
    edited: r.edited,
  };
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
  };
}

function getCurrentUser(): { id: string; email: string; name: string; role: string } | null {
  try {
    const raw = localStorage.getItem("cubit-auth-user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function extractError(res: Response): Promise<string> {
  try {
    const json = await res.clone().json();
    if (typeof json.message === "string")                       return json.message;
    if (typeof json.error === "string")                         return json.error;
    if (typeof json.error?.message === "string")                return json.error.message;
    if (Array.isArray(json.errors) && json.errors[0]?.message) return json.errors[0].message;
    return `HTTP ${res.status} ${res.statusText}`;
  } catch {
    return `HTTP ${res.status} ${res.statusText}`;
  }
}

const CORRECTION_STORE_KEY = "cubit_correction_requests";

function loadCorrectionRequests(): CorrectionRequest[] {
  try {
    const raw = localStorage.getItem(CORRECTION_STORE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCorrectionRequests(list: CorrectionRequest[]) {
  localStorage.setItem(CORRECTION_STORE_KEY, JSON.stringify(list));
}

// ───── Component ─────
export default function Attendance() {
  const { isHR } = useRole();
  const { toast } = useToast();

  const [syncing,         setSyncing]         = useState(false);
  const [loading,         setLoading]         = useState(true);
  const [devicesLoading,  setDevicesLoading]  = useState(false);
  const [mappingsLoading, setMappingsLoading] = useState(false);
  const [configDialog,    setConfigDialog]    = useState(false);
  const [addDeviceDialog, setAddDeviceDialog] = useState(false);
  const [activeTab,       setActiveTab]       = useState("daily");
  const [selectedMonth,   setSelectedMonth]   = useState(String(new Date().getMonth()));
  const [selectedYear,    setSelectedYear]    = useState(String(new Date().getFullYear()));
  const [selectedEmployee,setSelectedEmployee]= useState("all");
  const [selectedDate,    setSelectedDate]    = useState(getTodayStr);

  const [dailyLog,       setDailyLog]       = useState<DailyRow[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary[]>([]);
  const [auditLog,       setAuditLog]       = useState<AuditEntry[]>([]);
  const [auditDialog,    setAuditDialog]    = useState(false);

  const [correctionRequests,   setCorrectionRequests]   = useState<CorrectionRequest[]>([]);
  const [correctionDialog,     setCorrectionDialog]     = useState(false);
  const [hrRequestsDialog,     setHrRequestsDialog]     = useState(false);
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false);
  const [approvingId,          setApprovingId]          = useState<string | null>(null);
  const [correctionForm,       setCorrectionForm]       = useState<{
    date: string;
    type: CorrectionRequestType;
    checkIn: string;
    checkOut: string;
    reason: string;
  }>({
    date: getTodayStr(), type: "check_in", checkIn: "", checkOut: "", reason: "",
  });

  const [myEmployeeId,   setMyEmployeeId]   = useState<string | null>(null);
  const [myAttendance,   setMyAttendance]   = useState<MyAttendance>({
    id: null, checkedIn: false, checkedOut: false,
    checkIn: null, checkOut: null, status: null,
  });
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [liveTime,       setLiveTime]       = useState(new Date());

  const [devices,   setDevices]   = useState<Device[]>([]);
  const [newDevice, setNewDevice] = useState({
    name: "", serial_number: "", ip: "", port: "4370",
    model: 'ZKTeco K40 (4.3" TFT)', location: "",
  });

  const [apiMappings,       setApiMappings]       = useState<ApiMapping[]>([]);
  const [mappingSearch,     setMappingSearch]     = useState("");
  const [addMappingLoading, setAddMappingLoading] = useState(false);
  const [addForm,           setAddForm]           = useState({
    employee_id: "", biometric_id: "", device_id: "",
  });

  const [unmappedEmployees, setUnmappedEmployees] = useState<UnmappedEmployee[]>([]);
  const [unmappedLoading,   setUnmappedLoading]   = useState(false);

  const [editRow,   setEditRow]   = useState<DailyRow | null>(null);
  const [editDraft, setEditDraft] = useState<{
    checkIn:  string;
    checkOut: string;
    status:   AttendanceStatus;
    reason:   string;
  }>({ checkIn: "", checkOut: "", status: "present", reason: "" });

  // ── Live clock ──
  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const nepalLiveTime = useMemo(() => utcToNepalDate(liveTime), [liveTime]);

  useEffect(() => {
    setCorrectionRequests(loadCorrectionRequests());
  }, []);

  // ── Resolve current user's employee ID ──
  useEffect(() => {
    const user = getCurrentUser();
    if (!user) return;
    fetch(`${API_BASE}/employees`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const match = d.data.find(
            (e: { user_id: string; id: string }) => e.user_id === user.id
          );
          if (match) setMyEmployeeId(match.id);
        }
      })
      .catch(() => {});
  }, []);

  const fetchDevices = useCallback(async () => {
    setDevicesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/devices`, { headers: authHeaders() });
      if (!res.ok) { const msg = await extractError(res); throw new Error(msg); }
      const json = await res.json();
      if (json.success) setDevices(json.data);
    } catch (err: unknown) {
      toast({ title: "Failed to fetch devices", description: (err as Error).message, variant: "destructive" });
    } finally {
      setDevicesLoading(false);
    }
  }, [toast]);

  const fetchMappings = useCallback(async () => {
    setMappingsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/devices/mappings/all`, { headers: authHeaders() });
      if (!res.ok) { const msg = await extractError(res); throw new Error(msg); }
      const json = await res.json();
      if (json.success) setApiMappings(json.data);
    } catch (err: unknown) {
      toast({ title: "Failed to fetch mappings", description: (err as Error).message, variant: "destructive" });
    } finally {
      setMappingsLoading(false);
    }
  }, [toast]);

  const fetchUnmappedEmployees = useCallback(async () => {
    setUnmappedLoading(true);
    try {
      const res = await fetch(`${API_BASE}/employees?device_mapping=null`, { headers: authHeaders() });
      if (!res.ok) { const msg = await extractError(res); throw new Error(msg); }
      const json = await res.json();
      if (json.success) {
        setUnmappedEmployees(
          json.data.map((e: { id: string; personal_details?: { first_name: string; last_name: string } }) => ({
            id: e.id,
            name: e.personal_details
              ? `${e.personal_details.first_name} ${e.personal_details.last_name}`
              : e.id,
          }))
        );
      }
    } catch (err: unknown) {
      toast({ title: "Failed to fetch unmapped employees", description: (err as Error).message, variant: "destructive" });
    } finally {
      setUnmappedLoading(false);
    }
  }, [toast]);

  const fetchMyAttendance = useCallback(async () => {
    if (!myEmployeeId) return;
    const today = getTodayStr();
    try {
      const res = await fetch(
        `${API_BASE}/attendance?employee_id=${myEmployeeId}&date=${today}`,
        { headers: authHeaders() }
      );
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        const r = json.data[0];
        setMyAttendance({
          id:         r.id,
          checkedIn:  !!r.check_in,
          checkedOut: !!r.check_out,
          checkIn:    r.check_in,
          checkOut:   r.check_out,
          status:     r.status,
        });
      } else {
        setMyAttendance({ id: null, checkedIn: false, checkedOut: false, checkIn: null, checkOut: null, status: null });
      }
    } catch { /* silent */ }
  }, [myEmployeeId]);

  useEffect(() => { fetchMyAttendance(); }, [fetchMyAttendance]);

  const handleCheckIn = async () => {
    setCheckInLoading(true);
    try {
      const res = await fetch(`${API_BASE}/attendance/check-in`, {
        method: "POST", headers: authHeaders(),
      });
      if (!res.ok) { const msg = await extractError(res); throw new Error(msg); }
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Check-in failed");
      toast({ title: "Checked in successfully!", description: `Status: ${json.data.status}` });
      await fetchMyAttendance();
      await fetchDailyLog();
    } catch (err: unknown) {
      toast({ title: "Check-in failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckInLoading(true);
    try {
      const res = await fetch(`${API_BASE}/attendance/check-out`, {
        method: "POST", headers: authHeaders(),
      });
      if (!res.ok) { const msg = await extractError(res); throw new Error(msg); }
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Check-out failed");
      toast({ title: "Checked out successfully!", description: "Have a great day!" });
      await fetchMyAttendance();
      await fetchDailyLog();
    } catch (err: unknown) {
      toast({ title: "Check-out failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setCheckInLoading(false);
    }
  };

  // ── Daily log ──
  const fetchDailyLog = useCallback(async () => {
    setLoading(true);
    try {
      const employeeFilter = !isHR && myEmployeeId
        ? `&employee_id=${myEmployeeId}`
        : "";

      const res = await fetch(
        `${API_BASE}/attendance?date=${selectedDate}&limit=100${employeeFilter}`,
        { headers: authHeaders() }
      );
      if (!res.ok) { const msg = await extractError(res); throw new Error(msg); }
      const json = await res.json();
      if (json.success) setDailyLog(json.data.map(mapRecordToRow));
      else throw new Error(json.message ?? "Failed to load attendance");
    } catch (err: unknown) {
      toast({ title: "Failed to fetch attendance", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [selectedDate, isHR, myEmployeeId, toast]);

  // ── Monthly summary ──
  const fetchMonthlySummary = useCallback(async () => {
    setLoading(true);
    try {
      const month    = parseInt(selectedMonth);
      const year     = parseInt(selectedYear);
      const fromDate = new Date(year, month, 1).toISOString().split("T")[0];
      const toDate   = new Date(year, month + 1, 0).toISOString().split("T")[0];

      const employeeFilter = !isHR && myEmployeeId
        ? `&employee_id=${myEmployeeId}`
        : "";

      const res = await fetch(
        `${API_BASE}/attendance/summary?from_date=${fromDate}&to_date=${toDate}${employeeFilter}`,
        { headers: authHeaders() }
      );
      if (!res.ok) { const msg = await extractError(res); throw new Error(msg); }
      const json = await res.json();
      if (json.success) setMonthlySummary(json.data);
      else throw new Error(json.message ?? "Failed to load monthly summary");
    } catch (err: unknown) {
      toast({ title: "Failed to fetch monthly summary", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, isHR, myEmployeeId, toast]);

  useEffect(() => {
    const stored = localStorage.getItem("attendance_audit_log");
    if (stored) setAuditLog(JSON.parse(stored));
  }, []);

  useEffect(() => {
    localStorage.setItem("attendance_audit_log", JSON.stringify(auditLog));
  }, [auditLog]);

  useEffect(() => {
    if (!isHR && !myEmployeeId) return;
    fetchDailyLog();
    fetchDevices();
    fetchMappings();
    fetchUnmappedEmployees();
  }, [fetchDailyLog, fetchDevices, fetchMappings, fetchUnmappedEmployees, isHR, myEmployeeId]);

  useEffect(() => {
    if (!isHR && !myEmployeeId) return;
    if (activeTab === "monthly") fetchMonthlySummary();
  }, [activeTab, selectedMonth, selectedYear, fetchMonthlySummary, isHR, myEmployeeId]);

  const handleSync = async () => {
    setSyncing(true);
    await Promise.all([
      fetchDailyLog(),
      fetchMyAttendance(),
      fetchDevices(),
      fetchMappings(),
      fetchUnmappedEmployees(),
    ]);
    setSyncing(false);
    toast({ title: "Sync complete", description: "Pulled latest attendance records." });
  };

  const handleAddDevice = async () => {
    if (!newDevice.name || !newDevice.ip || !newDevice.serial_number) {
      toast({ title: "Missing fields", description: "Device name, serial number, and IP are required.", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/devices`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          device_name:   newDevice.name,
          serial_number: newDevice.serial_number,
          device_model:  newDevice.model,
          ip:            newDevice.ip,
          location:      newDevice.location || undefined,
        }),
      });
      if (!res.ok) { const msg = await extractError(res); throw new Error(msg); }
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to add device");
      await fetchDevices();
      setNewDevice({ name: "", serial_number: "", ip: "", port: "4370", model: 'ZKTeco K40 (4.3" TFT)', location: "" });
      setAddDeviceDialog(false);
      toast({ title: "Device added" });
    } catch (err: unknown) {
      toast({ title: "Failed to add device", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleDeleteDevice = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/devices/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) { const msg = await extractError(res); throw new Error(msg); }
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to remove device");
      await fetchDevices();
      toast({ title: "Device removed" });
    } catch (err: unknown) {
      toast({ title: "Failed to remove device", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleAddMapping = async () => {
    if (!addForm.employee_id || !addForm.biometric_id.trim() || !addForm.device_id) {
      toast({ title: "Missing fields", description: "All fields are required.", variant: "destructive" });
      return;
    }
    setAddMappingLoading(true);
    try {
      const res = await fetch(`${API_BASE}/devices/mappings`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          employee_id:  addForm.employee_id,
          device_id:    addForm.device_id,
          biometric_id: addForm.biometric_id,
        }),
      });
      if (!res.ok) { const msg = await extractError(res); throw new Error(msg); }
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to add mapping");
      await fetchMappings();
      await fetchUnmappedEmployees();
      setAddForm({ employee_id: "", biometric_id: "", device_id: "" });
      toast({ title: "Mapping added" });
    } catch (err: unknown) {
      toast({ title: "Failed to add mapping", description: (err as Error).message, variant: "destructive" });
    } finally {
      setAddMappingLoading(false);
    }
  };

  const handleRemoveMapping = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/devices/mappings/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) { const msg = await extractError(res); throw new Error(msg); }
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to remove mapping");
      await fetchMappings();
      await fetchUnmappedEmployees();
      toast({ title: "Mapping removed", description: `${json.data?.attendance_records_deleted ?? 0} attendance records also deleted.` });
    } catch (err: unknown) {
      toast({ title: "Failed to remove mapping", description: (err as Error).message, variant: "destructive" });
    }
  };

  const openEdit = (row: DailyRow) => {
    setEditRow(row);
    setEditDraft({
      checkIn:  HHMM_RE.test(row.checkIn)  ? row.checkIn  : "",
      checkOut: HHMM_RE.test(row.checkOut) ? row.checkOut : "",
      status:   row.status as AttendanceStatus,
      reason:   "",
    });
  };

  const saveEdit = async () => {
    if (!editRow) return;
    if (!editDraft.reason.trim()) {
      toast({ title: "Reason required", description: "Please enter a reason for the manual edit.", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/attendance/${editRow.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          check_in:  editDraft.checkIn  ? nepalHHMMtoUTCIso(selectedDate, editDraft.checkIn)  : null,
          check_out: editDraft.checkOut ? nepalHHMMtoUTCIso(selectedDate, editDraft.checkOut) : null,
          status:    editDraft.status,
          notes:     editDraft.reason,
        }),
      });
      if (!res.ok) { const msg = await extractError(res); throw new Error(msg); }
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to update record");

      const newHours =
        editDraft.checkIn && editDraft.checkOut
          ? diffHours(editDraft.checkIn, editDraft.checkOut)
          : "—";

      const entries: AuditEntry[] = [];
      const now    = new Date().toISOString();
      const editor = getCurrentUser()?.name ?? "HR";

      if (editDraft.checkIn  !== editRow.checkIn)
        entries.push({ id: `${Date.now()}-in`,  empId: editRow.employeeId, date: selectedDate, field: "Check-in",  oldValue: editRow.checkIn,  newValue: editDraft.checkIn  || "—", editor, reason: editDraft.reason, at: now });
      if (editDraft.checkOut !== editRow.checkOut)
        entries.push({ id: `${Date.now()}-out`, empId: editRow.employeeId, date: selectedDate, field: "Check-out", oldValue: editRow.checkOut, newValue: editDraft.checkOut || "—", editor, reason: editDraft.reason, at: now });
      if (editDraft.status   !== editRow.status)
        entries.push({ id: `${Date.now()}-st`,  empId: editRow.employeeId, date: selectedDate, field: "Status",    oldValue: editRow.status,   newValue: editDraft.status,            editor, reason: editDraft.reason, at: now });

      if (entries.length) setAuditLog((prev) => [...entries, ...prev].slice(0, 200));

      setDailyLog((prev) =>
        prev.map((r) =>
          r.id === editRow.id
            ? {
                ...r,
                checkIn:  editDraft.checkIn  || "—",
                checkOut: editDraft.checkOut || "—",
                hours:    newHours,
                status:   editDraft.status,
                source:   "Manual Edit",
                edited:   true,
                editNote: editDraft.reason,
              }
            : r
        )
      );

      toast({ title: "Attendance updated", description: `${editRow.name}'s record was edited.` });
      setEditRow(null);
    } catch (err: unknown) {
      toast({ title: "Failed to update", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleSubmitCorrection = async () => {
    if (!correctionForm.reason.trim()) {
      toast({ title: "Reason required", description: "Please provide a reason for the correction.", variant: "destructive" });
      return;
    }
    if (correctionForm.type !== "check_out" && !correctionForm.checkIn) {
      toast({ title: "Check-in time required", variant: "destructive" });
      return;
    }
    if (correctionForm.type !== "check_in" && !correctionForm.checkOut) {
      toast({ title: "Check-out time required", variant: "destructive" });
      return;
    }

    setCorrectionSubmitting(true);
    try {
      const currentUser = getCurrentUser();
      const empName = currentUser?.name ?? "Unknown";
      const empId   = myEmployeeId ?? currentUser?.id ?? "unknown";

      const newRequest: CorrectionRequest = {
        id:                `corr-${Date.now()}`,
        employeeId:        empId,
        employeeName:      empName,
        date:              correctionForm.date,
        type:              correctionForm.type,
        requestedCheckIn:  correctionForm.type !== "check_out" ? correctionForm.checkIn  : null,
        requestedCheckOut: correctionForm.type !== "check_in"  ? correctionForm.checkOut : null,
        reason:            correctionForm.reason,
        status:            "pending",
        submittedAt:       new Date().toISOString(),
        actionBy:          null,
      };

      const updated = [newRequest, ...loadCorrectionRequests()];
      saveCorrectionRequests(updated);
      setCorrectionRequests(updated);

      toast({ title: "Request submitted", description: "HR will review your correction request." });
      setCorrectionDialog(false);
      setCorrectionForm({ date: getTodayStr(), type: "check_in", checkIn: "", checkOut: "", reason: "" });
    } finally {
      setCorrectionSubmitting(false);
    }
  };

  const handleCorrectionAction = async (id: string, action: "approved" | "rejected") => {
    const editor  = getCurrentUser()?.name ?? "HR";
    const request = correctionRequests.find((r) => r.id === id);
    if (!request) return;

    if (action === "rejected") {
      const updated = correctionRequests.map((r) =>
        r.id === id ? { ...r, status: "rejected" as CorrectionRequestStatus, actionBy: editor } : r
      );
      saveCorrectionRequests(updated);
      setCorrectionRequests(updated);
      toast({ title: "Request rejected", description: "Employee will be notified." });
      return;
    }

    setApprovingId(id);
    try {
      const searchRes = await fetch(
        `${API_BASE}/attendance?employee_id=${request.employeeId}&date=${request.date}&limit=1`,
        { headers: authHeaders() }
      );
      if (!searchRes.ok) throw new Error(await extractError(searchRes));
      const searchJson = await searchRes.json();
      const existing: AttendanceRecord | undefined = searchJson.data?.[0];

      const checkIn =
        request.type !== "check_out" && request.requestedCheckIn
          ? request.requestedCheckIn
          : existing?.check_in
          ? formatTime(existing.check_in)
          : null;
      const checkOut =
        request.type !== "check_in" && request.requestedCheckOut
          ? request.requestedCheckOut
          : existing?.check_out
          ? formatTime(existing.check_out)
          : null;

      const status: AttendanceStatus = (existing?.status as AttendanceStatus) ?? "present";

      const body = {
        check_in:  checkIn  ? nepalHHMMtoUTCIso(request.date, checkIn)  : null,
        check_out: checkOut ? nepalHHMMtoUTCIso(request.date, checkOut) : null,
        status,
        notes:  `Correction approved by ${editor}: ${request.reason}`,
        edited: true,
      };

      let apiRes: Response;

      if (existing) {
        apiRes = await fetch(`${API_BASE}/attendance/${existing.id}`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify(body),
        });
      } else {
        apiRes = await fetch(`${API_BASE}/attendance`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ employee_id: request.employeeId, date: request.date, ...body }),
        });
      }

      if (!apiRes.ok) throw new Error(await extractError(apiRes));
      const apiJson = await apiRes.json();
      if (!apiJson.success) throw new Error(apiJson.message ?? "Failed to apply correction");

      const updated = correctionRequests.map((r) =>
        r.id === id ? { ...r, status: "approved" as CorrectionRequestStatus, actionBy: editor } : r
      );
      saveCorrectionRequests(updated);
      setCorrectionRequests(updated);

      await fetchDailyLog();

      toast({ title: "Request approved", description: "Attendance record updated in the database." });
    } catch (err: unknown) {
      toast({ title: "Failed to apply correction", description: (err as Error).message, variant: "destructive" });
    } finally {
      setApprovingId(null);
    }
  };

  const handleExport = () => {
    const csv = [
      ["Employee ID", "Name", "Department", "Working Days", "Present", "Late", "Absent", "Leave"].join(","),
      ...filteredMonthly.map((r) => {
        const pd   = r.employee?.personal_details;
        const name = pd ? `${pd.first_name} ${pd.last_name}` : r.employee?.id ?? "—";
        const dept = r.employee?.department?.[0]?.department_name ?? "—";
        return [r.employee?.id ?? "—", name, dept, r.total, r.present, r.late, r.absent, r.on_leave].join(",");
      }),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `attendance-${months[Number(selectedMonth)]}-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Report exported" });
  };

  const handlePushToPayroll = () => {
    const payload = {
      month:       months[Number(selectedMonth)],
      year:        selectedYear,
      generatedAt: new Date().toISOString(),
      employees:   filteredMonthly.map((r) => {
        const pd = r.employee?.personal_details;
        return {
          id:          r.employee?.id,
          name:        pd ? `${pd.first_name} ${pd.last_name}` : r.employee?.id,
          department:  r.employee?.department?.[0]?.department_name,
          presentDays: r.present + r.late,
          absentDays:  r.absent,
          leaveDays:   r.on_leave,
        };
      }),
    };
    localStorage.setItem("payroll_attendance_input", JSON.stringify(payload));
    toast({
      title:       "Pushed to Payroll",
      description: `${payload.employees.length} employees · ${payload.month} ${payload.year}.`,
    });
  };

  // ── Derived ──
  const dailySummary = useMemo(() => ({
    present:  dailyLog.filter((r) => r.status === "present").length,
    complete: dailyLog.filter((r) => r.checkOut !== "—" && r.status !== "absent" && r.status !== "on_leave").length,
    late:     dailyLog.filter((r) => r.status === "late").length,
    absent:   dailyLog.filter((r) => r.status === "absent").length,
    leave:    dailyLog.filter((r) => r.status === "on_leave").length,
  }), [dailyLog]);

  const filteredMonthly = useMemo(() =>
    selectedEmployee === "all"
      ? monthlySummary
      : monthlySummary.filter((r) => r.employee?.id === selectedEmployee),
    [selectedEmployee, monthlySummary]
  );

  const monthlyTotals = useMemo(() => ({
    totalPresent: filteredMonthly.reduce((s, r) => s + r.present,  0),
    totalLate:    filteredMonthly.reduce((s, r) => s + r.late,     0),
    totalAbsent:  filteredMonthly.reduce((s, r) => s + r.absent,   0),
    totalLeave:   filteredMonthly.reduce((s, r) => s + r.on_leave, 0),
  }), [filteredMonthly]);

  const filteredMappings = useMemo(() => {
    if (!mappingSearch) return apiMappings;
    const q = mappingSearch.toLowerCase();
    return apiMappings.filter((m) => {
      const pd   = m.employee?.personal_details;
      const name = pd ? `${pd.first_name} ${pd.last_name}`.toLowerCase() : "";
      return (
        name.includes(q) ||
        m.employee_id.toLowerCase().includes(q) ||
        m.biometric_id.toLowerCase().includes(q) ||
        (m.device?.device_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [apiMappings, mappingSearch]);

  const pendingCorrectionCount = useMemo(
    () => correctionRequests.filter((r) => r.status === "pending").length,
    [correctionRequests]
  );

  const myCorrectionRequests = useMemo(() => {
    if (!myEmployeeId) return [];
    return correctionRequests.filter((r) => r.employeeId === myEmployeeId);
  }, [correctionRequests, myEmployeeId]);

  const isToday = selectedDate === getTodayStr();

  const displayDate = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const shortDisplayDate = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  const elapsed = useMemo(() => {
    if (!myAttendance.checkIn || myAttendance.checkedOut) return null;
    const diffMs = liveTime.getTime() - new Date(myAttendance.checkIn).getTime();
    if (diffMs <= 0) return null;
    const totalMins = Math.floor(diffMs / 60000);
    return `${Math.floor(totalMins / 60)}h ${String(totalMins % 60).padStart(2, "0")}m`;
  }, [myAttendance.checkIn, myAttendance.checkedOut, liveTime]);

  const correctionTypeLabel: Record<CorrectionRequestType, string> = {
    check_in:  "Missed Check-in",
    check_out: "Missed Check-out",
    both:      "Both",
  };

  const correctionStatusColor: Record<CorrectionRequestStatus, string> = {
    pending:  "status-pending",
    approved: "status-active",
    rejected: "status-resigned",
  };

  const deviceConfigContent = (
    <div className="space-y-4 pt-2">
      <div className="bg-muted/30 border border-border rounded-lg p-4">
        <h4 className="text-sm font-semibold mb-1">ADMS Server URL</h4>
        <p className="text-xs text-muted-foreground mb-2">
          Set this URL on your ZKTeco device under Communication → Cloud Server.
        </p>
        <code className="text-xs bg-muted px-2 py-1 rounded font-mono-data">
          {window.location.origin}/adms
        </code>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold">Registered Devices</h4>
          <Dialog open={addDeviceDialog} onOpenChange={setAddDeviceDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 h-7 text-xs">
                <Plus className="w-3 h-3" /> Add Device
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Add ZKTeco Device</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Device Name</label>
                  <Input value={newDevice.name} onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })} placeholder="e.g., Floor 2 Entrance" className="h-8 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Serial Number <span className="text-destructive">*</span>
                    <span className="ml-1 text-muted-foreground">(printed on back of device)</span>
                  </label>
                  <Input value={newDevice.serial_number} onChange={(e) => setNewDevice({ ...newDevice, serial_number: e.target.value })} placeholder="e.g., ABC1234567" className="h-8 text-sm font-mono-data" />
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
                      {deviceModels.map((m) => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Location (optional)</label>
                  <Input value={newDevice.location} onChange={(e) => setNewDevice({ ...newDevice, location: e.target.value })} placeholder="e.g., Main Office" className="h-8 text-sm" />
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
          {devicesLoading ? (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading devices...
            </div>
          ) : devices.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-6">No devices registered.</div>
          ) : (
            devices.map((device) => (
              <div key={device.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  {device.status === "online" ? <Wifi className="w-4 h-4 text-success" /> : <WifiOff className="w-4 h-4 text-destructive" />}
                  <div>
                    <p className="text-sm font-medium">{device.device_name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono-data">
                      {device.serial_number} · {device.ip} · {device.device_model}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`status-pill ${device.status === "online" ? "status-active" : "status-resigned"}`}>
                    {device.status}
                  </span>
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleDeleteDevice(device.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button variant="outline" size="sm" onClick={() => setConfigDialog(false)}>Close</Button>
      </div>
    </div>
  );

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

      {/* ── Header ── */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Attendance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Daily logs · monthly reports · ZKTeco K40 biometric integration
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isHR && (
            <Button variant="outline" size="sm" className="gap-1.5 press-effect" onClick={() => setCorrectionDialog(true)}>
              <Inbox className="w-3.5 h-3.5" /> Request Correction
            </Button>
          )}
          {isHR && (
            <Button variant="outline" size="sm" className="gap-1.5 press-effect" onClick={() => setHrRequestsDialog(true)}>
              <Inbox className="w-3.5 h-3.5" /> Requests
              {pendingCorrectionCount > 0 && (
                <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-mono-data">
                  {pendingCorrectionCount}
                </span>
              )}
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5 press-effect" onClick={() => setAuditDialog(true)}>
            <History className="w-3.5 h-3.5" /> Audit Log
            {auditLog.length > 0 && (
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-mono-data">
                {auditLog.length}
              </span>
            )}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 press-effect" onClick={handleSync} disabled={syncing}>
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
                  <DialogDescription>
                    Manage ZKTeco K40 biometric devices. The device auto-registers on first punch using the serial number.
                  </DialogDescription>
                </DialogHeader>
                {deviceConfigContent}
              </DialogContent>
            </Dialog>
          )}
        </div>
      </motion.div>

      {/* ── Tabs ── */}
      <motion.div variants={item}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
          <TabsList>
            <TabsTrigger value="daily"   className="gap-1.5"><CalendarIcon className="w-3.5 h-3.5" /> Daily Log</TabsTrigger>
            <TabsTrigger value="monthly" className="gap-1.5"><TrendingUp   className="w-3.5 h-3.5" /> Monthly Report</TabsTrigger>
            <TabsTrigger value="devices" className="gap-1.5"><Wifi         className="w-3.5 h-3.5" /> Devices</TabsTrigger>
            {isHR && (
              <TabsTrigger value="mapping" className="gap-1.5">
                <Fingerprint className="w-3.5 h-3.5" /> User Mapping
                {unmappedEmployees.length > 0 && (
                  <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-mono-data">
                    {unmappedEmployees.length}
                  </span>
                )}
              </TabsTrigger>
            )}
            {!isHR && (
              <TabsTrigger value="my_requests" className="gap-1.5">
                <Inbox className="w-3.5 h-3.5" /> My Requests
                {myCorrectionRequests.filter((r) => r.status === "pending").length > 0 && (
                  <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-warning/10 text-warning font-mono-data">
                    {myCorrectionRequests.filter((r) => r.status === "pending").length}
                  </span>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          {/* ══ DAILY TAB ══ */}
          <TabsContent value="daily" className="space-y-5">

            {/* ── Summary stat cards ── */}
            <div className="grid grid-cols-5 gap-4">
              {[
                { label: "Present",   value: dailySummary.present,  icon: CheckCircle2, color: "text-success"     },
                { label: "Completed", value: dailySummary.complete,  icon: LogOut,       color: "text-primary"     },
                { label: "Late",      value: dailySummary.late,      icon: Clock,        color: "text-warning"     },
                { label: "Absent",    value: dailySummary.absent,    icon: AlertCircle,  color: "text-destructive" },
                { label: "On Leave",  value: dailySummary.leave,     icon: CalendarIcon, color: "text-primary"     },
              ].map((s) => (
                <div key={s.label} className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                    <span className={`text-xs font-medium ${s.color}`}>{s.label}</span>
                  </div>
                  <p className={`text-2xl font-bold font-mono-data ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* ── Daily log table ── */}
            <div className="glass-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">
                    Today's Log · <span className="font-mono-data text-muted-foreground">{shortDisplayDate}</span>
                  </h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Check-in / Check-out &amp; total time present in office.{isHR && <> Click <Pencil className="w-2.5 h-2.5 inline -mt-0.5" /> to edit.</>}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {/* ── Inline date picker ── */}
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="h-8 w-40 text-xs font-mono-data"
                    />
                    <Button
                      variant={isToday ? "default" : "outline"}
                      size="sm"
                      className="h-8 text-xs px-3"
                      onClick={() => setSelectedDate(getTodayStr())}
                    >
                      Today
                    </Button>
                  </div>
                  <div className="h-5 w-px bg-border" />
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="font-mono-data">Shift: 09:00 — 17:00</span>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16 text-sm text-muted-foreground gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Loading attendance...
                </div>
              ) : dailyLog.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-16">
                  No attendance records found for {displayDate}.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="nexus-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Employee</th>
                        <th>Department</th>
                        <th><div className="flex items-center gap-1"><LogIn  className="w-3 h-3" /> Check-in</div></th>
                        <th><div className="flex items-center gap-1"><LogOut className="w-3 h-3" /> Check-out</div></th>
                        <th><div className="flex items-center gap-1"><Timer  className="w-3 h-3" /> Total Time</div></th>
                        <th>Source</th>
                        <th>Status</th>
                        {isHR && <th className="text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {dailyLog.map((row) => (
                        <tr key={row.id}>
                          <td className="font-mono-data text-xs text-muted-foreground">{shortId(row.employeeId)}</td>
                          <td>
                            <div className="text-sm font-medium">{row.name}</div>
                            {row.edited && (
                              <span title={row.editNote} className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning font-medium">
                                edited
                              </span>
                            )}
                          </td>
                          <td className="text-xs text-muted-foreground">{row.department}</td>
                          <td className="font-mono-data text-xs">{row.checkIn}</td>
                          <td className="font-mono-data text-xs">{row.checkOut}</td>
                          <td className="font-mono-data text-xs font-semibold">{row.hours}</td>
                          <td className="text-xs text-muted-foreground">{row.source}</td>
                          <td>
                            <span className={`status-pill ${statusColors[row.status] ?? ""}`}>
                              {statusLabel[row.status] ?? row.status}
                            </span>
                          </td>
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
              )}
            </div>
          </TabsContent>

          {/* ══ MONTHLY TAB ══ */}
          <TabsContent value="monthly" className="space-y-5">
            <div className="glass-card p-4 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Period</span>
              </div>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {months.map((m, i) => <SelectItem key={m} value={String(i)} className="text-xs">{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["2023","2024","2025","2026"].map((y) => <SelectItem key={y} value={y} className="text-xs">{y}</SelectItem>)}
                </SelectContent>
              </Select>
              {isHR && (
                <>
                  <div className="h-6 w-px bg-border" />
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger className="h-8 w-48 text-xs"><SelectValue placeholder="All employees" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All Employees</SelectItem>
                      {monthlySummary.map((e) => {
                        const pd   = e.employee?.personal_details;
                        const name = pd ? `${pd.first_name} ${pd.last_name}` : e.employee?.id ?? "—";
                        return (
                          <SelectItem key={e.employee?.id} value={e.employee?.id ?? ""} className="text-xs">
                            {name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </>
              )}
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 press-effect" onClick={handleExport}>
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
                </Button>
                {isHR && (
                  <Button size="sm" className="gap-1.5 press-effect" onClick={handlePushToPayroll}>
                    <Inbox className="w-3.5 h-3.5" /> Push to Payroll
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "Total Present Days", value: monthlyTotals.totalPresent, icon: CheckCircle2, color: "text-success"     },
                { label: "Late Arrivals",       value: monthlyTotals.totalLate,    icon: AlertCircle,  color: "text-warning"     },
                { label: "Absent Days",         value: monthlyTotals.totalAbsent,  icon: AlertCircle,  color: "text-destructive" },
                { label: "Leave Days",          value: monthlyTotals.totalLeave,   icon: Clock,        color: "text-primary"     },
              ].map((s) => (
                <div key={s.label} className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                    <span className={`text-xs font-medium ${s.color}`}>{s.label}</span>
                  </div>
                  <p className={`text-2xl font-bold font-mono-data ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="glass-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold">
                  Monthly Attendance Report ·{" "}
                  <span className="font-mono-data text-muted-foreground">
                    {months[Number(selectedMonth)]} {selectedYear}
                  </span>
                </h2>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-16 text-sm text-muted-foreground gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Loading monthly data...
                </div>
              ) : filteredMonthly.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-16">
                  No data for {months[Number(selectedMonth)]} {selectedYear}.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="nexus-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Department</th>
                        <th className="text-center">Total</th>
                        <th className="text-center text-success">Present</th>
                        <th className="text-center text-warning">Late</th>
                        <th className="text-center text-destructive">Absent</th>
                        <th className="text-center text-primary">Leave</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMonthly.map((row) => {
                        const pd   = row.employee?.personal_details;
                        const name = pd ? `${pd.first_name} ${pd.last_name}` : row.employee?.id ?? "—";
                        const dept = row.employee?.department?.[0]?.department_name ?? "—";
                        const rate = row.total > 0 ? ((row.present / row.total) * 100).toFixed(0) : "0";
                        return (
                          <tr key={row.employee?.id}>
                            <td>
                              <div className="text-sm font-medium">{name}</div>
                              <div className="text-[11px] text-muted-foreground">{rate}% attendance</div>
                            </td>
                            <td className="text-xs text-muted-foreground">{dept}</td>
                            <td className="text-center font-mono-data text-xs">{row.total}</td>
                            <td className="text-center font-mono-data text-xs font-semibold text-success">{row.present}</td>
                            <td className="text-center font-mono-data text-xs font-semibold text-warning">{row.late}</td>
                            <td className="text-center font-mono-data text-xs font-semibold text-destructive">{row.absent}</td>
                            <td className="text-center font-mono-data text-xs font-semibold text-primary">{row.on_leave}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ══ DEVICES TAB ══ */}
          <TabsContent value="devices" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Biometric Devices</h2>
              {isHR && (
                <Button variant="outline" size="sm" className="gap-1 h-7 text-xs press-effect" onClick={() => setConfigDialog(true)}>
                  <Settings2 className="w-3 h-3" /> Manage Devices
                </Button>
              )}
            </div>
            {devicesLoading ? (
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Loading devices...
              </div>
            ) : devices.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-16">
                No devices registered. {isHR && "Add one via Manage Devices."}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {devices.map((device) => (
                  <div key={device.id} className="glass-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {device.status === "online" ? <Wifi className="w-4 h-4 text-success" /> : <WifiOff className="w-4 h-4 text-destructive" />}
                        <span className="text-sm font-medium">{device.device_name}</span>
                      </div>
                      <span className={`status-pill ${device.status === "online" ? "status-active" : "status-resigned"}`}>
                        {device.status}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Serial</span>
                        <span className="font-mono-data text-[11px]">{device.serial_number}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Model</span>
                        <span className="font-mono-data text-[11px]">{device.device_model}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">IP Address</span>
                        <span className="font-mono-data text-[11px]">{device.ip}:4370</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Last Sync</span>
                        <span className="font-mono-data text-[11px]">{formatLastSync(device.updated_at)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Mapped Users</span>
                        <span className="font-mono-data text-[11px] text-primary font-semibold">{device.mappings?.length ?? 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ══ USER MAPPING TAB (HR only) ══ */}
          {isHR && (
            <TabsContent value="mapping">
              <div className="flex gap-5 items-start">
                <div className="w-80 shrink-0 space-y-4">
                  <div className="glass-card p-5">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Fingerprint className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">Add Mapping</h3>
                        <p className="text-[11px] text-muted-foreground">Bind employee → biometric PIN</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1.5 block">Employee</label>
                        <Select value={addForm.employee_id} onValueChange={(v) => setAddForm((f) => ({ ...f, employee_id: v }))}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select employee..." /></SelectTrigger>
                          <SelectContent>
                            {unmappedLoading ? (
                              <SelectItem value="__loading__" disabled className="text-sm text-muted-foreground">
                                <span className="flex items-center gap-2"><RefreshCw className="w-3 h-3 animate-spin" /> Loading...</span>
                              </SelectItem>
                            ) : unmappedEmployees.length === 0 ? (
                              <SelectItem value="__none__" disabled className="text-sm text-muted-foreground">All employees mapped</SelectItem>
                            ) : (
                              unmappedEmployees.map((e) => <SelectItem key={e.id} value={e.id} className="text-sm">{e.name}</SelectItem>)
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs text-muted-foreground">Biometric PIN</label>
                          <span className="text-[10px] text-muted-foreground">As enrolled on device</span>
                        </div>
                        <Input value={addForm.biometric_id} onChange={(e) => setAddForm((f) => ({ ...f, biometric_id: e.target.value }))} placeholder="e.g., 1042" className="h-9 font-mono-data text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1.5 block">Biometric Device</label>
                        <Select value={addForm.device_id} onValueChange={(v) => setAddForm((f) => ({ ...f, device_id: v }))}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select device..." /></SelectTrigger>
                          <SelectContent>
                            {devices.filter((d) => d.serial_number !== "MANUAL").map((dev) => (
                              <SelectItem key={dev.id} value={dev.id} className="text-sm">
                                <div className="flex items-center gap-2">
                                  {dev.status === "online" ? <Wifi className="w-3.5 h-3.5 text-success" /> : <WifiOff className="w-3.5 h-3.5 text-destructive" />}
                                  {dev.device_name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button className="w-full gap-2 mt-1" onClick={handleAddMapping} disabled={addMappingLoading}>
                        <Plus className="w-4 h-4" />
                        {addMappingLoading ? "Adding..." : "Add Mapping"}
                      </Button>
                    </div>
                  </div>

                  <div className="glass-card p-4">
                    <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-3">Connected Devices</p>
                    <div className="space-y-2.5">
                      {devices.filter((d) => d.serial_number !== "MANUAL").map((dev) => (
                        <div key={dev.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Wifi className={`w-3.5 h-3.5 ${dev.status === "online" ? "text-success" : "text-destructive"}`} />
                            <span className="text-sm">{dev.device_name}</span>
                          </div>
                          <span className="text-[11px] font-mono-data text-muted-foreground">{dev.serial_number}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex-1 glass-card overflow-hidden">
                  <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold">Active Mappings</h2>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {apiMappings.length} mappings across {devices.filter((d) => d.serial_number !== "MANUAL").length} devices
                      </p>
                    </div>
                    <div className="relative w-60 shrink-0">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input value={mappingSearch} onChange={(e) => setMappingSearch(e.target.value)} placeholder="Search employee, PIN, device..." className="h-8 pl-8 text-xs" />
                    </div>
                  </div>
                  {mappingsLoading ? (
                    <div className="flex items-center justify-center py-16 text-sm text-muted-foreground gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Loading mappings...
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="nexus-table">
                        <thead>
                          <tr>
                            <th>Employee</th>
                            <th>Biometric PIN</th>
                            <th>Device</th>
                            <th>Enrolled</th>
                            <th className="text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredMappings.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center text-sm text-muted-foreground py-10">No mappings found.</td>
                            </tr>
                          ) : (
                            filteredMappings.map((m) => {
                              const pd   = m.employee?.personal_details;
                              const name = pd ? `${pd.first_name} ${pd.last_name}` : m.employee_id;
                              return (
                                <tr key={m.id}>
                                  <td>
                                    <div className="text-sm font-medium">{name}</div>
                                    <div className="text-[11px] font-mono-data text-muted-foreground">{shortId(m.employee_id)}</div>
                                  </td>
                                  <td><span className="font-mono-data text-xs font-semibold text-primary">{m.biometric_id}</span></td>
                                  <td className="text-sm">{m.device?.device_name ?? "—"}</td>
                                  <td className="text-xs text-muted-foreground font-mono-data">
                                    {m.created_at ? new Date(m.created_at).toLocaleDateString() : "—"}
                                  </td>
                                  <td className="text-right">
                                    <Button
                                      variant="ghost" size="sm"
                                      className="h-7 px-2 gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => handleRemoveMapping(m.id)}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" /><span className="text-xs">Remove</span>
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          )}

          {/* ══ MY REQUESTS TAB (Employee only) ══ */}
          {!isHR && (
            <TabsContent value="my_requests" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">My Correction Requests</h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Track the status of your submitted attendance correction requests.
                  </p>
                </div>
                <Button size="sm" className="gap-1.5" onClick={() => setCorrectionDialog(true)}>
                  <Plus className="w-3.5 h-3.5" /> New Request
                </Button>
              </div>
              {myCorrectionRequests.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <Inbox className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium text-muted-foreground">No correction requests yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Submit a request if you missed a check-in or check-out.</p>
                  <Button size="sm" className="mt-4 gap-1.5" onClick={() => setCorrectionDialog(true)}>
                    <Plus className="w-3.5 h-3.5" /> Request Correction
                  </Button>
                </div>
              ) : (
                <div className="glass-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="nexus-table">
                      <thead>
                        <tr>
                          <th>Submitted</th>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Requested</th>
                          <th>Reason</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myCorrectionRequests.map((r) => (
                          <tr key={r.id}>
                            <td className="text-[11px] text-muted-foreground font-mono-data">
                              {new Date(r.submittedAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
                            </td>
                            <td className="font-mono-data text-xs">{r.date}</td>
                            <td className="text-xs">{correctionTypeLabel[r.type]}</td>
                            <td className="font-mono-data text-xs">
                              {r.requestedCheckIn && <span>{r.requestedCheckIn}</span>}
                              {r.requestedCheckIn && r.requestedCheckOut && <span className="text-muted-foreground mx-1">/</span>}
                              {r.requestedCheckOut && <span>{r.requestedCheckOut}</span>}
                            </td>
                            <td className="text-xs text-muted-foreground max-w-[200px] truncate">{r.reason}</td>
                            <td>
                              <span className={`status-pill ${correctionStatusColor[r.status]}`}>
                                {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </motion.div>

      {/* ══ EMPLOYEE: Request Correction Dialog ══ */}
      <Dialog open={correctionDialog} onOpenChange={setCorrectionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Attendance Correction</DialogTitle>
            <DialogDescription>Submit a request to HR/Admin for a missed check-in or check-out.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Date</label>
                <Input type="date" value={correctionForm.date} onChange={(e) => setCorrectionForm((f) => ({ ...f, date: e.target.value }))} className="h-9 text-sm font-mono-data" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Request Type</label>
                <Select
                  value={correctionForm.type}
                  onValueChange={(v: CorrectionRequestType) => setCorrectionForm((f) => ({ ...f, type: v, checkIn: "", checkOut: "" }))}
                >
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="check_in"  className="text-sm">Missed Check-in</SelectItem>
                    <SelectItem value="check_out" className="text-sm">Missed Check-out</SelectItem>
                    <SelectItem value="both"      className="text-sm">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {correctionForm.type !== "check_out" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Check-in time</label>
                <Input type="time" value={correctionForm.checkIn} onChange={(e) => setCorrectionForm((f) => ({ ...f, checkIn: e.target.value }))} className="h-9 font-mono-data" />
              </div>
            )}
            {correctionForm.type !== "check_in" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Check-out time</label>
                <Input type="time" value={correctionForm.checkOut} onChange={(e) => setCorrectionForm((f) => ({ ...f, checkOut: e.target.value }))} className="h-9 font-mono-data" />
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Reason <span className="text-destructive">*</span></label>
              <textarea
                value={correctionForm.reason}
                onChange={(e) => setCorrectionForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="e.g., Forgot to punch out, device offline, came directly from client site."
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCorrectionDialog(false)}>Cancel</Button>
            <Button size="sm" className="gap-1.5" onClick={handleSubmitCorrection} disabled={correctionSubmitting}>
              <Inbox className="w-3.5 h-3.5" />
              {correctionSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ HR: Correction Requests Dialog ══ */}
      <Dialog open={hrRequestsDialog} onOpenChange={setHrRequestsDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Attendance Correction Requests</DialogTitle>
            <DialogDescription>Approve or reject employee-submitted corrections.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {correctionRequests.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-10">No correction requests submitted yet.</div>
            ) : (
              <table className="nexus-table">
                <thead>
                  <tr>
                    <th>Submitted</th>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Requested</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {correctionRequests.map((r) => (
                    <tr key={r.id}>
                      <td className="text-[11px] text-muted-foreground font-mono-data">
                        {new Date(r.submittedAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td>
                        <div className="text-sm font-medium">{r.employeeName}</div>
                        <div className="text-[11px] font-mono-data text-muted-foreground">{shortId(r.employeeId)}</div>
                      </td>
                      <td className="font-mono-data text-xs">{r.date}</td>
                      <td className="text-xs">{correctionTypeLabel[r.type]}</td>
                      <td className="font-mono-data text-xs">
                        {r.requestedCheckIn && <span>{r.requestedCheckIn}</span>}
                        {r.requestedCheckIn && r.requestedCheckOut && <span className="text-muted-foreground mx-1">/</span>}
                        {r.requestedCheckOut && <span>{r.requestedCheckOut}</span>}
                      </td>
                      <td className="text-xs text-muted-foreground max-w-[160px] truncate" title={r.reason}>{r.reason}</td>
                      <td>
                        <div className="flex flex-col gap-0.5">
                          <span className={`status-pill ${correctionStatusColor[r.status]}`}>
                            {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                          </span>
                          {r.actionBy && <span className="text-[10px] text-muted-foreground">{r.actionBy}</span>}
                        </div>
                      </td>
                      <td className="text-right">
                        {r.status === "pending" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost" size="sm"
                              className="h-7 px-2 gap-1 text-success hover:text-success hover:bg-success/10"
                              disabled={approvingId === r.id}
                              onClick={() => handleCorrectionAction(r.id, "approved")}
                            >
                              {approvingId === r.id
                                ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                : <CheckCircle2 className="w-3.5 h-3.5" />}
                              <span className="text-xs">{approvingId === r.id ? "Applying..." : "Approve"}</span>
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className="h-7 px-2 gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={approvingId === r.id}
                              onClick={() => handleCorrectionAction(r.id, "rejected")}
                            >
                              <XCircle className="w-3.5 h-3.5" /><span className="text-xs">Reject</span>
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            {r.status === "approved" ? "Approved" : "Rejected"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setHrRequestsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ EDIT ATTENDANCE DIALOG ══ */}
      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Attendance Record</DialogTitle>
            <DialogDescription>
              {editRow && (
                <span>
                  {editRow.name} · <span className="font-mono-data">{shortId(editRow.employeeId)}</span>
                  {" · "}
                  <span className="font-mono-data text-muted-foreground">{shortDisplayDate}</span>
                </span>
              )}
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
              <Select value={editDraft.status} onValueChange={(v: AttendanceStatus) => setEditDraft((d) => ({ ...d, status: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="half_day">Half Day</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Reason for edit <span className="text-destructive">*</span>
              </label>
              <Input value={editDraft.reason} onChange={(e) => setEditDraft((d) => ({ ...d, reason: e.target.value }))} placeholder="e.g., Forgot to punch out, Device malfunction" className="h-9 text-sm" />
            </div>
            {editDraft.checkIn && editDraft.checkOut && (
              <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-2 font-mono-data">
                Computed total time:{" "}
                <span className="font-semibold text-foreground">{diffHours(editDraft.checkIn, editDraft.checkOut)}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditRow(null)}>Cancel</Button>
            <Button size="sm" className="gap-1.5" onClick={saveEdit}>
              <Save className="w-3.5 h-3.5" /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ AUDIT LOG DIALOG ══ */}
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
                  <tr>
                    <th>When</th>
                    <th>Employee</th>
                    <th>Field</th>
                    <th>Old</th>
                    <th>New</th>
                    <th>Reason</th>
                    <th>Editor</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map((a) => (
                    <tr key={a.id}>
                      <td className="text-[11px] text-muted-foreground font-mono-data">
                        {utcToNepalDate(new Date(a.at)).toLocaleString("en-US", { timeZone: "UTC" })}
                      </td>
                      <td className="text-xs font-mono-data">{shortId(a.empId)}</td>
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