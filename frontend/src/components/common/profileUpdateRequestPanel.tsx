import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList, ChevronDown, ChevronUp, Check, X,
  User, CreditCard, Building2, Phone, FileText,
  Loader2, Clock, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { apiClient, type ProfileUpdateRequest, type ProfileSection } from "@/services/apiClient";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type EmploymentStatus = "active" | "notice_period" | "resigned";
type MunicipalityType = "metropolitian" | "sub_metropolitian" | "municipality" | "rural_municipality";

interface PersonalData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  marital_status?: string;
  citizenship_number?: string;
  pan_number?: string;
  nid_number?: string;
  ssid_number?: string;
  father_name?: string;
  mother_name?: string;
  grandfather_name?: string;
  spouse_name?: string;
  current_address?: string;
  permanent_address?: string;
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  municipality?: MunicipalityType;
  ward?: number;
  tole?: string;
}

interface BankData {
  account_number?: string;
  salary?: string | number;
  bank_name?: string;
  branch?: string;
  contract_type?: string;
}

interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
  email?: string;
}

interface EmergencyData {
  contacts: EmergencyContact[];
}

interface DocumentData {
  name?: string;
  type?: string;
  status?: string;
  file_size?: string;
  file_url?: string;
}

interface DepartmentData {
  department_name?: string;
  hierarchy?: string;
  joining_date?: string;
  previous_experience?: string;
  employment_type?: string;
  employment_status?: EmploymentStatus;
  level?: string;
  designation?: string;
}

type SectionData =
  | PersonalData
  | BankData
  | EmergencyData
  | DocumentData
  | DepartmentData;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sectionMeta: Record<ProfileSection, { label: string; icon: React.ElementType; color: string }> = {
  personal:     { label: "Personal Info",  icon: User,       color: "text-blue-500    bg-blue-50    dark:bg-blue-950/40"    },
  bank_details: { label: "Bank Details",   icon: CreditCard, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40" },
  department:   { label: "Department",     icon: Building2,  color: "text-violet-500  bg-violet-50  dark:bg-violet-950/40"  },
  emergency:    { label: "Emergency",      icon: Phone,      color: "text-orange-500  bg-orange-50  dark:bg-orange-950/40"  },
  documents:    { label: "Documents",      icon: FileText,   color: "text-rose-500    bg-rose-50    dark:bg-rose-950/40"    },
};

const employmentStatusMeta: Record<EmploymentStatus, { label: string; className: string }> = {
  active:        { label: "Active",        className: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" },
  notice_period: { label: "Notice Period", className: "text-amber-600   bg-amber-50   dark:bg-amber-950/40"   },
  resigned:      { label: "Resigned",      className: "text-red-600     bg-red-50     dark:bg-red-950/40"     },
};

const municipalityLabels: Record<MunicipalityType, string> = {
  metropolitian:      "Metropolitian",
  sub_metropolitian:  "Sub-Metropolitian",
  municipality:       "Municipality",
  rural_municipality: "Rural Municipality",
};

function getEmployeeName(req: ProfileUpdateRequest): string {
  const pd   = req.employee?.personal_details;
  const full = `${pd?.first_name ?? ""} ${pd?.last_name ?? ""}`.trim();
  return full || req.employee?.user?.name || req.employee?.user?.email || "Unknown Employee";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatDataKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Format a salary Decimal (serialised as string from Prisma) as NPR currency */
function formatSalary(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);
  return `NPR ${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Render a single scalar value, applying special formatting where needed */
function renderValue(key: string, value: unknown, section: ProfileSection): React.ReactNode {
  if (value === null || value === undefined || value === "") return null;

  // Salary in bank_details
  if (section === "bank_details" && key === "salary") {
    return (
      <span className="font-medium font-mono-data">
        {formatSalary(value as string | number)}
      </span>
    );
  }

  // Employment status badge in department
  if (section === "department" && key === "employment_status") {
    const status = value as EmploymentStatus;
    const meta   = employmentStatusMeta[status] ?? { label: String(value), className: "" };
    return (
      <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full font-medium ${meta.className}`}>
        {meta.label}
      </span>
    );
  }

  // Municipality enum
  if (section === "personal" && key === "municipality") {
    return (
      <span className="font-medium">
        {municipalityLabels[value as MunicipalityType] ?? String(value)}
      </span>
    );
  }

  // Date fields — joining_date, date_of_birth
  if (key === "joining_date" || key === "date_of_birth") {
    const d = new Date(String(value));
    if (!isNaN(d.getTime())) {
      return <span className="font-medium font-mono-data">{d.toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })}</span>;
    }
  }

  return <span className="font-medium truncate font-mono-data">{String(value)}</span>;
}

// ─── Data preview ─────────────────────────────────────────────────────────────

interface DataPreviewProps {
  data: SectionData;
  section: ProfileSection;
}

function DataPreview({ data, section }: DataPreviewProps) {
  const [expanded, setExpanded] = useState(false);

  // Emergency contacts — section-driven, not shape-driven
  if (section === "emergency") {
    const emergency = data as EmergencyData;
    const contacts  = Array.isArray(emergency.contacts) ? emergency.contacts : [];
    return (
      <div className="mt-2 space-y-1">
        {contacts.map((c, i) => (
          <div key={i} className="flex flex-wrap gap-3 text-xs bg-muted/40 rounded px-2 py-1.5">
            <span className="font-medium">{c.name}</span>
            <span className="text-muted-foreground">{c.relation}</span>
            <span className="font-mono-data">{c.phone}</span>
            {c.email && <span className="text-muted-foreground">{c.email}</span>}
          </div>
        ))}
        {contacts.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No contact details provided</p>
        )}
      </div>
    );
  }

  const entries = Object.entries(data).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  ) as [string, unknown][];

  const visible = expanded ? entries : entries.slice(0, 4);
  const hasMore = entries.length > 4;

  return (
    <div className="mt-2 space-y-1">
      {visible.map(([key, value]) => {
        const rendered = renderValue(key, value, section);
        if (rendered === null) return null;
        return (
          <div key={key} className="grid grid-cols-[140px_1fr] gap-2 text-xs items-center">
            <span className="text-muted-foreground truncate">{formatDataKey(key)}</span>
            {rendered}
          </div>
        );
      })}
      {hasMore && (
        <button
          onClick={() => setExpanded((p) => !p)}
          className="flex items-center gap-1 text-[10px] text-primary hover:underline mt-1"
        >
          {expanded
            ? <><ChevronUp className="w-3 h-3" /> Show less</>
            : <><ChevronDown className="w-3 h-3" /> {entries.length - 4} more fields</>}
        </button>
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function ProfileUpdateRequestsPanel() {
  const { toast } = useToast();

  const [requests, setRequests]         = useState<ProfileUpdateRequest[]>([]);
  const [loading, setLoading]           = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [rejectTarget, setRejectTarget] = useState<ProfileUpdateRequest | null>(null);
  const [rejectNotes, setRejectNotes]   = useState("");
  const [rejecting, setRejecting]       = useState(false);

  // ── Fetch pending requests ─────────────────────────────────────────────────
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await apiClient.getProfileUpdateRequests({ status: "pending", limit: 50 });
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch profile update requests", err);
      toast({
        title: "Failed to load requests",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  // ── Approve ────────────────────────────────────────────────────────────────
  const handleApprove = async (req: ProfileUpdateRequest) => {
    try {
      setProcessingId(req.id);
      await apiClient.approveProfileUpdateRequest(req.id);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      toast({
        title: "Request approved",
        description: `${getEmployeeName(req)}'s ${sectionMeta[req.section].label} has been updated.`,
      });
    } catch (err: unknown) {
      toast({
        title: "Approval failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  // ── Reject ─────────────────────────────────────────────────────────────────
  const handleReject = async () => {
    if (!rejectTarget || !rejectNotes.trim()) return;
    try {
      setRejecting(true);
      // Maps to `reviewer_notes` on the backend (ProfileUpdateRequest schema)
      await apiClient.rejectProfileUpdateRequest(rejectTarget.id, rejectNotes.trim());
      setRequests((prev) => prev.filter((r) => r.id !== rejectTarget.id));
      toast({
        title: "Request rejected",
        description: `${getEmployeeName(rejectTarget)}'s request has been declined.`,
      });
      setRejectTarget(null);
      setRejectNotes("");
    } catch (err: unknown) {
      toast({
        title: "Rejection failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setRejecting(false);
    }
  };

  // ── Empty / loading state ──────────────────────────────────────────────────
  if (!loading && requests.length === 0) {
    return (
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Profile Update Requests</h2>
          <span className="status-pill status-active ml-auto">All clear</span>
        </div>
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
          <Check className="w-8 h-8 text-success opacity-40" />
          <p className="text-sm">No pending profile requests</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="glass-card overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Profile Update Requests</h2>
          </div>
          <div className="flex items-center gap-2">
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            {requests.length > 0 && (
              <span className="status-pill status-pending">{requests.length} pending</span>
            )}
          </div>
        </div>

        {/* List */}
        <div className="divide-y divide-border overflow-y-auto max-h-[480px]">
          <AnimatePresence initial={false}>
            {requests.map((req) => {
              const meta         = sectionMeta[req.section];
              const Icon         = meta.icon;
              const name         = getEmployeeName(req);
              const initials     = name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
              const isProcessing = processingId === req.id;

              return (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                  transition={{ duration: 0.2 }}
                  className="px-4 py-3"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0 mt-0.5">
                      {initials || "E"}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Name + section badge */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{name}</p>
                        {req.employee?.employee_id && (
                          <span className="text-[10px] font-mono-data text-muted-foreground">
                            {req.employee.employee_id}
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${meta.color}`}>
                          <Icon className="w-2.5 h-2.5" />
                          {meta.label}
                        </span>
                      </div>

                      {/* Date */}
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        Submitted {formatDate(req.created_at)}
                      </p>

                      {/* Data diff — section passed explicitly */}
                      <DataPreview
                        data={req.requested_data as SectionData}
                        section={req.section}
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                      <Button
                        size="sm"
                        disabled={isProcessing}
                        onClick={() => handleApprove(req)}
                        className="h-7 px-2.5 text-xs bg-green-600 hover:bg-green-700 text-white gap-1"
                      >
                        {isProcessing
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Check className="w-3 h-3" />}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isProcessing}
                        onClick={() => { setRejectTarget(req); setRejectNotes(""); }}
                        className="h-7 px-2.5 text-xs border-red-200 dark:border-red-900 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1"
                      >
                        <X className="w-3 h-3" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Reject dialog */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectNotes(""); } }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              Reject Profile Update
            </DialogTitle>
          </DialogHeader>

          {rejectTarget && (
            <div className="space-y-4 pt-1">
              {/* Request summary */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                <div className={`p-1.5 rounded-md ${sectionMeta[rejectTarget.section].color}`}>
                  {(() => {
                    const SectionIcon = sectionMeta[rejectTarget.section].icon;
                    return <SectionIcon className="w-3.5 h-3.5" />;
                  })()}
                </div>
                <div>
                  <p className="text-sm font-medium">{getEmployeeName(rejectTarget)}</p>
                  <p className="text-xs text-muted-foreground">
                    {sectionMeta[rejectTarget.section].label} update request
                  </p>
                </div>
              </div>

              {/* Reviewer notes → maps to `reviewer_notes` in ProfileUpdateRequest schema */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block font-medium">
                  Reason for rejection <span className="text-destructive">*</span>
                </label>
                <Textarea
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder="Explain why this request is being rejected…"
                  className="text-sm min-h-[100px] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setRejectTarget(null); setRejectNotes(""); }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={!rejectNotes.trim() || rejecting}
                  onClick={handleReject}
                  className="gap-1.5"
                >
                  {rejecting
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <X className="w-3.5 h-3.5" />}
                  Reject Request
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}