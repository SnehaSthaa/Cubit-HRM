import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  User,
  FileText,
  CreditCard,
  Edit2,
  Upload,
  Plus,
  Phone,
  Mail,
  Building2,
  Package,
  AlertCircle,
  Check,
  X,
  Trash2,
  Save,
  ChevronDown,
  Loader2,
  CheckSquare,
  ShieldAlert,
  ShieldCheck,
  CalendarDays,
  Stethoscope,
  Briefcase,
  Plane,
  Coffee,
  AlertTriangle,
  Baby,
  LucideIcon,
  CalendarCheck,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useRole } from "@/contexts/RoleContext";
import { useToast } from "@/hooks/use-toast";
import {
  type Employee,
  type EmployeeDocument,
  type EmergencyContact,
  LeaveBalance,
} from "@/types";
import { apiClient } from "@/services/apiClient";
import type { AssetApi } from "@/services/apiClient";
import { EmployementStatus } from "./EmployeeSelfService";

const itemVariant = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};
const containerVariant = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

interface BankFormData {
  bank_name: string;
  account_number: string;
  branch: string;
  salary: string;
  contract_type: string;
}
interface DeptFormData {
  department: string;
  position: string;
  level: string;
  hierarchy: string;
  joining_date: string;
  previous_experience: string;
  employment_type: string;
  employment_status: string;
}
interface ProfileFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  marital_status: string;
  father_name: string;
  grandfather_name: string;
  mother_name: string;
  current_address: string;
  permanent_address: string;
  citizenship_number?: string;
  pan_number?: string;
  nid_number?: string;
  ssid_number?: string;
}

export const leaveTypeIcons: Record<string, LucideIcon> = {
  "sick leave": Stethoscope,
  " paid leave": Briefcase,
  " vacation leave": Plane,
  "custom leave": Coffee,
  "unpaid leave": AlertTriangle,
  "maternity leave": Baby,
  "annual leave": CalendarCheck,
};

type Section = "profile" | "bank" | "department";

const documentTypes = [
  "Citizenship",
  "PAN",
  "Certificate",
  "National Identification",
  "Police Report",
  "SSF",
  "Other",
];
const docStatusClass: Record<string, string> = {
  Verified: "status-active",
  Pending: "status-pending",
  Rejected: "status-resigned",
};

const empStatusClass: Record<string, string> = {
  active: "active",
  notice_period: "notice_period",
  resigned: "resigned",
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
const EMPTY_BANK: BankFormData = {
  bank_name: "",
  account_number: "",
  branch: "",
  salary: "",
  contract_type: "",
};
const EMPTY_DEPT: DeptFormData = {
  department: "",
  position: "",
  level: "",
  hierarchy: "",
  joining_date: "",
  previous_experience: "",
  employment_type: "",
  employment_status: "",
};
const EMPTY_PROFILE: ProfileFormData = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  date_of_birth: "",
  gender: "",
  marital_status: "",
  father_name: "",
  grandfather_name: "",
  mother_name: "",
  current_address: "",
  permanent_address: "",
  citizenship_number: "",
  pan_number: "",
  nid_number: "",
  ssid_number: "",
};

function toDateStr(val: unknown): string {
  if (!val) return "";
  const s = String(val);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
}
function toSalaryStr(val: unknown): string {
  if (val === null || val === undefined || val === "") return "";
  return String(val);
}
function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : "An unexpected error occurred";
}
function profileFromEmployee(e: Employee, userEmail?: string): ProfileFormData {
  return {
    first_name: e.first_name ?? "",
    last_name: e.last_name ?? "",
    email: e.email ?? e.user?.email ?? userEmail ?? "",
    phone: e.phone ?? "",
    date_of_birth: toDateStr(e.date_of_birth),
    gender: e.gender ?? "",
    marital_status: e.marital_status ?? "",
    father_name: e.father_name ?? "",
    grandfather_name: e.grandfather_name ?? "",
    mother_name: e.mother_name ?? "",
    current_address: e.current_address ?? "",
    permanent_address: e.permanent_address ?? "",
    citizenship_number: e.citizenship_number ?? "",
    pan_number: e.pan_number ?? "",
    nid_number: e.nid_number ?? "",
    ssid_number: e.ssid_number ?? "",
  };
}
function bankFromEmployee(e: Employee): BankFormData {
  return {
    bank_name: e.bank_name ?? "",
    account_number: e.account_number ?? "",
    branch: e.branch ?? "",
    salary: toSalaryStr(e.salary),
    contract_type: e.contract_type ?? "",
  };
}
function deptFromEmployee(e: Employee): DeptFormData {
  return {
    department: e.department ?? "",
    position: e.position ?? "",
    level: e.level ?? "",
    hierarchy: e.hierarchy ?? "",
    joining_date: toDateStr(e.joining_date),
    previous_experience: e.previous_experience ?? "",
    employment_type: e.type ?? "",
    employment_status: e.employment_status ?? "",
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function EmployeeProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isHR } = useRole();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // core
  const [activeTab, setActiveTab] = useState("profile");
  const [statusDialog, setStatusDialog] = useState(false);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance[]>([]);
  // ── Unified pending-verification state ───────────────────────────────────────
  const [hasUnverifiedChanges, setHasUnverifiedChanges] = useState(false);
  const [approvingAll, setApprovingAll] = useState(false);
  const [changedSections, setChangedSections] = useState<Set<Section>>(
    new Set(),
  );
  const [isDragging, setIsDragging] = useState(false);

  // documents
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [uploadDocType, setUploadDocType] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [verifyingBulk, setVerifyingBulk] = useState(false);

  async function handleFiles(files: File[]) {
    if (!uploadDocType) {
      toast({
        title: "Select a document type first",
      });
      return;
    }

    const alreadyExists = documents.some((doc) => doc.type === uploadDocType);

    if (alreadyExists) {
      toast({
        title: "Document already exists",
        description: `${uploadDocType} already uploaded.`,
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(files[0]);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }
  function handleDragLeave() {
    setIsDragging(false);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }

  function markChanged(section: Section) {
    setHasUnverifiedChanges(true);
    setChangedSections((prev) => new Set(prev).add(section));
  }

  // profile
  const [editing, setEditing] = useState(false);
  const [profileForm, setProfileForm] =
    useState<ProfileFormData>(EMPTY_PROFILE);
  const [empStatus, setEmpStatus] = useState<EmployementStatus>("active");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // bank
  const [bankCommitted, setBankCommitted] = useState<BankFormData>(EMPTY_BANK);
  const [bankDraft, setBankDraft] = useState<BankFormData>(EMPTY_BANK);
  const [editingBank, setEditingBank] = useState(false);

  // dept
  const [deptCommitted, setDeptCommitted] = useState<DeptFormData>(EMPTY_DEPT);
  const [deptDraft, setDeptDraft] = useState<DeptFormData>(EMPTY_DEPT);
  const [editingDept, setEditingDept] = useState(false);

  // bulk doc selection
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const pendingDocIds = documents
    .filter((d) => d.status === "Pending")
    .map((d) => d.id);
  const allPendingSelected =
    pendingDocIds.length > 0 &&
    pendingDocIds.every((did) => selectedDocIds.has(did));
  const somePendingSelected = pendingDocIds.some((did) =>
    selectedDocIds.has(did),
  );

  function toggleDoc(docId: string) {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  }
  function toggleAllPending() {
    if (allPendingSelected) {
      setSelectedDocIds((prev) => {
        const next = new Set(prev);
        pendingDocIds.forEach((did) => next.delete(did));
        return next;
      });
    } else {
      setSelectedDocIds((prev) => {
        const next = new Set(prev);
        pendingDocIds.forEach((did) => next.add(did));
        return next;
      });
    }
  }
  //fetch leave balance
  const fetchLeaveBalance = async () => {
    try {
      if (!id) return;

      const res = await apiClient.getLeaveBalance(id);

      if (res?.data) {
        setLeaveBalance(
          res.data.map((l: LeaveBalance) => ({
            name: enumToLeaveType[l.leave_type] ?? l.leave_type,
            leave_type: l.leave_type,
            total: l.total,
            used: l.used ?? 0,
            remaining: l.remaining ?? 12 - (l.used ?? 0),
          })),
        );
      }
    } catch (err) {
      toast({
        title: "Failed to fetch leave Balance",
        description: errMsg(err),
        variant: "destructive",
      });
    }
  };
  useEffect(() => {
    fetchLeaveBalance();
  }, [id]);
  const totalUsed = leaveBalance.reduce(
    (acc, curr) => acc + (Number(curr.used) || 0),
    0,
  );
  const totalRemaining = leaveBalance.reduce((acc, curr) => {
    if (typeof curr.remaining !== "number") return acc;
    return acc + curr.remaining;
  }, 0);

  useEffect(() => {
    if (!id) return;

    const fetchAssets = async () => {
      const res = await apiClient.getAssets({
        assigned_to: id,
      });
      setEmployeeAssets(res.data ?? []);
    };

    fetchAssets();
  }, [id]);
  const handleReturnAsset = async (id: string) => {
    try {
      await apiClient.unassignAsset(id);

      setEmployeeAssets((prev) => prev.filter((asset) => asset.id !== id));

      toast({ title: "Asset returned" });
    } catch (err) {
      toast({
        title: "Failed to return asset",
        description: errMsg(err),
        variant: "destructive",
      });
    }
  };

  async function handleBulkVerify(action: "Verified" | "Rejected") {
    if (selectedDocIds.size === 0) return;
    try {
      setVerifyingBulk(true);
      const ids = Array.from(selectedDocIds);
      await Promise.all(
        ids.map((docId) => apiClient.updateDocumentStatus(docId, action)),
      );
      setDocuments((prev) =>
        prev.map((d) =>
          selectedDocIds.has(d.id) ? { ...d, status: action } : d,
        ),
      );
      setSelectedDocIds(new Set());
      toast({
        title: `${ids.length} document${ids.length > 1 ? "s" : ""} ${action.toLowerCase()}`,
      });
    } catch (err) {
      toast({
        title: "Bulk action failed",
        description: errMsg(err),
        variant: "destructive",
      });
    } finally {
      setVerifyingBulk(false);
    }
  }

  async function handleApproveAll() {
    if (!id) return;
    try {
      setApprovingAll(true);
      const pendingDocs = documents.filter((d) => d.status === "Pending");
      await Promise.all([
        changedSections.size > 0
          ? apiClient.verifyEmployee(id)
          : Promise.resolve(),
        ...pendingDocs.map((doc) =>
          apiClient.updateDocumentStatus(doc.id, "Verified"),
        ),
      ]);
      setDocuments((prev) =>
        prev.map((d) =>
          d.status === "Pending" ? { ...d, status: "Verified" as const } : d,
        ),
      );
      setSelectedDocIds(new Set());
      setHasUnverifiedChanges(false);
      setChangedSections(new Set());
      const docCount = pendingDocs.length;
      const sectCount = changedSections.size;
      const parts: string[] = [];
      if (sectCount > 0)
        parts.push(`${sectCount} section${sectCount > 1 ? "s" : ""}`);
      if (docCount > 0)
        parts.push(`${docCount} document${docCount > 1 ? "s" : ""}`);
      toast({
        title: "All changes approved",
        description:
          parts.length > 0
            ? `Verified ${parts.join(" and ")}.`
            : "Nothing pending.",
      });
    } catch (err) {
      toast({
        title: "Approval failed",
        description: errMsg(err),
        variant: "destructive",
      });
    } finally {
      setApprovingAll(false);
    }
  }

  // emergency contacts
  const [emergencyContacts, setEmergencyContacts] = useState<
    EmergencyContact[]
  >([]);
  const [addContactDialog, setAddContactDialog] = useState(false);
  const [newContact, setNewContact] = useState({
    name: "",
    relation: "",
    phone: "",
    email: "",
  });
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editContactData, setEditContactData] = useState({
    name: "",
    relation: "",
    phone: "",
    email: "",
  });

  // assets
  const [employeeAssets, setEmployeeAssets] = useState<AssetApi[]>([]);
  const [assetRequestDialog, setAssetRequestDialog] = useState(false);
  const [availableAssets, setAvailableAssets] = useState<AssetApi[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [loadingAvailable, setLoadingAvailable] = useState(false);

  const [assetRequest, setAssetRequest] = useState({
    type: "",
    name: "",
    reason: "",
  });
  const isResigned = empStatus === "resigned";
  const fetchAvailableAssets = async () => {
    try {
      setLoadingAvailable(true);
      const res = await apiClient.getAssets({ status: "available" });
      setAvailableAssets(res.data ?? []);
    } catch (err) {
      toast({
        title: "Failed to load available assets",
        description: errMsg(err),
        variant: "destructive",
      });
    } finally {
      setLoadingAvailable(false);
    }
  };

  // ─── Fetch employee ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const res = await apiClient.getEmployee(id);
        const e = res.data as Employee;
        setEmployee(e);
        setProfileForm(profileFromEmployee(e));
        if (e.profile_image) {
          setProfileImage(`${e.profile_image}?t=${Date.now()}`);
        }
        setEmpStatus((e.employment_status as EmployementStatus) ?? "active");
        const bank = bankFromEmployee(e);
        setBankCommitted(bank);
        setBankDraft(bank);
        const dept = deptFromEmployee(e);
        setDeptCommitted(dept);
        setDeptDraft(dept);
        if (Array.isArray(e.documents) && e.documents.length)
          setDocuments(e.documents);
      } catch (err) {
        toast({ title: "Failed to load employee", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await apiClient.getEmergencyContacts(id);
        if (Array.isArray(res.data)) setEmergencyContacts(res.data);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    apiClient
      .getAssets({ assigned_to: id })
      .then((r) => setEmployeeAssets(r.data ?? []))
      .catch(console.error);
  }, [id]);
  //upload profile
  const handleProfileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!e.target.files?.[0] || !employee?.id) return;

    try {
      setUploading(true);

      const file = e.target.files[0];

      const res = await apiClient.uploadEmployeeProfileImage(employee.id, file);

      const imageUrl = res.data.profile_image;

      console.log("IMAGE URL:", imageUrl);

      setProfileImage(`${imageUrl}?t=${Date.now()}`);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.log("upload Failed", err);
    } finally {
      setUploading(false);
    }
  };

  // ─── Save handlers ────────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!id) return;
    try {
      setSaving(true);
      await apiClient.updateEmployee(
        id,
        profileForm as unknown as Record<string, unknown>,
      );
      setEmployee((prev) =>
        prev ? ({ ...prev, ...profileForm } as unknown as Employee) : prev,
      );
      setEditing(false);
      markChanged("profile");
      toast({
        title: "Profile updated",
        description: "Awaiting HR verification.",
      });
    } catch (err) {
      toast({
        title: "Failed to save profile",
        description: errMsg(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBank = async () => {
    if (!id) return;
    try {
      setSaving(true);
      await apiClient.updateEmployee(
        id,
        bankDraft as unknown as Record<string, unknown>,
      );
      setBankCommitted({ ...bankDraft });
      setEmployee((prev) =>
        prev ? ({ ...prev, ...bankDraft } as unknown as Employee) : prev,
      );
      setEditingBank(false);
      markChanged("bank");
      toast({
        title: "Bank details updated",
        description: "Awaiting HR verification.",
      });
    } catch (err) {
      toast({
        title: "Failed to save bank details",
        description: errMsg(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDept = async () => {
    if (!id) return;
    try {
      setSaving(true);
      const { employment_status, ...rest } = deptDraft;
      await apiClient.updateEmployee(id, rest);
      setDeptCommitted({ ...deptDraft });
      setEmployee((prev) =>
        prev ? ({ ...prev, ...deptDraft } as unknown as Employee) : prev,
      );
      setEditingDept(false);
      markChanged("department");
      toast({
        title: "Department info updated",
        description: "Awaiting HR verification.",
      });
    } catch (err) {
      toast({
        title: "Failed to save department info",
        description: errMsg(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangeStatus = async (s: string) => {
    if (!id) return;
    try {
      if (s === "notice_period") {
        await apiClient.startOffboarding(id);
      } else {
        await apiClient.updateEmployee(id, { employment_status: s });
      }

      setEmpStatus(s as EmployementStatus);
      setDeptCommitted((p) => ({ ...p, employment_status: s }));
      setDeptDraft((p) => ({ ...p, employment_status: s }));
      setEmployee((p) =>
        p ? ({ ...p, employment_status: s } as unknown as Employee) : p,
      );
      setStatusDialog(false);
      toast({ title: `Status changed to ${s}` });

      if (s === "notice_period") {
        navigate(`/offboarding`);
      }
    } catch (err) {
      toast({
        title: "Failed to update status",
        description: errMsg(err),
        variant: "destructive",
      });
    }
  };

  const handleUpdateDocumentStatus = async (
    docId: string,
    status: "Verified" | "Rejected",
  ) => {
    try {
      await apiClient.updateDocumentStatus(docId, status);
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, status } : d)),
      );
    } catch (err) {
      toast({
        title: "Failed to update document",
        description: errMsg(err),
        variant: "destructive",
      });
    }
  };

  const handleAddContact = async () => {
    if (!id || !newContact.name || !newContact.phone) return;
    try {
      const res = await apiClient.addEmergencyContact(
        id,
        newContact as unknown as Record<string, unknown>,
      );
      if (res.data)
        setEmergencyContacts((prev) => [...prev, res.data as EmergencyContact]);
      setNewContact({ name: "", relation: "", phone: "", email: "" });
      setAddContactDialog(false);
      toast({ title: "Contact added" });
    } catch (err) {
      toast({
        title: "Failed to add contact",
        description: errMsg(err),
        variant: "destructive",
      });
    }
  };

  const handleUpdateContact = async (contactId: string) => {
    if (!id) return;
    try {
      const res = await apiClient.updateEmergencyContact(
        id,
        contactId,
        editContactData as unknown as Record<string, unknown>,
      );
      if (res.data)
        setEmergencyContacts((prev) =>
          prev.map((c) =>
            c.id === contactId ? (res.data as EmergencyContact) : c,
          ),
        );
      setEditingContactId(null);
      toast({ title: "Contact updated" });
    } catch (err) {
      toast({
        title: "Update failed",
        description: errMsg(err),
        variant: "destructive",
      });
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!id) return;
    try {
      await apiClient.deleteEmergencyContact(id, contactId);
      setEmergencyContacts((prev) => prev.filter((c) => c.id !== contactId));
      toast({ title: "Contact deleted" });
    } catch (err) {
      toast({
        title: "Delete failed",
        description: errMsg(err),
        variant: "destructive",
      });
    }
  };

  // ─── Computed flags ───────────────────────────────────────────────────────────
  const pendingDocCount = documents.filter(
    (d) => d.status === "Pending",
  ).length;
  const showApprovalBanner =
    isHR && (hasUnverifiedChanges || pendingDocCount > 0);

  // ─── Guards ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading employee…</span>
      </div>
    );
  }
  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-sm text-muted-foreground">Employee not found.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/employees")}
        >
          Back to Employees
        </Button>
      </div>
    );
  }

  const displayName = `${employee.first_name} ${employee.last_name}`.trim();
  const initials =
    (employee.first_name?.[0] ?? "") + (employee.last_name?.[0] ?? "");

  return (
    <motion.div
      variants={containerVariant}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      <motion.div variants={itemVariant}>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 -ml-2 text-muted-foreground"
          onClick={() => navigate("/employees")}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Employees
        </Button>
      </motion.div>

      {showApprovalBanner && (
        <motion.div
          variants={itemVariant}
          className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Review Required</p>
              <p className="text-xs text-muted-foreground">
                {[
                  changedSections.size > 0 &&
                    `${changedSections.size} section${changedSections.size > 1 ? "s" : ""} updated`,
                  pendingDocCount > 0 &&
                    `${pendingDocCount} document${pendingDocCount > 1 ? "s" : ""} pending`,
                ]
                  .filter(Boolean)
                  .join(" · ")}{" "}
                — click to approve all at once.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="gap-2 px-4 shadow-sm press-effect shrink-0"
            disabled={approvingAll}
            onClick={handleApproveAll}
          >
            {approvingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckSquare className="w-4 h-4" />
            )}
            Approve All Changes
          </Button>
        </motion.div>
      )}

      {isResigned && (
        <motion.div
          variants={itemVariant}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-destructive/20 bg-destructive/5"
        >
          <LogOut className="w-4 h-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive font-medium">
            This employee has been resigned. Profile is read-only — no changes
            can be made.
          </p>
        </motion.div>
      )}
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <motion.div
        variants={itemVariant}
        className="bg-card border border-border rounded-lg p-5"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onLoad={() =>
                    console.log("Image loaded successfully:", profileImage)
                  }
                  onError={(e) => {
                    console.error("Image failed to load. URL:", profileImage);
                  }}
                />
              ) : editing ? (
                (profileForm.first_name[0] ?? "") +
                (profileForm.last_name[0] ?? "")
              ) : (
                initials
              )}
            </div>
            {editing && (
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  hidden
                  accept="image/*"
                  onChange={handleProfileUpload}
                />

                <Button
                  size="sm"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5"
                >
                  {uploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  Upload Image
                </Button>
              </div>
            )}
            <div>
              <h2 className="font-semibold text-lg">
                {editing
                  ? `${profileForm.first_name} ${profileForm.last_name}`.trim()
                  : displayName}
              </h2>
              <p className="text-sm text-muted-foreground">
                {deptCommitted.position} · {deptCommitted.department}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs font-mono-data text-muted-foreground">
                  {employee.employee_id}
                </span>
                <span
                  className={`status-pill ${empStatusClass[empStatus] ?? "status-active"}`}
                >
                  {empStatus}
                </span>
                <span className="text-xs text-muted-foreground">
                  {deptCommitted.employment_type}
                </span>
                {isHR && (hasUnverifiedChanges || pendingDocCount > 0) && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                    <ShieldAlert className="w-2.5 h-2.5" />
                    {changedSections.size + (pendingDocCount > 0 ? 1 : 0)}{" "}
                    pending
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isHR && (
              <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 press-effect"
                    disabled={isResigned}
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                    Change Status
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Change Employment Status</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 pt-2">
                    {(
                      [
                        "active",
                        "notice_period",
                        "resigned",
                      ] as EmployementStatus[]
                    ).map((s) => (
                      <button
                        key={s}
                        onClick={() => handleChangeStatus(s)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                          empStatus === s
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">
                            {s}
                          </span>
                          <span className={`status-pill ${empStatusClass[s]}`}>
                            {s}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 press-effect"
              disabled={saving || isResigned}
              onClick={
                editing
                  ? handleSaveProfile
                  : () => {
                      setProfileForm(profileFromEmployee(employee));
                      setEditing(true);
                    }
              }
            >
              {saving && editing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : editing ? (
                <Save className="w-3.5 h-3.5" />
              ) : (
                <Edit2 className="w-3.5 h-3.5" />
              )}
              {editing ? "Save" : "Edit Profile"}
            </Button>
            {editing && (
              <Button
                variant="ghost"
                size="sm"
                className="press-effect"
                onClick={() => setEditing(false)}
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariant}>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="bg-muted/50 border border-border p-1 h-auto flex-wrap">
            {(
              [
                {
                  value: "profile",
                  icon: User,
                  label: "Personal",
                  section: "profile" as Section,
                },
                {
                  value: "documents",
                  icon: FileText,
                  label: "Documents",
                  section: null,
                },
                {
                  value: "leave",
                  icon: CalendarDays,
                  label: "Leaves",
                  section: null,
                },
                {
                  value: "emergency",
                  icon: Phone,
                  label: "Emergency",
                  section: null,
                },
                {
                  value: "bank",
                  icon: CreditCard,
                  label: "Bank Details",
                  section: "bank" as Section,
                },
                {
                  value: "department",
                  icon: Building2,
                  label: "Department",
                  section: "department" as Section,
                },
                {
                  value: "assets",
                  icon: Package,
                  label: "Assets",
                  section: null,
                },
              ] as const
            ).map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm relative"
              >
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

          {/* ══ Personal ══════════════════════════════════════════════════════ */}
          <TabsContent value="profile" className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-5">
              <h3 className="text-sm font-semibold mb-4">
                Personal Information
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {(
                  [
                    { label: "First Name", key: "first_name" },
                    { label: "Last Name", key: "last_name" },
                    { label: "Email", key: "email" },
                    { label: "Phone", key: "phone", mono: true },
                    {
                      label: "Date of Birth",
                      key: "date_of_birth",
                      mono: true,
                    },
                    { label: "Citizenship Number", key: "citizenship_number" },
                    { label: "PAN Number", key: "pan_number" },
                    { label: "NID Number", key: "nid_number" },
                    { label: "SSF SSID", key: "ssid_number" },
                  ] as {
                    label: string;
                    key: keyof ProfileFormData;
                    mono?: boolean;
                  }[]
                ).map((f) => (
                  <div key={f.key}>
                    <p className="text-xs text-muted-foreground mb-1">
                      {f.label}
                    </p>
                    {editing ? (
                      <Input
                        type={f.key === "date_of_birth" ? "date" : "text"}
                        value={profileForm[f.key] ?? ""}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            [f.key]: e.target.value,
                          })
                        }
                        className="h-8 text-sm"
                      />
                    ) : (
                      <p
                        className={`text-sm ${f.mono ? "font-mono-data" : ""}`}
                      >
                        {profileForm[f.key] || "—"}
                      </p>
                    )}
                  </div>
                ))}

                {[
                  {
                    label: "Gender",
                    key: "gender",
                    options: ["Female", "Male", "Others"],
                    placeholder: "Select gender",
                  },
                  {
                    label: "Marital Status",
                    key: "marital_status",
                    options: ["Single", "Married", "Divorced", "Widowed"],
                    placeholder: "Select marital status",
                  },
                ].map((field) => (
                  <div key={field.key} className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      {field.label}
                    </label>
                    {editing ? (
                      <Select
                        value={profileForm[field.key] ?? ""}
                        onValueChange={(value) =>
                          setProfileForm({
                            ...profileForm,
                            [field.key]: value,
                          })
                        }
                      >
                        <SelectTrigger className="w-1/2 h-8 text-xs">
                          <SelectValue placeholder={field.placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options.map((opt) => (
                            <SelectItem
                              key={opt}
                              value={opt}
                              className="text-xs"
                            >
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
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
                {(
                  [
                    { label: "Father's Name", key: "father_name" },
                    { label: "Grandfather's Name", key: "grandfather_name" },
                    { label: "Mother's Name", key: "mother_name" },
                  ] as { label: string; key: keyof ProfileFormData }[]
                ).map((f) => (
                  <div key={f.key}>
                    <p className="text-xs text-muted-foreground mb-1">
                      {f.label}
                    </p>
                    {editing ? (
                      <Input
                        value={profileForm[f.key] ?? ""}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            [f.key]: e.target.value,
                          })
                        }
                        className="h-8 text-sm"
                      />
                    ) : (
                      <p className="text-sm">{profileForm[f.key] || "—"}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-5">
              <h3 className="text-sm font-semibold mb-4">Address</h3>
              <div className="grid grid-cols-2 gap-4">
                {(
                  [
                    { label: "Current Address", key: "current_address" },
                    { label: "Permanent Address", key: "permanent_address" },
                  ] as { label: string; key: keyof ProfileFormData }[]
                ).map((f) => (
                  <div key={f.key}>
                    <p className="text-xs text-muted-foreground mb-1">
                      {f.label}
                    </p>
                    {editing ? (
                      <Input
                        value={profileForm[f.key] ?? ""}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            [f.key]: e.target.value,
                          })
                        }
                        className="h-8 text-sm"
                      />
                    ) : (
                      <p className="text-sm">{profileForm[f.key] || "—"}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ══ Documents ═════════════════════════════════════════════════════ */}
          <TabsContent value="documents" className="space-y-4">
            <div className="bg-card border border-border rounded-lg">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Documents</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Citizenship, PAN, certificates, NID, police report, SSF
                  </p>
                </div>
                {isHR && selectedDocIds.size > 0 && (
                  <div className="flex items-center gap-2 bg-muted/60 border border-border rounded-lg px-3 py-1.5">
                    <span className="text-xs text-muted-foreground font-medium">
                      {selectedDocIds.size} selected
                    </span>
                    <div className="w-px h-4 bg-border" />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs gap-1.5 text-success hover:text-success hover:bg-success/10"
                      disabled={verifyingBulk}
                      onClick={() => handleBulkVerify("Verified")}
                    >
                      {verifyingBulk ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      Verify
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                      disabled={verifyingBulk}
                      onClick={() => handleBulkVerify("Rejected")}
                    >
                      {verifyingBulk ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <X className="w-3 h-3" />
                      )}
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-muted-foreground"
                      onClick={() => setSelectedDocIds(new Set())}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>

              {/* Upload zone — type selector is now clearly above the drop area
                  so users know they must pick a type before dragging files in */}
              <div className="px-5 py-4 border-b border-border space-y-3">
                <div className="flex items-center gap-2">
                  <Select
                    value={uploadDocType}
                    onValueChange={setUploadDocType}
                  >
                    <SelectTrigger className="w-48 h-8 text-xs">
                      <SelectValue placeholder="Select document type *" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((t) => (
                        <SelectItem key={t} value={t} className="text-xs">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!uploadDocType && (
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      ← Choose a type before uploading
                    </span>
                  )}
                </div>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : uploadDocType
                        ? "border-border hover:border-primary/50"
                        : "border-border opacity-60 cursor-not-allowed"
                  }`}
                  onClick={() => uploadDocType && fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {uploadDocType
                      ? "Drag & drop files here, or click to browse"
                      : "Select a document type above first"}
                  </p>
                  {selectedFile && (
                    <p className="text-xs text-primary mt-1 font-medium">
                      {selectedFile.name}
                    </p>
                  )}
                  <div
                    className="flex items-center gap-2 justify-center mt-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) =>
                        setSelectedFile(e.target.files?.[0] ?? null)
                      }
                      className="hidden"
                    />
                    <Button
                      size="sm"
                      className="h-8 text-xs gap-1"
                      disabled={!selectedFile || !uploadDocType}
                      onClick={async () => {
                        if (!selectedFile || !uploadDocType) return;

                        const alreadyExists = documents.some(
                          (doc) => doc.type === uploadDocType,
                        );

                        if (alreadyExists) {
                          toast({
                            title: "Document already exists",
                            description: `${uploadDocType} already uploaded.`,
                            variant: "destructive",
                          });
                          return;
                        }

                        const formData = new FormData();
                        formData.append("file", selectedFile);
                        formData.append("type", uploadDocType);
                        formData.append("name", selectedFile.name);

                        try {
                          const res = await apiClient.uploadDocument(
                            id!,
                            formData,
                          );

                          setDocuments((prev) => [
                            res.data as EmployeeDocument,
                            ...prev,
                          ]);

                          setSelectedFile(null);
                          setUploadDocType("");

                          toast({
                            title: "Document uploaded",
                          });
                        } catch (err) {
                          toast({
                            title: "Upload failed",
                            description: errMsg(err),
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Upload className="w-3 h-3" />
                      Upload
                    </Button>
                  </div>
                </div>
              </div>

              <table className="nexus-table">
                <thead>
                  <tr>
                    {isHR && (
                      <th className="w-10">
                        {pendingDocIds.length > 0 && (
                          <Checkbox
                            checked={allPendingSelected}
                            data-state={
                              somePendingSelected && !allPendingSelected
                                ? "indeterminate"
                                : undefined
                            }
                            onCheckedChange={toggleAllPending}
                            aria-label="Select all pending"
                          />
                        )}
                      </th>
                    )}
                    <th>Document</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Uploaded</th>
                    <th>Status</th>
                    {isHR && <th className="w-20">Action</th>}
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {documents.length === 0 && (
                    <tr>
                      <td
                        colSpan={isHR ? 8 : 6}
                        className="text-center text-sm text-muted-foreground py-6"
                      >
                        No documents uploaded yet.
                      </td>
                    </tr>
                  )}
                  {documents.map((doc) => {
                    const isPending = doc.status === "Pending";
                    const isSelected = selectedDocIds.has(doc.id);
                    return (
                      <tr
                        key={doc.id ?? `${doc.name}-${doc.uploaded_at}`}
                        className={isSelected ? "bg-primary/5" : undefined}
                      >
                        {isHR && (
                          <td>
                            {isPending && (
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleDoc(doc.id)}
                                aria-label={`Select ${doc.name}`}
                              />
                            )}
                          </td>
                        )}
                        <td>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="text-sm">{doc.name}</span>
                          </div>
                        </td>
                        <td className="text-xs text-muted-foreground">
                          {doc.type}
                        </td>
                        <td className="text-xs font-mono-data text-muted-foreground">
                          {doc.file_size}
                        </td>
                        <td className="text-xs font-mono-data text-muted-foreground">
                          {toDateStr(doc.uploaded_at)}
                        </td>
                        <td>
                          <span
                            className={`status-pill ${docStatusClass[doc.status]}`}
                          >
                            {doc.status === "Verified" && (
                              <Check className="w-3 h-3 mr-1" />
                            )}
                            {doc.status === "Pending" && (
                              <AlertCircle className="w-3 h-3 mr-1" />
                            )}
                            {doc.status === "Rejected" && (
                              <X className="w-3 h-3 mr-1" />
                            )}
                            {doc.status}
                          </span>
                        </td>
                        {isHR && (
                          <td>
                            {isPending && (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-1.5 text-success"
                                  onClick={() =>
                                    handleUpdateDocumentStatus(
                                      doc.id,
                                      "Verified",
                                    )
                                  }
                                >
                                  <Check className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-1.5 text-destructive"
                                  onClick={() =>
                                    handleUpdateDocumentStatus(
                                      doc.id,
                                      "Rejected",
                                    )
                                  }
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </td>
                        )}
                        <td>
                          <button
                            onClick={async () => {
                              try {
                                await apiClient.deleteDocument(doc.id);
                                setDocuments((prev) =>
                                  prev.filter((d) => d.id !== doc.id),
                                );
                                toast({
                                  title: "Document deleted successfully",
                                });
                              } catch {
                                toast({ title: "Delete Failed" });
                              }
                            }}
                            className="p-1 rounded hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {isHR && selectedDocIds.size > 0 && (
                <div className="px-5 py-3 border-t border-border flex items-center justify-between bg-muted/30">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {selectedDocIds.size}
                    </span>{" "}
                    document{selectedDocIds.size > 1 ? "s" : ""} selected
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-7 gap-1.5 text-xs bg-success/90 hover:bg-success text-white"
                      disabled={verifyingBulk}
                      onClick={() => handleBulkVerify("Verified")}
                    >
                      {verifyingBulk ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <CheckSquare className="w-3 h-3" />
                      )}
                      Verify Selected
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 gap-1.5 text-xs"
                      disabled={verifyingBulk}
                      onClick={() => handleBulkVerify("Rejected")}
                    >
                      {verifyingBulk ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <X className="w-3 h-3" />
                      )}
                      Reject Selected
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          {/* leaves */}
          {isHR && (
            <TabsContent value="leave" className="space-y-6">
              {/* --- Individual Leave Cards --- */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {leaveBalance?.length > 0 ? (
                  leaveBalance.map((lb) => {
                    const percentage = lb.total
                      ? Math.round((lb.used / lb.total) * 100)
                      : 0;

                    const Icon =
                      leaveTypeIcons[lb.leave_type.toLowerCase()] || Briefcase;

                    return (
                      <div
                        key={lb.leave_type}
                        className="group relative bg-card border border-border rounded-xl p-5 
          hover:shadow-md hover:border-primary/40 transition-all duration-300"
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-md bg-primary/10 text-primary">
                              <Icon className="w-4 h-4" />
                            </div>
                            <p className="text-sm font-semibold">
                              {lb.name || lb.leave_type}
                            </p>
                          </div>

                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {percentage}%
                          </span>
                        </div>

                        {/* Remaining */}
                        <div className="mb-3">
                          <p className="text-2xl font-bold tracking-tight">
                            {lb.remaining}
                            <span className="text-sm font-normal text-muted-foreground ml-1">
                              days left
                            </span>
                          </p>
                        </div>

                        {/* Stats */}
                        <div className="flex justify-between text-xs text-muted-foreground mb-3">
                          <span>Used: {lb.used}</span>
                          <span>Total: {lb.total}</span>
                        </div>

                        {/* Progress */}
                        {typeof lb.total === "number" && (
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                percentage > 80
                                  ? "bg-red-500"
                                  : percentage > 60
                                    ? "bg-amber-500"
                                    : "bg-primary"
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        )}

                        {/* Hover glow */}
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
            </TabsContent>
          )}

          {/* ══ Emergency ═════════════════════════════════════════════════════ */}
          <TabsContent value="emergency" className="space-y-4">
            <div className="bg-card border border-border rounded-lg">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold">Emergency Contacts</h3>
                <Dialog
                  open={addContactDialog}
                  onOpenChange={setAddContactDialog}
                >
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 press-effect"
                      disabled={isResigned}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Contact
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Emergency Contact</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: "Name *", key: "name" },
                          { label: "Relation", key: "relation" },
                          { label: "Phone *", key: "phone" },
                          { label: "Email", key: "email" },
                        ].map((f) => (
                          <div key={f.key}>
                            <label className="text-xs text-muted-foreground mb-1 block">
                              {f.label}
                            </label>
                            <Input
                              value={
                                (newContact as Record<string, string>)[f.key]
                              }
                              onChange={(e) =>
                                setNewContact({
                                  ...newContact,
                                  [f.key]: e.target.value,
                                })
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAddContactDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleAddContact}>
                          Add Contact
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="divide-y divide-border">
                {emergencyContacts.length === 0 && (
                  <p className="px-5 py-6 text-sm text-muted-foreground text-center">
                    No emergency contacts added yet.
                  </p>
                )}
                {emergencyContacts.map((contact) => (
                  <div key={contact.id} className="px-5 py-4">
                    {editingContactId === contact.id ? (
                      <div className="grid grid-cols-4 gap-2 items-end">
                        {(["name", "relation", "phone"] as const).map((key) => (
                          <Input
                            key={key}
                            value={editContactData[key]}
                            onChange={(e) =>
                              setEditContactData({
                                ...editContactData,
                                [key]: e.target.value,
                              })
                            }
                            className="h-8 text-sm"
                            placeholder={
                              key.charAt(0).toUpperCase() + key.slice(1)
                            }
                          />
                        ))}
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            className="h-8"
                            onClick={() => handleUpdateContact(contact.id)}
                          >
                            <Save className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => setEditingContactId(null)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                            {contact.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {contact.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {contact.relation}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="w-3.5 h-3.5" />
                            <span className="font-mono-data">
                              {contact.phone}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="w-3.5 h-3.5" />
                            <span>{contact.email}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => {
                              setEditingContactId(contact.id);
                              setEditContactData({
                                name: contact.name,
                                relation: contact.relation,
                                phone: contact.phone,
                                email: contact.email ?? "",
                              });
                            }}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <button
                            onClick={() => handleDeleteContact(contact.id)}
                            className="p-1 rounded hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ══ Bank ══════════════════════════════════════════════════════════ */}
          <TabsContent value="bank" className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">
                  Bank & Salary Information
                </h3>
                <div className="flex gap-2">
                  {editingBank && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="press-effect"
                      onClick={() => {
                        setBankDraft({ ...bankCommitted });
                        setEditingBank(false);
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 press-effect"
                    disabled={saving || isResigned}
                    onClick={
                      editingBank
                        ? handleSaveBank
                        : () => {
                            setBankDraft({ ...bankCommitted });
                            setEditingBank(true);
                          }
                    }
                  >
                    {saving && editingBank ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : editingBank ? (
                      <Save className="w-3.5 h-3.5" />
                    ) : (
                      <Edit2 className="w-3.5 h-3.5" />
                    )}
                    {editingBank ? "Save Changes" : "Edit"}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {(
                  [
                    { label: "Bank Name", key: "bank_name" },
                    {
                      label: "Account Number",
                      key: "account_number",
                      mono: true,
                    },
                    { label: "Branch", key: "branch" },

                    { label: "Contract Type", key: "contract_type" },
                  ] as {
                    label: string;
                    key: keyof BankFormData;
                    mono?: boolean;
                  }[]
                ).map((f) => (
                  <div key={f.key}>
                    <p className="text-xs text-muted-foreground mb-0.5">
                      {f.label}
                    </p>
                    {editingBank ? (
                      <Input
                        type={f.key === "salary" ? "number" : "text"}
                        value={bankDraft[f.key]}
                        onChange={(e) =>
                          setBankDraft({
                            ...bankDraft,
                            [f.key]: e.target.value,
                          })
                        }
                        className="h-8 text-sm"
                      />
                    ) : (
                      <p
                        className={`text-sm ${f.mono ? "font-mono-data" : ""}`}
                      >
                        {bankCommitted[f.key] || "—"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ══ Department ════════════════════════════════════════════════════ */}
          <TabsContent value="department" className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">
                  Department & Role Assignment
                </h3>
                <div className="flex gap-2">
                  {editingDept && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="press-effect"
                      onClick={() => {
                        setDeptDraft({ ...deptCommitted });
                        setEditingDept(false);
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 press-effect"
                    disabled={saving || isResigned}
                    onClick={
                      editingDept
                        ? handleSaveDept
                        : () => {
                            setDeptDraft({ ...deptCommitted });
                            setEditingDept(true);
                          }
                    }
                  >
                    {saving && editingDept ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : editingDept ? (
                      <Save className="w-3.5 h-3.5" />
                    ) : (
                      <Edit2 className="w-3.5 h-3.5" />
                    )}
                    {editingDept ? "Save Changes" : "Edit"}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {(
                  [
                    { label: "Department", key: "department" },
                    { label: "Designation", key: "position" },
                    { label: "Level", key: "level" },
                    { label: "Hierarchy", key: "hierarchy" },
                    {
                      label: "Date of Joining",
                      key: "joining_date",
                      mono: true,
                    },
                    {
                      label: "Previous Experience",
                      key: "previous_experience",
                    },
                    { label: "Employment Type", key: "employment_type" },
                    { label: "Employment Status", key: "employment_status" },
                  ] as {
                    label: string;
                    key: keyof DeptFormData;
                    mono?: boolean;
                  }[]
                ).map((f) => (
                  <div key={f.key}>
                    <p className="text-xs text-muted-foreground mb-0.5">
                      {f.label}
                    </p>
                    {editingDept ? (
                      f.key === "employment_status" ? (
                        <p className="text-sm">{empStatus}</p>
                      ) : (
                        <Input
                          type={f.key === "joining_date" ? "date" : "text"}
                          value={deptDraft[f.key]}
                          onChange={(e) =>
                            setDeptDraft({
                              ...deptDraft,
                              [f.key]: e.target.value,
                            })
                          }
                          className="h-8 text-sm"
                        />
                      )
                    ) : (
                      <p
                        className={`text-sm ${f.mono ? "font-mono-data" : ""}`}
                      >
                        {f.key === "employment_status"
                          ? empStatus
                          : deptCommitted[f.key] || "—"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ══ Assets ════════════════════════════════════════════════════════ */}
          <TabsContent value="assets" className="space-y-4">
            <div className="bg-card border border-border rounded-lg">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Assigned Assets</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Assets allocated to this employee
                  </p>
                </div>
                <Dialog
                  open={assetRequestDialog}
                  onOpenChange={(open) => {
                    setAssetRequestDialog(open);
                    if (open) fetchAvailableAssets();
                    else setSelectedAssetId("");
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="gap-1.5 press-effect"
                      disabled={isResigned}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Asset
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assign Asset to Employee</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      {loadingAvailable ? (
                        <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">
                            Loading available assets…
                          </span>
                        </div>
                      ) : availableAssets.length === 0 ? (
                        <div className="py-8 text-center border-2 border-dashed border-border rounded-lg">
                          <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            No available assets in inventory.
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Add assets to inventory first before assigning.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {availableAssets.map((asset) => (
                            <button
                              key={asset.id}
                              onClick={() => setSelectedAssetId(asset.id)}
                              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                                selectedAssetId === asset.id
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:bg-muted/50"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {asset.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {asset.category ?? asset.type}
                                    {asset.serial_number
                                      ? ` · ${asset.serial_number}`
                                      : ""}
                                  </p>
                                </div>
                                <span className="text-xs font-mono-data text-muted-foreground shrink-0">
                                  {asset.asset_id}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAssetRequestDialog(false);
                            setSelectedAssetId("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={!selectedAssetId || loadingAvailable}
                          onClick={async () => {
                            if (!selectedAssetId || !id) return;
                            try {
                              await apiClient.assignAsset(selectedAssetId, id);
                              const res = await apiClient.getAssets({
                                assigned_to: id,
                              });
                              setEmployeeAssets(res.data ?? []);
                              setSelectedAssetId("");
                              setAssetRequestDialog(false);
                              toast({ title: "Asset assigned successfully" });
                            } catch (err) {
                              toast({
                                title: "Failed to assign asset",
                                description: errMsg(err),
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          Assign Asset
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <table className="nexus-table">
                <thead>
                  <tr>
                    <th>Asset ID</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Serial Number</th>
                    <th>Assigned</th>
                    <th>Status</th>
                    <th className="w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {employeeAssets.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center text-sm text-muted-foreground py-6"
                      >
                        No assets assigned.
                      </td>
                    </tr>
                  )}
                  {employeeAssets.map((asset) => (
                    <tr key={asset.id}>
                      <td className="text-xs font-mono-data text-muted-foreground">
                        {asset.asset_id}
                      </td>
                      <td className="text-sm font-medium">{asset.name}</td>
                      <td className="text-xs text-muted-foreground">
                        {asset.category ?? asset.type}
                      </td>
                      <td className="text-xs font-mono-data text-muted-foreground">
                        {asset.serial_number || "—"}
                      </td>
                      <td className="text-xs font-mono-data text-muted-foreground">
                        {toDateStr(asset.purchase_date) || "—"}
                      </td>
                      <td>
                        <span
                          className={`status-pill ${asset.status === "assigned" ? "status-active" : "status-pending"}`}
                        >
                          {asset.status}
                        </span>
                      </td>
                      <td>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground"
                          onClick={() => handleReturnAsset(asset.id)}
                        >
                          Return
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
