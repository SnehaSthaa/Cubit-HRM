import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import {
  Users,
  CalendarDays,
  AlertTriangle,
  UserPlus,
  LucideIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/services/apiClient";

// --- Types & Interfaces ---

interface User {
  name: string | null;
  email: string;
}

interface Employee {
  id: string;
  department: string | null;
  user: User;
}

interface LeaveType {
  id: string;
  name: string;
}

interface LeaveRecord {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  status: "pending" | "approved" | "rejected";
  employee: Employee;
  leaveType: LeaveType;
}

interface StatItem {
  label: string;
  value: number;
  icon: LucideIcon;
}

interface PendingAction {
  id: string;
  name: string;
  type: string;
  date: string;
}

// --- Animation Variants ---



const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } },
};


export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<StatItem[]>([]);
  const [todayLeaves, setTodayLeaves] = useState<LeaveRecord[]>([]);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const [employeesRes, leavesRes] = await Promise.all([        apiClient.getEmployees(),
        apiClient.getLeaves(),
      ]);


      const employees = Array.isArray(employeesRes.data) ? (employeesRes.data as unknown as Employee[]) : [];
      const allLeaves = Array.isArray(leavesRes.data) ? (leavesRes.data as unknown as LeaveRecord[]) : [];
      
      const todayStr = new Date().toISOString().split("T")[0];

      // 1. Filter Today's Leaves
      const todayLeavesList = allLeaves.filter((leave) => {
        const start = leave.start_date?.split("T")[0];
        const end = leave.end_date?.split("T")[0];
        return todayStr >= start && todayStr <= end && leave.status === "approved";
      });

      // 2. Map Pending Actions
      const pendingList: PendingAction[] = allLeaves
        .filter((leave) => leave.status === "pending")
        .map((leave) => ({
          id: leave.id,
          name: leave.employee?.user?.name || "Unknown Staff",
          type: leave.leaveType?.name || "Leave Request",
          date: leave.start_date?.split("T")[0] || "N/A",
        }));

      // 3. Set Stats
      setStats([
        { label: "Active Employees", value: employees.length, icon: Users },
        { label: "On Leave Today", value: todayLeavesList.length, icon: CalendarDays },
        { label: "Pending Requests", value: pendingList.length, icon: AlertTriangle },
        { label: "New Hires", value: 0, icon: UserPlus },
      ]);

      setTodayLeaves(todayLeavesList);
      setPendingActions(pendingList);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch data";
      toast({
        title: "Dashboard Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-6 space-y-8">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold tracking-tight">Workforce Overview</h1>
        <p className="text-sm text-muted-foreground">System metrics and active staff status.</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <motion.div key={stat.label} variants={item} className="glass-card p-6 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-3xl font-bold mt-1">{loading ? "..." : stat.value}</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl text-primary">
                <stat.icon size={22} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* On Leave Today */}
        <motion.div variants={item} className="lg:col-span-1 glass-card border border-border/50 overflow-hidden">
          <div className="p-5 border-b border-border bg-muted/30">
            <h2 className="text-sm font-semibold">On Leave Today</h2>
          </div>
          <div className="p-2 space-y-1">
            {todayLeaves.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground italic">
                All staff are present.
              </div>
            ) : (
              todayLeaves.map((l) => (
                <div key={l.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/5 transition-all">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 border border-primary/20">
                    {(l.employee?.user?.name?.[0] || "E").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {l.employee?.user?.name || "Unknown Staff"}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate uppercase">
                      {l.employee?.department || "General"} • {l.leaveType.name}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Pending Requests */}
        <motion.div variants={item} className="lg:col-span-2 glass-card border border-border/50">
          <div className="p-5 border-b border-border bg-muted/30">
            <h2 className="text-sm font-semibold">Pending Requests</h2>
          </div>
          <div className="p-4">
            {pendingActions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-10">All clear! No pending requests.</p>
            ) : (
              <div className="space-y-3">
                {pendingActions.map((action) => (
                  <div key={action.id} className="flex items-center justify-between p-4 border rounded-xl border-border/60 bg-background/50 shadow-sm">
                    <div>
                      <p className="text-sm font-semibold">{action.name}</p>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-tight">
                        {action.type} — {action.date}
                      </p>
                    </div>
                    
                   <button
  onClick={() => navigate("/leave")}  // change path to match your actual route
  className="text-[10px] font-bold uppercase tracking-widest text-primary border border-primary/20 px-3 py-1 rounded-md hover:bg-primary hover:text-white transition-colors"
>
  Review
</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}