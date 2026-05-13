import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays, Plus, ArrowLeft, User, FileText, Edit2, Trash2, Settings2, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useRole } from "@/contexts/RoleContext";
import { useToast } from "@/hooks/use-toast";
import { EmployeeAPI } from "@/types";
import { apiClient, LeavePolicyApi } from "@/services/apiClient";

const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };

interface LeaveRequest {
  id: string; employee: string; type: string; from: string; to: string;
  days: number; status: string; reason: string; appliedOn: string;
  approvedBy?: string; remarks?: string; rejectionReason?: string;
}
interface Holiday {
  id: string; start_date: string; end_date: string;
  name: string; holiday_type: "public" | "company" | "regional" | "religious";
}
interface LeavePolicy {
  id: string; name: string; type: "paid" | "sick" | "unpaid" | "compensatory" | "custom";
  annualQuota: number; proRata: boolean; carryForward: boolean;
  maxCarryForward: number; active: boolean;
}
interface LeaveApiResponse {
  id?: string; employee_name?: string;
  employee?: { user?: { name?: string }; name?: string } | string;
  leaveType?: { name: string }; type?: string;
  start_date?: string; end_date?: string; approval_notes?: string;
  days_count?: number; days?: number; status?: string; reason?: string;
  created_at?: string; applied_on?: string; appliedOn?: string;
  approved_by?: string; approvedBy?: string; remarks?: string;
  rejection_reason?: string; rejectionReason?: string;
}

const leaveTypeToEnum: Record<string, string> = {
  "Sick Leave": "sick", "Paid Leave": "paid", "Unpaid Leave": "unpaid",
  "Casual Leave": "casual", "Personal Leave": "personal",
  "Maternity Leave": "maternity", Vacation: "vacation",
};

const normaliseStatus = (s?: string) => {
  if (!s) return "Pending";
  const map: Record<string, string> = {
    pending: "Pending", approved: "Approved", rejected: "Rejected",
    Pending: "Pending", Approved: "Approved", Rejected: "Rejected",
  };
  return map[s] ?? s;
};

const statusClass: Record<string, string> = {
  Pending: "status-pending", Approved: "status-active", Rejected: "status-resigned",
};

const HOLIDAY_TYPE_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "company", label: "Company" },
  { value: "regional", label: "Regional" },
  { value: "religious", label: "Religious" },
] as const;

const POLICY_TYPE_OPTIONS = [
  { value: "paid", label: "Paid" },
  { value: "sick", label: "Sick" },
  { value: "unpaid", label: "Unpaid" },
  { value: "compensatory", label: "Compensatory" },
  { value: "custom", label: "Custom" },
] as const;

// FIX: reads name from personal_details → user.name → employee_id
const getEmployeeDisplayName = (emp: EmployeeAPI): string => {
  const pd = emp.personal_details;
  if (pd?.first_name || pd?.last_name) {
    return `${pd.first_name ?? ""} ${pd.last_name ?? ""}`.trim();
  }
  if (emp.user?.name) return emp.user.name;
  return emp.employee_id ?? "Unknown";
};

export default function LeaveManagement() {
  const { isHR } = useRole();
  const { toast } = useToast();

  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);
  useEffect(() => {
    if (!isHR) {
      apiClient.getMe().then((res) => {
        setCurrentEmployeeId(res.data?.employee?.id ?? null);
      });
    }
  }, [isHR]);

  // FIX: store EmployeeAPI[] (raw) instead of Employee[] (normalized)
  // so personal_details.first_name / last_name are available for display
  const [employees, setEmployees] = useState<EmployeeAPI[]>([]);
  const [activeTab, setActiveTab] = useState("requests");
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [applyDialog, setApplyDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [editDialog, setEditDialog] = useState(false);
  const [editData, setEditData] = useState<LeaveRequest | null>(null);

  const [holidayDialog, setHolidayDialog] = useState(false);
  const [editHoliday, setEditHoliday] = useState<Holiday | null>(null);
  const [newHoliday, setNewHoliday] = useState({
    name: "", start_date: "", end_date: "", holiday_type: "public" as Holiday["holiday_type"],
  });

  const [policyDialog, setPolicyDialog] = useState(false);
  const [editPolicy, setEditPolicy] = useState<LeavePolicy | null>(null);
  const [newPolicy, setNewPolicy] = useState({
    name: "", type: "custom" as LeavePolicy["type"],
    annualQuota: 0, proRata: false, carryForward: false, maxCarryForward: 0,
  });

  const [newLeave, setNewLeave] = useState({ employee: "", type: "", from: "", to: "", reason: "" });
  const [applyForEmployee, setApplyForEmployee] = useState(false);

  const leaveTypes = policies.filter((p) => p.active).map((p) => p.name);
  const isValidLeaveType = (t: string): t is LeavePolicy["type"] =>
    ["paid", "sick", "unpaid", "compensatory", "custom"].includes(t);

  const mapPolicy = (p: LeavePolicyApi): LeavePolicy => ({
    id: p.id, name: p.name,
    type: isValidLeaveType(p.type) ? p.type : "custom",
    annualQuota: p.annual_quota, proRata: p.pro_rata,
    carryForward: p.carry_forward, maxCarryForward: p.max_carry_forward, active: p.active,
  });

  const fetchEmployees = async () => {
    if (!isHR) return;
    try {
      const res = await apiClient.getEmployees();
      // FIX: store raw EmployeeAPI array directly — no normalization
      setEmployees(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error("Failed to fetch employees", err); }
  };

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
            ? (l.employee?.user?.name ?? (l.employee as { name?: string })?.name)
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
          rejectionReason: l.rejection_reason ?? l.approval_notes ?? l.rejectionReason,
        };
      });
      setRequests(mapped);
    } catch (err) { console.error("Failed to fetch leaves", err); }
  };

  const fetchPolicies = async () => {
    try {
      const res = await apiClient.getPolicies();
      setPolicies((Array.isArray(res.data) ? res.data : []).map(mapPolicy));
    } catch (err) { console.error("Failed to fetch policies", err); }
  };

  const fetchHolidays = async () => {
    try {
      const res = await apiClient.getHolidays();
      const data = Array.isArray(res.data) ? res.data : [];
      setHolidays(data.map((h) => ({
        id: h.id, name: h.name,
        start_date: h.start_date?.split("T")[0] ?? "",
        end_date: h.end_date?.split("T")[0] ?? "",
        holiday_type: h.holiday_type,
      })));
    } catch (err) { console.error("Failed to fetch holidays", err); }
  };

  useEffect(() => { fetchEmployees(); fetchPolicies(); fetchHolidays(); }, [isHR]);
  useEffect(() => { if (isHR || currentEmployeeId) fetchLeaves(); }, [isHR, currentEmployeeId]);

  const handleApplyLeave = async () => {
    if (!newLeave.type || !newLeave.from || !newLeave.to || !newLeave.reason) return;
    if (isHR && applyForEmployee && !newLeave.employee) return;
    try {
      const policy = policies.find((p) => p.name === newLeave.type);
      // FIX: newLeave.employee already is the UUID, no redundant .find() needed
      const employeeId = isHR && applyForEmployee ? newLeave.employee : currentEmployeeId;
      if (!employeeId || !policy?.id) {
        toast({ title: "Error", description: "Invalid employee or leave type" });
        return;
      }
      await apiClient.createLeave({
        employee_id: employeeId, start_date: newLeave.from,
        end_date: newLeave.to, leave_type_id: policy.id, reason: newLeave.reason,
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
      setSelectedRequest((prev) => prev ? { ...prev, status: "Approved", approvedBy: "HR Admin" } : null);
      toast({ title: "Leave approved", description: `${req.employee}'s leave has been approved.` });
    } catch { toast({ title: "Error", description: "Failed to approve leave." }); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim() || !selectedRequest) return;
    try {
      await apiClient.rejectLeave(selectedRequest.id, rejectReason);
      await fetchLeaves();
      setSelectedRequest((prev) => prev ? { ...prev, status: "Rejected", rejectionReason: rejectReason } : null);
      setRejectDialog(false);
      setRejectReason("");
      toast({ title: "Leave rejected" });
    } catch { toast({ title: "Error", description: "Failed to reject leave." }); }
  };

  const handleEditLeave = async () => {
    if (!editData) return;
    try {
      await apiClient.updateLeave(editData.id, {
        leave_type: leaveTypeToEnum[editData.type] ?? editData.type.toLowerCase(),
        start_date: editData.from, end_date: editData.to, reason: editData.reason,
      });
      await fetchLeaves();
      setEditDialog(false);
      setEditData(null);
      toast({ title: "Leave updated", description: "Updated successfully (Pending re-approval)." });
    } catch (err) {
      console.error("Update failed:", err);
      toast({ title: "Update failed", description: (err as Error)?.message });
    }
  };

  const handleDeleteLeave = async (id: string) => {
    try {
      await apiClient.deleteLeave(id);
      await fetchLeaves();
      if (selectedRequest?.id === id) setSelectedRequest(null);
      toast({ title: "Leave request deleted" });
    } catch { toast({ title: "Error", description: "Failed to delete leave." }); }
  };

  const handleSaveHoliday = async () => {
    try {
      if (editHoliday) {
        if (!editHoliday.name || !editHoliday.start_date || !editHoliday.end_date) { toast({ title: "All fields required" }); return; }
        await apiClient.updateHoliday(editHoliday.id, { name: editHoliday.name, start_date: editHoliday.start_date, end_date: editHoliday.end_date, holiday_type: editHoliday.holiday_type });
        toast({ title: "Holiday updated" });
      } else {
        if (!newHoliday.name || !newHoliday.start_date || !newHoliday.end_date) { toast({ title: "All fields required" }); return; }
        await apiClient.createHoliday({ name: newHoliday.name, start_date: newHoliday.start_date, end_date: newHoliday.end_date, holiday_type: newHoliday.holiday_type });
        toast({ title: "Holiday added" });
      }
      await fetchHolidays();
      setHolidayDialog(false);
      setEditHoliday(null);
      setNewHoliday({ name: "", start_date: "", end_date: "", holiday_type: "public" });
    } catch (err) {
      console.error("Failed to save holiday", err);
      toast({ title: "Error", description: "Failed to save holiday." });
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    try { await apiClient.deleteHoliday(id); await fetchHolidays(); toast({ title: "Holiday deleted" }); }
    catch { toast({ title: "Error deleting holiday" }); }
  };

  const handleCreatePolicy = async () => {
    try {
      await apiClient.createPolicy({ name: newPolicy.name, type: newPolicy.type, annual_quota: newPolicy.annualQuota, pro_rata: newPolicy.proRata, carry_forward: newPolicy.carryForward, max_carry_forward: newPolicy.maxCarryForward, description: "", active: true });
      setPolicyDialog(false);
      setNewPolicy({ name: "", type: "custom", annualQuota: 0, proRata: false, carryForward: false, maxCarryForward: 0 });
      await fetchPolicies();
      toast({ title: "Policy created" });
    } catch (err) { console.error("Error creating policy", err); toast({ title: "Error creating policy" }); }
  };

  const handleUpdatePolicy = async () => {
    if (!editPolicy) return;
    try {
      await apiClient.updatePolicy(editPolicy.id, { name: editPolicy.name, type: editPolicy.type, annual_quota: editPolicy.annualQuota, pro_rata: editPolicy.proRata, carry_forward: editPolicy.carryForward, max_carry_forward: editPolicy.maxCarryForward, active: editPolicy.active });
      setEditPolicy(null);
      await fetchPolicies();
      toast({ title: "Policy updated" });
    } catch (err) { console.error("Error updating policy", err); toast({ title: "Error updating policy" }); }
  };

  const handleDeletePolicy = async (id: string) => {
    try { await apiClient.deletePolicy(id); await fetchPolicies(); toast({ title: "Policy deleted" }); }
    catch { toast({ title: "Error deleting policy" }); }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
      {selectedRequest ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground" onClick={() => setSelectedRequest(null)}>
            <ArrowLeft className="w-4 h-4" /> Back to Leave Requests
          </Button>
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-lg font-semibold">Leave Request {selectedRequest.id}</h2>
                  <span className={`status-pill ${statusClass[selectedRequest.status]}`}>{selectedRequest.status}</span>
                </div>
                <p className="text-sm text-muted-foreground">Submitted by {selectedRequest.employee}</p>
              </div>
              {isHR && (
                <div className="flex gap-2">
                  {selectedRequest.status === "Pending" && (
                    <>
                      <Button variant="outline" size="sm" className="text-destructive border-destructive/20 hover:bg-destructive/10" onClick={() => setRejectDialog(true)}>Reject</Button>
                      <Button size="sm" onClick={() => handleApprove(selectedRequest)}>Approve</Button>
                    </>
                  )}
                  <Button variant="outline" size="sm" className="gap-1 disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => { setEditData({ ...selectedRequest }); setEditDialog(true); }} disabled={selectedRequest.status === "Approved"}>
                    <Edit2 className="w-3 h-3" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDeleteLeave(selectedRequest.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
              {!isHR && selectedRequest.status === "Pending" && (
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDeleteLeave(selectedRequest.id)}>
                  <Trash2 className="w-3 h-3" /> Cancel Request
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <User className="w-5 h-5 text-primary" />
                  <div><p className="text-xs text-muted-foreground">Employee</p><p className="text-sm font-medium">{selectedRequest.employee}</p></div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <FileText className="w-5 h-5 text-primary" />
                  <div><p className="text-xs text-muted-foreground">Leave Type</p><p className="text-sm font-medium">{selectedRequest.type}</p></div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="text-sm font-medium font-mono-data">{selectedRequest.from} → {selectedRequest.to}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{selectedRequest.days} day(s)</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-3 bg-muted/30 rounded-lg"><p className="text-xs text-muted-foreground mb-1">Reason</p><p className="text-sm">{selectedRequest.reason}</p></div>
                <div className="p-3 bg-muted/30 rounded-lg"><p className="text-xs text-muted-foreground mb-1">Applied On</p><p className="text-sm font-mono-data">{selectedRequest.appliedOn}</p></div>
                {selectedRequest.approvedBy && (
                  <div className="p-3 bg-muted/30 rounded-lg"><p className="text-xs text-muted-foreground mb-1">Processed By</p><p className="text-sm">{selectedRequest.approvedBy}</p></div>
                )}
                {selectedRequest.rejectionReason && (
                  <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg"><p className="text-xs text-destructive mb-1">Rejection Reason</p><p className="text-sm">{selectedRequest.rejectionReason}</p></div>
                )}
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="text-sm font-semibold mb-3">Status Timeline</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <p className="text-sm">Leave applied by <span className="font-medium">{selectedRequest.employee}</span></p>
                  <span className="text-xs text-muted-foreground font-mono-data ml-auto">{selectedRequest.appliedOn}</span>
                </div>
                {selectedRequest.status !== "Pending" && (
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${selectedRequest.status === "Approved" ? "bg-success" : "bg-destructive"}`} />
                    <p className="text-sm">
                      Leave <span className="font-medium">{selectedRequest.status.toLowerCase()}</span>
                      {selectedRequest.approvedBy && <> by <span className="font-medium">{selectedRequest.approvedBy}</span></>}
                    </p>
                    <span className="text-xs text-muted-foreground font-mono-data ml-auto">{selectedRequest.appliedOn}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <>
          <motion.div variants={item} className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">Leave Management</h1>
              <p className="text-sm text-muted-foreground">Manage leave requests, holidays, and leave policies</p>
            </div>
            <div className="flex gap-2">
              <Dialog open={applyDialog} onOpenChange={setApplyDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5 press-effect"><Plus className="w-3.5 h-3.5" /> Apply Leave</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>{isHR ? "Apply Leave" : "Apply for Leave"}</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    {isHR && (
                      <div>
                        <label className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <input type="checkbox" checked={applyForEmployee} onChange={(e) => setApplyForEmployee(e.target.checked)} className="rounded" />
                          Apply on behalf of an employee
                        </label>
                        {applyForEmployee && (
                          <Select value={newLeave.employee} onValueChange={(v) => setNewLeave({ ...newLeave, employee: v })}>
                            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select employee" /></SelectTrigger>
                            <SelectContent>
                              {employees.length === 0 ? (
                                <SelectItem value="__none__" disabled>No employees found</SelectItem>
                              ) : (
                                employees.map((e) => (
                                  <SelectItem key={e.id} value={e.id}>
                                    {getEmployeeDisplayName(e)}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Leave Type *</label>
                      <Select value={newLeave.type} onValueChange={(v) => setNewLeave({ ...newLeave, type: v })}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select leave type" /></SelectTrigger>
                        <SelectContent>
                          {leaveTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">From Date *</label>
                        <Input type="date" value={newLeave.from} onChange={(e) => setNewLeave({ ...newLeave, from: e.target.value })} className="h-9 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">To Date *</label>
                        <Input type="date" value={newLeave.to} onChange={(e) => setNewLeave({ ...newLeave, to: e.target.value })} className="h-9 text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Reason *</label>
                      <Textarea value={newLeave.reason} onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })} placeholder="Provide a reason..." className="text-sm min-h-[80px]" />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button variant="outline" size="sm" onClick={() => { setApplyDialog(false); setApplyForEmployee(false); setNewLeave({ employee: "", type: "", from: "", to: "", reason: "" }); }}>Cancel</Button>
                      <Button size="sm" onClick={handleApplyLeave}>Submit Request</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </motion.div>

          <motion.div variants={item}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-muted/50 border border-border p-1 h-auto">
                <TabsTrigger value="requests" className="gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
                  <FileText className="w-3.5 h-3.5" /> Leave Requests
                </TabsTrigger>
                <TabsTrigger value="holidays" className="gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
                  <Calendar className="w-3.5 h-3.5" /> Holidays
                </TabsTrigger>
                {isHR && (
                  <TabsTrigger value="policies" className="gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
                    <Settings2 className="w-3.5 h-3.5" /> Leave Policies
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="requests" className="mt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 bg-card border border-border rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-border"><h2 className="text-sm font-medium">Recent Requests</h2></div>
                    <table className="nexus-table">
                      <thead>
                        <tr>
                          <th>Employee</th><th>Type</th><th>Duration</th><th>Days</th><th>Reason</th><th>Status</th><th className="w-20">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requests.length === 0 ? (
                          <tr><td colSpan={7} className="text-center text-sm text-muted-foreground py-8">No leave requests found</td></tr>
                        ) : (
                          requests.map((req) => (
                            <tr key={req.id} className="cursor-pointer" onClick={() => setSelectedRequest(req)}>
                              <td className="text-sm font-medium">{req.employee}</td>
                              <td className="text-sm text-muted-foreground">{req.type}</td>
                              <td className="font-mono-data text-xs text-muted-foreground">{req.from} → {req.to}</td>
                              <td className="font-mono-data text-xs">{req.days}</td>
                              <td className="text-xs">
                                {req.status === "Rejected"
                                  ? <p className="text-destructive">{req.rejectionReason || "No reason provided"}</p>
                                  : req.reason}
                              </td>
                              <td><span className={`status-pill ${statusClass[req.status]}`}>{req.status}</span></td>
                              <td onClick={(e) => e.stopPropagation()}>
                                <div className="flex gap-1">
                                  {isHR && (
                                    <Button variant="ghost" size="sm" className="h-6 px-1.5 disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => { setEditData({ ...req }); setEditDialog(true); }} disabled={req.status === "Approved"}>
                                      <Edit2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                  {(isHR || req.status === "Pending") && (
                                    <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={() => handleDeleteLeave(req.id)}>
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
                    <div className="px-4 py-3 border-b border-border"><h2 className="text-sm font-medium">Upcoming Holidays</h2></div>
                    <div className="p-2">
                      {holidays.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No holidays scheduled</p>
                      ) : (
                        holidays.map((h) => (
                          <div key={h.id} className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted/50 transition-colors">
                            <CalendarDays className="w-4 h-4 text-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{h.name}</p>
                              <p className="text-xs text-muted-foreground font-mono-data">{h.start_date} → {h.end_date}</p>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary capitalize">{h.holiday_type}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="holidays" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Holiday Calendar</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{holidays.length} holidays configured for the year</p>
                  </div>
                  {isHR && (
                    <Dialog open={holidayDialog} onOpenChange={setHolidayDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="gap-1.5 press-effect"><Plus className="w-3.5 h-3.5" /> Add Holiday</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm">
                        <DialogHeader><DialogTitle>Add Holiday</DialogTitle></DialogHeader>
                        <div className="space-y-3 pt-2">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Holiday Name *</label>
                            <Input value={newHoliday.name} onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })} className="h-9 text-sm" placeholder="e.g. Dashain" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Start Date *</label>
                            <Input type="date" value={newHoliday.start_date} onChange={(e) => setNewHoliday({ ...newHoliday, start_date: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">End Date *</label>
                            <Input type="date" value={newHoliday.end_date} onChange={(e) => setNewHoliday({ ...newHoliday, end_date: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                            <Select value={newHoliday.holiday_type} onValueChange={(v) => setNewHoliday({ ...newHoliday, holiday_type: v as Holiday["holiday_type"] })}>
                              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {HOLIDAY_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setHolidayDialog(false)}>Cancel</Button>
                            <Button size="sm" onClick={handleSaveHoliday}>Add Holiday</Button>
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
                        <th>Date</th><th>Holiday Name</th><th>Type</th>
                        {isHR && <th className="w-24">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {holidays.sort((a, b) => a.start_date.localeCompare(b.start_date)).map((h) => (
                        <tr key={h.id}>
                          <td className="font-mono-data text-xs">{h.start_date} → {h.end_date}</td>
                          <td className="text-sm font-medium">{h.name}</td>
                          <td><span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">{h.holiday_type}</span></td>
                          {isHR && (
                            <td>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={() => setEditHoliday({ ...h })}><Edit2 className="w-3 h-3" /></Button>
                                <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={() => handleDeleteHoliday(h.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {isHR && (
                <TabsContent value="policies" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">Leave Policy Settings</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Configure leave types, quotas, and pro-rata rules</p>
                    </div>
                    <Dialog open={policyDialog} onOpenChange={setPolicyDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="gap-1.5 press-effect"><Plus className="w-3.5 h-3.5" /> Add Leave Type</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader><DialogTitle>Add Leave Type</DialogTitle></DialogHeader>
                        <div className="space-y-3 pt-2">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Leave Name *</label>
                            <Input value={newPolicy.name} onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })} className="h-9 text-sm" placeholder="e.g. Maternity Leave" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                            <Select value={newPolicy.type} onValueChange={(v) => setNewPolicy({ ...newPolicy, type: v as LeavePolicy["type"] })}>
                              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {POLICY_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Annual Quota (days)</label>
                            <Input type="number" value={newPolicy.annualQuota} onChange={(e) => setNewPolicy({ ...newPolicy, annualQuota: +e.target.value })} className="h-9 text-sm font-mono-data" min={0} />
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-muted-foreground">Pro-Rata (1 leave per month worked)</label>
                            <Switch checked={newPolicy.proRata} onCheckedChange={(v) => setNewPolicy({ ...newPolicy, proRata: v })} />
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-muted-foreground">Carry Forward</label>
                            <Switch checked={newPolicy.carryForward} onCheckedChange={(v) => setNewPolicy({ ...newPolicy, carryForward: v })} />
                          </div>
                          {newPolicy.carryForward && (
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Max Carry Forward (days)</label>
                              <Input type="number" value={newPolicy.maxCarryForward} onChange={(e) => setNewPolicy({ ...newPolicy, maxCarryForward: +e.target.value })} className="h-9 text-sm font-mono-data" min={0} />
                            </div>
                          )}
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setPolicyDialog(false)}>Cancel</Button>
                            <Button size="sm" onClick={handleCreatePolicy}>Add Policy</Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {policies.map((p) => (
                      <div key={p.id} className="bg-card border border-border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold">{p.name}</h4>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${p.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                                {p.active ? "Active" : "Inactive"}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{p.type} leave</p>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={() => setEditPolicy({ ...p })}><Edit2 className="w-3 h-3" /></Button>
                            <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={() => handleDeletePolicy(p.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 bg-muted/30 rounded"><p className="text-muted-foreground">Annual Quota</p><p className="font-semibold font-mono-data">{p.annualQuota} days</p></div>
                          <div className="p-2 bg-muted/30 rounded"><p className="text-muted-foreground">Pro-Rata</p><p className="font-semibold">{p.proRata ? "Yes (1/month)" : "No"}</p></div>
                          <div className="p-2 bg-muted/30 rounded"><p className="text-muted-foreground">Carry Forward</p><p className="font-semibold">{p.carryForward ? `Yes (max ${p.maxCarryForward}d)` : "No"}</p></div>
                          <div className="p-2 bg-muted/30 rounded"><p className="text-muted-foreground">Status</p><p className="font-semibold">{p.active ? "Active" : "Disabled"}</p></div>
                        </div>
                      </div>
                    ))}
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
          <DialogHeader><DialogTitle>Reject Leave Request</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for rejecting <span className="font-medium text-foreground">{selectedRequest?.employee}</span>'s leave request.
            </p>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Rejection Reason *</label>
              <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Enter the reason for rejection..." className="text-sm min-h-[100px]" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setRejectDialog(false); setRejectReason(""); }}>Cancel</Button>
              <Button size="sm" variant="destructive" onClick={handleReject} disabled={!rejectReason.trim()}>Reject Leave</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Leave Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Leave Request</DialogTitle></DialogHeader>
          {editData && (
            <div className="space-y-4 pt-2">
              {(editData.status === "Approved" || editData.status === "Rejected") && (
                <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50">
                  <span className="text-amber-600 dark:text-amber-400 mt-0.5">⚠</span>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    This request is currently <strong>{editData.status}</strong>. Saving any change will reset it to <strong>Pending</strong> and require HR re-approval.
                  </p>
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Employee</label>
                <Input value={editData.employee} disabled className="h-9 text-sm opacity-60" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Leave Type</label>
                <Select value={editData.type} onValueChange={(v) => setEditData({ ...editData, type: v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">From</label>
                  <Input type="date" value={editData.from} onChange={(e) => setEditData({ ...editData, from: e.target.value })} className="h-9 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">To</label>
                  <Input type="date" value={editData.to} onChange={(e) => setEditData({ ...editData, to: e.target.value })} className="h-9 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Reason</label>
                <Textarea value={editData.reason} onChange={(e) => setEditData({ ...editData, reason: e.target.value })} className="text-sm min-h-[60px]" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditDialog(false)}>Cancel</Button>
                <Button size="sm" onClick={handleEditLeave}>Save & Reset to Pending</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Holiday Dialog */}
      <Dialog open={!!editHoliday} onOpenChange={() => setEditHoliday(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Holiday</DialogTitle></DialogHeader>
          {editHoliday && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Holiday Name</label>
                <Input value={editHoliday.name} onChange={(e) => setEditHoliday({ ...editHoliday, name: e.target.value })} className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
                <Input type="date" value={editHoliday.start_date} onChange={(e) => setEditHoliday({ ...editHoliday, start_date: e.target.value })} className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">End Date</label>
                <Input type="date" value={editHoliday.end_date} onChange={(e) => setEditHoliday({ ...editHoliday, end_date: e.target.value })} className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                <Select value={editHoliday.holiday_type} onValueChange={(v) => setEditHoliday({ ...editHoliday, holiday_type: v as Holiday["holiday_type"] })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HOLIDAY_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditHoliday(null)}>Cancel</Button>
                <Button size="sm" onClick={handleSaveHoliday}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Policy Dialog */}
      <Dialog open={!!editPolicy} onOpenChange={() => setEditPolicy(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Leave Policy</DialogTitle></DialogHeader>
          {editPolicy && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Leave Name</label>
                <Input value={editPolicy.name} onChange={(e) => setEditPolicy({ ...editPolicy, name: e.target.value })} className="h-9 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                <Select value={editPolicy.type} onValueChange={(v) => setEditPolicy({ ...editPolicy, type: v as LeavePolicy["type"] })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {POLICY_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Annual Quota (days)</label>
                <Input type="number" value={editPolicy.annualQuota} onChange={(e) => setEditPolicy({ ...editPolicy, annualQuota: +e.target.value })} className="h-9 text-sm font-mono-data" min={0} />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Pro-Rata</label>
                <Switch checked={editPolicy.proRata} onCheckedChange={(v) => setEditPolicy({ ...editPolicy, proRata: v })} />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Carry Forward</label>
                <Switch checked={editPolicy.carryForward} onCheckedChange={(v) => setEditPolicy({ ...editPolicy, carryForward: v })} />
              </div>
              {editPolicy.carryForward && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Max Carry Forward</label>
                  <Input type="number" value={editPolicy.maxCarryForward} onChange={(e) => setEditPolicy({ ...editPolicy, maxCarryForward: +e.target.value })} className="h-9 text-sm font-mono-data" min={0} />
                </div>
              )}
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Active</label>
                <Switch checked={editPolicy.active} onCheckedChange={(v) => setEditPolicy({ ...editPolicy, active: v })} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditPolicy(null)}>Cancel</Button>
                <Button size="sm" onClick={handleUpdatePolicy}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}