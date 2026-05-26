// ===== Cubit HRM Frontend — Centralized Type Definitions =====

// ──── Common ────
export type UUID = string;

// ──── Enums (mirror Prisma) ────
export type UserRole = "super_admin" | "hr_admin" | "employee";
export type Permission = "view" | "create" | "edit" | "delete";

export type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "half_day"
  | "on_leave";

export type LeaveStatus = "pending" | "approved" | "rejected";
export type PayrollStatus = "pending" | "processed" | "paid";

export type ReportType = "attendance" | "payroll" | "leave" | "performance";

export type HolidayType = "public" | "company" | "regional" | "religious";

export type MunicipalityType =
  | "metropolitian"
  | "sub_metropolitian"
  | "municipality"
  | "rural_municipality";

// ──── Employee Status (UI only) ────
export type EmployeeStatus =
  | "Active"
  | "Onboarding"
  | "On Leave"
  | "Resigned"
  | "Inactive"
  | "Notice Period";

// ──── Department (1-to-many per schema) ────
export interface DepartmentRecord {
  id: string;
  employee_id: string;
  department_name: string;
  hierarchy?: string;
  joining_date: string;
  previous_experience?: string;
  employment_type?: string;
  employment_status?: string;
  designation?: string;
  level?: string;
}

// ──── Personal Details ────
export interface PersonalDetail {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;

  gender?: string;
  marital_status?: string;
  citizenship_number?: string;
  pan_number?: string;
  nid_number?: string;
  ssid_number?: string;
  father_name?: string;
  mother_name?: string;
  grandfather_name?: string;
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
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  municipality?: MunicipalityType;
  ward?: number;
  tole?: string;
}

// ──── Bank Details ────
export interface BankDetail {
  id: string;
  employee_id: string;
  account_number: string;
  salary: string;
  bank_name: string;
  branch: string;
  contract_type?: string;
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
  status: DocStatus;
  file_size?: string;
  uploaded_at: string;
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

// ──── User ────
export interface UserRecord {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ──── Asset ────
export type AssetCondition = "Good" | "Fair" | "Needs Repair";

export interface AssetRecord {
  id: string;
  asset_id: string;
  name: string;
  category: string;
  serial_number?: string;
  purchase_cost?: string;
  purchase_date?: string;
  status: AssetStatus;
  assigned_to?: string;
  assigned_date?: string;
  location?: string;
  notes?: string;
  return_date?: string;
}

// ──── Employee API (raw shape from backend) ────
export interface EmployeeAPI {
  id: string;
  user_id: string;
  employee_id: string;
  profile_image?: string;
  employee_verified: boolean;
  verification_pending: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  manager_id?: string;

  user: UserRecord;
  personal_details?: PersonalDetail;
  bank_details?: BankDetail;
  department?: DepartmentRecord[];
  manager?: Pick<EmployeeAPI, "id" | "employee_id" | "personal_details">;
  emergencyContacts?: EmergencyContact[];
  documents?: EmployeeDocument[];
  assets?: AssetRecord[];
}

export interface Employee {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  profile_image?: string;
  employee_verified: boolean;
  verification_pending: boolean;
  notes?: string;
  manager_id?: string;
  department: DepartmentRecord[];
  personal_details?: PersonalDetail;
  bank_details?: BankDetail;
  emergencyContacts?: EmergencyContact[];
  documents?: EmployeeDocument[];
  assets?: AssetRecord[];
}

// ──── Employee Payloads ────
export interface CreateEmployeePayload {
  first_name: string;
  last_name: string;
  email: string;
  department_name: string;
  joining_date: string;
  employee_id?: string;
  phone?: string;
  date_of_birth?: string;
  designation?: string;
  employment_type?: string;
  manager_id?: string;
  notes?: string;
  account_number?: string;
  salary?: number;
  bank_name?: string;
  branch?: string;
  contract_type?: string;
}

export interface UpdateEmployeePayload {
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  manager_id?: string | null;
  notes?: string;
  personal_details?: Partial<Omit<PersonalDetail, "id" | "employee_id">>;
  bank_details?: Partial<Omit<BankDetail, "id" | "employee_id">>;
  // FIX: department update payload must allow passing id so the backend
  // knows which row to update (required since the fix in EmployeeController).
  department?: Partial<DepartmentRecord>;
}

// ──── Helper functions ────

/**
 * Returns the most recent department record for an employee.
 *
 * FIX: The backend now returns departments sorted descending by joining_date
 * (newest first), so index [0] is always the current department.
 * The old implementation returned departments[departments.length - 1]
 * (the last element), which was the OLDEST record after the backend sort
 * was added — causing stale department data to appear on every page load.
 */
export function getLatestDepartment(
  departments: DepartmentRecord[] | null | undefined,
): DepartmentRecord | null {
  if (!departments || departments.length === 0) return null;
  // Backend sorts by joining_date DESC → index 0 is the latest.
  return departments[0];
}

export function normalizeEmployee(emp: EmployeeAPI): Employee {
  const firstName = emp.personal_details?.first_name ?? "";
  const lastName = emp.personal_details?.last_name ?? "";
  const fullName = `${firstName} ${lastName}`.trim();

  return {
    id: emp.id,
    employee_id: emp.employee_id,
    // Prefer personal_details name; fall back to user.name only if it's not "undefined undefined"
    name:
      fullName ||
      (emp.user?.name?.includes("undefined") ? "" : emp.user?.name) ||
      emp.user?.email ||
      "",
    email: emp.personal_details?.email || emp.user?.email || "",
    profile_image: emp.profile_image,
    employee_verified: emp.employee_verified,
    verification_pending: emp.verification_pending,
    notes: emp.notes,
    manager_id: emp.manager_id,
    department: emp.department ?? [],
    personal_details: emp.personal_details ?? {
      // Seed from user so fields aren't blank when personal_details hasn't been filled yet
      id: "",
      employee_id: emp.id,
      first_name: emp.user?.name?.split(" ")[0] ?? "",
      last_name: emp.user?.name?.split(" ").slice(1).join(" ") ?? "",
      email: emp.user?.email ?? "",
      phone: emp.user?.phone ?? "",
    },
    bank_details: emp.bank_details,
    emergencyContacts: emp.emergencyContacts,
    documents: emp.documents,
    assets: emp.assets,
  };
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

export interface Holiday {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  holiday_type: HolidayType;
  created_at: string;
  updated_at: string;
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
  type: string;
  annual_quota: number;
  pro_rata: boolean;
  carry_forward: boolean;
  max_carry_forward: number;
  description?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  year: number;
  leave_type_id: string;
  leave_type?: string;
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
  created_at: string;
  updated_at: string;
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

// ──── Payroll ────
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
