import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Calculator, Plus, Trash2, Download, FileText, Users, DollarSign,
  AlertCircle, CheckCircle2, Save, Eye, X, Receipt, Settings2, Edit2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRole } from "@/contexts/RoleContext";
import { useToast } from "@/hooks/use-toast";
import {
  calculatePayroll, fmt, NEPALI_MONTHS, IRD_DATA,
  type PayrollEmployee, type PayrollResult, type TaxpayerType, type Gender, type FYData, type TaxSlab
} from "@/lib/payroll-engine";

const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };

const defaultEmployee = (): PayrollEmployee => ({
  id: Date.now() + Math.random(),
  name: "", tp: "single", gd: "male", absentDays: 0, unpaidLeave: 0,
  monthlySalary: 0, disabled: false, pf: 0, dashain: 0,
  extraTime: 0, bonus: 0, cit: 0, healthInsurance: 0, lifeInsurance: 0,
  hasSSF: true, employmentType: 'full-time',
});

const sampleEmployees: PayrollEmployee[] = [
  { id: 1, name: "Aarav Bhandari", tp: "single", gd: "male", absentDays: 0, unpaidLeave: 0, monthlySalary: 85000, disabled: false, pf: 0, dashain: 0, extraTime: 0, bonus: 0, cit: 0, healthInsurance: 0, lifeInsurance: 0, pan: "123456789", ssfId: "SSF-001", designation: "Sr. Developer", totalWorkingDays: 20, workingDaysAttended: 20, paidLeave: 0, sickLeave: 0, hasSSF: true, employmentType: 'full-time' },
  { id: 2, name: "Priya Sharma", tp: "couple", gd: "female", absentDays: 1, unpaidLeave: 0, monthlySalary: 95000, disabled: false, pf: 0, dashain: 0, extraTime: 2000, bonus: 0, cit: 0, healthInsurance: 0, lifeInsurance: 0, pan: "987654321", ssfId: "SSF-002", designation: "DevOps Lead", totalWorkingDays: 20, workingDaysAttended: 19, paidLeave: 1, sickLeave: 0, hasSSF: true, employmentType: 'full-time' },
  { id: 3, name: "Raj Thapa", tp: "single", gd: "male", absentDays: 2, unpaidLeave: 1, monthlySalary: 65000, disabled: false, pf: 5000, dashain: 0, extraTime: 0, bonus: 0, cit: 1000, healthInsurance: 0, lifeInsurance: 0, pan: "456789123", ssfId: "SSF-003", designation: "Campaign Mgr", totalWorkingDays: 20, workingDaysAttended: 17, paidLeave: 0, sickLeave: 0, hasSSF: true, employmentType: 'full-time' },
];

interface SavedPayslip {
  empName: string;
  month: string;
  year: string;
  result: PayrollResult;
}

export default function Payroll() {
  const { isHR, isEmployee } = useRole();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("payroll");
  const [employees, setEmployees] = useState<PayrollEmployee[]>(sampleEmployees);
  const [fyKey, setFyKey] = useState("2082/083");
  const [month, setMonth] = useState("7");
  const [year, setYear] = useState("2082");
  const [workingDays, setWorkingDays] = useState(30);
  const [processed, setProcessed] = useState(false);
  const [slipDialog, setSlipDialog] = useState<PayrollResult | null>(null);
  const [savedSlips, setSavedSlips] = useState<SavedPayslip[]>([]);

  // Tax slab management
  const [taxSlabs, setTaxSlabs] = useState<Record<string, FYData>>({ ...IRD_DATA });
  const [editSlabFY, setEditSlabFY] = useState<string | null>(null);
  const [editSlabData, setEditSlabData] = useState<FYData | null>(null);
  const [addFYDialog, setAddFYDialog] = useState(false);
  const [newFYKey, setNewFYKey] = useState("");

  // Payslip filter
  const [slipFilterMonth, setSlipFilterMonth] = useState("all");
  const [slipFilterYear, setSlipFilterYear] = useState("all");

  const results = useMemo(() => {
    if (!processed) return [];
    return employees.map(emp => calculatePayroll(emp, fyKey, workingDays));
  }, [employees, fyKey, workingDays, processed]);

  const totals = useMemo(() => {
    if (!results.length) return { totalIncome: 0, totalTax: 0, totalNet: 0, totalSSF: 0, totalDeduct: 0 };
    return results.reduce((acc, r) => ({
      totalIncome: acc.totalIncome + r.totalIncome,
      totalTax: acc.totalTax + r.monthlyTax,
      totalNet: acc.totalNet + r.netPay,
      totalSSF: acc.totalSSF + r.ssf31,
      totalDeduct: acc.totalDeduct + r.totalDeduct,
    }), { totalIncome: 0, totalTax: 0, totalNet: 0, totalSSF: 0, totalDeduct: 0 });
  }, [results]);

  const updateEmployee = useCallback((id: number, key: keyof PayrollEmployee, value: string | number | boolean) => {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, [key]: value } : e));
    setProcessed(false);
  }, []);

  const addEmployee = () => { setEmployees(prev => [...prev, defaultEmployee()]); setProcessed(false); };
  const removeEmployee = (id: number) => { setEmployees(prev => prev.filter(e => e.id !== id)); setProcessed(false); };
  const runPayroll = () => setProcessed(true);

  const saveMonth = () => {
    const monthName = NEPALI_MONTHS[parseInt(month) - 1];
    const newSlips = results.map(r => ({ empName: r.name, month: monthName, year, result: r }));
    setSavedSlips(prev => [...prev.filter(s => !(s.month === monthName && s.year === year)), ...newSlips]);
    toast({ title: "Month saved", description: `${newSlips.length} payslips saved for ${monthName} ${year}` });
  };

  const exportCSV = () => {
    if (!results.length) return;
    const monthName = NEPALI_MONTHS[parseInt(month) - 1];
    const cols = ['#', 'Name', 'Type', 'Gender', 'Monthly Salary', 'Absent', 'Unpaid Leave', 'Actual Salary', 'Basic 60%', 'Allowance 40%', 'SSF 20%', 'Dashain', 'Extra Time', 'Bonus', 'Total Income', 'SSF 31%', 'CIT', 'PF', 'TDS', 'Total Deductibles', 'Net Pay'];
    const rows = results.map((r, i) => [i + 1, r.name, r.tp, r.gd, r.monthlySalary, r.absentDays, r.unpaidLeave, r.actualSalary.toFixed(0), r.basic.toFixed(0), r.allowance.toFixed(0), r.ssf20.toFixed(0), r.dashain, r.extraTime, r.bonus, r.totalIncome.toFixed(0), r.ssf31.toFixed(0), r.cit, r.pf, r.monthlyTax.toFixed(0), r.totalDeduct.toFixed(0), r.netPay.toFixed(0)]);
    const csv = [cols, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    download(csv, `Payroll_${monthName}_${year}.csv`);
  };

  const exportIRD = () => {
    if (!results.length) return;
    const monthName = NEPALI_MONTHS[parseInt(month) - 1];
    const cols = ['Employee Name', 'Actual Salary', 'SSF 31%', 'Tax (TDS)', 'Net Salary'];
    const rows = results.map(r => [r.name, r.actualSalary.toFixed(0), r.ssf31.toFixed(0), r.monthlyTax.toFixed(0), r.netPay.toFixed(0)]);
    rows.push(['TOTAL', results.reduce((a, r) => a + r.actualSalary, 0).toFixed(0), results.reduce((a, r) => a + r.ssf31, 0).toFixed(0), results.reduce((a, r) => a + r.monthlyTax, 0).toFixed(0), results.reduce((a, r) => a + r.netPay, 0).toFixed(0)]);
    const csv = [cols, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    download(csv, `IRD_TDS_${monthName}_${year}.csv`);
  };

  const download = (content: string, filename: string) => {
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };

  const filteredSlips = savedSlips.filter(s => {
    const matchMonth = slipFilterMonth === "all" || s.month === slipFilterMonth;
    const matchYear = slipFilterYear === "all" || s.year === slipFilterYear;
    return matchMonth && matchYear;
  });

  const uniqueYears = [...new Set(savedSlips.map(s => s.year))];

  // Employee view - only see their payslips
  if (isEmployee) {
    return (
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
        <motion.div variants={item}>
          <h1 className="text-lg font-semibold">My Payslips</h1>
          <p className="text-sm text-muted-foreground">View and download your salary slips</p>
        </motion.div>

        <motion.div variants={item} className="flex gap-3">
          <Select value={slipFilterMonth} onValueChange={setSlipFilterMonth}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="All Months" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Months</SelectItem>{NEPALI_MONTHS.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={slipFilterYear} onValueChange={setSlipFilterYear}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="All Years" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Years</SelectItem>{uniqueYears.map(y => <SelectItem key={y} value={y} className="text-xs">{y}</SelectItem>)}</SelectContent>
          </Select>
        </motion.div>

        <motion.div variants={item}>
          {filteredSlips.filter(s => s.empName === "Aarav Bhandari").length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <Receipt className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No payslips available yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filteredSlips.filter(s => s.empName === "Aarav Bhandari").map((s, i) => (
                <div key={i} className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSlipDialog(s.result)}>
                  <p className="text-sm font-medium">{s.month} {s.year}</p>
                  <p className="text-lg font-semibold font-mono-data text-success mt-1">NPR {fmt(s.result.netPay)}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Gross {fmt(s.result.totalIncome)}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">TDS {fmt(s.result.monthlyTax)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {renderPayslipDialog()}
      </motion.div>
    );
  }

  if (!isHR) {
    return (
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
        <motion.div variants={item}><h1 className="text-lg font-semibold">Payroll</h1><p className="text-sm text-muted-foreground">Access restricted.</p></motion.div>
      </motion.div>
    );
  }

  function renderPayslipDialog() {
    return (
      <Dialog open={!!slipDialog} onOpenChange={() => setSlipDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Salary Slip</DialogTitle></DialogHeader>
          {slipDialog && (
            <div className="space-y-4 text-xs">
              {/* Header */}
              <div className="text-center border-b border-border pb-3">
                <h2 className="text-base font-bold">Salary Slip</h2>
              </div>

              {/* Employee & Attendance Info */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                <div className="flex justify-between"><span className="text-muted-foreground">Employee Name</span><span className="font-medium">{slipDialog.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Month</span><span className="font-medium font-mono-data">{NEPALI_MONTHS[parseInt(month) - 1]}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Employee ID</span><span className="font-mono-data">{slipDialog.id || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total Working Days</span><span className="font-mono-data">{slipDialog.totalWorkingDays || workingDays}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Designation</span><span>{slipDialog.designation || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Days Attended</span><span className="font-mono-data">{slipDialog.workingDaysAttended || (workingDays - slipDialog.absentDays - slipDialog.unpaidLeave)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">PAN</span><span className="font-mono-data">{slipDialog.pan || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Paid Leave</span><span className="font-mono-data">{slipDialog.paidLeave || 0}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">SSF SSID</span><span className="font-mono-data">{slipDialog.ssfId || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Sick Leave</span><span className="font-mono-data">{slipDialog.sickLeave || 0}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Marital Status</span><span>{slipDialog.tp === 'couple' ? 'Married' : 'Single'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Absent</span><span className="font-mono-data">{slipDialog.absentDays}</span></div>
              </div>

              {/* Income & Deductions */}
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Income</div>
                  {[
                    ["Basic Salary", slipDialog.basic * 12],
                    ["Allowance", slipDialog.allowance * 12],
                    ["Festival Allowance", slipDialog.dashain * 12],
                    ["Other Income", 0],
                    ["Bonus", slipDialog.bonus * 12],
                    ["SSF(20%)", slipDialog.ssf20 * 12],
                  ].map(([label, val]) => (
                    <div key={label as string} className="flex justify-between px-3 py-1.5 border-t border-border">
                      <span>{label as string}</span><span className="font-mono-data">NPR {fmt(val as number)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-3 py-2 border-t border-border font-semibold bg-muted/30">
                    <span>Gross Income</span><span className="font-mono-data">NPR {fmt(slipDialog.annGross)}</span>
                  </div>
                </div>

                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Deductions</div>
                  {[
                    ["Yearly SSF", slipDialog.yearlySSF],
                    ["Yearly CIT", slipDialog.yearlyCIT],
                    ["Total SSF & CIT - (i)", slipDialog.totalSSFCIT],
                    ["Deduction Limit (ii)", slipDialog.deductionLimit],
                    ["1/3 of Total Income - (iii)", slipDialog.oneThirdIncome],
                    ["Min of (i),(ii),(iii)", slipDialog.minDeduction],
                    ["Life Insurance (max 40K)", slipDialog.lifeInsurance],
                    ["Health Insurance (max 20K)", slipDialog.healthInsurance],
                  ].map(([label, val]) => (
                    <div key={label as string} className="flex justify-between px-3 py-1.5 border-t border-border">
                      <span>{label as string}</span><span className="font-mono-data">NPR {fmt(val as number)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-3 py-2 border-t border-border font-semibold bg-muted/30">
                    <span>Taxable Income</span><span className="font-mono-data">NPR {fmt(slipDialog.taxableIncome)}</span>
                  </div>
                </div>
              </div>

              {/* Tax Band Breakdown */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tax Band Breakdown</div>
                {slipDialog.taxBands.map((band, i) => (
                  <div key={i} className="flex justify-between px-3 py-1.5 border-t border-border">
                    <span>{band.label} (NPR {fmt(band.taxable)})</span>
                    <span className="font-mono-data text-destructive">NPR {fmt(band.tax)}</span>
                  </div>
                ))}
                <div className="flex justify-between px-3 py-2 border-t border-border font-semibold bg-muted/30">
                  <span>Annual Tax</span><span className="font-mono-data text-destructive">NPR {fmt(slipDialog.annTax)}</span>
                </div>
                <div className="flex justify-between px-3 py-2 border-t border-border font-semibold">
                  <span>Monthly Tax</span><span className="font-mono-data text-destructive">NPR {fmt(slipDialog.monthlyTax)}</span>
                </div>
              </div>

              {/* Net Salary */}
              <div className="bg-foreground text-background rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider opacity-50">Net Salary</p>
                  <p className="text-[10px] opacity-40 font-mono-data mt-0.5">{NEPALI_MONTHS[parseInt(month) - 1]} {year}</p>
                </div>
                <p className="text-xl font-semibold font-mono-data">NPR {fmt(slipDialog.netPay)}</p>
              </div>

              <div className="flex justify-between items-center">
                <p className="text-[10px] text-muted-foreground">System-generated salary slip · Verify with IRD Nepal</p>
                <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => {
                  const printContent = document.querySelector('.payslip-print');
                  window.print();
                }}><Download className="w-3 h-3" />Download</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Payroll</h1>
          <p className="text-sm text-muted-foreground">Nepal TDS & salary processing · IRD FY {fyKey}</p>
        </div>
      </motion.div>

      <motion.div variants={item}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50 border border-border p-1 h-auto">
            <TabsTrigger value="payroll" className="gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Calculator className="w-3.5 h-3.5" />Bulk Payroll
            </TabsTrigger>
            <TabsTrigger value="payslips" className="gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Receipt className="w-3.5 h-3.5" />Payslips
            </TabsTrigger>
            <TabsTrigger value="taxslab" className="gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Settings2 className="w-3.5 h-3.5" />Tax Slab
            </TabsTrigger>
          </TabsList>

          {/* BULK PAYROLL */}
          <TabsContent value="payroll" className="space-y-4 mt-4">
            <div className="bg-card border border-border rounded-lg p-5">
              <h3 className="text-sm font-semibold mb-3">Payroll Period & Settings</h3>
              <div className="grid grid-cols-5 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Month</label>
                  <Select value={month} onValueChange={v => { setMonth(v); setProcessed(false); }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{NEPALI_MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)} className="text-xs">{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Year</label>
                  <Input value={year} onChange={e => { setYear(e.target.value); setProcessed(false); }} className="h-8 text-xs font-mono-data" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Financial Year</label>
                  <Select value={fyKey} onValueChange={v => { setFyKey(v); setProcessed(false); }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.keys(taxSlabs).map(fy => <SelectItem key={fy} value={fy} className="text-xs">{fy}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Working Days</label>
                  <Input type="number" value={workingDays} onChange={e => { setWorkingDays(+e.target.value); setProcessed(false); }} className="h-8 text-xs font-mono-data" min={1} max={31} />
                </div>
                <div className="flex items-end">
                  <Button size="sm" className="gap-1.5 w-full press-effect" onClick={runPayroll}><Calculator className="w-3.5 h-3.5" />Process Payroll</Button>
                </div>
              </div>
            </div>

            {/* Employee Input Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">Employee Attendance & Salary Input</h3>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-mono-data">{employees.length} employees</span>
                </div>
                <Button variant="outline" size="sm" className="gap-1 text-xs h-7 press-effect" onClick={addEmployee}><Plus className="w-3 h-3" />Add Employee</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="nexus-table" style={{ minWidth: "1400px" }}>
                  <thead>
                    <tr>
                      <th className="w-8">#</th><th>Employee Name</th><th>Type</th><th>Gender</th>
                      <th>SSF</th><th>Emp. Type</th>
                      <th>Absent</th><th>Unpaid Leave</th><th>Monthly Salary</th><th>PF</th>
                      <th>Dashain</th><th>Extra Time</th><th>Bonus</th><th>CIT</th>
                      <th>Health Ins.</th><th>Life Ins.</th><th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp, i) => (
                      <tr key={emp.id}>
                        <td className="font-mono-data text-xs text-muted-foreground">{i + 1}</td>
                        <td><Input value={emp.name} onChange={e => updateEmployee(emp.id, 'name', e.target.value)} className="h-7 text-xs min-w-[140px]" placeholder="Employee name" /></td>
                        <td>
                          <Select value={emp.tp} onValueChange={v => updateEmployee(emp.id, 'tp', v as TaxpayerType)}>
                            <SelectTrigger className="h-7 text-xs w-20"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="single" className="text-xs">Single</SelectItem><SelectItem value="couple" className="text-xs">Couple</SelectItem></SelectContent>
                          </Select>
                        </td>
                        <td>
                          <Select value={emp.gd} onValueChange={v => updateEmployee(emp.id, 'gd', v as Gender)}>
                            <SelectTrigger className="h-7 text-xs w-20"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="male" className="text-xs">Male</SelectItem><SelectItem value="female" className="text-xs">Female</SelectItem><SelectItem value="other" className="text-xs">Other</SelectItem></SelectContent>
                          </Select>
                        </td>
                        <td>
                          <input type="checkbox" checked={emp.hasSSF ?? false} onChange={e => updateEmployee(emp.id, 'hasSSF', e.target.checked)} className="rounded" />
                        </td>
                        <td>
                          <Select value={emp.employmentType || 'full-time'} onValueChange={v => updateEmployee(emp.id, 'employmentType', v)}>
                            <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="full-time" className="text-xs">Full-time</SelectItem><SelectItem value="contract" className="text-xs">Contract</SelectItem></SelectContent>
                          </Select>
                        </td>
                        <td><Input type="number" value={emp.absentDays} onChange={e => updateEmployee(emp.id, 'absentDays', +e.target.value)} className="h-7 text-xs w-16 font-mono-data" min={0} /></td>
                        <td><Input type="number" value={emp.unpaidLeave} onChange={e => updateEmployee(emp.id, 'unpaidLeave', +e.target.value)} className="h-7 text-xs w-16 font-mono-data" min={0} /></td>
                        <td><Input type="number" value={emp.monthlySalary} onChange={e => updateEmployee(emp.id, 'monthlySalary', +e.target.value)} className="h-7 text-xs w-24 font-mono-data" min={0} /></td>
                        <td><Input type="number" value={emp.pf} onChange={e => updateEmployee(emp.id, 'pf', +e.target.value)} className="h-7 text-xs w-20 font-mono-data" min={0} /></td>
                        <td><Input type="number" value={emp.dashain} onChange={e => updateEmployee(emp.id, 'dashain', +e.target.value)} className="h-7 text-xs w-20 font-mono-data" min={0} /></td>
                        <td><Input type="number" value={emp.extraTime} onChange={e => updateEmployee(emp.id, 'extraTime', +e.target.value)} className="h-7 text-xs w-20 font-mono-data" min={0} /></td>
                        <td><Input type="number" value={emp.bonus} onChange={e => updateEmployee(emp.id, 'bonus', +e.target.value)} className="h-7 text-xs w-20 font-mono-data" min={0} /></td>
                        <td><Input type="number" value={emp.cit} onChange={e => updateEmployee(emp.id, 'cit', +e.target.value)} className="h-7 text-xs w-20 font-mono-data" min={0} /></td>
                        <td><Input type="number" value={emp.healthInsurance} onChange={e => updateEmployee(emp.id, 'healthInsurance', +e.target.value)} className="h-7 text-xs w-20 font-mono-data" min={0} /></td>
                        <td><Input type="number" value={emp.lifeInsurance} onChange={e => updateEmployee(emp.id, 'lifeInsurance', +e.target.value)} className="h-7 text-xs w-20 font-mono-data" min={0} /></td>
                        <td><button onClick={() => removeEmployee(emp.id)} className="p-1 rounded hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Results */}
            {processed && results.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Employees", value: String(results.length), icon: Users, color: "text-primary" },
                    { label: "Total Gross", value: `NPR ${fmt(totals.totalIncome)}`, icon: DollarSign, color: "text-primary" },
                    { label: "Total TDS", value: `NPR ${fmt(totals.totalTax)}`, icon: AlertCircle, color: "text-destructive" },
                    { label: "Total Net", value: `NPR ${fmt(totals.totalNet)}`, icon: CheckCircle2, color: "text-success" },
                  ].map(s => (
                    <div key={s.label} className="bg-card border border-border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2"><s.icon className={`w-4 h-4 ${s.color}`} /><span className="text-xs text-muted-foreground">{s.label}</span></div>
                      <p className={`text-xl font-semibold font-mono-data ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Payroll — {NEPALI_MONTHS[parseInt(month) - 1]} {year}</h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-1 text-xs h-7 press-effect" onClick={saveMonth}><Save className="w-3 h-3" />Save Month</Button>
                      <Button variant="outline" size="sm" className="gap-1 text-xs h-7 press-effect" onClick={exportCSV}><Download className="w-3 h-3" />Export CSV</Button>
                      <Button variant="outline" size="sm" className="gap-1 text-xs h-7 press-effect" onClick={exportIRD}><FileText className="w-3 h-3" />IRD File</Button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="nexus-table" style={{ minWidth: "1600px" }}>
                      <thead>
                        <tr>
                          <th className="w-8">#</th><th>Employee</th><th>Actual Salary</th><th>Basic (60%)</th>
                          <th>Allowance (40%)</th><th>SSF (20%)</th><th>Dashain</th><th>Extra/Bonus</th>
                          <th>Total Income</th><th>SSF (31%)</th><th>CIT</th><th>PF</th><th>TDS</th>
                          <th>Total Deduct</th><th>Net Pay</th><th>Eff. Rate</th><th className="w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r, i) => (
                          <tr key={r.id} className="cursor-pointer" onClick={() => setSlipDialog(r)}>
                            <td className="font-mono-data text-xs text-muted-foreground">{i + 1}</td>
                            <td>
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary shrink-0">
                                  {(r.name || '?').split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase()}
                                </div>
                                <div><p className="text-xs font-medium">{r.name || '—'}</p><p className="text-[10px] text-muted-foreground">{r.tp === 'couple' ? 'Couple' : 'Single'} · {r.gd}</p></div>
                              </div>
                            </td>
                            <td className="font-mono-data text-xs">{fmt(r.actualSalary)}</td>
                            <td className="font-mono-data text-xs">{fmt(r.basic)}</td>
                            <td className="font-mono-data text-xs">{fmt(r.allowance)}</td>
                            <td className="font-mono-data text-xs">{fmt(r.ssf20)}</td>
                            <td className="font-mono-data text-xs">{fmt(r.dashain)}</td>
                            <td className="font-mono-data text-xs">{fmt(r.extraTime + r.bonus)}</td>
                            <td className="font-mono-data text-xs font-semibold">{fmt(r.totalIncome)}</td>
                            <td className="font-mono-data text-xs text-destructive">{fmt(r.ssf31)}</td>
                            <td className="font-mono-data text-xs">{fmt(r.cit)}</td>
                            <td className="font-mono-data text-xs">{fmt(r.pf)}</td>
                            <td className="font-mono-data text-xs text-destructive">{fmt(r.monthlyTax)}</td>
                            <td className="font-mono-data text-xs">{fmt(r.totalDeduct)}</td>
                            <td className="font-mono-data text-xs font-semibold text-success">{fmt(r.netPay)}</td>
                            <td className="font-mono-data text-[10px] text-muted-foreground">{(r.effRate * 100).toFixed(1)}%</td>
                            <td>
                              <Button variant="outline" size="sm" className="h-6 px-2 text-[10px]" onClick={e => { e.stopPropagation(); setSlipDialog(r); }}><Eye className="w-3 h-3" /></Button>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-muted/30 font-semibold">
                          <td></td><td className="text-xs">Total · {results.length} employees</td>
                          <td className="font-mono-data text-xs">{fmt(results.reduce((a, r) => a + r.actualSalary, 0))}</td>
                          <td></td><td></td><td></td><td></td><td></td>
                          <td className="font-mono-data text-xs">{fmt(totals.totalIncome)}</td>
                          <td className="font-mono-data text-xs text-destructive">{fmt(totals.totalSSF)}</td>
                          <td></td><td></td>
                          <td className="font-mono-data text-xs text-destructive">{fmt(totals.totalTax)}</td>
                          <td className="font-mono-data text-xs">{fmt(totals.totalDeduct)}</td>
                          <td className="font-mono-data text-xs text-success">{fmt(totals.totalNet)}</td>
                          <td></td><td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </TabsContent>

          {/* PAYSLIPS */}
          <TabsContent value="payslips" className="space-y-4 mt-4">
            <div className="flex gap-3 items-center">
              <Select value={slipFilterMonth} onValueChange={setSlipFilterMonth}>
                <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="All Months" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Months</SelectItem>{NEPALI_MONTHS.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={slipFilterYear} onValueChange={setSlipFilterYear}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="All Years" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Years</SelectItem>{uniqueYears.map(y => <SelectItem key={y} value={y} className="text-xs">{y}</SelectItem>)}</SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground font-mono-data">{filteredSlips.length} slips</span>
            </div>
            <div className="bg-card border border-border rounded-lg">
              {filteredSlips.length === 0 ? (
                <div className="p-12 text-center">
                  <Receipt className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No pay slips saved yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Process payroll and click "Save Month" to generate pay slips</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 p-4">
                  {filteredSlips.map((s, i) => (
                    <div key={i} className="bg-muted/30 border border-border rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSlipDialog(s.result)}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary">
                          {s.empName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                        </div>
                        <div><p className="text-sm font-medium">{s.empName}</p><p className="text-[10px] text-muted-foreground font-mono-data">{s.month} {s.year}</p></div>
                      </div>
                      <p className="text-lg font-semibold font-mono-data text-success">NPR {fmt(s.result.netPay)}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Gross {fmt(s.result.totalIncome)}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">TDS {fmt(s.result.monthlyTax)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAX SLAB */}
          <TabsContent value="taxslab" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Tax Slab Configuration</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Manage income tax slabs per fiscal year. Only Admin/HR can edit.</p>
              </div>
              <Dialog open={addFYDialog} onOpenChange={setAddFYDialog}>
                <DialogTrigger asChild><Button size="sm" className="gap-1.5 press-effect"><Plus className="w-3.5 h-3.5" />Add FY</Button></DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader><DialogTitle>Add Fiscal Year</DialogTitle></DialogHeader>
                  <div className="space-y-3 pt-2">
                    <div><label className="text-xs text-muted-foreground mb-1 block">FY Key (e.g., 2083/084)</label><Input value={newFYKey} onChange={e => setNewFYKey(e.target.value)} className="h-9 text-sm" placeholder="20XX/0XX" /></div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setAddFYDialog(false)}>Cancel</Button>
                      <Button size="sm" onClick={() => {
                        if (!newFYKey || taxSlabs[newFYKey]) return;
                        const base = taxSlabs['2082/083'];
                        setTaxSlabs(prev => ({ ...prev, [newFYKey]: { ...base, slabs: base.slabs.map(s => ({ ...s })) } }));
                        setNewFYKey("");
                        setAddFYDialog(false);
                        toast({ title: `FY ${newFYKey} added` });
                      }}>Add</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {Object.entries(taxSlabs).map(([fy, data]) => (
              <div key={fy} className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold">FY {fy}</h4>
                    <p className="text-[10px] text-muted-foreground">Single threshold: NPR {fmt(data.threshSingle)} · Couple: NPR {fmt(data.threshCouple)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => { setEditSlabFY(fy); setEditSlabData(JSON.parse(JSON.stringify(data))); }}>
                      <Edit2 className="w-3 h-3" />Edit
                    </Button>
                    {Object.keys(taxSlabs).length > 1 && (
                      <Button variant="outline" size="sm" className="gap-1 text-xs h-7 text-destructive" onClick={() => {
                        const next = { ...taxSlabs };
                        delete next[fy];
                        setTaxSlabs(next);
                        if (fyKey === fy) setFyKey(Object.keys(next)[0]);
                        toast({ title: `FY ${fy} deleted` });
                      }}><Trash2 className="w-3 h-3" /></Button>
                    )}
                  </div>
                </div>
                <table className="nexus-table">
                  <thead>
                    <tr><th>Band</th><th>Single</th><th>Couple</th><th>Tax Rate</th></tr>
                  </thead>
                  <tbody>
                    {data.slabs.map((slab, i) => {
                      const isFirst = i === 0;
                      const isLast = slab.size === 0 && i === data.slabs.length - 1;
                      let singleLabel = '';
                      let coupleLabel = '';
                      if (isFirst) {
                        singleLabel = `First Rs. ${fmt(data.threshSingle)}`;
                        coupleLabel = `First Rs. ${fmt(data.threshCouple)}`;
                      } else if (isLast) {
                        singleLabel = 'Remaining';
                        coupleLabel = 'Remaining';
                      } else {
                        singleLabel = `Next Rs. ${fmt(slab.size)}`;
                        coupleLabel = `Next Rs. ${fmt(slab.size)}`;
                      }
                      return (
                        <tr key={i}>
                          <td className="text-xs">Band {i + 1}</td>
                          <td className="text-xs font-mono-data">{singleLabel}</td>
                          <td className="text-xs font-mono-data">{coupleLabel}</td>
                          <td className="text-xs font-mono-data font-semibold">{slab.rate}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-4 py-2 border-t border-border text-[10px] text-muted-foreground">
                  Female rebate: {data.femaleRebate}% · Retirement cap: NPR {fmt(data.capRetirement)} · Life ins cap: NPR {fmt(data.capLife)} · Health ins cap: NPR {fmt(data.capMed)}
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </motion.div>

      {renderPayslipDialog()}

      {/* Edit Tax Slab Dialog */}
      <Dialog open={!!editSlabFY} onOpenChange={() => setEditSlabFY(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Tax Slab — FY {editSlabFY}</DialogTitle></DialogHeader>
          {editSlabData && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground mb-1 block">Single Threshold</label><Input type="number" value={editSlabData.threshSingle} onChange={e => setEditSlabData({ ...editSlabData, threshSingle: +e.target.value })} className="h-8 text-xs font-mono-data" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Couple Threshold</label><Input type="number" value={editSlabData.threshCouple} onChange={e => setEditSlabData({ ...editSlabData, threshCouple: +e.target.value })} className="h-8 text-xs font-mono-data" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Female Rebate %</label><Input type="number" value={editSlabData.femaleRebate} onChange={e => setEditSlabData({ ...editSlabData, femaleRebate: +e.target.value })} className="h-8 text-xs font-mono-data" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Retirement Cap</label><Input type="number" value={editSlabData.capRetirement} onChange={e => setEditSlabData({ ...editSlabData, capRetirement: +e.target.value })} className="h-8 text-xs font-mono-data" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Life Ins Cap</label><Input type="number" value={editSlabData.capLife} onChange={e => setEditSlabData({ ...editSlabData, capLife: +e.target.value })} className="h-8 text-xs font-mono-data" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Health Ins Cap</label><Input type="number" value={editSlabData.capMed} onChange={e => setEditSlabData({ ...editSlabData, capMed: +e.target.value })} className="h-8 text-xs font-mono-data" /></div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold">Tax Bands</h4>
                  <Button variant="outline" size="sm" className="gap-1 h-6 text-[10px]" onClick={() => setEditSlabData({ ...editSlabData, slabs: [...editSlabData.slabs, { size: 0, rate: 0 }] })}><Plus className="w-2.5 h-2.5" />Add Band</Button>
                </div>
                {editSlabData.slabs.map((slab, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] text-muted-foreground w-14">Band {i + 1}</span>
                    <Input type="number" value={slab.size} onChange={e => {
                      const s = [...editSlabData.slabs];
                      s[i] = { ...s[i], size: +e.target.value };
                      setEditSlabData({ ...editSlabData, slabs: s });
                    }} className="h-7 text-xs w-28 font-mono-data" placeholder="Size (0=top)" />
                    <Input type="number" value={slab.rate} onChange={e => {
                      const s = [...editSlabData.slabs];
                      s[i] = { ...s[i], rate: +e.target.value };
                      setEditSlabData({ ...editSlabData, slabs: s });
                    }} className="h-7 text-xs w-20 font-mono-data" placeholder="Rate %" />
                    <span className="text-[10px] text-muted-foreground">%</span>
                    {editSlabData.slabs.length > 1 && (
                      <button onClick={() => setEditSlabData({ ...editSlabData, slabs: editSlabData.slabs.filter((_, j) => j !== i) })} className="p-0.5 rounded hover:bg-destructive/10"><Trash2 className="w-3 h-3 text-destructive" /></button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditSlabFY(null)}>Cancel</Button>
                <Button size="sm" onClick={() => {
                  if (editSlabFY) {
                    setTaxSlabs(prev => ({ ...prev, [editSlabFY]: editSlabData }));
                    // Update the global IRD_DATA reference
                    (IRD_DATA as Record<string, FYData>)[editSlabFY] = editSlabData;
                    setProcessed(false);
                    setEditSlabFY(null);
                    toast({ title: `Tax slab for FY ${editSlabFY} updated` });
                  }
                }}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
