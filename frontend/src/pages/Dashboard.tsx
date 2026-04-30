import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  CalendarDays,
  AlertTriangle,
  UserPlus,
  ArrowUpRight,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useRole } from "@/contexts/RoleContext";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/services/apiClient";
import type { Employee } from "@/types";

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

const leaveStatusClass: Record<string, string> = {
  "Paid Leave": "status-active",
  "Sick Leave": "status-pending",
  "Unpaid Leave": "status-notice",
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

interface StatItem {
  label: string;
  value: number;
  icon: React.ElementType;
  change: string;
  positive: boolean;
}

interface LeaveRecord {
  id?: string;
  employee_id?: string;
  employee?: { first_name: string; last_name: string; department: string };
  leave_type?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
}

interface LeaveData extends LeaveRecord {
  type?: string;
  date?: string;
  name?: string;
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

export default function Dashboard() {
  const { isHR } = useRole();
  const { toast } = useToast();
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(
    new Date(),
  );

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

  const [todayLeaves, setTodayLeaves] = useState<LeaveRecord[]>([]);
  const [allLeaves, setAllLeaves] = useState<LeaveRecord[]>([]);
  const [activeEmployeesList, setActiveEmployeesList] = useState<Employee[]>(
    [],
  );
  const [pendingOffboardingList, setPendingOffboardingList] = useState<
    Employee[]
  >([]);
  const [upcomingHolidays, setUpcomingHolidays] = useState<Holiday[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityRecord[]>([
    { text: "System initialized", time: "Today", type: "new" as const },
  ]);
  const [pendingActions, setPendingActions] = useState<
    {
      id: string;
      type: string;
      description: string;
      priority: string;
      name: string;
      dept: string;
      time: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [employeesRes, leavesRes, holidaysRes] = await Promise.all([
        apiClient.getEmployees(),
        apiClient.getLeaves(),
        apiClient.getHolidays(),
      ]);

      const employees: Employee[] = Array.isArray(employeesRes.data)
        ? employeesRes.data
        : [];

      const allLeaves: LeaveData[] = Array.isArray(leavesRes.data)
        ? leavesRes.data
        : [];

      const pendingLeaveActions = allLeaves
        .filter((leave) => leave.status?.toLowerCase() === "pending")
        .map((leave) => ({
          id: leave.id || "",
          type: "leave",
          description:
            enumToLeaveType[leave.leave_type ?? ""] ??
            leave.leave_type ??
            "Leave Request",
          priority: "medium",
          name: leave.employee
            ? `${leave.employee.first_name} ${leave.employee.last_name}`
            : "Unknown",
          dept: leave.employee?.department || "—",
          time: leave.start_date?.split("T")[0] || "—",
        }));

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayLeavesList = allLeaves.filter((leave) => {
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
        ? holidaysRes.data.map((h) => ({
            id: h.id,
            name: h.name || "Holiday",
            start_date: h.start_date?.split("T")[0] ?? "",
            end_date: h.end_date?.split("T")[0] ?? "",
          }))
        : [];

      // Use employment_status field from the global Employee type
      const activeEmployees = employees.filter(
        (e) =>
          !e.employment_status ||
          e.employment_status.toLowerCase() !== "pending_offboarding",
      );
      const pendingOffboarding = employees.filter(
        (e) => e.employment_status?.toLowerCase() === "pending_offboarding",
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
      setAllLeaves(allLeaves);
      setActiveEmployeesList(activeEmployees);
      setPendingOffboardingList(pendingOffboarding);
      setUpcomingHolidays(holidays);
      setPendingActions(pendingLeaveActions);
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (id: string) => {
    if (!id) {
      toast({
        title: "Invalid leave ID",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiClient.approveLeave(id, "Approved from dashboard");

      await fetchDashboardData();
      console.log("DASHBOARD APPROVE DATA:", {
        id,
      });
      toast({
        title: "Leave approved successfully",
      });
    } catch (err) {
      console.error("Approve error:", err);

      toast({
        title: "Approval failed",
        description:
          err?.message || "Something went wrong while approving leave",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (id: string) => {
    if (!id) {
      toast({ title: "Invalid leave ID", variant: "destructive" });
      return;
    }

    try {
      await apiClient.rejectLeave(id, "Rejected from dashboard");
      await fetchDashboardData();
      toast({ title: "Leave rejected" });
    } catch (err) {
      toast({
        title: "Rejection failed",
        description: err instanceof Error ? err.message : "Error",
        variant: "destructive",
      });
    }
  };

  const holidayDates = upcomingHolidays.flatMap((h) => {
    if (!h.start_date || !h.end_date) return [];
    const start = new Date(h.start_date);
    const end = new Date(h.end_date);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];
    const dates: Date[] = [];
    const temp = new Date(start);
    while (temp <= end) {
      dates.push(new Date(temp));
      temp.setDate(temp.getDate() + 1);
    }
    return dates;
  });

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
                  className={`flex items-center gap-0.5 text-xs font-medium font-mono-data ${stat.positive ? "text-success" : "text-warning"}`}
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

      {/* Today's Leave & Upcoming Holidays */}
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
              todayLeaves.map((l, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-accent/10 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary shrink-0">
                      {(l.employee?.first_name || "E")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .substring(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {l.employee
                          ? `${l.employee.first_name || ""} ${l.employee.last_name || ""}`.trim()
                          : "Unknown"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {l.employee?.department || "Department"} ·{" "}
                        {l.start_date?.split("T")[0]} –{" "}
                        {l.end_date?.split("T")[0]}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`status-pill ${leaveStatusClass[l.leave_type || ""] || "status-pending"}`}
                  >
                    {l.leave_type || "Leave"}
                  </span>
                </div>
              ))
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
            <div className="p-3 flex justify-center">
              <Calendar
                mode="single"
                selected={calendarDate}
                onSelect={setCalendarDate}
                modifiers={{ holiday: holidayDates }}
                modifiersClassNames={{
                  holiday:
                    "font-bold rounded-full relative text-black after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-red-500 after:rounded-full",
                }}
              />
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
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(h.start_date).toLocaleDateString("en", {
                          day: "numeric",
                        })}
                        {" - "}
                        {new Date(h.end_date).toLocaleDateString("en", {
                          day: "numeric",
                        })}
                      </span>
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
        {isHR && (
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
                          onClick={() => handleReject(action.id)}
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
        )}
      </div>
    </motion.div>
  );
}
