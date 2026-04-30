import { motion } from "framer-motion";
import { BarChart3, Download, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };

const monthlyAttendance = [
  { month: "Oct", present: 92, late: 5, absent: 3 },
  { month: "Nov", present: 89, late: 7, absent: 4 },
  { month: "Dec", present: 85, late: 8, absent: 7 },
  { month: "Jan", present: 91, late: 6, absent: 3 },
];

export default function Reports() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">Workforce insights and data exports</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 press-effect">
          <Download className="w-3.5 h-3.5" />
          Export
        </Button>
      </motion.div>

      {/* KPIs */}
      <motion.div variants={item} className="grid grid-cols-4 gap-3">
        {[
          { label: "Avg. Attendance Rate", value: "91%", trend: "+2%", up: true },
          { label: "Employee Turnover", value: "4.2%", trend: "-0.8%", up: false },
          { label: "Avg. Late Arrivals/mo", value: "6.5", trend: "+1.2", up: true },
          { label: "Open Positions", value: "7", trend: "+3", up: true },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-card border border-border rounded-lg p-4">
            <p className="text-2xl font-semibold font-mono-data">{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
            <div className="flex items-center gap-1 mt-1">
              {kpi.up ? (
                <TrendingUp className="w-3 h-3 text-success" />
              ) : (
                <TrendingDown className="w-3 h-3 text-destructive" />
              )}
              <span className={`text-xs font-mono-data ${kpi.up ? "text-success" : "text-destructive"}`}>
                {kpi.trend}
              </span>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Monthly Breakdown */}
      <motion.div variants={item} className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-medium">Monthly Attendance Breakdown (%)</h2>
        </div>
        <table className="nexus-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Present %</th>
              <th>Late %</th>
              <th>Absent %</th>
              <th>Attendance Bar</th>
            </tr>
          </thead>
          <tbody>
            {monthlyAttendance.map((m) => (
              <tr key={m.month}>
                <td className="text-sm font-medium">{m.month}</td>
                <td className="font-mono-data text-xs text-success">{m.present}%</td>
                <td className="font-mono-data text-xs text-warning">{m.late}%</td>
                <td className="font-mono-data text-xs text-destructive">{m.absent}%</td>
                <td>
                  <div className="flex h-2 rounded-full overflow-hidden bg-muted w-48">
                    <div className="bg-success" style={{ width: `${m.present}%` }} />
                    <div className="bg-warning" style={{ width: `${m.late}%` }} />
                    <div className="bg-destructive" style={{ width: `${m.absent}%` }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </motion.div>
  );
}
