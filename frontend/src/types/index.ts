// ===== Cubit HRM  Frontend— Centralized Type Definitions =====
// All shared interfaces/types live here for backend integration readiness.

// ──── Common ────
export type UUID = string;

// ──── Employee ────
export type EmployeeStatus =
  | "Active"
  | "Onboarding"
  | "On Leave"
  | "Resigned"
  | "Inactive"
  | "Notice Period";
export interface Employee {
  id: string;
  employee_id?: string;
  first_name: string;
  last_name: string;
  citizenship_number?: string;
  pan_number?: string;
  nid_number?: string;
  ssid_number?: string;
  email: string;
  profile_image?: string;
  phone?: string;
  gender?: string;
  department?: string;
  position?: string;
  marital_status?: string;
  father_name?: string;
  grandfather_name?: string;
  mother_name?: string;
  current_address?: string;
  permanent_address?: string;
  employment_status?: string;
  employment_type?: string;
  type?: "Full-time" | "Contract" | "Part-time";
  date_of_birth?: string;
  joining_date?: string;
  bank_name?: string;
  account_number?: string;
  branch?: string;
  salary?: string;
  contract_type?: string;
  previous_experience?: string;
  level?: string;
  hierarchy?: string;
  documents?: EmployeeDocument[];
  emergency_contacts?: EmergencyContact[];
  leaveBalances?: LeaveBalance[];
  assets?: Asset[];
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
    is_active: boolean;
  };
  updated_at?: string; // ← add this
  created_at?: string;
}
// ──── Documents ────
export type DocStatus = "Verified" | "Pending" | "Rejected";
export type DocumentType =
  | "Citizenship"
  | "PAN"
  | "Certificate"
  | "National Identification"
  | "Police Report"
  | "SSF"
  | "Other";

export interface EmployeeDocument {
  id: string;
  employee_id: string;
  name: string;
  type: DocumentType;
  uploaded_at: string;
  status: DocStatus;
  file_size: string;
  file_url?: string;
}

// ──── Emergency Contact ────
export interface EmergencyContact {
  id: string;
  employee_id: string;
  name: string;
  relation: string;
  phone: string;
  email?: string;
}

// ──── Bank Details ────
export interface BankDetails {
  id?: string;
  employee_id: string;
  bank_name: string;
  account_number: string;
  branch: string;
  salary: string;
  contract_type: string;
}

// ──── Attendance ────
export interface AttendanceLog {
  id: string;
  employee_id: string;
  employee_name: string;
  date: string;
  check_in: string;
  check_out: string;
  hours: string;
  status: "Present" | "Late" | "Absent" | "Complete" | "On Leave";
  source: string;
}

export interface BiometricDevice {
  id: string;
  name: string;
  ip: string;
  port: string;
  model: string;
  protocol: string;
  status: "online" | "offline";
  lastSync: string;
}

// ──── Leave ────
export interface LeaveRequest {
  id: string;
  employeeId?: string;
  employee: string;
  type: string;
  from: string;
  to: string;
  days: number;
  status: "Pending" | "Approved" | "Rejected";
  reason: string;
  appliedOn: string;
  approvedBy?: string;
  remarks?: string;
  rejectionReason?: string;
}

export type HolidayType = "public" | "restricted" | "optional";
export interface Holiday {
  id: string;
  date: string;
  name: string;
  type: HolidayType;
}

export type LeavePolicyType =
  | "paid"
  | "sick"
  | "unpaid"
  | "compensatory"
  | "custom";
export interface LeavePolicy {
  id: string;
  name: string;
  type: LeavePolicyType;
  annualQuota: number;
  proRata: boolean;
  carryForward: boolean;
  maxCarryForward: number;
  active: boolean;
}

export interface LeaveBalance {
  leave_type: string;
  name?: string;
  type?: string;
  total: number;
  used: number;
  remaining: number;
}

// ──── Asset ────
export type AssetStatus =
  | "Assigned"
  | "Available"
  | "Under Maintenance"
  | "Retired"
  | "Pending Approval";

export interface Asset {
  id: string;
  assetId: string;
  name: string;
  type: string;
  assigned_date: string | null;
  return_date: string | null;
  serialNumber: string;
  assignedTo: string | null;
  assignedToId: string | null;
  department: string | null;
  purchaseDate: string;
  status: AssetStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
}

export interface EmployeeAsset {
  id: string;
  name: string;
  type: string;
  serialNumber: string;
  assignedDate: string;
  status: string;
}

// ──── Offboarding ────
export interface OffboardingCase {
  id: string;
  name: string;
  department: string;
  resignDate: string;
  lastDay: string;
  noticePeriod: string;
  clearance: Record<string, boolean>;
  status: "In Progress" | "Completed";
}

// ──── Roles & Access ────
export type UserRole = "super_admin" | "hr_admin" | "employee";
export type Permission = "view" | "create" | "edit" | "delete";

export const ALL_MODULES = [
  "Dashboard",
  "Employees",
  "Attendance",
  "Leave Management",
  "Payroll",
  "Assets",
  "Offboarding",
  "Reports",
  "Roles & Access",
  "Employee Self-Service",
] as const;
export type Module = (typeof ALL_MODULES)[number];
export const ALL_PERMISSIONS: Permission[] = [
  "view",
  "create",
  "edit",
  "delete",
];

export interface RolePermissions {
  [module: string]: Permission[];
}

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  maxUsers: number | null;
  permissions: RolePermissions;
  locked: boolean;
}

export interface UserAssignment {
  id: string;
  name: string;
  email: string;
  role: string;
}

// ──── Payroll (re-exports from engine) ────
export type {
  PayrollEmployee,
  PayrollResult,
  TaxpayerType,
  Gender,
  FYData,
  TaxSlab,
  TaxBandBreakdown,
} from "@/lib/payroll-engine";

// ──── Dashboard ────
export interface DashboardStat {
  label: string;
  value: string;
  icon: string;
  change: string;
  positive: boolean;
}

export interface PendingAction {
  id: string;
  name: string;
  action: string;
  dept: string;
  time: string;
}

export interface ActivityItem {
  text: string;
  time: string;
  type: "clockin" | "leave" | "new" | "exit";
}
