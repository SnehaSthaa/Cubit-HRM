// src/services/apiClient.ts
import {
  Employee,
  EmployeeAPI,
  EmergencyContact,
  EmployeeDocument,
  LeaveBalance,
  CreateEmployeePayload,
  UpdateEmployeePayload,
  PersonalDetail,
  DepartmentRecord,
  BankDetail,
  OffboardingEmployee,
} from "@/types/index";
import axios, { AxiosInstance } from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  role?: string;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}

type LoginResponse = {
  user: {
    id: string;
    email: string;
    name: string;
    role: "super_admin" | "hr_admin" | "employee";
  };
  token: string;
};

export type TakeHomeRequestApi = {
  id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
  asset: {
    id: string;
    asset_id: string;
    name: string;
    reviewed_by_user_id: string | null;
    reviewer: {
      id: string;
      name: string;
    } | null;
    employee: {
      first_name: string;
      last_name: string;
      employee_id: string;
    } | null;
  };
};

export interface ProRataDebugResult {
  joining_date: string;
  annual_quota: number;
  accrual_starts: string;
  this_year: { month: string; accrued: number }[];
  next_year_jan1: { month: string; accrued: number };
}

type UploadProfileImageResponse = {
  profile_image: string;
};

export interface ApiError extends Error {
  fields?: Record<string, string[]>;
}

type MeEmployee = Employee & {
  personal_details: PersonalDetail[];
  department: DepartmentRecord[];
  bank_details: BankDetail[];
  emergencyContacts: EmergencyContact[];
  leaveBalances: LeaveBalance[];
  documents: EmployeeDocument[];
  assets: AssetApi[];
};

export interface AssetApi {
  id: string;
  asset_id: string;
  name: string;
  status: string;
  category: string;
  serial_number: string | null;
  purchase_cost?: string | null;
  purchase_date: string | null;
  assigned_date?: string | null;
  return_date?: string | null;
  location?: string | null;
  notes?: string | null;
  reason?: string | null;
  reveiwed_at?: string | null;
  assigned_to?: string | null;
  reviewed_by_user_id?: string | null;
  created_at?: string;
  updated_at?: string;
  employee?: {
    id: string;

    personal_details?: {
      first_name?: string;
      last_name?: string;
    } | null;

    department?: {
      department_name: string;
      joining_date?: string;
    }[];
  } | null;
  reviewer?: {
    id: string;
    name: string;
  } | null;
  type?: string;
  condition?: string | null;
}

export interface LeaveData {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  status: string;
  days_count: number;
  personal_details?: {
    first_name: string;
    last_name: string;
  };
  department?: DepartmentRecord;
  leave_type?: string;
  reason?: string;
  created_at?: string;
  approved_by?: string;
  approval_notes?: string;
  rejection_reason?: string;
  remarks?: string;
}

export interface LeavePolicyApi {
  id: string;
  name: string;
  type: string;
  annual_quota: number;
  pro_rata: boolean;
  carry_forward: boolean;
  max_carry_forward: number;
  description?: string;
  active: boolean;
}

export type DocumentStatus = "Verified" | "Rejected" | "Pending";

interface HolidayApi {
  id: string;
  start_date: string;
  end_date: string;
  name: string;
  holiday_type: "public" | "company" | "regional" | "religious";
}

// ── Profile Update Requests ───────────────────────────────────────────────────
export type ProfileSection =
  | "personal"
  | "documents"
  | "emergency"
  | "bank_details"
  | "department";

export type RequestStatus = "pending" | "approved" | "rejected";

export interface ProfileUpdateRequest {
  id: string;
  employee_id: string;
  section: ProfileSection;
  requested_data: Record<string, unknown>;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  reviewer_notes?: string;
  employee?: {
    id?: string;
    employee_id?: string;
    personal_details?: { first_name?: string; last_name?: string };
    user?: { name?: string; email?: string };
    department?: Array<{
      department_name?: string;
      employment_status?: string;
    }>; // ← add this
  };
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: { "Content-Type": "application/json" },
    });

    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem("access_token");
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    this.client.interceptors.response.use(
      (res) => res,
      (error) => {
        const data = error.response?.data;
        const message = data?.message || error.message || "Unknown API error";
        const err = new Error(message) as ApiError;
        if (data?.errors) err.fields = data.errors;
        return Promise.reject(err);
      },
    );
  }

  private async parse<T>(promise: Promise<{ data: ApiResponse<T> }>) {
    const response = await promise;
    return response.data;
  }

  // ── AUTH ──────────────────────────────────────────────────────────────────

  login(email: string, password: string) {
    return this.parse<LoginResponse>(
      this.client.post<ApiResponse<LoginResponse>>("/auth/login", {
        email,
        password,
      }),
    );
  }

  register(email: string, password: string, name: string) {
    return this.parse(
      this.client.post<ApiResponse>("/auth/register", {
        email,
        password,
        name,
      }),
    );
  }

  getMe() {
    return this.parse<{
      user: {
        id: string;
        email: string;
        name: string;
        role: ("super_admin" | "hr_admin" | "employee")[];
        activeRole: "super_admin" | "hr_admin" | "employee";
        permissions?: string[];
      };
      employee?: MeEmployee;
    }>(this.client.get("/users/me"));
  }

  changePassword(data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    return this.parse(
      this.client.patch<ApiResponse>("/users/me/change-password", data),
    );
  }

  switchRole(role: string) {
    return this.parse<{ token: string; activeRole: string }>(
      this.client.post<ApiResponse<{ token: string; activeRole: string }>>(
        "/users/switch-role",
        { role },
      ),
    );
  }

  assignRole(userId: string, role: string) {
    return this.parse(this.client.post(`/users/assign-role`, { userId, role }));
  }

  removeRole(userId: string, role: string) {
    return this.parse(
      this.client.delete(`/users/remove-role`, { data: { userId, role } }),
    );
  }

  // ── PERMISSIONS ───────────────────────────────────────────────────────────

  getPermissionByRole(role: string) {
    return this.parse(this.client.get<ApiResponse>(`/permissions/${role}`));
  }

  updatePermissionByRole(
    role: string,
    permissions: Record<string, Record<string, boolean>>,
  ) {
    return this.parse(
      this.client.put<ApiResponse>(`/permissions/${role}`, { permissions }),
    );
  }

  // ── EMPLOYEES ─────────────────────────────────────────────────────────────

  getEmployees() {
    return this.parse<EmployeeAPI[]>(
      this.client.get<ApiResponse<EmployeeAPI[]>>("/employees"),
    );
  }

  getEmployee(id: string) {
    return this.parse<EmployeeAPI>(
      this.client.get<ApiResponse<EmployeeAPI>>(`/employees/${id}`),
    );
  }

  createEmployee(data: CreateEmployeePayload) {
    return this.parse<EmployeeAPI>(
      this.client.post<ApiResponse<EmployeeAPI>>("/employees", data),
    );
  }

  updateEmployee(id: string, data: UpdateEmployeePayload) {
    return this.parse<EmployeeAPI>(
      this.client.put<ApiResponse<EmployeeAPI>>(`/employees/${id}`, data),
    );
  }

  verifyEmployee(id: string) {
    return this.parse<EmployeeAPI>(
      this.client.patch<ApiResponse<EmployeeAPI>>(`/employees/${id}/verify`),
    );
  }

  deleteEmployee(id: string) {
    return this.parse<void>(
      this.client.delete<ApiResponse<void>>(`/employees/${id}`),
    );
  }

  uploadEmployeeProfileImage(id: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return this.parse<UploadProfileImageResponse>(
      this.client.post<ApiResponse<UploadProfileImageResponse>>(
        `/employees/${id}/profile-image`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      ),
    );
  }

  // ── PERSONAL DETAILS ──────────────────────────────────────────────────────

  getPersonalDetails(employeeId: string) {
    return this.parse(
      this.client.get(`/employees/${employeeId}/personal-details`),
    );
  }

  updatePersonalDetails(employeeId: string, data: Record<string, unknown>) {
    return this.parse(
      this.client.put(`/employees/${employeeId}/personal-details`, data),
    );
  }

  // ── BANK DETAILS ──────────────────────────────────────────────────────────

  getBankDetails(employeeId: string) {
    return this.parse(this.client.get(`/employees/${employeeId}/bank-details`));
  }

  upsertBankDetails(employeeId: string, data: Record<string, unknown>) {
    return this.parse(
      this.client.put(`/employees/${employeeId}/bank-details`, data),
    );
  }

  updateLeaveBalance(data: {
    employee_id: string;
    leave_type_id: string;
    total: number;
    reason?: string;
  }) {
    return this.parse(
      this.client.patch<ApiResponse>("/leaves/balance/customize", data),
    );
  }

  exportLeaves(params?: {
    month?: string;
    leave_type?: string;
    employee?: string;
    status?: string;
  }) {
    const query = new URLSearchParams(
      Object.entries(params ?? {}).filter(([_, v]) => v && v !== "all") as [
        string,
        string,
      ][],
    ).toString();

    return this.client.get(`/leaves/export${query ? `?${query}` : ""}`, {
      responseType: "blob",
    });
  }

  // ── EMERGENCY CONTACTS ────────────────────────────────────────────────────

  getEmergencyContacts(employeeId: string) {
    return this.parse<EmergencyContact[]>(
      this.client.get<ApiResponse<EmergencyContact[]>>(
        `/employees/${employeeId}/emergency-contacts`,
      ),
    );
  }

  addEmergencyContact(employeeId: string, data: Record<string, unknown>) {
    return this.parse<EmergencyContact>(
      this.client.post<ApiResponse<EmergencyContact>>(
        `/employees/${employeeId}/emergency-contacts`,
        data,
      ),
    );
  }

  updateEmergencyContact(contactId: string, data: Record<string, unknown>) {
    return this.parse<EmergencyContact>(
      this.client.patch<ApiResponse<EmergencyContact>>(
        `/employees/emergency-contacts/${contactId}`,
        data,
      ),
    );
  }

  deleteEmergencyContact(contactId: string) {
    return this.parse<void>(
      this.client.delete<ApiResponse<void>>(
        `/employees/emergency-contacts/${contactId}`,
      ),
    );
  }

  // ── DOCUMENTS ─────────────────────────────────────────────────────────────

  getDocuments(employeeId: string) {
    return this.parse<EmployeeDocument[]>(
      this.client.get<ApiResponse<EmployeeDocument[]>>(
        `/employee-documents/${employeeId}/documents`,
      ),
    );
  }

  uploadDocument(employeeId: string, formData: FormData) {
    return this.parse<EmployeeDocument>(
      this.client.post<ApiResponse<EmployeeDocument>>(
        `/employee-documents/${employeeId}/documents`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      ),
    );
  }

  updateDocumentStatus(docId: string, status: DocumentStatus) {
    return this.parse<EmployeeDocument>(
      this.client.patch<ApiResponse<EmployeeDocument>>(
        `/employee-documents/documents/${docId}/status`,
        { status },
      ),
    );
  }

  deleteDocument(docId: string) {
    return this.parse<void>(
      this.client.delete<ApiResponse<void>>(
        `/employee-documents/documents/${docId}`,
      ),
    );
  }

  // ── LEAVES ────────────────────────────────────────────────────────────────

  getLeaves() {
    return this.parse<LeaveData[]>(
      this.client.get<ApiResponse<LeaveData[]>>("/leaves"),
    );
  }

  getLeavesByEmployee(employeeId: string) {
    return this.parse<LeaveData[]>(
      this.client.get<ApiResponse<LeaveData[]>>(
        `/leaves/employee/${employeeId}`,
      ),
    );
  }

  createLeave(data: Record<string, unknown>) {
    return this.parse<LeaveData>(
      this.client.post<ApiResponse<LeaveData>>("/leaves", data),
    );
  }

  updateLeave(id: string, data: Record<string, unknown>) {
    return this.parse<LeaveData>(
      this.client.put<ApiResponse<LeaveData>>(`/leaves/${id}`, data),
    );
  }

  approveLeave(id: string, notes?: string) {
    return this.parse<LeaveData>(
      this.client.put<ApiResponse<LeaveData>>(`/leaves/${id}/approve`, {
        approval_notes: notes,
      }),
    );
  }

  rejectLeave(id: string, notes?: string) {
    return this.parse<LeaveData>(
      this.client.put<ApiResponse<LeaveData>>(`/leaves/${id}/reject`, {
        approval_notes: notes,
      }),
    );
  }

  deleteLeave(id: string) {
    return this.parse<void>(
      this.client.delete<ApiResponse<void>>(`/leaves/${id}`),
    );
  }

  getLeaveBalance(employeeId: string) {
    return this.parse<LeaveBalance[]>(
      this.client.get<ApiResponse<LeaveBalance[]>>(
        `/leaves/balance/${employeeId}`,
      ),
    );
  }

  getAllLeaveBalances() {
    return this.parse<LeaveBalance[]>(
      this.client.get<ApiResponse<LeaveBalance[]>>("/leaves/balance"),
    );
  }

  // ── LEAVE POLICIES ────────────────────────────────────────────────────────

  getPolicies() {
    return this.parse<LeavePolicyApi[]>(
      this.client.get<ApiResponse<LeavePolicyApi[]>>("/leave-policies"),
    );
  }

  createPolicy(data: Record<string, unknown>) {
    return this.parse<LeavePolicyApi>(
      this.client.post<ApiResponse<LeavePolicyApi>>("/leave-policies", data),
    );
  }

  updatePolicy(id: string, data: Record<string, unknown>) {
    return this.parse<LeavePolicyApi>(
      this.client.put<ApiResponse<LeavePolicyApi>>(
        `/leave-policies/${id}`,
        data,
      ),
    );
  }

  deletePolicy(id: string) {
    return this.parse<void>(
      this.client.delete<ApiResponse<void>>(`/leave-policies/${id}`),
    );
  }

  // ── HOLIDAYS ──────────────────────────────────────────────────────────────

  getHolidays() {
    return this.parse<HolidayApi[]>(
      this.client.get<ApiResponse<HolidayApi[]>>("/holidays"),
    );
  }

  createHoliday(data: {
    name: string;
    start_date: string;
    end_date: string;
    holiday_type: string;
  }) {
    return this.parse<HolidayApi>(
      this.client.post<ApiResponse<HolidayApi>>("/holidays", data),
    );
  }

  updateHoliday(
    id: string,
    data: Partial<{
      name: string;
      start_date: string;
      end_date: string;
      holiday_type: string;
    }>,
  ) {
    return this.parse<HolidayApi>(
      this.client.put<ApiResponse<HolidayApi>>(`/holidays/${id}`, data),
    );
  }

  deleteHoliday(id: string) {
    return this.parse<void>(
      this.client.delete<ApiResponse<void>>(`/holidays/${id}`),
    );
  }

  // ── ASSETS ────────────────────────────────────────────────────────────────

  getAssets(filters?: Record<string, unknown>) {
    return this.parse<AssetApi[]>(
      this.client.get<ApiResponse<AssetApi[]>>("/assets", { params: filters }),
    );
  }

  createAsset(data: Record<string, unknown>) {
    return this.parse<AssetApi>(
      this.client.post<ApiResponse<AssetApi>>("/assets", data),
    );
  }

  assignAsset(id: string, employeeId: string, data?: Record<string, unknown>) {
    return this.parse<AssetApi>(
      this.client.patch<ApiResponse<AssetApi>>(`/assets/${id}/assign`, {
        assigned_to: employeeId,
        ...data,
      }),
    );
  }

  unassignAsset(id: string) {
    return this.parse<void>(
      this.client.patch<ApiResponse<void>>(`/assets/${id}/unassign`),
    );
  }

  deleteAsset(id: string) {
    return this.parse<void>(
      this.client.delete<ApiResponse<void>>(`/assets/${id}`),
    );
  }

  updateAsset(id: string, data: Record<string, unknown>) {
    return this.parse<void>(
      this.client.put<ApiResponse<void>>(`/assets/${id}`, data),
    );
  }

  exportAssets() {
    return this.client.get("/assets/export", { responseType: "blob" });
  }

  importAssets(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return this.client.post("/assets/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }

  // ── TAKE-HOME REQUESTS ────────────────────────────────────────────────────

  createTakeHomeAssetRequest(
    assetId: string,
    data: { start_date: string; end_date: string; reason: string },
  ) {
    return this.parse(
      this.client.post<ApiResponse>(`/assets/${assetId}/take-home`, data),
    );
  }

  getTakeHomeAssetRequest() {
    return this.parse<TakeHomeRequestApi[]>(
      this.client.get<ApiResponse<TakeHomeRequestApi[]>>("/assets/take-home"),
    );
  }

  getMyTakeHomeRequests() {
    return this.parse<TakeHomeRequestApi[]>(
      this.client.get<ApiResponse<TakeHomeRequestApi[]>>(
        "/assets/take-home/my",
      ),
    );
  }

  reviewTakeHomeRequest(id: string, data: { status: "approved" | "rejected" }) {
    return this.parse(
      this.client.patch<ApiResponse>(`/assets/take-home-requests/${id}`, data),
    );
  }

  // ── OFFBOARDING ───────────────────────────────────────────────────────────

  getOffboardingEmployees() {
    return this.parse<OffboardingEmployee[]>(
      this.client.get<ApiResponse<OffboardingEmployee[]>>("/offboarding"),
    );
  }

  startOffboarding(employeeId: string) {
    return this.parse(
      this.client.post<ApiResponse>(
        `/offboarding/${employeeId}/start-offboarding`,
      ),
    );
  }

  completeOffboarding(employeeId: string) {
    return this.parse(
      this.client.patch<ApiResponse>(`/offboarding/${employeeId}/complete`),
    );
  }

  // ── PROFILE UPDATE REQUESTS ───────────────────────────────────────────────

  getProfileUpdateRequests(params?: {
    status?: RequestStatus;
    section?: ProfileSection;
    page?: number;
    limit?: number;
  }) {
    return this.parse<ProfileUpdateRequest[]>(
      this.client.get<ApiResponse<ProfileUpdateRequest[]>>(
        "/profile-update-requests",
        { params },
      ),
    );
  }

  getMyProfileUpdateRequests(params?: {
    status?: RequestStatus;
    section?: ProfileSection;
  }) {
    return this.parse<ProfileUpdateRequest[]>(
      this.client.get<ApiResponse<ProfileUpdateRequest[]>>(
        "/profile-update-requests/my",
        { params },
      ),
    );
  }

  createProfileUpdateRequest(data: {
    section: ProfileSection;
    requested_data: Record<string, unknown>;
  }) {
    return this.parse<ProfileUpdateRequest>(
      this.client.post<ApiResponse<ProfileUpdateRequest>>(
        "/profile-update-requests",
        data,
      ),
    );
  }

  approveProfileUpdateRequest(id: string, reviewer_notes?: string) {
    return this.parse<ProfileUpdateRequest>(
      this.client.patch<ApiResponse<ProfileUpdateRequest>>(
        `/profile-update-requests/${id}/approve`,
        { reviewer_notes },
      ),
    );
  }

  rejectProfileUpdateRequest(id: string, reviewer_notes: string) {
    return this.parse<ProfileUpdateRequest>(
      this.client.patch<ApiResponse<ProfileUpdateRequest>>(
        `/profile-update-requests/${id}/reject`,
        { reviewer_notes },
      ),
    );
  }

  cancelProfileUpdateRequest(id: string) {
    return this.parse<void>(
      this.client.delete<ApiResponse<void>>(`/profile-update-requests/${id}`),
    );
  }
}

export const apiClient = new ApiClient();
