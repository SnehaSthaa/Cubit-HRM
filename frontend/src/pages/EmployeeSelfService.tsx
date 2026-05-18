// src/pages/EmployeeSelfService.tsx
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  User, FileText, CreditCard, CalendarDays, Edit2, Upload, Plus,
  Phone, Mail, Building2, Package, AlertCircle, Check, X, Trash2,
  Save, Stethoscope, type LucideIcon, Briefcase, Plane, Coffee,
  AlertTriangle, Baby, Loader2, CheckSquare, ChevronDown, ShieldCheck,
  ShieldAlert, KeyRound, EyeOff, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/contexts/RoleContext";
import type { Employee, EmployeeAPI, EmergencyContact, EmployeeDocument, LeaveBalance } from "@/types";
import { getLatestDepartment, normalizeEmployee } from "@/types";
import { apiClient, type AssetApi } from "@/services/apiClient";

const itemVariant = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };
const containerVariant = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };

interface BankFormData {
  bank_name: string; account_number: string; branch: string;
  salary: string; contract_type: string;
}
interface DeptFormData {
  department_name: string; designation: string; level: string;
  hierarchy: string; joining_date: string; previous_experience: string;
  employment_type: string; employment_status: string;
}
interface ProfileFormData {
  first_name: string; last_name: string; email: string; phone: string;
  date_of_birth: string; gender: string; marital_status: string;
  father_name: string; grandfather_name: string; mother_name: string;
  current_address: string; permanent_address: string;
  citizenship_number: string; pan_number: string;
  nid_number: string; ssid_number: string;
}
type Section = "profile" | "bank" | "department";

const leaveTypeIcons: Record<string, LucideIcon> = {
  sick: Stethoscope, paid: Briefcase, vacation: Plane,
  casual: Coffee, unpaid: AlertTriangle, maternity: Baby,
};
const enumToLeaveType: Record<string, string> = {
  sick: "Sick Leave", personal: "Personal Leave", vacation: "Vacation",
  maternity: "Maternity Leave", casual: "Casual Leave", unpaid: "Unpaid Leave",
  paid: "Paid Leave", compensatory: "Compensatory Leave",
};
const documentTypes = ["Citizenship", "PAN", "Certificate", "National Identification", "Police Report", "SSF", "Other"];
const docStatusClass: Record<string, string> = {
  Verified: "status-active", Pending: "status-pending", Rejected: "status-resigned",
};
const empStatusClass: Record<string, string> = {
  Active: "status-active", "On Leave": "status-pending",
  "Notice Period": "status-notice", Resigned: "status-resigned", Inactive: "status-inactive",
};

const EMPTY_BANK: BankFormData = { bank_name: "", account_number: "", branch: "", salary: "", contract_type: "" };
const EMPTY_DEPT: DeptFormData = { department_name: "", designation: "", level: "", hierarchy: "", joining_date: "", previous_experience: "", employment_type: "", employment_status: "" };
const EMPTY_PROFILE: ProfileFormData = { first_name: "", last_name: "", email: "", phone: "", date_of_birth: "", gender: "", marital_status: "", father_name: "", grandfather_name: "", mother_name: "", current_address: "", permanent_address: "", citizenship_number: "", pan_number: "", nid_number: "", ssid_number: "" };

function toDateStr(val: unknown): string {
  if (!val) return "";
  const s = String(val);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
}
function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) return String((err  ).message);
  return "An unexpected error occurred";
}
function profileFromEmployee(e: Employee, userEmail?: string): ProfileFormData {
  const p = e.personal_details;
  return {
    first_name:         p?.first_name         ?? "",
    last_name:          p?.last_name          ?? "",
    email:              p?.email              ?? userEmail ?? "",
    phone:              p?.phone              ?? "",
    date_of_birth:      toDateStr(p?.date_of_birth),
    gender:             p?.gender             ?? "",
    marital_status:     p?.marital_status     ?? "",
    father_name:        p?.father_name        ?? "",
    grandfather_name:   p?.grandfather_name   ?? "",
    mother_name:        p?.mother_name        ?? "",
    current_address:    p?.current_address    ?? "",
    permanent_address:  p?.permanent_address  ?? "",
    citizenship_number: p?.citizenship_number ?? "",
    pan_number:         p?.pan_number         ?? "",
    nid_number:         p?.nid_number         ?? "",
    ssid_number:        p?.ssid_number        ?? "",
  };
}
function bankFromEmployee(e: Employee): BankFormData {
  const b = e.bank_details;
  return {
    bank_name:      b?.bank_name      ?? "",
    account_number: b?.account_number ?? "",
    branch:         b?.branch         ?? "",
    salary:         b?.salary ? String(b.salary) : "",
    contract_type:  b?.contract_type  ?? "",
  };
}
function deptFromEmployee(e: Employee): DeptFormData {
  const d = getLatestDepartment(e.department);
  return {
    department_name:     d?.department_name     ?? "",
    designation:         d?.designation         ?? "",
    level:               d?.level               ?? "",
    hierarchy:           d?.hierarchy           ?? "",
    joining_date:        toDateStr(d?.joining_date),
    previous_experience: d?.previous_experience ?? "",
    employment_type:     d?.employment_type     ?? "",
    employment_status:   d?.employment_status   ?? "",
  };
}

export default function EmployeeSelfService() {
  const { toast } = useToast();
  const { isHR } = useRole();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const docFileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState("profile");
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance[]>([]);
  const [hasUnverifiedChanges, setHasUnverifiedChanges] = useState(false);
  const [approvingAll, setApprovingAll] = useState(false);
  const [changedSections, setChangedSections] = useState<Set<Section>>(new Set());
  const [statusDialog, setStatusDialog] = useState(false);
  const [empStatus, setEmpStatus] = useState("Active");
  const [editing, setEditing] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileFormData>(EMPTY_PROFILE);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordError, setPasswordError] = useState("");
  const [showPasswords, setShowPasswords] = useState({ currentPassword: false, newPassword: false, confirmPassword: false });
  const [bankCommitted, setBankCommitted] = useState<BankFormData>(EMPTY_BANK);
  const [bankDraft, setBankDraft] = useState<BankFormData>(EMPTY_BANK);
  const [editingBank, setEditingBank] = useState(false);
  const [deptCommitted, setDeptCommitted] = useState<DeptFormData>(EMPTY_DEPT);
  const [deptDraft, setDeptDraft] = useState<DeptFormData>(EMPTY_DEPT);
  const [editingDept, setEditingDept] = useState(false);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [uploadDocType, setUploadDocType] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [addContactDialog, setAddContactDialog] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", relation: "", phone: "", email: "" });
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editContactData, setEditContactData] = useState({ name: "", relation: "", phone: "", email: "" });
  const [employeeAssets, setEmployeeAssets] = useState<AssetApi[]>([]);
  const [assetRequestDialog, setAssetRequestDialog] = useState(false);
  const [assetRequest, setAssetRequest] = useState({ type: "", name: "", reason: "" });

  const pendingDocCount = documents.filter((d) => d.status === "Pending").length;
  const showApprovalBanner = isHR && (hasUnverifiedChanges || pendingDocCount > 0);

  function markChanged(section: Section) {
    setHasUnverifiedChanges(true);
    setChangedSections((prev) => new Set(prev).add(section));
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await apiClient.getMe();
        const meUser = res.data?.user;
        let rawEmployee = res.data?.employee as EmployeeAPI | null ?? null;

        if (!meUser) {
          toast({ title: "Could not identify logged-in user", variant: "destructive" });
          setLoading(false);
          return;
        }

        if (!rawEmployee) {
          try {
            const allRes = await apiClient.getEmployees();
            const employees = allRes.data ?? [];
            rawEmployee = employees.find((emp) => {
              if ((emp  ).user_id && meUser.id && (emp ).user_id === meUser.id) return true;
              const pdEmail = (emp ).personal_details?.email ?? "";
              return pdEmail.toLowerCase() === meUser.email.toLowerCase();
            }) ?? null;
          } catch {
            // silently ignore
          }
        }

        if (!rawEmployee) {
          toast({
            title: "No employee profile found",
            description: "Your account is not linked to an employee record. Please contact HR.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const e = normalizeEmployee(rawEmployee);
        setEmployee(e);
        setProfileForm(profileFromEmployee(e, meUser.email));
        const latestDept = getLatestDepartment(e.department);
        setEmpStatus(latestDept?.employment_status ?? "Active");
        if (e.profile_image) setProfileImage(`${e.profile_image}?t=${Date.now()}`);
        const bank = bankFromEmployee(e);
        setBankCommitted(bank); setBankDraft(bank);
        const dept = deptFromEmployee(e);
        setDeptCommitted(dept); setDeptDraft(dept);
        if (Array.isArray(e.documents) && e.documents.length) setDocuments(e.documents);
      } catch (err) {
        toast({ title: "Failed to load profile", description: errMsg(err), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!employee?.id) return;
    apiClient.getDocuments(employee.id)
      .then((res) => { const docs = (res.data as EmployeeDocument[]) ?? []; if (docs.length > 0) setDocuments(docs); })
      .catch(console.error);
    apiClient.getEmergencyContacts(employee.id)
      .then((res) => { if (Array.isArray(res.data)) setEmergencyContacts(res.data); })
      .catch(console.error);
    apiClient.getAssets({ assigned_to: employee.id })
      .then((res) => setEmployeeAssets(res.data ?? []))
      .catch(console.error);
  }, [employee?.id]);

  useEffect(() => {
    if (!employee?.id) return;
    apiClient.getLeaveBalance(employee.id)
      .then((res) => {
        if (res?.data) {
          setLeaveBalance(res.data.map((l: LeaveBalance) => ({
            ...l,
            name: enumToLeaveType[l.leave_type_id] ?? l.leave_type_id,
          })));
        }
      })
      .catch((err) => toast({ title: "Failed to fetch leave balance", description: errMsg(err), variant: "destructive" }));
  }, [employee?.id]);

  const handleProfileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !employee?.id) return;
    try {
      setUploading(true);
      const res = await apiClient.uploadEmployeeProfileImage(employee.id, e.target.files[0]);
      const imageUrl = res.data?.profile_image;
      if (imageUrl) setProfileImage(`${imageUrl}?t=${Date.now()}`);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      toast({ title: "Upload failed", description: errMsg(err), variant: "destructive" });
    } finally { setUploading(false); }
  };

  // ── ADDED BACK: was accidentally removed ──────────────────────────────────
  const handleSaveProfile = async () => {
  if (!employee?.id) return;
  if (!profileForm.first_name || !profileForm.last_name || !profileForm.email) {
    toast({ title: "First name, last name and email are required", variant: "destructive" });
    return;
  }
  try {
    setSaving(true);
    // Use the dedicated personal-details endpoint, not updateEmployee
await apiClient.updatePersonalDetails(employee.id, profileForm as unknown as Record<string, unknown>);    setEmployee((prev) =>
      prev ? {
        ...prev,
        personal_details: {
          ...prev.personal_details,
          ...profileForm,
          id: prev.personal_details?.id ?? "",
          employee_id: employee.id,
        },
      } : prev
    );
    setEditing(false);
    markChanged("profile");
    toast({ title: "Profile updated", description: "Awaiting HR verification." });
  } catch (err) {
    toast({ title: "Failed to save profile", description: errMsg(err), variant: "destructive" });
  } finally { setSaving(false); }
};

  const handleSaveBank = async () => {
    if (!employee?.id) return;
    try {
      setSaving(true);
await apiClient.upsertBankDetails(employee.id, bankDraft as unknown as Record<string, unknown>);      setBankCommitted({ ...bankDraft });
      setEmployee((prev) =>
        prev ? { ...prev, bank_details: { ...prev.bank_details, ...bankDraft, id: prev.bank_details?.id ?? "", employee_id: employee.id } } : prev
      );
      setEditingBank(false);
      markChanged("bank");
      toast({ title: "Bank details updated", description: "Awaiting HR verification." });
    } catch (err) {
      toast({ title: "Failed to save bank details", description: errMsg(err), variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleSaveDept = async () => {
    if (!employee?.id) return;
    try {
      setSaving(true);
      const latestDept = getLatestDepartment(employee.department);
      await apiClient.updateEmployee(employee.id, {
        department: {
          id: latestDept?.id,
          department_name: deptDraft.department_name,
          designation: deptDraft.designation,
          level: deptDraft.level,
          hierarchy: deptDraft.hierarchy,
          joining_date: deptDraft.joining_date,
          previous_experience: deptDraft.previous_experience,
          employment_type: deptDraft.employment_type,
        },
      });
      setDeptCommitted({ ...deptDraft });
      setEditingDept(false);
      markChanged("department");
      toast({ title: "Department info updated", description: "Awaiting HR verification." });
    } catch (err) {
      toast({ title: "Failed to save department info", description: errMsg(err), variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleApproveAll = async () => {
    if (!employee?.id) return;
    try {
      setApprovingAll(true);
      const pendingDocs = documents.filter((d) => d.status === "Pending");
      const results = await Promise.allSettled([
        changedSections.size > 0 ? apiClient.verifyEmployee(employee.id) : Promise.resolve(),
        ...pendingDocs.map((doc) => apiClient.updateDocumentStatus(doc.id, "Verified")),
      ]);
      const failures = results.filter((r) => r.status === "rejected");
      const verifyOk = results[0].status === "fulfilled";
      const approvedDocIds = new Set(
        pendingDocs
          .filter((_, i) => results[i + 1]?.status === "fulfilled")
          .map((d) => d.id)
      );
      if (verifyOk) {
        setHasUnverifiedChanges(false);
        setChangedSections(new Set());
      }
      setDocuments((prev) =>
        prev.map((d) => approvedDocIds.has(d.id) ? { ...d, status: "Verified" as const } : d)
      );
      if (failures.length > 0) {
        toast({
          title: `${failures.length} item(s) failed to approve`,
          description: "Some changes could not be verified. Please try again.",
          variant: "destructive",
        });
      } else {
        const parts: string[] = [];
        if (changedSections.size > 0) parts.push(`${changedSections.size} section(s)`);
        if (pendingDocs.length > 0) parts.push(`${pendingDocs.length} document(s)`);
        toast({ title: "All changes approved", description: parts.length > 0 ? `Verified ${parts.join(" and ")}.` : "Nothing pending." });
      }
    } catch (err) {
      toast({ title: "Approval failed", description: errMsg(err), variant: "destructive" });
    } finally { setApprovingAll(false); }
  };

  const handleChangeStatus = async (s: string) => {
    if (!employee?.id) return;
    try {
      const latestDept = getLatestDepartment(employee.department);
      await apiClient.updateEmployee(employee.id, {
        department: { id: latestDept?.id, employment_status: s },
      });
      setEmpStatus(s);
      setDeptCommitted((p) => ({ ...p, employment_status: s }));
      setDeptDraft((p) => ({ ...p, employment_status: s }));
      setStatusDialog(false);
      toast({ title: `Status changed to ${s}` });
    } catch (err) {
      toast({ title: "Failed to update status", description: errMsg(err), variant: "destructive" });
    }
  };

  const handleUploadDoc = async () => {
    if (!selectedFile || !uploadDocType || !employee?.id) return;
    if (documents.some((doc) => doc.type === uploadDocType)) {
      toast({ title: "Document already exists", description: `${uploadDocType} already uploaded.`, variant: "destructive" });
      return;
    }
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("type", uploadDocType);
    formData.append("name", selectedFile.name);
    try {
      setUploadingDoc(true);
      const res = await apiClient.uploadDocument(employee.id, formData);
      setDocuments((prev) => [res.data as EmployeeDocument, ...prev]);
      setSelectedFile(null);
      setUploadDocType("");
      if (docFileInputRef.current) docFileInputRef.current.value = "";
      toast({ title: "Document uploaded" });
    } catch (err) {
      toast({ title: "Upload failed", description: errMsg(err), variant: "destructive" });
    } finally { setUploadingDoc(false); }
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      await apiClient.deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      toast({ title: "Document deleted successfully" });
    } catch { toast({ title: "Delete failed" }); }
  };

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.phone || !employee?.id) return;
    try {
      const res = await apiClient.addEmergencyContact(employee.id, newContact);
      if (res.data) setEmergencyContacts((prev) => [...prev, res.data as EmergencyContact]);
      setNewContact({ name: "", relation: "", phone: "", email: "" });
      setAddContactDialog(false);
      toast({ title: "Contact added" });
    } catch (err) {
      toast({ title: "Failed to add contact", description: errMsg(err), variant: "destructive" });
    }
  };

  const handleUpdateContact = async (contactId: string) => {
    try {
      const res = await apiClient.updateEmergencyContact(contactId, editContactData);
      if (res.data) setEmergencyContacts((prev) => prev.map((c) => c.id === contactId ? (res.data as EmergencyContact) : c));
      setEditingContactId(null);
      toast({ title: "Contact updated" });
    } catch (err) {
      toast({ title: "Update failed", description: errMsg(err), variant: "destructive" });
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      await apiClient.deleteEmergencyContact(contactId);
      setEmergencyContacts((prev) => prev.filter((c) => c.id !== contactId));
      toast({ title: "Contact deleted" });
    } catch (err) {
      toast({ title: "Delete failed", description: errMsg(err), variant: "destructive" });
    }
  };

  const handleReturnAsset = async (assetId: string) => {
    try {
      await apiClient.unassignAsset(assetId);
      setEmployeeAssets((prev) => prev.filter((a) => a.id !== assetId));
      toast({ title: "Asset returned" });
    } catch (err) {
      toast({ title: "Failed to return asset", description: errMsg(err), variant: "destructive" });
    }
  };

  const handleRequestAsset = () => {
    if (!assetRequest.type || !assetRequest.name) return;
    setEmployeeAssets((prev) => [...prev, {
      id: `A-${String(Date.now()).slice(-3)}`,
      asset_id: `A-${String(Date.now()).slice(-3)}`,
      name: assetRequest.name, category: assetRequest.type, serial_number: "—",
      assigned_date: "—", purchase_date: "—", status: "Pending Approval",
    } as AssetApi]);
    setAssetRequest({ type: "", name: "", reason: "" });
    setAssetRequestDialog(false);
    toast({ title: "Asset requested", description: "Pending HR approval." });
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!currentPassword || !newPassword || !confirmPassword) { setPasswordError("All fields are required"); return; }
    if (newPassword !== confirmPassword) { setPasswordError("New passwords do not match"); return; }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) { setPasswordError("Password must be 8+ characters with uppercase, lowercase, number and special character"); return; }
    try {
      setChangingPassword(true);
      await apiClient.changePassword({ currentPassword, newPassword, confirmPassword });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: "Password changed successfully!" });
    } catch (err) {
      setPasswordError(errMsg(err));
    } finally { setChangingPassword(false); }
  };

  const displayName =
    `${employee?.personal_details?.first_name ?? ""} ${employee?.personal_details?.last_name ?? ""}`.trim() ||
    employee?.name || employee?.email || "—";
  const initials =
    ((employee?.personal_details?.first_name?.[0] ?? "") + (employee?.personal_details?.last_name?.[0] ?? "")) ||
    employee?.email?.[0]?.toUpperCase() || "E";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading profile…</span>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="p-4 rounded-full bg-muted">
          <User className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">No Employee Profile Found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Your account is not linked to an employee record. Please contact HR.
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariant} initial="hidden" animate="show" className="space-y-4">
      <motion.div variants={itemVariant}>
        <h1 className="text-lg font-semibold">My Profile</h1>
        <p className="text-sm text-muted-foreground">Employee Self-Service Portal</p>
      </motion.div>

      {showApprovalBanner && (
        <motion.div variants={itemVariant} className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full"><ShieldCheck className="w-5 h-5 text-primary" /></div>
            <div>
              <p className="text-sm font-semibold">Review Required</p>
              <p className="text-xs text-muted-foreground">
                {[
                  changedSections.size > 0 && `${changedSections.size} section${changedSections.size > 1 ? "s" : ""} updated`,
                  pendingDocCount > 0 && `${pendingDocCount} document${pendingDocCount > 1 ? "s" : ""} pending`,
                ].filter(Boolean).join(" · ")} — click to approve all at once.
              </p>
            </div>
          </div>
          <Button size="sm" className="gap-2 px-4 shadow-sm press-effect shrink-0" disabled={approvingAll} onClick={handleApproveAll}>
            {approvingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
            Approve All Changes
          </Button>
        </motion.div>
      )}

      <motion.div variants={itemVariant} className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary overflow-hidden">
              {profileImage
                ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                : <span>{editing ? ((profileForm.first_name[0] ?? "") + (profileForm.last_name[0] ?? "")) : initials}</span>}
            </div>
            {editing && (
              <div className="flex flex-col gap-2">
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleProfileUpload} />
                <Button size="sm" variant="outline" disabled={uploading} onClick={() => fileInputRef.current?.click()} className="gap-1.5">
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Upload Image
                </Button>
              </div>
            )}
            <div>
              <h2 className="font-semibold text-lg">
                {editing ? `${profileForm.first_name} ${profileForm.last_name}`.trim() || "—" : displayName}
              </h2>
              <p className="text-sm text-muted-foreground">{deptCommitted.designation} · {deptCommitted.department_name}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs font-mono-data text-muted-foreground">{employee.employee_id}</span>
                <span className={`status-pill ${empStatusClass[empStatus] ?? "status-active"}`}>{empStatus}</span>
                <span className="text-xs text-muted-foreground">{deptCommitted.employment_type}</span>
                {isHR && (hasUnverifiedChanges || pendingDocCount > 0) && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                    <ShieldAlert className="w-2.5 h-2.5" />
                    {changedSections.size + (pendingDocCount > 0 ? 1 : 0)} pending
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isHR && (
              <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 press-effect">
                    <ChevronDown className="w-3.5 h-3.5" /> Change Status
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader><DialogTitle>Change Employment Status</DialogTitle></DialogHeader>
                  <div className="space-y-3 pt-2">
                    {["Active", "On Leave", "Notice Period", "Resigned", "Inactive"].map((s) => (
                      <button key={s} onClick={() => handleChangeStatus(s)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${empStatus === s ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{s}</span>
                          <span className={`status-pill ${empStatusClass[s]}`}>{s}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <Button variant="outline" size="sm" className="gap-1.5 press-effect" disabled={saving}
              onClick={editing ? handleSaveProfile : () => { setProfileForm(profileFromEmployee(employee)); setEditing(true); }}>
              {saving && editing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : editing ? <Save className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
              {editing ? "Save" : "Edit Profile"}
            </Button>
            {editing && (
              <Button variant="ghost" size="sm" className="press-effect" onClick={() => { setProfileForm(profileFromEmployee(employee)); setEditing(false); }}>
                <X className="w-3.5 h-3.5" /> Cancel
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariant}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted/50 border border-border p-1 h-auto flex-wrap">
            {([
              { value: "profile",    icon: User,         label: "Personal",     section: "profile"    as Section | null },
              { value: "documents",  icon: FileText,     label: "Documents",    section: null },
              { value: "leave",      icon: CalendarDays, label: "Leaves",       section: null },
              { value: "emergency",  icon: Phone,        label: "Emergency",    section: null },
              { value: "bank",       icon: CreditCard,   label: "Bank Details", section: "bank"       as Section | null },
              { value: "department", icon: Building2,    label: "Department",   section: "department" as Section | null },
              { value: "assets",     icon: Package,      label: "Assets",       section: null },
              { value: "security",   icon: KeyRound,     label: "Security",     section: null },
            ] as const).map((t) => (
              <TabsTrigger key={t.value} value={t.value}
                className="gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm relative">
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
                {isHR && t.section && changedSections.has(t.section) && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500" />
                )}
                {isHR && t.value === "documents" && pendingDocCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ══ Personal ══ */}
          <TabsContent value="profile" className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-5">
              <h3 className="text-sm font-semibold mb-4">Personal Information</h3>
              <div className="grid grid-cols-3 gap-4">
                {([
                  { label: "First Name",         key: "first_name" },
                  { label: "Last Name",          key: "last_name" },
                  { label: "Email",              key: "email" },
                  { label: "Phone",              key: "phone",              mono: true },
                  { label: "Date of Birth",      key: "date_of_birth",      mono: true },
                  { label: "Citizenship Number", key: "citizenship_number" },
                  { label: "PAN Number",         key: "pan_number" },
                  { label: "NID Number",         key: "nid_number" },
                  { label: "SSF SSID",           key: "ssid_number" },
                ] as { label: string; key: keyof ProfileFormData; mono?: boolean }[]).map((f) => (
                  <div key={f.key}>
                    <p className="text-xs text-muted-foreground mb-1">{f.label}</p>
                    {editing
                      ? <Input type={f.key === "date_of_birth" ? "date" : "text"} value={profileForm[f.key] ?? ""} onChange={(e) => setProfileForm((p) => ({ ...p, [f.key]: e.target.value }))} className="h-8 text-sm" />
                      : <p className={`text-sm ${f.mono ? "font-mono-data" : ""}`}>{profileForm[f.key] || "—"}</p>}
                  </div>
                ))}
                {([
                  { label: "Gender",         key: "gender",         options: ["Female", "Male", "Others"],                 placeholder: "Select gender" },
                  { label: "Marital Status", key: "marital_status", options: ["Single", "Married", "Divorced", "Widowed"], placeholder: "Select marital status" },
                ] as const).map((field) => (
                  <div key={field.key}>
                    <p className="text-xs text-muted-foreground mb-1">{field.label}</p>
                    {editing ? (
                      <Select value={profileForm[field.key] ?? ""} onValueChange={(v) => setProfileForm((p) => ({ ...p, [field.key]: v }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={field.placeholder} /></SelectTrigger>
                        <SelectContent>{field.options.map((opt) => <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm">{profileForm[field.key] || "—"}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-5">
              <h3 className="text-sm font-semibold mb-4">Family Details</h3>
              <div className="grid grid-cols-3 gap-4">
                {([
                  { label: "Father's Name",      key: "father_name" },
                  { label: "Grandfather's Name", key: "grandfather_name" },
                  { label: "Mother's Name",      key: "mother_name" },
                ] as { label: string; key: keyof ProfileFormData }[]).map((f) => (
                  <div key={f.key}>
                    <p className="text-xs text-muted-foreground mb-1">{f.label}</p>
                    {editing
                      ? <Input value={profileForm[f.key] ?? ""} onChange={(e) => setProfileForm((p) => ({ ...p, [f.key]: e.target.value }))} className="h-8 text-sm" />
                      : <p className="text-sm">{profileForm[f.key] || "—"}</p>}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-5">
              <h3 className="text-sm font-semibold mb-4">Address</h3>
              <div className="grid grid-cols-2 gap-4">
                {([
                  { label: "Current Address",   key: "current_address" },
                  { label: "Permanent Address", key: "permanent_address" },
                ] as { label: string; key: keyof ProfileFormData }[]).map((f) => (
                  <div key={f.key}>
                    <p className="text-xs text-muted-foreground mb-1">{f.label}</p>
                    {editing
                      ? <Input value={profileForm[f.key] ?? ""} onChange={(e) => setProfileForm((p) => ({ ...p, [f.key]: e.target.value }))} className="h-8 text-sm" />
                      : <p className="text-sm">{profileForm[f.key] || "—"}</p>}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ══ Documents ══ */}
          <TabsContent value="documents" className="space-y-4">
            <div className="bg-card border border-border rounded-lg">
              <div className="px-5 py-3 border-b border-border">
                <h3 className="text-sm font-semibold">Documents</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Citizenship, PAN, certificates, NID, police report, SSF</p>
              </div>
              <div className="px-5 py-4 border-b border-border space-y-3">
                <div className="flex items-center gap-2">
                  <Select value={uploadDocType} onValueChange={setUploadDocType}>
                    <SelectTrigger className="w-48 h-8 text-xs"><SelectValue placeholder="Select document type *" /></SelectTrigger>
                    <SelectContent>{documentTypes.map((t) => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
                  </Select>
                  {!uploadDocType && <span className="text-xs text-amber-600 dark:text-amber-400">← Choose a type before uploading</span>}
                </div>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = Array.from(e.dataTransfer.files)[0]; if (f) setSelectedFile(f); }}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragging ? "border-primary bg-primary/5" : uploadDocType ? "border-border hover:border-primary/50" : "border-border opacity-60 cursor-not-allowed"}`}
                  onClick={() => uploadDocType && docFileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{uploadDocType ? "Drag & drop files here, or click to browse" : "Select a document type above first"}</p>
                  {selectedFile && <p className="text-xs text-primary mt-1 font-medium">{selectedFile.name}</p>}
                  <div className="flex items-center gap-2 justify-center mt-3" onClick={(e) => e.stopPropagation()}>
                    <input type="file" ref={docFileInputRef} onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} className="hidden" />
                    <Button size="sm" className="h-8 text-xs gap-1" disabled={!selectedFile || !uploadDocType || uploadingDoc} onClick={handleUploadDoc}>
                      {uploadingDoc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Upload
                    </Button>
                  </div>
                </div>
              </div>
              <table className="nexus-table">
                <thead>
                  <tr><th>Document</th><th>Type</th><th>Size</th><th>Uploaded</th><th>Status</th><th className="w-10"></th></tr>
                </thead>
                <tbody>
                  {documents.length === 0 && (
                    <tr><td colSpan={6} className="text-center text-sm text-muted-foreground py-6">No documents uploaded yet.</td></tr>
                  )}
                  {documents.map((doc, idx) => (
                    <tr key={doc.id ?? idx}>
                      <td><div className="flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground shrink-0" /><span className="text-sm">{doc.name}</span></div></td>
                      <td className="text-xs text-muted-foreground">{doc.type}</td>
                      <td className="text-xs font-mono-data text-muted-foreground">{doc.file_size}</td>
                      <td className="text-xs font-mono-data text-muted-foreground">{toDateStr(doc.uploaded_at)}</td>
                      <td>
                        <span className={`status-pill ${docStatusClass[doc.status]}`}>
                          {doc.status === "Verified" && <Check className="w-3 h-3 mr-1" />}
                          {doc.status === "Pending" && <AlertCircle className="w-3 h-3 mr-1" />}
                          {doc.status === "Rejected" && <X className="w-3 h-3 mr-1" />}
                          {doc.status}
                        </span>
                      </td>
                      <td><button onClick={() => handleDeleteDoc(doc.id)} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ══ Leaves ══ */}
          <TabsContent value="leave" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {leaveBalance?.length > 0 ? leaveBalance.map((lb, idx) => {
                const percentage = lb.total ? Math.round((lb.used / lb.total) * 100) : 0;
                const Icon = leaveTypeIcons[lb.leave_type_id] ?? Briefcase;
                return (
                  <div key={lb.leave_type_id ?? lb.id ?? idx} className="group relative bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/40 transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-md bg-primary/10 text-primary"><Icon className="w-4 h-4" /></div>
                        <p className="text-sm font-semibold">{enumToLeaveType[lb.leave_type_id] ?? lb.leave_type_id}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{percentage}%</span>
                    </div>
                    <p className="text-2xl font-bold tracking-tight mb-3">{lb.remaining}<span className="text-sm font-normal text-muted-foreground ml-1">days left</span></p>
                    <div className="flex justify-between text-xs text-muted-foreground mb-3"><span>Used: {lb.used}</span><span>Total: {lb.total}</span></div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${percentage > 80 ? "bg-red-500" : percentage > 60 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              }) : (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-xl">
                  <p className="text-sm text-muted-foreground">No leave records found.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ══ Emergency ══ */}
          <TabsContent value="emergency" className="space-y-4">
            <div className="bg-card border border-border rounded-lg">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold">Emergency Contacts</h3>
                <Dialog open={addContactDialog} onOpenChange={setAddContactDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1.5 press-effect"><Plus className="w-3.5 h-3.5" /> Add Contact</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Add Emergency Contact</DialogTitle></DialogHeader>
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-2 gap-3">
                        {([{ label: "Name *", key: "name" }, { label: "Relation", key: "relation" }, { label: "Phone *", key: "phone" }, { label: "Email", key: "email" }] as const).map((f) => (
                          <div key={f.key}>
                            <label className="text-xs text-muted-foreground mb-1 block">{f.label}</label>
                            <Input value={(newContact as Record<string, string>)[f.key]} onChange={(e) => setNewContact({ ...newContact, [f.key]: e.target.value })} className="h-8 text-sm" />
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setAddContactDialog(false)}>Cancel</Button>
                        <Button size="sm" onClick={handleAddContact}>Add Contact</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="divide-y divide-border">
                {emergencyContacts.length === 0 && (
                  <p className="px-5 py-6 text-sm text-muted-foreground text-center">No emergency contacts added yet.</p>
                )}
                {emergencyContacts.map((contact, idx) => (
                  <div key={contact.id ?? idx} className="px-5 py-4">
                    {editingContactId === contact.id ? (
                      <div className="grid grid-cols-4 gap-2 items-end">
                        {(["name", "relation", "phone"] as const).map((key) => (
                          <Input key={key} value={editContactData[key]} onChange={(e) => setEditContactData({ ...editContactData, [key]: e.target.value })} className="h-8 text-sm" placeholder={key.charAt(0).toUpperCase() + key.slice(1)} />
                        ))}
                        <div className="flex gap-1">
                          <Button size="sm" className="h-8" onClick={() => handleUpdateContact(contact.id)}><Save className="w-3 h-3" /></Button>
                          <Button variant="outline" size="sm" className="h-8" onClick={() => setEditingContactId(null)}><X className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                            {contact.name.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{contact.name}</p>
                            <p className="text-xs text-muted-foreground">{contact.relation}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="w-3.5 h-3.5" /><span className="font-mono-data">{contact.phone}</span></div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="w-3.5 h-3.5" /><span>{contact.email}</span></div>
                          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => { setEditingContactId(contact.id); setEditContactData({ name: contact.name, relation: contact.relation, phone: contact.phone, email: contact.email ?? "" }); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                          <button onClick={() => handleDeleteContact(contact.id)} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ══ Bank ══ */}
          <TabsContent value="bank" className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Bank & Salary Information</h3>
                <div className="flex gap-2">
                  {editingBank && (
                    <Button variant="ghost" size="sm" className="press-effect" onClick={() => { setBankDraft({ ...bankCommitted }); setEditingBank(false); }}>
                      <X className="w-3.5 h-3.5" /> Cancel
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="gap-1.5 press-effect" disabled={saving}
                    onClick={editingBank ? handleSaveBank : () => { setBankDraft({ ...bankCommitted }); setEditingBank(true); }}>
                    {saving && editingBank ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : editingBank ? <Save className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                    {editingBank ? "Save Changes" : "Edit"}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {([
                  { label: "Bank Name",      key: "bank_name" },
                  { label: "Account Number", key: "account_number", mono: true },
                  { label: "Branch",         key: "branch" },
                  { label: "Salary (NPR)",   key: "salary",         mono: true },
                  { label: "Contract Type",  key: "contract_type" },
                ] as { label: string; key: keyof BankFormData; mono?: boolean }[]).map((f) => (
                  <div key={f.key}>
                    <p className="text-xs text-muted-foreground mb-0.5">{f.label}</p>
                    {editingBank
                      ? <Input type={f.key === "salary" ? "number" : "text"} value={bankDraft[f.key]} onChange={(e) => setBankDraft((p) => ({ ...p, [f.key]: e.target.value }))} className="h-8 text-sm" />
                      : <p className={`text-sm ${f.mono ? "font-mono-data" : ""}`}>{bankCommitted[f.key] || "—"}</p>}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ══ Department ══ */}
          <TabsContent value="department" className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Department & Role Assignment</h3>
                <div className="flex gap-2">
                  {editingDept && (
                    <Button variant="ghost" size="sm" className="press-effect" onClick={() => { setDeptDraft({ ...deptCommitted }); setEditingDept(false); }}>
                      <X className="w-3.5 h-3.5" /> Cancel
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="gap-1.5 press-effect" disabled={saving}
                    onClick={editingDept ? handleSaveDept : () => { setDeptDraft({ ...deptCommitted }); setEditingDept(true); }}>
                    {saving && editingDept ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : editingDept ? <Save className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                    {editingDept ? "Save Changes" : "Edit"}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {([
                  { label: "Department",          key: "department_name" },
                  { label: "Designation",         key: "designation" },
                  { label: "Level",               key: "level" },
                  { label: "Hierarchy",           key: "hierarchy" },
                  { label: "Date of Joining",     key: "joining_date",        mono: true },
                  { label: "Previous Experience", key: "previous_experience" },
                  { label: "Employment Type",     key: "employment_type" },
                  { label: "Employment Status",   key: "employment_status" },
                ] as { label: string; key: keyof DeptFormData; mono?: boolean }[]).map((f) => (
                  <div key={f.key}>
                    <p className="text-xs text-muted-foreground mb-0.5">{f.label}</p>
                    {editingDept ? (
                      f.key === "employment_status" ? <p className="text-sm">{empStatus}</p> : (
                        <Input type={f.key === "joining_date" ? "date" : "text"} value={deptDraft[f.key]}
                          onChange={(e) => setDeptDraft((p) => ({ ...p, [f.key]: e.target.value }))} className="h-8 text-sm" />
                      )
                    ) : (
                      <p className={`text-sm ${f.mono ? "font-mono-data" : ""}`}>
                        {f.key === "employment_status" ? empStatus : deptCommitted[f.key] || "—"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ══ Assets ══ */}
          <TabsContent value="assets" className="space-y-4">
            <div className="bg-card border border-border rounded-lg">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">My Assets</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Assets allocated to you</p>
                </div>
                <Dialog open={assetRequestDialog} onOpenChange={setAssetRequestDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1.5 press-effect"><Plus className="w-3.5 h-3.5" /> Request Asset</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Request New Asset</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Asset Type</label>
                        <Select value={assetRequest.type} onValueChange={(v) => setAssetRequest({ ...assetRequest, type: v })}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>{["Laptop", "Monitor", "Keyboard", "Mouse", "Mobile", "Headset", "Other"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Asset Name</label>
                        <Input value={assetRequest.name} onChange={(e) => setAssetRequest({ ...assetRequest, name: e.target.value })} placeholder="e.g., MacBook Pro 16 inch" className="h-9 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Reason</label>
                        <Textarea value={assetRequest.reason} onChange={(e) => setAssetRequest({ ...assetRequest, reason: e.target.value })} placeholder="Why do you need this asset?" className="text-sm min-h-[80px]" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setAssetRequestDialog(false)}>Cancel</Button>
                        <Button size="sm" onClick={handleRequestAsset}>Submit Request</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <table className="nexus-table">
                <thead>
                  <tr><th>Asset ID</th><th>Name</th><th>Category</th><th>Serial Number</th><th>Assigned</th><th>Status</th><th className="w-16"></th></tr>
                </thead>
                <tbody>
                  {employeeAssets.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-sm text-muted-foreground py-6">No assets assigned yet.</td></tr>
                  )}
                  {employeeAssets.map((asset, idx) => (
                    <tr key={asset.id ?? idx}>
                      <td className="text-xs font-mono-data text-muted-foreground">{asset.asset_id}</td>
                      <td className="text-sm font-medium">{asset.name}</td>
                      <td className="text-xs text-muted-foreground">{asset.category ?? (asset ).type}</td>
                      <td className="text-xs font-mono-data text-muted-foreground">{asset.serial_number || "—"}</td>
                      <td className="text-xs font-mono-data text-muted-foreground">{toDateStr(asset.assigned_date) || "—"}</td>
                      <td><span className={`status-pill ${asset.status === "assigned" ? "status-active" : "status-pending"}`}>{asset.status}</span></td>
                      <td>{asset.status === "assigned" && <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => handleReturnAsset(asset.id)}>Return</Button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ══ Security ══ */}
          <TabsContent value="security" className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-5 max-w-md">
              <h3 className="text-sm font-semibold mb-4">Change Password</h3>
              <div className="space-y-3">
                {([
                  { label: "Current Password",    key: "currentPassword" },
                  { label: "New Password",         key: "newPassword" },
                  { label: "Confirm New Password", key: "confirmPassword" },
                ] as const).map((f) => (
                  <div key={f.key}>
                    <p className="text-xs text-muted-foreground mb-1">{f.label}</p>
                    <div className="relative">
                      <Input
                        type={showPasswords[f.key] ? "text" : "password"}
                        value={passwordForm[f.key]}
                        onChange={(e) => setPasswordForm((p) => ({ ...p, [f.key]: e.target.value }))}
                        className="h-8 text-sm pr-8" placeholder={f.label}
                      />
                      <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowPasswords((p) => ({ ...p, [f.key]: !p[f.key] }))}>
                        {showPasswords[f.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                ))}
                {passwordError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {passwordError}
                  </p>
                )}
                <Button size="sm" className="w-full gap-1.5 mt-2" disabled={changingPassword} onClick={handleChangePassword}>
                  {changingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                  Change Password
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}