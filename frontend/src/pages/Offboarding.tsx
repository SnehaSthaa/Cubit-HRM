import { motion } from "framer-motion";
import { LogOut, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };

const offboardingCases = [
  {
    id: "EMP-0998", name: "Bikash Gurung", department: "Operations",
    resignDate: "2024-01-05", lastDay: "2024-02-05", noticePeriod: "30 days",
    clearance: { it: true, finance: false, hr: false },
    status: "In Progress",
  },
  {
    id: "EMP-0985", name: "Ramesh Adhikari", department: "Sales",
    resignDate: "2023-12-20", lastDay: "2024-01-20", noticePeriod: "30 days",
    clearance: { it: true, finance: true, hr: true },
    status: "Completed",
  },
];

export default function Offboarding() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
      <motion.div variants={item}>
        <h1 className="text-lg font-semibold">Exit / Offboarding</h1>
        <p className="text-sm text-muted-foreground">Track resignations, notice periods, and clearance</p>
      </motion.div>

      <motion.div variants={item} className="space-y-3">
        {offboardingCases.map((c) => (
          <div key={c.id} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                  {c.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <h3 className="text-sm font-medium">{c.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono-data">{c.id}</span> · {c.department}
                  </p>
                </div>
              </div>
              <span className={`status-pill ${c.status === "Completed" ? "status-active" : "status-pending"}`}>
                {c.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-3">
              <div>
                <p className="text-xs text-muted-foreground">Resignation Date</p>
                <p className="text-sm font-mono-data">{c.resignDate}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last Working Day</p>
                <p className="text-sm font-mono-data">{c.lastDay}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Notice Period</p>
                <p className="text-sm">{c.noticePeriod}</p>
              </div>
            </div>

            {/* Clearance */}
            <div className="flex items-center gap-4">
              <p className="text-xs text-muted-foreground">Clearance:</p>
              {Object.entries(c.clearance).map(([dept, done]) => (
                <div key={dept} className="flex items-center gap-1">
                  {done ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                  )}
                  <span className="text-xs uppercase">{dept}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}
