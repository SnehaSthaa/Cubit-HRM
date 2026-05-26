// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = "super_admin" | "hr_admin" | "employee";

export type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "half_day"
  | "on_leave";

export type LeaveStatus = "pending" | "approved" | "rejected";

export type AssetStatus = "available" | "assigned" | "maintenance" | "retired";

export type PayrollStatus = "pending" | "processed" | "paid";

export type ReportType = "attendance" | "payroll" | "leave" | "performance";

export type HolidayType = "public" | "company" | "regional" | "religious";

export type MunicipalityType =
  | "metropolitian"
  | "sub_metropolitian"
  | "municipality"
  | "rural_municipality";

export type EmploymentStatus = "Active" | "Inactive" | "Notice Period";

export type EmploymentType = "Full-time" | "Contract" | "Part-time";

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Employee {
  id: string;
  user_id: string;
  employee_id: string;
  profile_image?: string;
  employee_verified: boolean;
  verification_pending: boolean;
  notes?: string;
  manager_id?: string;
  created_at: Date;
  updated_at: Date;

  // Relations (optional — populated when included)
  user?: Pick<User, "id" | "email" | "name" | "phone" | "role" | "is_active">;
  personal_details?: PersonalDetail;
  bank_details?: BankDetail;
  department?: Department[];
  manager?: Employee;
  subordinates?: Employee[];
  assets?: Asset[];
  attendance?: Attendance[];
  emergencyContacts?: EmergencyContact[];
  documents?: EmployeeDocument[];
  leaveBalances?: LeaveBalance[];
  leaves?: Leave[];
  payroll?: Payroll[];
}

/** Flattened employee view — used for list/detail responses in the frontend */
export interface EmployeeDTO {
  id: string;
  user_id: string;
  employee_id: string;
  profile_image?: string;
  employee_verified: boolean;
  verification_pending: boolean;
  notes?: string;
  manager_id?: string;
  created_at: Date;
  updated_at: Date;

  // From PersonalDetail
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth?: Date;
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
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  municipality?: MunicipalityType;
  ward?: number;
  tole?: string;

  // From BankDetail
  account_number?: string;
  salary?: number;
  bank_name?: string;
  branch?: string;
  contract_type?: string;

  // From Department (latest/current entry)
  department_name?: string;
  designation?: string;
  joining_date?: Date;
  employment_type?: EmploymentType;
  employment_status?: EmploymentStatus;
  level?: string;
  hierarchy?: string;
  previous_experience?: string;
}

export interface PersonalDetail {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth?: Date;
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
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  municipality?: MunicipalityType;
  ward?: number;
  tole?: string;
}

export interface BankDetail {
  id: string;
  employee_id: string;
  account_number: string;
  salary: number;
  bank_name: string;
  branch: string;
  contract_type?: string;
}

export interface Department {
  id: string;
  employee_id: string;
  department_name: string;
  hierarchy?: string;
  joining_date: Date;
  previous_experience?: string;
  employment_type?: EmploymentType;
  employment_status?: EmploymentStatus;
  designation?: string;
  level?: string;
}

export interface EmergencyContact {
  id: string;
  employee_id: string;
  name: string;
  relation: string;
  phone: string;
  email?: string;
}

export interface EmployeeDocument {
  id: string;
  employee_id: string;
  name: string;
  type: string;
  status: "Pending" | "Approved" | "Rejected";
  file_size?: string;
  uploaded_at: Date;
  file_url?: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: Date;
  check_in?: Date;
  check_out?: Date;
  status: AttendanceStatus;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AttendanceSummary {
  employee: Pick<Employee, "id" | "employee_id"> & {
    personal_details?: Pick<PersonalDetail, "first_name" | "last_name">;
  };
  present: number;
  absent: number;
  late: number;
  half_day: number;
  on_leave: number;
  total: number;
}

export interface Leave {
  id: string;
  employee_id: string;
  start_date: Date;
  end_date: Date;
  leave_type_id: string;
  leaveType?: LeavePolicy;
  days_count: number;
  reason?: string;
  status: LeaveStatus;
  approved_by?: string;
  approval_notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  year: number;
  leave_type_id: string;
  used: number;
  remaining: number;
  total: number;
  created_at: Date;
  updated_at: Date;
  leavePolicy?: LeavePolicy;
}

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
  created_at: Date;
  updated_at: Date;
}

export interface Payroll {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  base_salary: number;
  bonus: number;
  deductions: number;
  net_salary: number;
  status: PayrollStatus;
  paid_date?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Asset {
  id: string;
  asset_id: string;
  name: string;
  category: string;
  serial_number?: string;
  purchase_cost?: number;
  purchase_date?: Date;
  status: AssetStatus;
  assigned_to?: string;
  assigned_date?: Date;
  return_date?: Date;
  location?: string;
  reviewed_at?: string;
  reviewed_by_user_id?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Device {
  id: string;
  device_name: string;
  device_model: string;
  ip: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  mappings?: DeviceMapping[];
}

export interface DeviceMapping {
  id: string;
  employee_id: string;
  device_id: string;
  biometric_id: string;
  created_at: Date;
  updated_at: Date;
  employee?: Employee;
  device?: Device;
}

export interface Holiday {
  id: string;
  name: string;
  start_date: Date;
  end_date: Date;
  holiday_type: HolidayType;
  created_at: Date;
  updated_at: Date;
}

export interface Report {
  id: string;
  generated_by: string;
  name: string;
  type: ReportType;
  from_date?: Date;
  to_date?: Date;
  filters?: Record<string, unknown>;
  data?: Record<string, unknown>;
  created_at: Date;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole[];
  activeRole: UserRole;
  employeeId?: string;
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: PaginationMeta;
  errors?: Record<string, string[] | undefined>;
  error?: string;
}

export type PaginatedResponse<T> = ApiResponse<T[]> & { meta: PaginationMeta };
