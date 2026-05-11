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
  first_name: string;
  last_name: string;
  date_of_birth?: Date;
  gender?: string;
  phone?: string;
  email: string;
  employee_verified?: boolean;
  verification_pending?: boolean;
  citizenship_number?: string;
  pan_number?: string;
  nid_number?: string;
  ssid_number?: string;
  department: string;
  marital_status?: string;
  father_name?: string;
  grandfather_name?: string;
  contract_type?: string;
  mother_name?: string;
  current_address?: string;
  permanent_address?: string;
  position: string;
  joining_date: Date;
  salary?: number;
  manager_id?: string;
  employment_status: "Active" | "Inactive" | "Notice Period";
  type: "Full-time" | "Contract" | "Part-time";
  previous_experience?: string;
  level?: string;
  hierarchy?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
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
export interface Report {
  id: string;
  generated_by?: string;
  name: string;
  type: ReportType;
  from_date?: Date;
  to_date?: Date;
  filters?: Record<string, any>;
  data?: Record<string, any>;
  created_at: Date;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  employeeId?: string;
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}
