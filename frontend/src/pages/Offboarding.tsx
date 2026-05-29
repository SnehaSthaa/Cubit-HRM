import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  User,
  Calendar,
  Clock,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/services/apiClient";
import { useToast } from "@/hooks/use-toast";

const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

interface OffboardingEmployee {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  department: string;
  position: string;
  employment_status: string;
  joining_date: string;
  updated_at: string;
  profile_image: string;
  user?: { name: string; email: string };
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function toLocalMidnight(dateStr: string): Date {
  const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
  return new Date(year, month - 1, day);
}
function getLastWorkingDay(updatedAt: string): string {
  const d = toLocalMidnight(updatedAt);
  d.setDate(d.getDate() + 30);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getNoticeDaysLeft(updatedAt: string, now: Date): number {
  const startMidnight = toLocalMidnight(updatedAt);
  const lastDay = new Date(startMidnight);
  lastDay.setDate(lastDay.getDate() + 30);

  const todayMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  return Math.max(
    0,
    Math.round((lastDay.getTime() - todayMidnight.getTime()) / 86_400_000),
  );
}

function getNoticeProgress(updatedAt: string, now: Date): number {
  const daysLeft = getNoticeDaysLeft(updatedAt, now);
  return Math.min(100, Math.round(((30 - daysLeft) / 30) * 100));
}

export default function Offboarding() {
  const { id } = useParams<{ id?: string }>();
  const { toast } = useToast();

  const [employees, setEmployees] = useState<OffboardingEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(id ?? null);
  const [completing, setCompleting] = useState<string | null>(null);

  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (id) setSelectedId(id);
  }, [id]);

  const fetchOffboarding = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.getOffboardingEmployees();
      setEmployees(
        Array.isArray(res.data) ? (res.data as OffboardingEmployee[]) : [],
      );
    } catch {
      toast({
        title: "Failed to load offboarding data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchOffboarding();
  }, [fetchOffboarding]);

  const handleCompleteOffboarding = async (empId: string) => {
    try {
      setCompleting(empId);
      await apiClient.completeOffboarding(empId);
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === empId ? { ...e, employment_status: "resigned" } : e,
        ),
      );
      toast({
        title: "Offboarding completed",
        description: "Employee marked as resigned.",
      });
    } catch (err: unknown) {
      toast({
        title: "Failed to complete offboarding",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setCompleting(null);
    }
  };

  // FIX 3 – toggle cycles asc → desc → null (actual null, not string)
  const toggleSort = () =>
    setSortOrder((prev) =>
      prev === "asc" ? "desc" : prev === "desc" ? null : "asc",
    );

  const selected = employees.find((e) => e.id === selectedId);

  const resignedEmployees = employees
    .filter((e) => e.employment_status === "resigned")
    .sort((a, b) => {
      if (!sortOrder) return 0; // FIX 4 – no sort when null (was comparing to string "null")
      const dateA = new Date(getLastWorkingDay(a.updated_at)).getTime();
      const dateB = new Date(getLastWorkingDay(b.updated_at)).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

  // ─── loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading offboarding data…</span>
      </div>
    );
  }

  // ─── render ─────────────────────────────────────────────────────────────────

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Exit / Offboarding</h1>
          <p className="text-sm text-muted-foreground">
            Track resignations, notice periods, and clearance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 border border-border rounded-lg px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            {
              employees.filter((e) => e.employment_status === "notice_period")
                .length
            }{" "}
            on notice
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 border border-border rounded-lg px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-muted-foreground inline-block" />
            {employees.filter((e) => e.employment_status === "resigned").length}{" "}
            resigned
          </div>
        </div>
      </motion.div>

      {/* Empty state */}
      {employees.length === 0 ? (
        <motion.div
          variants={item}
          className="bg-card border border-border rounded-lg p-16 text-center"
        >
          <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
            <LogOut className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium mb-1">
            No employees in offboarding
          </p>
          <p className="text-xs text-muted-foreground">
            Employees on notice period or resigned will appear here.
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {/* ── List ── */}
          <div className="col-span-1 space-y-2">
            {employees.map((emp) => {
              // FIX 5 – pass `now` so the displayed value is always fresh
              const daysLeft = getNoticeDaysLeft(emp.updated_at, now);
              const progress = getNoticeProgress(emp.updated_at, now);
              const isSelected = selectedId === emp.id;
              const isNotice = emp.employment_status === "notice_period";

              return (
                <motion.div
                  key={emp.id}
                  variants={item}
                  onClick={() => setSelectedId(emp.id)}
                  className={`bg-card border rounded-lg p-3 cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/40 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0 overflow-hidden">
                      {emp.profile_image ? (
                        <img
                          src={emp.profile_image}
                          alt={emp.first_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>
                          {emp.first_name[0]}
                          {emp.last_name[0]}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {emp.first_name} {emp.last_name}
                        <span className="text-xs"> ({emp.employee_id})</span>
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {emp.department}
                      </p>
                    </div>
                    <span
                      className={`status-pill shrink-0 ${isNotice ? "notice_period" : "resigned"}`}
                    >
                      {isNotice ? "Notice" : "Resigned"}
                    </span>
                  </div>

                  {isNotice && (
                    <div className="mt-2.5 pt-2.5 border-t border-border/60">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
                        </span>
                        <span>{progress}% complete</span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* ── Detail ── */}
          <div className="col-span-2">
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-lg overflow-hidden"
              >
                {/* Header band */}
                <div className="px-5 py-4 border-b border-border flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center text-base font-semibold text-muted-foreground overflow-hidden shrink-0">
                      {selected.profile_image ? (
                        <img
                          src={selected.profile_image}
                          alt={selected.first_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>
                          {selected.first_name[0]}
                          {selected.last_name[0]}
                        </span>
                      )}
                    </div>
                    <div>
                      <h2 className="font-semibold text-base">
                        {selected.first_name} {selected.last_name}
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {selected.employee_id} · {selected.position} ·{" "}
                        {selected.department}
                      </p>
                      <span
                        className={`status-pill mt-1.5 inline-flex ${
                          selected.employment_status === "resigned"
                            ? "resigned"
                            : "notice_period"
                        }`}
                      >
                        {selected.employment_status === "notice_period"
                          ? "In Progress"
                          : "Completed"}
                      </span>
                    </div>
                  </div>

                  {selected.employment_status === "notice_period" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={completing === selected.id}
                      onClick={() => handleCompleteOffboarding(selected.id)}
                      className="gap-1.5"
                    >
                      {completing === selected.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <LogOut className="w-3.5 h-3.5" />
                      )}
                      Complete Offboarding
                    </Button>
                  )}
                </div>

                <div className="p-5 space-y-5">
                  {/* Timeline info */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                      <p className="text-[11px] text-muted-foreground mb-1 uppercase tracking-wide font-medium">
                        Status Changed
                      </p>
                      <p className="text-sm font-mono font-medium">
                        {selected.updated_at.split("T")[0]}
                      </p>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                      <p className="text-[11px] text-muted-foreground mb-1 uppercase tracking-wide font-medium">
                        Last Working Day
                      </p>
                      <p className="text-sm font-mono font-medium">
                        {getLastWorkingDay(selected.updated_at)}
                      </p>
                    </div>
                    <div
                      className={`p-3 rounded-lg border ${
                        selected.employment_status === "notice_period"
                          ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40"
                          : "bg-muted/30 border-border/50"
                      }`}
                    >
                      <p className="text-[11px] text-muted-foreground mb-1 uppercase tracking-wide font-medium">
                        Notice Period
                      </p>
                      <p
                        className={`text-sm font-medium ${
                          selected.employment_status === "notice_period"
                            ? "text-amber-600 dark:text-amber-400"
                            : ""
                        }`}
                      >
                        {selected.employment_status === "notice_period"
                          ? `${getNoticeDaysLeft(selected.updated_at, now)} days left`
                          : "Completed"}
                      </p>
                    </div>
                  </div>

                  {/* Notice progress bar */}
                  {selected.employment_status === "notice_period" && (
                    <div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span>Notice period progress</span>
                        <span>
                          {getNoticeProgress(selected.updated_at, now)}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all duration-500"
                          style={{
                            width: `${getNoticeProgress(selected.updated_at, now)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Clearance checklist */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">
                      Clearance Checklist
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        {
                          key: "it",
                          label: "IT Equipment",
                          desc: "Laptop, accessories returned",
                        },
                        {
                          key: "finance",
                          label: "Finance",
                          desc: "Final settlement cleared",
                        },
                        {
                          key: "hr",
                          label: "HR Documents",
                          desc: "Exit interview, NOC",
                        },
                      ].map((checkItem) => {
                        const done = selected.employment_status === "resigned";
                        return (
                          <div
                            key={checkItem.key}
                            className={`p-3 rounded-lg border transition-colors ${
                              done
                                ? "border-success/30 bg-success/5"
                                : "border-border bg-muted/20"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {done ? (
                                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                              )}
                              <span className="text-xs font-medium">
                                {checkItem.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              {checkItem.desc}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-card border border-border rounded-lg p-16 text-center flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium mb-1">No employee selected</p>
                <p className="text-xs text-muted-foreground">
                  Select an employee from the list to view their offboarding
                  details
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resigned employees table */}
      {resignedEmployees.length > 0 && (
        <motion.div
          variants={item}
          className="bg-card border border-border rounded-lg overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Resigned Employees</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Employees who completed offboarding
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              {resignedEmployees.length} employee
              {resignedEmployees.length !== 1 ? "s" : ""}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Employee
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Department
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Position
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    {/* FIX 6 – toggle now correctly cycles asc → desc → null */}
                    <button
                      className="flex items-center gap-1 font-medium hover:text-foreground transition-colors"
                      onClick={toggleSort}
                    >
                      Last Working Day
                      {sortOrder === "asc" ? (
                        <ArrowUp className="w-3 h-3 text-primary" />
                      ) : sortOrder === "desc" ? (
                        <ArrowDown className="w-3 h-3 text-primary" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                      )}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {resignedEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center overflow-hidden text-xs font-semibold text-muted-foreground">
                          {emp.profile_image ? (
                            <img
                              src={emp.profile_image}
                              alt={emp.first_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>
                              {emp.first_name[0]}
                              {emp.last_name[0]}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {emp.first_name} {emp.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {emp.employee_id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {emp.department}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {emp.position}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        {getLastWorkingDay(emp.updated_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="status-pill resigned">Resigned</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
