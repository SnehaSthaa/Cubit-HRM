import { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Plus,
  ArrowLeft,
  User,
  FileText,
  Edit2,
  Trash2,
  Settings2,
  Calendar,
  Briefcase,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Stethoscope,
  Plane,
  Coffee,
  AlertTriangle,
  Baby,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useRole } from "@/contexts/RoleContext";
import { useToast } from "@/hooks/use-toast";
import { Employee, LeaveBalance, getLatestDepartment } from "@/types";
import { apiClient, LeavePolicyApi } from "@/services/apiClient";

// FIX 1: Define leaveTypeIcons locally instead of importing from EmployeeProfile
const leaveTypeIcons: Record<string, LucideIcon> = {
  sick: Stethoscope,
  paid: Briefcase,
  vacation: Plane,
  casual: Coffee,
  unpaid: AlertTriangle,
  maternity: Baby,
};

const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

interface LeaveBalanceApi {
  id: string;
  employee_id: string;
  leave_type_id: string;
  leave_type: string;
  total: number;
  used: number;
  remaining: number;
  year?: number;
  accrued?: number;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    department: string;
  };
}

export interface LeaveRequest {
  id: string;
  employee: string;
  type: string;
  from: string;
  to: string;
  days: number;
  status: string;
  reason: string;
  appliedOn: string;
  approvedBy?: string;
  remarks?: string;
  rejectionReason?: string;
}

interface Holiday {
  id: string;
  start_date: string;
  end_date: string;
  name: string;
  holiday_type: "public" | "company" | "regional" | "religious";
}

interface LeavePolicy {
  id: string;
  name: string;
  type: "paid" | "sick" | "unpaid" | "compensatory" | "custom";
  annualQuota: number;
  proRata: boolean;
  carryForward: boolean;
  maxCarryForward: number;
  active: boolean;
}

export interface LeaveApiResponse {
  id?: string;
  employee_name?: string;
  employee?: { user?: { name?: string }; name?: string } | string;
  leaveType?: { name: string };
  type?: string;
  start_date?: string;
  end_date?: string;
  approval_notes?: string;
  days_count?: number;
  days?: number;
  status?: string;
  reason?: string;
  created_at?: string;
  applied_on?: string;
  appliedOn?: string;
  approved_by?: string;
  approvedBy?: string;
  remarks?: string;
  rejection_reason?: string;
  rejectionReason?: string;
}

interface LeaveOverride {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: string;
  customQuota: number;
  reason: string;
  updatedOn: string;
  updatedBy: string;
}

const leaveTypeToEnum: Record<string, string> = {
  "Sick Leave": "sick",
  "Paid Leave": "paid",
  "Unpaid Leave": "unpaid",
  "Casual Leave": "casual",
  "Personal Leave": "personal",
  "Maternity Leave": "maternity",
  Vacation: "vacation",
};

const normaliseStatus = (s?: string) => {
  if (!s) return "Pending";
  const map: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    Pending: "Pending",
    Approved: "Approved",
    Rejected: "Rejected",
  };
  return map[s] ?? s;
};

const statusClass: Record<string, string> = {
  Pending: "status-pending",
  Approved: "status-active",
  Rejected: "status-resigned",
};

const isValidLeaveType = (t: string): t is LeavePolicy["type"] =>
  ["paid", "sick", "unpaid", "compensatory", "custom"].includes(t);

const mapPolicy = (p: LeavePolicyApi): LeavePolicy => ({
  id: p.id,
  name: p.name,
  type: isValidLeaveType(p.type) ? p.type : "custom",
  annualQuota: p.annual_quota,
  proRata: p.pro_rata,
  carryForward: p.carry_forward,
  maxCarryForward: p.max_carry_forward,
  active: p.active,
});

// FIX 2: Helper to get flat name/department from Employee (which uses nested personal_details)
function getEmployeeName(emp: Employee): string {
  const first = emp.personal_details?.first_name ?? "";
  const last = emp.personal_details?.last_name ?? "";
  return `${first} ${last}`.trim() || emp.name || emp.email || "";
}

function getEmployeeDept(emp: Employee): string {
  return getLatestDepartment(emp.department)?.department_name ?? "";
}

export default function LeaveManagement() {
  const { isHR } = useRole();
  const { toast } = useToast();
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!isHR) {
      apiClient.getMe().then((res) => {
        setCurrentEmployeeId(res.data?.employee?.id ?? null);
      });
    }
  }, [isHR]);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeTab, setActiveTab] = useState("requests");
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [applyDialog, setApplyDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(
    null,
  );
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance[]>([]);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [editDialog, setEditDialog] = useState(false);
  const [editData, setEditData] = useState<LeaveRequest | null>(null);
  const [holidayDialog, setHolidayDialog] = useState(false);
  const [editHoliday, setEditHoliday] = useState<Holiday | null>(null);
  const [newHoliday, setNewHoliday] = useState({
    name: "",
    start_date: "",
    end_date: "",
    holiday_type: "public" as Holiday["holiday_type"],
  });
  const [sortEmployeeName, setSortEmployeeName] = useState<
    "asc" | "desc" | null
  >(null);
  const [sortLeaveType, setSortLeaveType] = useState<{
    policyId: string;
    dir: "asc" | "desc";
  } | null>(null);
  const [overrides, setOverrides] = useState<LeaveOverride[]>([]);
  const [overrideDialog, setOverrideDialog] = useState(false);
  const [overrideSort, setOverrideSort] = useState<{
    key: string;
    dir: "asc" | "desc";
  }>({
    key: "employeeName",
    dir: "asc",
  });
  const [newOverride, setNewOverride] = useState({
    employeeId: "",
    leaveType: "",
    customQuota: 0,
    reason: "",
  });
  const [allBalances, setAllBalances] = useState<LeaveBalanceApi[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [policyDialog, setPolicyDialog] = useState(false);
  const [editPolicy, setEditPolicy] = useState<LeavePolicy | null>(null);
  const [newPolicy, setNewPolicy] = useState({
    name: "",
    type: "custom" as LeavePolicy["type"],
    annualQuota: 0,
    proRata: false,
    carryForward: false,
    maxCarryForward: 0,
  });
  const [newLeave, setNewLeave] = useState({
    employee: "",
    type: "",
    from: "",
    to: "",
    reason: "",
  });
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterLeaveType, setFilterLeaveType] = useState<string>("all");
  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  const [applyForEmployee, setApplyForEmployee] = useState(false);

  const leaveTypes = policies.filter((p) => p.active).map((p) => p.name);

  const filterRequests = useMemo(() => {
    return requests.filter((req) => {
      const monthMatch =
        filterMonth === "all" ||
        new Date(req.from).getMonth() === parseInt(filterMonth);
      const typeMatch =
        filterLeaveType === "all" || req.type === filterLeaveType;
      const empMatch =
        filterEmployee === "all" || req.employee === filterEmployee;
      return monthMatch && typeMatch && empMatch;
    });
  }, [requests, filterMonth, filterLeaveType, filterEmployee]);

  const fetchEmployees = useCallback(async () => {
    if (!isHR) return;
    try {
      const res = await apiClient.getEmployees();

      const list = Array.isArray(res.data)
        ? res.data.filter((emp) => {
            const status = getLatestDepartment(
              emp.department,
            )?.employment_status;
            return status === "active" || status === "notice_period";
          })
        : [];
      setEmployees(list as unknown as Employee[]);
    } catch (err) {
      console.error("Failed to fetch employees", err);
    }
  }, [isHR]);

  const fetchLeaves = useCallback(async () => {
    try {
      let data: LeaveApiResponse[] = [];
      if (isHR) {
        const res = await apiClient.getLeaves();
        data = Array.isArray(res.data) ? res.data : [];
      } else {
        if (!currentEmployeeId) return;
        const res = await apiClient.getLeavesByEmployee(currentEmployeeId);
        data = Array.isArray(res.data) ? res.data : [];
      }
      const mapped: LeaveRequest[] = data.map((l: LeaveApiResponse) => {
        const empName =
          typeof l.employee === "object"
            ? ((l.employee as { user?: { name?: string }; name?: string })?.user
                ?.name ??
              (l.employee as { user?: { name?: string }; name?: string })?.name)
            : (l.employee ?? l.employee_name ?? "Unknown");
        const policyName =
          typeof l.leaveType === "object"
            ? (l.leaveType?.name ?? "Unknown Leave")
            : (l.leaveType ?? "Unknown Leave");
        return {
          id: l.id ?? "",
          employee: empName,
          type: policyName,
          from: l.start_date?.split("T")[0] ?? "",
          to: l.end_date?.split("T")[0] ?? "",
          days: l.days_count ?? l.days ?? 1,
          status: normaliseStatus(l.status),
          reason: l.reason ?? "",
          appliedOn: l.created_at?.split("T")[0] ?? "",
          approvedBy: l.approved_by ?? l.approvedBy,
          remarks: l.remarks,
          rejectionReason:
            l.status?.toLocaleLowerCase() === "rejected"
              ? (l.rejection_reason ?? l.approval_notes ?? l.rejectionReason)
              : "",
        };
      });
      setRequests(mapped);
    } catch (err) {
      console.error("Failed to fetch leaves", err);
    }
  }, [isHR, currentEmployeeId]);

  const fetchPolicies = useCallback(async () => {
    try {
      const res = await apiClient.getPolicies();
      setPolicies((Array.isArray(res.data) ? res.data : []).map(mapPolicy));
    } catch (err) {
      console.error("Failed to fetch policies", err);
    }
  }, []);

  const fetchLeaveBalance = useCallback(async () => {
    try {
      if (!currentEmployeeId) return;
      const res = await apiClient.getLeaveBalance(currentEmployeeId);
      if (res?.data) {
        // FIX 4: LeaveBalance type uses leave_type_id; the API response has a leave_type
        // string on the extended LeaveBalanceApi shape. Map carefully.
        setLeaveBalance(
          (res.data as unknown as LeaveBalanceApi[]).map((l) => ({
            id: l.id,
            employee_id: l.employee_id,
            year: l.year ?? new Date().getFullYear(),
            leave_type_id: l.leave_type_id,
            // Attach the human-readable name so cards can display it
            leave_type: l.leave_type,
            total: l.total ?? l.accrued ?? 0,
            used: l.used ?? 0,
            remaining: l.remaining ?? (l.total ?? 0) - (l.used ?? 0),
          })) as unknown as LeaveBalance[],
        );
      }
    } catch {
      toast({ title: "Failed to fetch leave balance", variant: "destructive" });
    }
  }, [currentEmployeeId, toast]);

  useEffect(() => {
    fetchLeaveBalance();
  }, [fetchLeaveBalance]);

  const fetchHolidays = useCallback(async () => {
    try {
      const res = await apiClient.getHolidays();
      const data = Array.isArray(res.data) ? res.data : [];
      setHolidays(
        data.map((h) => ({
          id: h.id,
          name: h.name,
          start_date: h.start_date?.split("T")[0] ?? "",
          end_date: h.end_date?.split("T")[0] ?? "",
          holiday_type: h.holiday_type,
        })),
      );
    } catch (err) {
      console.error("Failed to fetch holidays", err);
    }
  }, []);

  const fetchAllBalances = useCallback(async () => {
    if (!isHR) return;
    setBalancesLoading(true);
    try {
      const res = await apiClient.getAllLeaveBalances();
      setAllBalances(
        Array.isArray(res.data)
          ? (res.data as unknown as LeaveBalanceApi[])
          : [],
      );
    } catch (err) {
      console.error("Failed to fetch leave balances", err);
    } finally {
      setBalancesLoading(false);
    }
  }, [isHR]);

  useEffect(() => {
    fetchEmployees();
    fetchPolicies();
    fetchHolidays();
    fetchAllBalances();
  }, [fetchEmployees, fetchPolicies, fetchHolidays, fetchAllBalances]);

  useEffect(() => {
    if (isHR || currentEmployeeId) {
      fetchLeaves();
    }
  }, [isHR, currentEmployeeId, fetchLeaves]);

  useEffect(() => {
    if (!newOverride.employeeId || !newOverride.leaveType) return;
    const policy = policies.find((p) => p.name === newOverride.leaveType);
    if (!policy) return;
    const existing = allBalances.find(
      (b) =>
        b.employee_id === newOverride.employeeId &&
        b.leave_type_id === policy.id,
    );
    setNewOverride((prev) => ({
      ...prev,
      customQuota: existing?.total ?? policy.annualQuota,
    }));
  }, [newOverride.employeeId, newOverride.leaveType, policies, allBalances]);

  const activePolicies = useMemo(
    () => policies.filter((p) => p.active),
    [policies],
  );

  const employeeBalances = useMemo(() => {
    return employees.map((emp) => {
      const types = activePolicies.map((policy) => {
        const balance = allBalances.find(
          (b) => b.employee_id === emp.id && b.leave_type_id === policy.id,
        );
        let total: number;
        if (balance) {
          total = balance.total;
        } else if (policy.proRata) {
          total = 0;
        } else {
          total = policy.annualQuota;
        }
        const used = balance?.used ?? 0;
        const remaining = total - used;
        return {
          type: policy.name,
          policyId: policy.id,
          isProRata: policy.proRata,
          total,
          used,
          remaining,
          hasDbRow: !!balance,
        };
      });
      return { employee: emp, types };
    });
  }, [employees, activePolicies, allBalances]);

  const sortedEmployeeBalances = useMemo(() => {
    const sorted = [...employeeBalances].sort((a, b) => {
      if (!sortEmployeeName) return 0;
      const nameA = getEmployeeName(a.employee).toLowerCase();
      const nameB = getEmployeeName(b.employee).toLowerCase();
      return sortEmployeeName === "asc"
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    });
    if (!sortLeaveType) return sorted;
    return [...sorted].sort((a, b) => {
      const aType = a.types.find((t) => t.policyId === sortLeaveType.policyId);
      const bType = b.types.find((t) => t.policyId === sortLeaveType.policyId);
      const aVal = aType?.remaining ?? 0;
      const bVal = bType?.remaining ?? 0;
      return sortLeaveType.dir === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [employeeBalances, sortEmployeeName, sortLeaveType]);

  // FIX 3 (continued): filter using department status, not a flat field
  const eligibleEmployeeIds = new Set(
    employees
      .filter((e) => {
        const status = getLatestDepartment(e.department)?.employment_status;
        return status === "active" || status === "notice_period";
      })
      .map((e) => e.id),
  );

  const customizedBalances = allBalances.filter((b) => {
    const policy = policies.find((p) => p.id === b.leave_type_id);
    return (
      policy &&
      eligibleEmployeeIds.has(b.employee_id) &&
      b.total !== policy.annualQuota
    );
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleApplyLeave = async () => {
    if (!newLeave.type) {
      toast({ title: "Leave type is required", variant: "destructive" });
      return;
    }
    if (!newLeave.from) {
      toast({ title: "Start date is required", variant: "destructive" });
      return;
    }
    if (!newLeave.to) {
      toast({ title: "End date is required", variant: "destructive" });
      return;
    }
    if (new Date(newLeave.to) < new Date(newLeave.from)) {
      toast({
        title: "End date cannot be before start date",
        variant: "destructive",
      });
      return;
    }
    if (!newLeave.reason.trim()) {
      toast({ title: "Reason is required", variant: "destructive" });
      return;
    }
    if (isHR && applyForEmployee && !newLeave.employee) {
      toast({ title: "Please select an employee", variant: "destructive" });
      return;
    }
    try {
      const policy = policies.find((p) => p.name === newLeave.type);
      const employeeId =
        isHR && applyForEmployee
          ? employees.find((e) => e.id === newLeave.employee)?.id
          : currentEmployeeId;
      if (!employeeId || !policy?.id) {
        toast({
          title: "Error",
          description: "Invalid employee or leave type",
        });
        return;
      }
      await apiClient.createLeave({
        employee_id: employeeId,
        start_date: newLeave.from,
        end_date: newLeave.to,
        leave_type_id: policy.id,
        reason: newLeave.reason,
      });
      await fetchLeaves();
      toast({ title: "Leave applied" });
    } catch (err) {
      console.error("Create leave error:", err);
      toast({ title: "Error", description: "Failed to submit leave request." });
    }
    setNewLeave({ employee: "", type: "", from: "", to: "", reason: "" });
    setApplyForEmployee(false);
    setApplyDialog(false);
  };

  const handleApprove = async (req: LeaveRequest) => {
    try {
      await apiClient.approveLeave(req.id);
      await fetchLeaves();
      await fetchAllBalances();
      setSelectedRequest((prev) =>
        prev ? { ...prev, status: "Approved", approvedBy: "HR Admin" } : null,
      );
      toast({
        title: "Leave approved",
        description: `${req.employee}'s leave has been approved.`,
      });
    } catch {
      toast({ title: "Error", description: "Failed to approve leave." });
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim() || !selectedRequest) return;
    try {
      await apiClient.rejectLeave(selectedRequest.id, rejectReason);
      await fetchLeaves();
      setSelectedRequest((prev) =>
        prev
          ? { ...prev, status: "Rejected", rejectionReason: rejectReason }
          : null,
      );
      setRejectDialog(false);
      setRejectReason("");
      toast({ title: "Leave rejected" });
    } catch {
      toast({ title: "Error", description: "Failed to reject leave." });
    }
  };

  const handleEditLeave = async () => {
    if (!editData) return;
    if (!editData.from || !editData.to) {
      toast({ title: "Dates are required", variant: "destructive" });
      return;
    }
    if (new Date(editData.to) < new Date(editData.from)) {
      toast({
        title: "End date cannot be before start date",
        variant: "destructive",
      });
      return;
    }
    if (!editData.reason.trim()) {
      toast({ title: "Reason is required", variant: "destructive" });
      return;
    }
    try {
      const payload = {
        leave_type:
          leaveTypeToEnum[editData.type] ?? editData.type.toLowerCase(),
        start_date: editData.from,
        end_date: editData.to,
        reason: editData.reason,
      };
      await apiClient.updateLeave(editData.id, payload);
      await fetchLeaves();
      setEditDialog(false);
      setEditData(null);
      toast({
        title: "Leave updated",
        description: "Updated successfully (Pending re-approval).",
      });
    } catch (err) {
      console.error("Update failed:", err);
      // FIX 5: err is unknown — narrow before accessing .message
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Update failed", description: msg });
    }
  };

  const handleDeleteLeave = async (id: string) => {
    try {
      await apiClient.deleteLeave(id);
      await fetchLeaves();
      await fetchAllBalances();
      if (selectedRequest?.id === id) setSelectedRequest(null);
      toast({ title: "Leave request deleted" });
    } catch {
      toast({ title: "Error", description: "Failed to delete leave." });
    }
  };

  const handleExportLeaves = async () => {
    try {
      const res = await apiClient.exportLeaves({
        month: filterMonth,
        leave_type: filterLeaveType,
        employee: filterEmployee,
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "leave-requests.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const handleSaveHoliday = async () => {
    if (!newHoliday.name.trim()) {
      toast({ title: "Holiday name is required", variant: "destructive" });
      return;
    }
    if (!newHoliday.start_date) {
      toast({ title: "Start date is required", variant: "destructive" });
      return;
    }
    if (!newHoliday.end_date) {
      toast({ title: "End date is required", variant: "destructive" });
      return;
    }
    if (new Date(newHoliday.end_date) < new Date(newHoliday.start_date)) {
      toast({
        title: "End date cannot be before start date",
        variant: "destructive",
      });
      return;
    }
    try {
      await apiClient.createHoliday({
        name: newHoliday.name,
        start_date: newHoliday.start_date,
        end_date: newHoliday.end_date,
        holiday_type: newHoliday.holiday_type,
      });
      await fetchHolidays();
      setHolidayDialog(false);
      setNewHoliday({
        name: "",
        start_date: "",
        end_date: "",
        holiday_type: "public",
      });
      toast({ title: "Holiday added" });
    } catch (err) {
      console.error("Failed to add holiday", err);
      toast({ title: "Error", description: "Failed to add holiday." });
    }
  };

  const handleUpdateHoliday = async () => {
    if (!editHoliday) return;
    if (!editHoliday.name.trim()) {
      toast({ title: "Holiday name is required", variant: "destructive" });
      return;
    }
    if (!editHoliday.start_date) {
      toast({ title: "Start date is required", variant: "destructive" });
      return;
    }
    if (!editHoliday.end_date) {
      toast({ title: "End date is required", variant: "destructive" });
      return;
    }
    if (new Date(editHoliday.end_date) < new Date(editHoliday.start_date)) {
      toast({
        title: "End date cannot be before start date",
        variant: "destructive",
      });
      return;
    }
    try {
      await apiClient.updateHoliday(editHoliday.id, {
        name: editHoliday.name,
        start_date: editHoliday.start_date,
        end_date: editHoliday.end_date,
        holiday_type: editHoliday.holiday_type,
      });
      await fetchHolidays();
      setEditHoliday(null);
      toast({ title: "Holiday updated" });
    } catch (err) {
      console.error("Failed to update holiday", err);
      toast({ title: "Error", description: "Failed to update holiday." });
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    try {
      await apiClient.deleteHoliday(id);
      await fetchHolidays();
      toast({ title: "Holiday deleted" });
    } catch {
      toast({ title: "Error deleting holiday" });
    }
  };

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return (
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1
    );
  };

  const handleCreatePolicy = async () => {
    if (!newPolicy.name.trim()) {
      toast({ title: "Policy name is required", variant: "destructive" });
      return;
    }
    if (newPolicy.annualQuota < 0) {
      toast({
        title: "Annual quota cannot be negative",
        variant: "destructive",
      });
      return;
    }
    if (newPolicy.carryForward && newPolicy.maxCarryForward < 0) {
      toast({
        title: "Max carry forward cannot be negative",
        variant: "destructive",
      });
      return;
    }
    try {
      await apiClient.createPolicy({
        name: newPolicy.name,
        type: newPolicy.type,
        annual_quota: newPolicy.annualQuota,
        pro_rata: newPolicy.proRata,
        carry_forward: newPolicy.carryForward,
        max_carry_forward: newPolicy.maxCarryForward,
        description: "",
        active: true,
      });
      setPolicyDialog(false);
      setNewPolicy({
        name: "",
        type: "custom",
        annualQuota: 0,
        proRata: false,
        carryForward: false,
        maxCarryForward: 0,
      });
      await fetchPolicies();
      toast({ title: "Policy created" });
    } catch (err) {
      console.error("Error creating policy", err);
      toast({ title: "Error creating policy" });
    }
  };

  const handleUpdatePolicy = async () => {
    if (!editPolicy) return;
    try {
      await apiClient.updatePolicy(editPolicy.id, {
        name: editPolicy.name,
        type: editPolicy.type,
        annual_quota: editPolicy.annualQuota,
        pro_rata: editPolicy.proRata,
        carry_forward: editPolicy.carryForward,
        max_carry_forward: editPolicy.maxCarryForward,
        active: editPolicy.active,
      });
      setEditPolicy(null);
      await fetchPolicies();
      toast({ title: "Policy updated" });
    } catch (err) {
      console.error("Error updating policy", err);
      toast({ title: "Error updating policy" });
    }
  };

  const handleDeletePolicy = async (id: string) => {
    try {
      await apiClient.deletePolicy(id);
      await fetchPolicies();
      toast({ title: "Policy deleted successfully" });
    } catch (error) {
      // FIX 5 (continued): narrow unknown error
      const msg = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Cannot delete policy",
        description: msg,
        variant: "destructive",
      });
    }
  };

  const handleSaveOverride = async () => {
    if (!newOverride.employeeId) {
      toast({ title: "Please select an employee", variant: "destructive" });
      return;
    }
    if (!newOverride.leaveType) {
      toast({ title: "Please select a leave type", variant: "destructive" });
      return;
    }
    if (!newOverride.reason.trim()) {
      toast({ title: "Reason is required", variant: "destructive" });
      return;
    }
    const policy = policies.find((p) => p.name === newOverride.leaveType);
    if (!policy) {
      toast({ title: "Invalid leave type", variant: "destructive" });
      return;
    }
    try {
      await apiClient.updateLeaveBalance({
        employee_id: newOverride.employeeId,
        leave_type_id: policy.id,
        total: newOverride.customQuota,
        reason: newOverride.reason,
      });
      setOverrideDialog(false);
      setNewOverride({
        employeeId: "",
        leaveType: "",
        customQuota: 0,
        reason: "",
      });
      await fetchAllBalances();
      toast({ title: "Leave quota updated successfully" });
    } catch (err) {
      console.error("Failed to customize leave", err);
      toast({ title: "Error", description: "Failed to update leave quota." });
    }
  };

  const sortedOverrides = [...overrides].sort((a, b) => {
    const av = a[overrideSort.key as keyof LeaveOverride];
    const bv = b[overrideSort.key as keyof LeaveOverride];
    const cmp =
      typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv));
    return overrideSort.dir === "asc" ? cmp : -cmp;
  });

  const openOverrideDialog = (
    employeeId: string,
    leaveType: string,
    currentTotal: number,
  ) => {
    setNewOverride({
      employeeId,
      leaveType,
      customQuota: currentTotal,
      reason: "",
    });
    setOverrideDialog(true);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {selectedRequest ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 -ml-2 text-muted-foreground"
            onClick={() => setSelectedRequest(null)}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Leave Requests
          </Button>
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-lg font-semibold">
                    Leave Request {selectedRequest.id}
                  </h2>
                  <span
                    className={`status-pill ${statusClass[selectedRequest.status]}`}
                  >
                    {selectedRequest.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Submitted by {selectedRequest.employee}
                </p>
              </div>
              {isHR && (
                <div className="flex gap-2">
                  {selectedRequest.status === "Pending" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive border-destructive/20 hover:bg-destructive/10"
                        onClick={() => setRejectDialog(true)}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(selectedRequest)}
                      >
                        Approve
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => {
                      setEditData({ ...selectedRequest });
                      setEditDialog(true);
                    }}
                    disabled={selectedRequest.status === "Approved"}
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDeleteLeave(selectedRequest.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
              {!isHR && selectedRequest.status === "Pending" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={() => handleDeleteLeave(selectedRequest.id)}
                >
                  <Trash2 className="w-3 h-3" />
                  Cancel Request
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <User className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Employee</p>
                    <p className="text-sm font-medium">
                      {selectedRequest.employee}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <FileText className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Leave Type</p>
                    <p className="text-sm font-medium">
                      {selectedRequest.type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="text-sm font-medium font-mono-data">
                      {selectedRequest.from} → {selectedRequest.to}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedRequest.days} day(s)
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Reason</p>
                  <p className="text-sm">{selectedRequest.reason}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">
                    Applied On
                  </p>
                  <p className="text-sm font-mono-data">
                    {selectedRequest.appliedOn}
                  </p>
                </div>
                {selectedRequest.approvedBy && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">
                      Processed By
                    </p>
                    <p className="text-sm">{selectedRequest.approvedBy}</p>
                  </div>
                )}
                {selectedRequest.rejectionReason && (
                  <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                    <p className="text-xs text-destructive mb-1">
                      Rejection Reason
                    </p>
                    <p className="text-sm">{selectedRequest.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="text-sm font-semibold mb-3">Status Timeline</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <p className="text-sm">
                    Leave applied by{" "}
                    <span className="font-medium">
                      {selectedRequest.employee}
                    </span>
                  </p>
                  <span className="text-xs text-muted-foreground font-mono-data ml-auto">
                    {selectedRequest.appliedOn}
                  </span>
                </div>
                {selectedRequest.status !== "Pending" && (
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        selectedRequest.status === "Approved"
                          ? "bg-success"
                          : "bg-destructive"
                      }`}
                    />
                    <p className="text-sm">
                      Leave{" "}
                      <span className="font-medium">
                        {selectedRequest.status.toLowerCase()}
                      </span>
                      {selectedRequest.approvedBy && (
                        <>
                          {" "}
                          by{" "}
                          <span className="font-medium">
                            {selectedRequest.approvedBy}
                          </span>
                        </>
                      )}
                    </p>
                    <span className="text-xs text-muted-foreground font-mono-data ml-auto">
                      {selectedRequest.appliedOn}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <>
          <motion.div
            variants={item}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-lg font-semibold">Leave Management</h1>
              <p className="text-sm text-muted-foreground">
                Manage leave requests, holidays, and leave policies
              </p>
            </div>
            <div className="flex gap-2">
              <Dialog open={applyDialog} onOpenChange={setApplyDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5 press-effect">
                    <Plus className="w-3.5 h-3.5" />
                    Apply Leave
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {isHR ? "Apply Leave" : "Apply for Leave"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    {isHR && (
                      <div>
                        <label className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <input
                            type="checkbox"
                            checked={applyForEmployee}
                            onChange={(e) =>
                              setApplyForEmployee(e.target.checked)
                            }
                            className="rounded"
                          />
                          Apply on behalf of an employee
                        </label>
                        {applyForEmployee && (
                          <Select
                            value={newLeave.employee}
                            onValueChange={(v) =>
                              setNewLeave({ ...newLeave, employee: v })
                            }
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                            <SelectContent>
                              {employees.map((e) => (
                                <SelectItem key={e.id} value={e.id}>
                                  {getEmployeeName(e)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Leave Type *
                      </label>
                      <Select
                        value={newLeave.type}
                        onValueChange={(v) =>
                          setNewLeave({ ...newLeave, type: v })
                        }
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Select leave type" />
                        </SelectTrigger>
                        <SelectContent>
                          {leaveTypes.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                          From Date *
                        </label>
                        <Input
                          type="date"
                          value={newLeave.from}
                          onChange={(e) =>
                            setNewLeave({ ...newLeave, from: e.target.value })
                          }
                          className="h-9 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                          To Date *
                        </label>
                        <Input
                          type="date"
                          value={newLeave.to}
                          onChange={(e) =>
                            setNewLeave({ ...newLeave, to: e.target.value })
                          }
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Reason *
                      </label>
                      <Textarea
                        value={newLeave.reason}
                        onChange={(e) =>
                          setNewLeave({ ...newLeave, reason: e.target.value })
                        }
                        placeholder="Provide a reason..."
                        className="text-sm min-h-[80px]"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setApplyDialog(false);
                          setApplyForEmployee(false);
                          setNewLeave({
                            employee: "",
                            type: "",
                            from: "",
                            to: "",
                            reason: "",
                          });
                        }}
                      >
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleApplyLeave}>
                        Submit Request
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </motion.div>

          <motion.div variants={item}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-muted/50 border border-border p-1 h-auto">
                <TabsTrigger
                  value="requests"
                  className="gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Leave Requests
                </TabsTrigger>
                <TabsTrigger
                  value="holidays"
                  className="gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Holidays
                </TabsTrigger>
                {isHR && (
                  <TabsTrigger
                    value="policies"
                    className="gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    Leave Policies
                  </TabsTrigger>
                )}
                {isHR && (
                  <TabsTrigger
                    value="balances"
                    className="gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm"
                  >
                    <User className="w-3.5 h-3.5" />
                    Leave Balances
                  </TabsTrigger>
                )}
              </TabsList>

              {/* LEAVE REQUESTS */}
              <TabsContent value="requests" className="mt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 bg-card border border-border rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-medium">
                          Recent Requests
                          {filterRequests.length !== requests.length && (
                            <span className="ml-2 text-xs text-muted-foreground font-normal">
                              {filterRequests.length} of {requests.length}
                            </span>
                          )}
                        </h2>
                        <div className="flex items-center gap-2">
                          {isHR && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2.5 text-xs gap-1.5"
                              onClick={handleExportLeaves}
                              disabled={filterRequests.length === 0}
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                              </svg>
                              Export Excel
                            </Button>
                          )}
                          {(filterMonth !== "all" ||
                            filterLeaveType !== "all" ||
                            filterEmployee !== "all") && (
                            <button
                              type="button"
                              onClick={() => {
                                setFilterMonth("all");
                                setFilterLeaveType("all");
                                setFilterEmployee("all");
                              }}
                              className="flex items-center gap-1 h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted/50 transition-colors"
                            >
                              <span>Clear filters</span>
                              <span className="w-3.5 h-3.5 rounded-full bg-muted-foreground/20 flex items-center justify-center text-[10px] leading-none">
                                ✕
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Select
                          value={filterMonth}
                          onValueChange={setFilterMonth}
                        >
                          <SelectTrigger className="h-7 text-xs w-32 bg-muted/40 border-border/60">
                            <SelectValue placeholder="All Months" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Months</SelectItem>
                            {[
                              "January",
                              "February",
                              "March",
                              "April",
                              "May",
                              "June",
                              "July",
                              "August",
                              "September",
                              "October",
                              "November",
                              "December",
                            ].map((m, i) => (
                              <SelectItem key={i} value={String(i)}>
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={filterLeaveType}
                          onValueChange={setFilterLeaveType}
                        >
                          <SelectTrigger className="h-7 text-xs w-36 bg-muted/40 border-border/60">
                            <SelectValue placeholder="All Leave Types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Leave Types</SelectItem>
                            {[...new Set(requests.map((r) => r.type))].map(
                              (t) => (
                                <SelectItem key={t} value={t}>
                                  {t}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                        {isHR && (
                          <Select
                            value={filterEmployee}
                            onValueChange={setFilterEmployee}
                          >
                            <SelectTrigger className="h-7 text-xs w-40 bg-muted/40 border-border/60">
                              <SelectValue placeholder="All Employees" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Employees</SelectItem>
                              {[...new Set(requests.map((r) => r.employee))]
                                .sort()
                                .map((e) => (
                                  <SelectItem key={e} value={e}>
                                    {e}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}
                        {filterMonth !== "all" && (
                          <span className="inline-flex items-center gap-1 h-7 px-2 text-xs rounded-md bg-primary/10 text-primary border border-primary/20">
                            {
                              [
                                "Jan",
                                "Feb",
                                "Mar",
                                "Apr",
                                "May",
                                "Jun",
                                "Jul",
                                "Aug",
                                "Sep",
                                "Oct",
                                "Nov",
                                "Dec",
                              ][parseInt(filterMonth)]
                            }
                            <button
                              type="button"
                              onClick={() => setFilterMonth("all")}
                              className="hover:text-primary/70 leading-none"
                            >
                              ✕
                            </button>
                          </span>
                        )}
                        {filterLeaveType !== "all" && (
                          <span className="inline-flex items-center gap-1 h-7 px-2 text-xs rounded-md bg-primary/10 text-primary border border-primary/20">
                            {filterLeaveType}
                            <button
                              type="button"
                              onClick={() => setFilterLeaveType("all")}
                              className="hover:text-primary/70 leading-none"
                            >
                              ✕
                            </button>
                          </span>
                        )}
                        {filterEmployee !== "all" && (
                          <span className="inline-flex items-center gap-1 h-7 px-2 text-xs rounded-md bg-primary/10 text-primary border border-primary/20">
                            {filterEmployee}
                            <button
                              type="button"
                              onClick={() => setFilterEmployee("all")}
                              className="hover:text-primary/70 leading-none"
                            >
                              ✕
                            </button>
                          </span>
                        )}
                      </div>
                    </div>
                    <table className="nexus-table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Type</th>
                          <th>Duration</th>
                          <th>Days</th>
                          <th>Reason</th>
                          <th>Status</th>
                          <th className="w-20">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filterRequests.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="text-center text-sm text-muted-foreground py-8"
                            >
                              No leave requests found
                            </td>
                          </tr>
                        ) : (
                          filterRequests.map((req) => (
                            <tr
                              key={req.id}
                              className="cursor-pointer"
                              onClick={() => setSelectedRequest(req)}
                            >
                              <td className="text-sm font-medium">
                                {req.employee}
                              </td>
                              <td className="text-sm text-muted-foreground">
                                {req.type}
                              </td>
                              <td className="font-mono-data text-xs text-muted-foreground">
                                {req.from} → {req.to}
                              </td>
                              <td className="font-mono-data text-xs">
                                {req.days}
                              </td>
                              <td className="text-xs">
                                {req.status === "Rejected" ? (
                                  <p className="text-destructive">
                                    {req.rejectionReason ||
                                      "No reason provided"}
                                  </p>
                                ) : (
                                  req.reason
                                )}
                              </td>
                              <td>
                                <span
                                  className={`status-pill ${statusClass[req.status]}`}
                                >
                                  {req.status}
                                </span>
                              </td>
                              <td onClick={(e) => e.stopPropagation()}>
                                <div className="flex gap-1">
                                  {isHR && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                      onClick={() => {
                                        setEditData({ ...req });
                                        setEditDialog(true);
                                      }}
                                      disabled={req.status === "Approved"}
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                  {(isHR || req.status === "Pending") && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-1.5"
                                      onClick={() => handleDeleteLeave(req.id)}
                                    >
                                      <Trash2 className="w-3 h-3 text-destructive" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-card border border-border rounded-lg">
                    <div className="px-4 py-3 border-b border-border">
                      <h2 className="text-sm font-medium">Upcoming Holidays</h2>
                    </div>
                    <div className="p-2">
                      {holidays.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No holidays scheduled
                        </p>
                      ) : (
                        holidays.map((h) => (
                          <div
                            key={h.id}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted/50 transition-colors"
                          >
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex flex-col items-center justify-center shrink-0">
                              <span className="text-[12px] font-bold text-primary leading-none">
                                {new Date(h.start_date)
                                  .toLocaleDateString("en", { month: "short" })
                                  .toUpperCase()}
                              </span>
                              <span className="text-[12px] flex flex-row items-center">
                                <span>
                                  {new Date(h.start_date).toLocaleDateString(
                                    "en",
                                    { day: "numeric" },
                                  )}
                                </span>
                                <span>
                                  {h.start_date !== h.end_date &&
                                    ` - ${new Date(h.end_date).toLocaleDateString("en", { day: "numeric" })}`}
                                </span>
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{h.name}</p>
                              <p className="text-xs text-muted-foreground font-mono-data">
                                {calculateDays(h.start_date, h.end_date)}{" "}
                                {calculateDays(h.start_date, h.end_date) === 1
                                  ? "day"
                                  : "days"}
                              </p>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary capitalize">
                              {h.holiday_type}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* HOLIDAYS */}
              <TabsContent value="holidays" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Holiday Calendar</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {holidays.length} holidays configured for the year
                    </p>
                  </div>
                  {isHR && (
                    <Dialog
                      open={holidayDialog}
                      onOpenChange={setHolidayDialog}
                    >
                      <DialogTrigger asChild>
                        <Button size="sm" className="gap-1.5 press-effect">
                          <Plus className="w-3.5 h-3.5" />
                          Add Holiday
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm">
                        <DialogHeader>
                          <DialogTitle>Add Holiday</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 pt-2">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                              Holiday Name *
                            </label>
                            <Input
                              value={newHoliday.name}
                              onChange={(e) =>
                                setNewHoliday({
                                  ...newHoliday,
                                  name: e.target.value,
                                })
                              }
                              className="h-9 text-sm"
                              placeholder="e.g. Dashain"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                              Start Date *
                            </label>
                            <Input
                              type="date"
                              value={newHoliday.start_date}
                              onChange={(e) =>
                                setNewHoliday({
                                  ...newHoliday,
                                  start_date: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                              End Date *
                            </label>
                            <Input
                              type="date"
                              value={newHoliday.end_date}
                              onChange={(e) =>
                                setNewHoliday({
                                  ...newHoliday,
                                  end_date: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                              Type
                            </label>
                            <Select
                              value={newHoliday.holiday_type}
                              onValueChange={(v) =>
                                setNewHoliday({
                                  ...newHoliday,
                                  holiday_type: v as Holiday["holiday_type"],
                                })
                              }
                            >
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="public">Public</SelectItem>
                                <SelectItem value="company">Company</SelectItem>
                                <SelectItem value="regional">
                                  Regional
                                </SelectItem>
                                <SelectItem value="religious">
                                  Religious
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setHolidayDialog(false)}
                            >
                              Cancel
                            </Button>
                            <Button size="sm" onClick={handleSaveHoliday}>
                              Add Holiday
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <table className="nexus-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Holiday Name</th>
                        <th>Type</th>
                        {isHR && <th className="w-24">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {holidays
                        .sort((a, b) =>
                          a.start_date.localeCompare(b.start_date),
                        )
                        .map((h) => (
                          <tr key={h.id}>
                            <td className="font-mono-data text-xs">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex flex-col items-center justify-center shrink-0">
                                <span className="text-[12px] font-bold text-primary leading-none">
                                  {new Date(h.start_date)
                                    .toLocaleDateString("en", {
                                      month: "short",
                                    })
                                    .toUpperCase()}
                                </span>
                                {h.start_date === h.end_date ? (
                                  <span>
                                    {new Date(h.start_date).toLocaleDateString(
                                      "en",
                                      { day: "numeric" },
                                    )}
                                  </span>
                                ) : (
                                  <span className="flex whitespace-nowrap text-[12px]">
                                    <span>
                                      {new Date(
                                        h.start_date,
                                      ).toLocaleDateString("en", {
                                        day: "numeric",
                                      })}
                                      -
                                    </span>
                                    <span>
                                      {new Date(h.end_date).toLocaleDateString(
                                        "en",
                                        { day: "numeric" },
                                      )}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="text-sm font-medium">{h.name}</td>
                            <td>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">
                                {h.holiday_type}
                              </span>
                            </td>
                            {isHR && (
                              <td>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-1.5"
                                    onClick={() => setEditHoliday({ ...h })}
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-1.5"
                                    onClick={() => handleDeleteHoliday(h.id)}
                                  >
                                    <Trash2 className="w-3 h-3 text-destructive" />
                                  </Button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* LEAVE POLICIES */}
              {isHR && (
                <TabsContent value="policies" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">
                        Leave Policy Settings
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Configure leave types, quotas, and pro-rata rules
                      </p>
                    </div>
                    <Dialog open={policyDialog} onOpenChange={setPolicyDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="gap-1.5 press-effect">
                          <Plus className="w-3.5 h-3.5" />
                          Add Leave Type
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Add Leave Type</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 pt-2">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                              Leave Name *
                            </label>
                            <Input
                              value={newPolicy.name}
                              onChange={(e) =>
                                setNewPolicy({
                                  ...newPolicy,
                                  name: e.target.value,
                                })
                              }
                              className="h-9 text-sm"
                              placeholder="e.g. Maternity Leave"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                              Type
                            </label>
                            <Select
                              value={newPolicy.type}
                              onValueChange={(v) =>
                                setNewPolicy({
                                  ...newPolicy,
                                  type: v as LeavePolicy["type"],
                                })
                              }
                            >
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="sick">Sick</SelectItem>
                                <SelectItem value="unpaid">Unpaid</SelectItem>
                                <SelectItem value="compensatory">
                                  Compensatory
                                </SelectItem>
                                <SelectItem value="custom">Custom</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                              Annual Quota (days)
                            </label>
                            <Input
                              type="number"
                              value={newPolicy.annualQuota}
                              onChange={(e) =>
                                setNewPolicy({
                                  ...newPolicy,
                                  annualQuota: +e.target.value,
                                })
                              }
                              className="h-9 text-sm font-mono-data"
                              min={0}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-muted-foreground">
                              Pro-Rata (1 leave per month worked)
                            </label>
                            <Switch
                              checked={newPolicy.proRata}
                              onCheckedChange={(v) =>
                                setNewPolicy({ ...newPolicy, proRata: v })
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-muted-foreground">
                              Carry Forward
                            </label>
                            <Switch
                              checked={newPolicy.carryForward}
                              onCheckedChange={(v) =>
                                setNewPolicy({ ...newPolicy, carryForward: v })
                              }
                            />
                          </div>
                          {newPolicy.carryForward && (
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">
                                Max Carry Forward (days)
                              </label>
                              <Input
                                type="number"
                                value={newPolicy.maxCarryForward}
                                onChange={(e) =>
                                  setNewPolicy({
                                    ...newPolicy,
                                    maxCarryForward: +e.target.value,
                                  })
                                }
                                className="h-9 text-sm font-mono-data"
                                min={0}
                              />
                            </div>
                          )}
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPolicyDialog(false)}
                            >
                              Cancel
                            </Button>
                            <Button size="sm" onClick={handleCreatePolicy}>
                              Add Policy
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {policies.map((p) => (
                      <div
                        key={p.id}
                        className="bg-card border border-border rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold">
                                {p.name}
                              </h4>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${p.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}
                              >
                                {p.active ? "Active" : "Inactive"}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
                              {p.type} leave
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1.5"
                              onClick={() => setEditPolicy({ ...p })}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1.5"
                              onClick={() => handleDeletePolicy(p.id)}
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 bg-muted/30 rounded">
                            <p className="text-muted-foreground">
                              Annual Quota
                            </p>
                            <p className="font-semibold font-mono-data">
                              {p.annualQuota} days
                            </p>
                          </div>
                          <div className="p-2 bg-muted/30 rounded">
                            <p className="text-muted-foreground">Pro-Rata</p>
                            <p className="font-semibold">
                              {p.proRata ? "Yes (1/month)" : "No"}
                            </p>
                          </div>
                          <div className="p-2 bg-muted/30 rounded">
                            <p className="text-muted-foreground">
                              Carry Forward
                            </p>
                            <p className="font-semibold">
                              {p.carryForward
                                ? `Yes (max ${p.maxCarryForward}d)`
                                : "No"}
                            </p>
                          </div>
                          <div className="p-2 bg-muted/30 rounded">
                            <p className="text-muted-foreground">Status</p>
                            <p className="font-semibold">
                              {p.active ? "Active" : "Disabled"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              )}

              {/* LEAVE BALANCES */}
              {isHR && (
                <TabsContent value="balances" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">
                        Employee Leave Balances
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Customize leave quotas per employee with reason.
                        Defaults come from active policies.
                      </p>
                    </div>
                    <Dialog
                      open={overrideDialog}
                      onOpenChange={(open) => {
                        setOverrideDialog(open);
                        if (!open)
                          setNewOverride({
                            employeeId: "",
                            leaveType: "",
                            customQuota: 0,
                            reason: "",
                          });
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button size="sm" className="gap-1.5 press-effect">
                          <Plus className="w-3.5 h-3.5" />
                          Customize Leave
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Customize Employee Leave</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 pt-2">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                              Employee *
                            </label>
                            <Select
                              value={newOverride.employeeId}
                              onValueChange={(v) =>
                                setNewOverride({
                                  ...newOverride,
                                  employeeId: v,
                                  leaveType: "",
                                  customQuota: 0,
                                })
                              }
                            >
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Select employee" />
                              </SelectTrigger>
                              <SelectContent>
                                {employees.map((e) => (
                                  <SelectItem key={e.id} value={e.id}>
                                    {getEmployeeName(e)} — {getEmployeeDept(e)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                              Leave Type *
                            </label>
                            <Select
                              value={newOverride.leaveType}
                              onValueChange={(v) =>
                                setNewOverride({ ...newOverride, leaveType: v })
                              }
                            >
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Select leave type" />
                              </SelectTrigger>
                              <SelectContent>
                                {leaveTypes.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {t}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                              Custom Quota (days)
                            </label>
                            <Input
                              type="number"
                              value={newOverride.customQuota}
                              onChange={(e) =>
                                setNewOverride({
                                  ...newOverride,
                                  customQuota: Number(e.target.value),
                                })
                              }
                              className="h-9 text-sm font-mono-data"
                              step={1}
                            />
                            {newOverride.leaveType && (
                              <p className="text-[10px] text-muted-foreground mt-1">
                                Policy default:{" "}
                                {policies.find(
                                  (p) => p.name === newOverride.leaveType,
                                )?.annualQuota ?? "—"}{" "}
                                days
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                              Reason *
                            </label>
                            <Textarea
                              value={newOverride.reason}
                              onChange={(e) =>
                                setNewOverride({
                                  ...newOverride,
                                  reason: e.target.value,
                                })
                              }
                              placeholder="Why this customization is needed..."
                              className="text-sm min-h-[80px]"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setOverrideDialog(false)}
                            >
                              Cancel
                            </Button>
                            <Button size="sm" onClick={handleSaveOverride}>
                              Save Customization
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Active Customisations */}
                  <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                      <h4 className="text-sm font-medium">
                        Active Customizations
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        {customizedBalances.length} custom rule(s)
                      </span>
                    </div>
                    {customizedBalances.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground">
                        No custom leave rules yet. Click any balance cell or
                        "Customize Leave" to override a quota.
                      </div>
                    ) : (
                      <table className="nexus-table">
                        <thead>
                          <tr>
                            <th>Employee</th>
                            <th>Leave Type</th>
                            <th>Custom Total</th>
                            <th>Policy Default</th>
                            <th>Used</th>
                            <th>Remaining</th>
                            <th className="w-20">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customizedBalances.map((b) => {
                            const policy = policies.find(
                              (p) => p.id === b.leave_type_id,
                            );
                            const remaining = b.total - b.used;
                            return (
                              <tr key={`${b.id}-${b.employee_id}`}>
                                <td className="text-sm font-medium">
                                  {b.employee?.first_name ?? "Unknown"}{" "}
                                  {b.employee?.last_name ?? ""}
                                  {b.employee?.department && (
                                    <p className="text-[10px] text-muted-foreground font-normal">
                                      {b.employee.department}
                                    </p>
                                  )}
                                </td>
                                <td className="text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1.5">
                                    {b.leave_type}
                                    {policy?.proRata && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 font-medium">
                                        pro-rata
                                      </span>
                                    )}
                                  </span>
                                </td>
                                <td className="font-mono-data text-xs font-semibold text-primary">
                                  {b.total}d
                                </td>
                                <td className="font-mono-data text-xs text-muted-foreground">
                                  {policy?.annualQuota ?? "—"}d
                                </td>
                                <td className="font-mono-data text-xs">
                                  {b.used}d
                                </td>
                                <td>
                                  <span
                                    className={`font-mono-data text-xs font-semibold ${remaining < 0 ? "text-destructive" : remaining <= 2 ? "text-amber-500" : "text-success"}`}
                                  >
                                    {remaining}d
                                  </span>
                                </td>
                                <td>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-1.5"
                                    onClick={() =>
                                      openOverrideDialog(
                                        b.employee_id,
                                        policies.find(
                                          (p) => p.id === b.leave_type_id,
                                        )?.name ?? "",
                                        b.total,
                                      )
                                    }
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Main Balance Matrix */}
                  <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h4 className="text-sm font-medium">
                          All Employee Leave Balances
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-success inline-block" />
                            OK
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                            Low (≤2)
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-destructive inline-block" />
                            Overdrawn
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setSortEmployeeName((prev) =>
                              prev === "asc"
                                ? "desc"
                                : prev === "desc"
                                  ? null
                                  : "asc",
                            )
                          }
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Name
                          {sortEmployeeName === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : sortEmployeeName === "desc" ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </button>
                        <button
                          onClick={fetchAllBalances}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {balancesLoading ? "Refreshing…" : "↻ Refresh"}
                        </button>
                      </div>
                    </div>
                    {balancesLoading ? (
                      <div className="p-8 text-center text-xs text-muted-foreground">
                        Loading balances…
                      </div>
                    ) : sortedEmployeeBalances.length === 0 ? (
                      <div className="p-8 text-center text-xs text-muted-foreground">
                        No employees found.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="nexus-table w-full">
                          <thead>
                            <tr>
                              <th className="sticky left-0 bg-card z-10 min-w-[160px]">
                                Employee
                              </th>
                              {activePolicies.map((p) => (
                                <th
                                  key={p.id}
                                  className="text-center min-w-[110px]"
                                >
                                  <button
                                    type="button"
                                    className="inline-flex flex-col items-center gap-0.5 w-full hover:text-foreground transition-colors"
                                    onClick={() =>
                                      setSortLeaveType((prev) => {
                                        if (prev?.policyId !== p.id)
                                          return { policyId: p.id, dir: "asc" };
                                        if (prev.dir === "asc")
                                          return {
                                            policyId: p.id,
                                            dir: "desc",
                                          };
                                        return null;
                                      })
                                    }
                                  >
                                    <span className="flex items-center gap-1">
                                      {p.name}
                                      {sortLeaveType?.policyId === p.id ? (
                                        sortLeaveType.dir === "asc" ? (
                                          <ArrowUp className="w-3 h-4 text-primary" />
                                        ) : (
                                          <ArrowDown className="w-3 h-4 text-primary" />
                                        )
                                      ) : (
                                        <ArrowUpDown className="w-3 h-4 text-muted-foreground opacity-40" />
                                      )}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      {p.proRata && (
                                        <span className="text-[9px] px-1 py-0.5 rounded bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 font-medium leading-none">
                                          pro-rata
                                        </span>
                                      )}
                                      <span className="text-[9px] text-muted-foreground font-normal">
                                        {p.proRata
                                          ? "1/mo"
                                          : `${p.annualQuota}d`}
                                      </span>
                                    </div>
                                  </button>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sortedEmployeeBalances.map(
                              ({ employee, types }) => (
                                <tr key={employee.id}>
                                  <td className="sticky left-0 bg-card z-10 text-sm font-medium whitespace-nowrap">
                                    {/* FIX 2: use helper instead of flat fields */}
                                    {getEmployeeName(employee)}
                                    <p className="text-[10px] text-muted-foreground font-normal">
                                      {getEmployeeDept(employee)}
                                    </p>
                                  </td>
                                  {types.map((t) => {
                                    const pct =
                                      t.total > 0
                                        ? Math.round((t.used / t.total) * 100)
                                        : 0;
                                    const statusColor =
                                      t.remaining < 0
                                        ? "text-destructive"
                                        : t.remaining <= 2
                                          ? "text-amber-500"
                                          : "text-success";
                                    const barColor =
                                      pct >= 100
                                        ? "bg-destructive"
                                        : pct >= 75
                                          ? "bg-amber-400"
                                          : "bg-primary";
                                    const policy = activePolicies.find(
                                      (p) => p.id === t.policyId,
                                    );
                                    const isCustomized =
                                      policy && t.total !== policy.annualQuota;
                                    return (
                                      <td
                                        key={t.policyId}
                                        className="text-center p-2"
                                      >
                                        <button
                                          type="button"
                                          title={`${t.type}: ${t.remaining} remaining / ${t.used} used / ${t.total} total${t.isProRata ? " (pro-rata 1/mo)" : ""}${isCustomized ? " [customized]" : ""}`}
                                          className="group inline-flex flex-col items-center gap-1 rounded-md px-2 py-1.5 hover:bg-muted/60 transition-colors cursor-pointer w-full"
                                          onClick={() =>
                                            openOverrideDialog(
                                              employee.id,
                                              t.type,
                                              t.total,
                                            )
                                          }
                                        >
                                          <span
                                            className={`font-mono-data text-sm font-bold leading-none ${statusColor}`}
                                          >
                                            {t.remaining}
                                          </span>
                                          <span className="text-[9px] text-muted-foreground leading-none">
                                            {t.used}/{t.total}d
                                            {isCustomized && (
                                              <span className="ml-1 text-primary">
                                                ✎
                                              </span>
                                            )}
                                            {!t.hasDbRow && t.isProRata && (
                                              <span className="ml-1 opacity-50">
                                                —
                                              </span>
                                            )}
                                          </span>
                                          <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                            <div
                                              className={`h-full rounded-full transition-all ${barColor}`}
                                              style={{
                                                width: `${Math.min(pct, 100)}%`,
                                              }}
                                            />
                                          </div>
                                          <span className="text-[9px] text-primary opacity-0 group-hover:opacity-100 transition-opacity leading-none">
                                            edit
                                          </span>
                                        </button>
                                      </td>
                                    );
                                  })}
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </motion.div>
        </>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for rejecting{" "}
              <span className="font-medium text-foreground">
                {selectedRequest?.employee}
              </span>
              's leave request.
            </p>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Rejection Reason *
              </label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter the reason for rejection..."
                className="text-sm min-h-[100px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRejectDialog(false);
                  setRejectReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectReason.trim()}
              >
                Reject Leave
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Leave Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Leave Request</DialogTitle>
          </DialogHeader>
          {editData && (
            <div className="space-y-4 pt-2">
              {(editData.status === "Approved" ||
                editData.status === "Rejected") && (
                <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50">
                  <span className="text-amber-600 dark:text-amber-400 mt-0.5">
                    ⚠
                  </span>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    This request is currently <strong>{editData.status}</strong>
                    . Saving any change will reset it to{" "}
                    <strong>Pending</strong> and require HR re-approval.
                  </p>
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Employee
                </label>
                <Input
                  value={editData.employee}
                  disabled
                  className="h-9 text-sm opacity-60"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Leave Type
                </label>
                <Select
                  value={editData.type}
                  onValueChange={(v) => setEditData({ ...editData, type: v })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    From
                  </label>
                  <Input
                    type="date"
                    value={editData.from}
                    onChange={(e) =>
                      setEditData({ ...editData, from: e.target.value })
                    }
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    To
                  </label>
                  <Input
                    type="date"
                    value={editData.to}
                    onChange={(e) =>
                      setEditData({ ...editData, to: e.target.value })
                    }
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Reason
                </label>
                <Textarea
                  value={editData.reason}
                  onChange={(e) =>
                    setEditData({ ...editData, reason: e.target.value })
                  }
                  className="text-sm min-h-[60px]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditDialog(false)}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleEditLeave}>
                  Save & Reset to Pending
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Holiday Dialog */}
      <Dialog open={!!editHoliday} onOpenChange={() => setEditHoliday(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Holiday</DialogTitle>
          </DialogHeader>
          {editHoliday && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Holiday Name
                </label>
                <Input
                  value={editHoliday.name}
                  onChange={(e) =>
                    setEditHoliday({ ...editHoliday, name: e.target.value })
                  }
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={editHoliday.start_date}
                  onChange={(e) =>
                    setEditHoliday({
                      ...editHoliday,
                      start_date: e.target.value,
                    })
                  }
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  End Date
                </label>
                <Input
                  type="date"
                  value={editHoliday.end_date}
                  onChange={(e) =>
                    setEditHoliday({ ...editHoliday, end_date: e.target.value })
                  }
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Type
                </label>
                <Select
                  value={editHoliday.holiday_type}
                  onValueChange={(v) =>
                    setEditHoliday({
                      ...editHoliday,
                      holiday_type: v as Holiday["holiday_type"],
                    })
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="regional">Regional</SelectItem>
                    <SelectItem value="religious">Religious</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditHoliday(null)}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleUpdateHoliday}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Policy Dialog */}
      <Dialog open={!!editPolicy} onOpenChange={() => setEditPolicy(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Leave Policy</DialogTitle>
          </DialogHeader>
          {editPolicy && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Leave Name
                </label>
                <Input
                  value={editPolicy.name}
                  onChange={(e) =>
                    setEditPolicy({ ...editPolicy, name: e.target.value })
                  }
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Type
                </label>
                <Select
                  value={editPolicy.type}
                  onValueChange={(v) =>
                    setEditPolicy({
                      ...editPolicy,
                      type: v as LeavePolicy["type"],
                    })
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="sick">Sick</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="compensatory">Compensatory</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Annual Quota (days)
                </label>
                <Input
                  type="number"
                  value={editPolicy.annualQuota}
                  onChange={(e) =>
                    setEditPolicy({
                      ...editPolicy,
                      annualQuota: +e.target.value,
                    })
                  }
                  className="h-9 text-sm font-mono-data"
                  min={0}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">
                  Pro-Rata
                </label>
                <Switch
                  checked={editPolicy.proRata}
                  onCheckedChange={(v) =>
                    setEditPolicy({ ...editPolicy, proRata: v })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">
                  Carry Forward
                </label>
                <Switch
                  checked={editPolicy.carryForward}
                  onCheckedChange={(v) =>
                    setEditPolicy({ ...editPolicy, carryForward: v })
                  }
                />
              </div>
              {editPolicy.carryForward && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Max Carry Forward
                  </label>
                  <Input
                    type="number"
                    value={editPolicy.maxCarryForward}
                    onChange={(e) =>
                      setEditPolicy({
                        ...editPolicy,
                        maxCarryForward: +e.target.value,
                      })
                    }
                    className="h-9 text-sm font-mono-data"
                    min={0}
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Active</label>
                <Switch
                  checked={editPolicy.active}
                  onCheckedChange={(v) =>
                    setEditPolicy({ ...editPolicy, active: v })
                  }
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditPolicy(null)}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleUpdatePolicy}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Employee Leave Balance Cards */}
      {!isHR && (
        <>
          <div className="font-semibold text-md">My Leave Balance</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {leaveBalance?.length > 0 ? (
              leaveBalance.map((lb) => {
                // FIX 4: LeaveBalance.leave_type_id is the enum key; the extended shape
                // carries leave_type as a display string — access it via cast.
                const leaveTypeName =
                  (lb as unknown as LeaveBalanceApi).leave_type ??
                  lb.leave_type_id;
                const total = lb.total ?? 0;
                const used = lb.used ?? 0;
                const remaining = lb.remaining ?? total - used;
                const percentage =
                  total > 0 ? Math.round((used / total) * 100) : 0;
                const Icon =
                  leaveTypeIcons[leaveTypeName?.toLowerCase()] ?? Briefcase;
                return (
                  <div
                    key={lb.leave_type_id}
                    className="group relative bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/40 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-md bg-primary/10 text-primary">
                          <Icon className="w-4 h-4" />
                        </div>
                        <p className="text-sm font-semibold">{leaveTypeName}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {percentage}%
                      </span>
                    </div>
                    <div className="mb-3">
                      <p className="text-2xl font-bold tracking-tight">
                        {remaining}
                        <span className="text-sm font-normal text-muted-foreground ml-1">
                          days left
                        </span>
                      </p>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-3">
                      <span>Used: {used}</span>
                      <span>Total: {total}</span>
                    </div>
                    {total > 0 && (
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${percentage > 80 ? "bg-red-500" : percentage > 60 ? "bg-amber-500" : "bg-primary"}`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition pointer-events-none bg-gradient-to-r from-primary/5 to-transparent" />
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-xl">
                <p className="text-sm text-muted-foreground">
                  No leave records found.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}
