import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  CalendarDays,
  AlertTriangle,
  UserPlus,
  ArrowUpRight,
  Calendar as CalendarIcon,
  CakeIcon,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useRole } from "@/contexts/RoleContext";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/services/apiClient";
import {
  type Employee,
  type DepartmentRecord,
  getLatestDepartment,
  normalizeEmployee,
} from "@/types";
import { Dialog, DialogContent, DialogTitle } from "@radix-ui/react-dialog";
import { DialogHeader } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LeaveApiResponse, LeaveRequest } from "./LeaveManagement";
import { type LeaveData } from "@/services/apiClient";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Protected } from "@/components/common/ProtectedRoute";
import { LeaveManagementAction } from "@/permissions/permission";

// ─────────────────────────────────────────────────────────────────────────────
// Animation variants
// ─────────────────────────────────────────────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.1, 0, 1] },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const months = [
  { label: "All", value: "all" },
  { label: "Jan", value: 0 },
  { label: "Feb", value: 1 },
  { label: "Mar", value: 2 },
  { label: "Apr", value: 3 },
  { label: "May", value: 4 },
  { label: "Jun", value: 5 },
  { label: "Jul", value: 6 },
  { label: "Aug", value: 7 },
  { label: "Sep", value: 8 },
  { label: "Oct", value: 9 },
  { label: "Nov", value: 10 },
  { label: "Dec", value: 11 },
];

const leaveStatusClass: Record<string, string> = {
  "Paid Leave": "paid",
  "Sick Leave": "sick",
  "Unpaid Leave": "unpaid",
  Vacation: "status-active",
  Personal: "status-pending",
  Maternity: "status-active",
};

const enumToLeaveType: Record<string, string> = {
  sick: "Sick Leave",
  personal: "Personal Leave",
  vacation: "Vacation",
  maternity: "Maternity Leave",
  casual: "Casual Leave",
  unpaid: "Unpaid Leave",
  paid: "Paid Leave",
  compensatory: "Compensatory Leave",
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

// ─────────────────────────────────────────────────────────────────────────────
// Local types
// ─────────────────────────────────────────────────────────────────────────────
interface StatItem {
  label: string;
  value: number;
  icon: React.ElementType;
  change: string;
  positive: boolean;
}

interface Holiday {
  id?: string;
  start_date: string;
  end_date: string;
  name: string;
}

interface ActivityRecord {
  text: string;
  time: string;
  type: "clockin" | "leave" | "new" | "exit";
}

interface PendingAction {
  id: string;
  type: string;
  description: string;
  priority: string;
  /** Display name derived from the employee's personal_details */
  name: string;
  dept: string;
  time: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: safely read name / department from the normalised Employee type
// ─────────────────────────────────────────────────────────────────────────────

/** Returns "First Last" from personal_details, falling back to Employee.name */
function getEmployeeName(emp: Employee): string {
  const pd = emp.personal_details;
  const full = `${pd?.first_name ?? ""} ${pd?.last_name ?? ""}`.trim();
  return full || emp.name || emp.email || "Unknown";
}

/** Returns the current department name using the canonical helper */
function getEmployeeDeptName(emp: Employee): string {
  return getLatestDepartment(emp.department)?.department_name ?? "—";
}

/** Returns the date_of_birth string from personal_details */
function getEmployeeDOB(emp: Employee): string | undefined {
  return emp.personal_details?.date_of_birth;
}

/**
 * Returns the employment_status string.
 * The status lives in personal_details on the API shape but is also
 * exposed via the latest DepartmentRecord's employment_status field.
 * We prefer personal_details first.
 */
function getEmploymentStatus(emp: Employee): string {
  return (
    emp.personal_details?.employment_status ??
    getLatestDepartment(emp.department)?.employment_status ??
    "active"
  ).toLowerCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Extended Employee type for the birthday list
// ─────────────────────────────────────────────────────────────────────────────
type EmployeeWithBirthday = Employee & {
  nextBirthday: Date;
  daysLeft: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard component
// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { isHR } = useRole();
  const { toast } = useToast();
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(
    new Date(),
  );
  const [birthdays, setBirthdays] = useState<EmployeeWithBirthday[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(
    null,
  );
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [stats, setStats] = useState<StatItem[]>([
    {
      label: "Active Employees",
      value: 0,
      icon: Users,
      change: "—",
      positive: true,
    },
    {
      label: "Pending Offboarding",
      value: 0,
      icon: UserPlus,
      change: "—",
      positive: true,
    },
    {
      label: "On Leave Today",
      value: 0,
      icon: CalendarDays,
      change: "—",
      positive: true,
    },
    {
      label: "Clearance Required",
      value: 0,
      icon: AlertTriangle,
      change: "—",
      positive: true,
    },
  ]);

  const [todayLeaves, setTodayLeaves] = useState<LeaveData[]>([]);
  const [allLeaves, setAllLeaves] = useState<LeaveData[]>([]);
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

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [upcomingHolidays, setUpcomingHolidays] = useState<Holiday[]>([]);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Fetch leave requests (HR sees all; employee sees own) ──────────────────
  const fetchLeaves = async () => {
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
            l.rejection_reason ?? l.approval_notes ?? l.rejectionReason,
        };
      });

      setRequests(mapped);
    } catch (err) {
      console.error("Failed to fetch leaves", err);
    }
  };

  // ── Main dashboard data fetch ──────────────────────────────────────────────
  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [employeesRes, leavesRes, holidaysRes] = await Promise.all([
        apiClient.getEmployees(),
        apiClient.getLeaves(),
        apiClient.getHolidays(),
      ]);

      const employees: Employee[] = Array.isArray(employeesRes.data)
        ? employeesRes.data.map(normalizeEmployee)
        : [];

      // Raw leave records from backend (LeaveData shape)
      const rawLeaves: LeaveData[] = Array.isArray(leavesRes.data)
        ? leavesRes.data
        : [];

      // Build pending actions from raw leave records.
      // FIX: use personal_details.first_name / last_name, not leave.employee.*
      const pendingLeaveActions: PendingAction[] = rawLeaves
        .filter((leave) => leave.status?.toLowerCase() === "pending")
        .map((leave) => ({
          id: leave.id ?? "",
          type: "leave",
          description:
            enumToLeaveType[leave.leave_type ?? ""] ??
            leave.leave_type ??
            "Leave Request",
          priority: "medium",
          // FIX: name comes from personal_details, not a flat .employee object
          name: leave.personal_details
            ? `${leave.personal_details.first_name} ${leave.personal_details.last_name}`.trim()
            : "Unknown",
          // FIX: department name from the nested DepartmentRecord
          dept: leave.department?.department_name ?? "—",
          time: leave.start_date?.split("T")[0] ?? "—",
        }));

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayLeavesList = rawLeaves.filter((leave) => {
        if (!leave.start_date || !leave.end_date) return false;
        const start = new Date(leave.start_date);
        const end = new Date(leave.end_date);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        const approved =
          !leave.status || leave.status.toLowerCase() === "approved";
        return start <= today && today <= end && approved;
      });

      const holidays: Holiday[] = Array.isArray(holidaysRes.data)
        ? holidaysRes.data.map(
            (h: { id?: string; name?: string; start_date?: string; end_date?: string }) => ({
              id: h.id,
              name: h.name ?? "Holiday",
              start_date: h.start_date?.split("T")[0] ?? "",
              end_date: h.end_date?.split("T")[0] ?? "",
            }),
          )
        : [];

      // FIX: use getEmploymentStatus helper instead of emp.employment_status
      const activeEmployees = employees.filter(
        (e) => getEmploymentStatus(e) === "active",
      );

      const pendingOffboarding = employees.filter(
        (e) => getEmploymentStatus(e) === "notice_period",
      );

      setStats([
        {
          label: "Active Employees",
          value: activeEmployees.length,
          icon: Users,
          change: "—",
          positive: true,
        },
        {
          label: "Pending Offboarding",
          value: pendingOffboarding.length,
          icon: UserPlus,
          change: "—",
          positive: true,
        },
        {
          label: "On Leave Today",
          value: todayLeavesList.length,
          icon: CalendarDays,
          change: "—",
          positive: true,
        },
        {
          label: "Clearance Required",
          value: 0,
          icon: AlertTriangle,
          change: "—",
          positive: true,
        },
      ]);

      setTodayLeaves(todayLeavesList);
      setAllLeaves(rawLeaves);
      setUpcomingHolidays(holidays);
      setPendingActions(pendingLeaveActions);
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Birthday fetch ─────────────────────────────────────────────────────────
  const fetchBirthdays = async () => {
    try {
      const res = await apiClient.getEmployees();
      const employees: Employee[] = Array.isArray(res.data)
        ? res.data.map(normalizeEmployee)
        : [];

      const today = new Date();

      const upcoming: EmployeeWithBirthday[] = employees
        .filter((e) => {
          const status = getEmploymentStatus(e);
          return ["active", "notice_period"].includes(status);
        })
        // FIX: DOB lives in personal_details, not top-level
        .filter((e) => !!getEmployeeDOB(e))
        .map((e) => {
          const dobStr = getEmployeeDOB(e)!;
          const dob = new Date(dobStr);

          const nextBirthday = new Date(
            today.getFullYear(),
            dob.getMonth(),
            dob.getDate(),
          );
          if (nextBirthday < today) {
            nextBirthday.setFullYear(today.getFullYear() + 1);
          }

          return {
            ...e,
            nextBirthday,
            daysLeft: Math.ceil(
              (nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
            ),
          };
        })
        .sort((a, b) => a.daysLeft - b.daysLeft);

      setBirthdays(upcoming);
    } catch (err) {
      console.error("Birthday fetch error:", err);
    }
  };

  // FIX: filter by month using personal_details.date_of_birth
  const filteredBirthdays = birthdays.filter((emp) => {
    if (selectedMonth === "all") return true;
    const dobStr = getEmployeeDOB(emp);
    if (!dobStr) return false;
    const dob = new Date(dobStr);
    return dob.getMonth() === Number(selectedMonth);
  });

  useEffect(() => {
    fetchDashboardData();
    fetchBirthdays();
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  // ── Calendar helpers ───────────────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const toStartOfDay = (d: Date) => {
    const nd = new Date(d);
    nd.setHours(0, 0, 0, 0);
    return nd;
  };

  const leaveDates = allLeaves
    .filter((l) => (l.status ?? "").toLowerCase() === "approved")
    .flatMap((l) => {
      if (!l.start_date || !l.end_date) return [];
      const start = new Date(l.start_date);
      const end = new Date(l.end_date);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      if (end < today) return [];
      const dates: Date[] = [];
      const temp = new Date(start < today ? today : start);
      while (temp <= end) {
        dates.push(new Date(temp));
        temp.setDate(temp.getDate() + 1);
      }
      return dates;
    });

  const holidayDates = upcomingHolidays.flatMap((h) => {
    if (!h.start_date || !h.end_date) return [];
    const start = toStartOfDay(new Date(h.start_date));
    const end = toStartOfDay(new Date(h.end_date));
    const dates: Date[] = [];
    const temp = new Date(start);
    while (temp <= end) {
      dates.push(toStartOfDay(new Date(temp)));
      temp.setDate(temp.getDate() + 1);
    }
    return dates;
  });

  const getDayInfo = (date: Date) => {
    const current = toStartOfDay(date);

    const holiday = upcomingHolidays.find((h) => {
      if (!h.start_date || !h.end_date) return false;
      const start = toStartOfDay(new Date(h.start_date));
      const end = toStartOfDay(new Date(h.end_date));
      return current >= start && current <= end;
    });

    // FIX: use personal_details for the leave employee name in tooltip
    const leave = allLeaves.find((l) => {
      if ((l.status ?? "").toLowerCase() !== "approved") return false;
      if (!l.start_date || !l.end_date) return false;
      const start = toStartOfDay(new Date(l.start_date));
      const end = toStartOfDay(new Date(l.end_date));
      return current >= start && current <= end;
    });

    if (holiday)
      return <p className="text-red-700">Holiday: {holiday.name}</p>;

    if (leave)
      return (
        <p className="text-green-700">
          {leave.personal_details
            ? `${leave.personal_details.first_name} ${leave.personal_details.last_name}`.trim()
            : "An employee"}{" "}
          is on leave
        </p>
      );

    return null;
  };

  // ── Approve / Reject handlers ──────────────────────────────────────────────
  const handleApprove = async (id: string) => {
    if (!id) {
      toast({ title: "Invalid leave ID", variant: "destructive" });
      return;
    }
    try {
      await apiClient.approveLeave(id, "Approved from dashboard");
      await fetchDashboardData();
      toast({ title: "Leave approved successfully" });
    } catch (err) {
      console.error("Approve error:", err);
      toast({
        title: "Approval failed",
        description: err?.message ?? "Something went wrong while approving leave",
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim() || !selectedRequest) return;
    try {
      await apiClient.rejectLeave(selectedRequest.id, rejectReason);
      await fetchDashboardData();
      await fetchLeaves();
      setRejectDialog(false);
      setRejectReason("");
      setSelectedRequest(null);
      toast({ title: "Leave rejected" });
    } catch {
      toast({ title: "Error", description: "Failed to reject leave." });
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={item}>
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your workforce status
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={item} className="grid grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="glass-card p-5 press-effect cursor-default group hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
              {stat.change !== "—" && (
                <span
                  className={`flex items-center gap-0.5 text-xs font-medium font-mono-data ${
                    stat.positive ? "text-success" : "text-warning"
                  }`}
                >
                  {stat.change}
                  <ArrowUpRight className="w-3 h-3" />
                </span>
              )}
            </div>
            <p className="text-3xl font-bold font-mono-data tracking-tight">
              {stat.value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Today's Leave / Upcoming Holidays / Pending Actions */}
      <div className="grid grid-cols-3 gap-5">
        {/* Today's Leave */}
        <motion.div variants={item} className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">On Leave Today</h2>
            </div>
            <span className="status-pill status-pending">
              {todayLeaves.length}
            </span>
          </div>
          <div className="p-2">
            {todayLeaves.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <p className="text-sm">No employees on leave today</p>
              </div>
            ) : (
              todayLeaves.map((l, i) => {
                // FIX: name comes from personal_details, department from department record
                const empName = l.personal_details
                  ? `${l.personal_details.first_name} ${l.personal_details.last_name}`.trim()
                  : "Unknown";
                const deptName = l.department?.department_name ?? "Department";
                const initials = empName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase();

                return (
                  <div
                    key={l.id ?? i}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-accent/10 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary shrink-0">
                        {initials || "E"}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{empName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {deptName} · {l.start_date?.split("T")[0]} –{" "}
                          {l.end_date?.split("T")[0]}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`status-pill ${
                        leaveStatusClass[l.leave_type ?? ""] ?? "status-pending"
                      }`}
                    >
                      {l.leave_type ?? "Leave"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>

        {/* Upcoming Holidays */}
        <motion.div variants={item} className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">Upcoming Holidays</h2>
            </div>
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="text-xs text-primary hover:underline font-medium"
            >
              {showCalendar ? "List View" : "Calendar View"}
            </button>
          </div>

          {showCalendar ? (
            <div className="p-3 flex flex-col">
              <TooltipProvider>
                <Calendar
                  className="flex items-center justify-center"
                  mode="single"
                  selected={calendarDate}
                  onSelect={setCalendarDate}
                  modifiers={{
                    holiday: holidayDates,
                    leave: leaveDates,
                    weekend: (date) => {
                      const day = date.getDay();
                      return day === 0 || day === 6;
                    },
                  }}
                  modifiersClassNames={{
                    holiday:
                      "text-red-600 font-semibold bg-red-50 rounded-md border border-red-100",
                    leave:
                      "text-green-600 font-semibold bg-green-50 rounded-md border border-green-200",
                    weekend:
                      "text-red-600 font-semibold bg-red-50 rounded-md border border-red-100",
                  }}
                  components={{
                    DayContent: ({ date }) => {
                      const info = getDayInfo(date);
                      return (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="relative w-full h-full flex items-center justify-center cursor-pointer">
                              {date.getDate()}
                            </div>
                          </TooltipTrigger>
                          {info && (
                            <TooltipContent side="top" className="text-xs">
                              {info}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      );
                    },
                  }}
                />
              </TooltipProvider>
              <div className="mt-3 border-t border-border pt-3">
                <div className="space-y-2 ml-10">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="text-xs font-medium">Holiday</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <span className="text-xs font-medium">Leave</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-2">
              {upcomingHolidays.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <p className="text-sm">No holidays scheduled</p>
                </div>
              ) : (
                upcomingHolidays.map((h) => (
                  <div
                    key={h.start_date}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent/10 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] font-semibold text-primary leading-none">
                        {new Date(h.start_date).toLocaleDateString("en", {
                          month: "short",
                        })}
                      </span>
                      {h.start_date === h.end_date ? (
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(h.start_date).toLocaleDateString("en", {
                            day: "numeric",
                          })}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(h.start_date).toLocaleDateString("en", {
                            day: "numeric",
                          })}
                          {" – "}
                          {new Date(h.end_date).toLocaleDateString("en", {
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{h.name}</p>
                      <p className="text-xs text-muted-foreground font-mono-data">
                        {Math.round(
                          (new Date(h.end_date).getTime() -
                            new Date(h.start_date).getTime()) /
                            (1000 * 60 * 60 * 24),
                        ) + 1}{" "}
                        days
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </motion.div>

        {/* Pending Actions */}
        <Protected anyPermissions={[LeaveManagementAction.Edit]}>
          <motion.div variants={item} className="glass-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold">Pending Actions</h2>
              <span className="status-pill status-pending">
                {pendingActions.length} items
              </span>
            </div>
            {pendingActions.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <p className="text-sm">No pending actions</p>
              </div>
            ) : (
              <div className="divide-y divide-border overflow-y-auto max-h-72">
                {pendingActions.map((action) => (
                  <div key={action.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {action.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            {action.description}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono-data">
                            {action.time}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleApprove(action.id)}
                          className="px-2.5 py-1 text-xs rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors font-medium"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRequest({
                              id: action.id,
                              employee: action.name,
                              type: action.type,
                              from: "",
                              to: "",
                              days: 0,
                              status: "Pending",
                              reason: "",
                              appliedOn: "",
                              approvedBy: "",
                              remarks: "",
                              rejectionReason: action.description,
                            });
                            setRejectDialog(true);
                          }}
                          className="px-2.5 py-1 text-xs rounded-md border border-red-200 dark:border-red-900 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors font-medium"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </Protected>

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
      </div>

      {/* Upcoming Birthdays */}
      <motion.div variants={item} className="glass-card overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b border-border space-y-3">
          <div className="flex items-center gap-2">
            <CakeIcon className="w-5 h-5 text-orange-500" />
            <h2 className="text-sm font-semibold">Upcoming Birthdays</h2>
          </div>
          <div className="flex gap-1 p-0.5 w-1/2 rounded-lg bg-muted/60 border border-border overflow-x-auto scrollbar-none">
            {months.map((m) => (
              <button
                key={m.label}
                onClick={() => setSelectedMonth(String(m.value))}
                className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  selectedMonth === String(m.value)
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-x divide-y divide-border grid grid-cols-3">
          {filteredBirthdays.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">
              No birthdays found 🎈
            </p>
          ) : (
            filteredBirthdays.map((emp) => {
              const isToday = emp.daysLeft === 0;
              // FIX: read name and DOB through helpers, not top-level emp.*
              const name = getEmployeeName(emp);
              const dobStr = getEmployeeDOB(emp);
              const dob = dobStr ? new Date(dobStr) : null;
              const initials = name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase();

              return (
                <div
                  key={emp.id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-accent/40 transition"
                >
                  <div className="flex gap-5">
                    <div className="w-12 h-12 rounded-sm bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary shrink-0 overflow-hidden">
                      {emp.profile_image ? (
                        <img
                          src={emp.profile_image}
                          className="w-full h-full object-cover"
                          alt={name}
                        />
                      ) : (
                        initials || "E"
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{name}</p>
                      {/* FIX: department from getLatestDepartment */}
                      <p className="text-xs text-muted-foreground">
                        {getEmployeeDeptName(emp)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    {isToday ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-success/15 text-success">
                        Today 🎉
                      </span>
                    ) : dob ? (
                      <div className="flex flex-col gap-3">
                        <span className="flex text-xs flex-col gap-1 items-center justify-center rounded-md h-10 w-10 font-bold text-orange-600 bg-orange-100 leading-none">
                          <span>
                            {dob
                              .toLocaleString("en-US", { month: "short" })
                              .toUpperCase()}
                          </span>
                          <span>{dob.getDate()}</span>
                        </span>
                        <span className="text-xs text-muted-foreground font-mono-data">
                          {emp.daysLeft} day{emp.daysLeft > 1 ? "s" : ""}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}