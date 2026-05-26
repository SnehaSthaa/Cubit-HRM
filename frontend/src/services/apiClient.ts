import {
  EmergencyContact,
  Employee,
  EmployeeDocument,
  LeaveBalance,
} from "@/types";
import axios, { AxiosInstance } from "axios";
import { Form } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  role?: string;
  data?: T;
  error?: string;
}
type MeEmployee = Employee & {
  emergencyContacts: EmergencyContact[];
  leaveBalances: LeaveBalance[];
  documents: EmployeeDocument[];
  assets: AssetApi[];
};
export type DocumentStatus = "Verified" | "Rejected" | "Pending";
interface HolidayApi {
  id: string;
  start_date: string;
  end_date: string;
  name: string;
  holiday_type: "public" | "company" | "regional" | "religious";
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
  reveiwed_at?: string | null; // ✅ exact schema typo
  assigned_to?: string | null;
  reviewed_by_user_id?: string | null;
  created_at?: string;
  updated_at?: string;

  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    department: string;
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
type UploadProfileImageResponse = {
  profile_image: string;
};

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    const baseUrl = API_BASE_URL;
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem("access_token");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    });

    this.client.interceptors.response.use(
      (res) => res,
      (error) => {
        const message =
          error.response?.data?.message || error.message || "Unknown API error";

        return Promise.reject(new Error(message));
      },
    );
  }

  private async parse<T>(promise: Promise<{ data: ApiResponse<T> }>) {
    const response = await promise;
    return response.data; // ApiResponse<T>
  }

  // ---------------- AUTH ----------------
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

  //----------------PERMISSIONS----------------
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
  // ---------------- EMPLOYEES ----------------
  getEmployees() {
    return this.parse<Employee[]>(
      this.client.get<ApiResponse<Employee[]>>("/employees"),
    );
  }

  getEmployee(id: string) {
    return this.parse<Employee>(
      this.client.get<ApiResponse<Employee>>(`/employees/${id}`),
    );
  }
  createEmployee(data: Record<string, unknown>) {
    return this.parse(this.client.post<ApiResponse>("/employees", data));
  }

  updateEmployee(id: string, data: Record<string, unknown>) {
    return this.parse(this.client.put<ApiResponse>(`/employees/${id}`, data));
  }
  verifyEmployee(id: string) {
    return this.parse(this.client.patch(`/employees/${id}/verify`));
  }
  deleteEmployee(id: string) {
    return this.parse(this.client.delete<ApiResponse>(`/employees/${id}`));
  }
  uploadEmployeeProfileImage(id: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);

    return this.parse(
      this.client.post<ApiResponse<UploadProfileImageResponse>>(
        `/employees/${id}/profile-image`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      ),
    );
  }
  // ---------------- LEAVES ----------------
  getLeaves() {
    return this.parse(this.client.get<ApiResponse<LeaveData[]>>("/leaves"));
  }
  getLeavesByEmployee(employeeId: string) {
    return this.parse(
      this.client.get<ApiResponse<LeaveData[]>>(
        `/leaves/employee/${employeeId}`,
      ),
    );
  }

  createLeave(data: Record<string, unknown>) {
    return this.parse(this.client.post<ApiResponse>("/leaves", data));
  }

  updateLeave(id: string, data: Record<string, unknown>) {
    return this.parse(this.client.put<ApiResponse>(`/leaves/${id}`, data));
  }
  approveLeave(id: string, notes?: string) {
    return this.parse(
      this.client.put<ApiResponse>(`/leaves/${id}/approve`, {
        approval_notes: notes,
      }),
    );
  }

  rejectLeave(id: string, notes?: string) {
    return this.parse(
      this.client.put<ApiResponse>(`/leaves/${id}/reject`, {
        approval_notes: notes,
      }),
    );
  }
  getLeaveBalance(employeeId: string) {
    return this.parse(
      this.client.get<ApiResponse<LeaveBalance[]>>(
        `/leaves/balance/${employeeId}`,
      ),
    );
  }

  getAllLeaveBalances() {
    return this.parse(
      this.client.get<ApiResponse<LeaveBalance[]>>("/leaves/balance"),
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
  deleteLeave(id: string) {
    return this.parse(this.client.delete<ApiResponse>(`/leaves/${id}`));
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
  //--------------Emergency Contacts-------------
  getEmergencyContacts(employeeId: string) {
    return this.parse(
      this.client.get<ApiResponse<EmergencyContact[]>>(
        `/employees/${employeeId}/emergency-contacts`,
      ),
    );
  }

  addEmergencyContact(employeeId: string, data: Record<string, unknown>) {
    return this.parse<EmergencyContact>(
      this.client.post(`/employees/${employeeId}/emergency-contacts`, data),
    );
  }

  updateEmergencyContact(
    employeeId: string,
    contactId: string,
    data: Record<string, unknown>,
  ) {
    return this.parse<EmergencyContact>(
      this.client.patch(`/employees/emergency-contacts/${contactId}`, data),
    );
  }

  deleteEmergencyContact(employeeId: string, contactId: string) {
    return this.parse(
      this.client.delete<ApiResponse<EmergencyContact>>(
        `/employees/emergency-contacts/${contactId}`,
      ),
    );
  }
  // ---------------- DOCUMENTS ----------------

  // DOCUMENTS
  getDocuments(employeeId: string) {
    return this.parse(
      this.client.get<ApiResponse<EmployeeDocument[]>>(
        `/employee-documents/${employeeId}/documents`,
      ),
    );
  }
  uploadDocument(employeeId: string, formData: FormData) {
    return this.parse(
      this.client.post(
        `/employee-documents/${employeeId}/documents`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      ),
    );
  }

  updateDocumentStatus(docId: string, status: "Verified" | "Rejected") {
    return this.parse(
      this.client.patch<ApiResponse>(
        `/employee-documents/documents/${docId}/status`,
        { status },
      ),
    );
  }

  deleteDocument(docId: string) {
    return this.parse(
      this.client.delete<ApiResponse>(`/employee-documents/documents/${docId}`),
    );
  }
  // ---------------- LEAVE POLICIES ----------------

  getPolicies() {
    return this.parse(
      this.client.get<ApiResponse<LeavePolicyApi[]>>("/leave-policies"),
    );
  }

  createPolicy(data: Record<string, unknown>) {
    return this.parse(this.client.post<ApiResponse>("/leave-policies", data));
  }

  updatePolicy(id: string, data: Record<string, unknown>) {
    return this.parse(
      this.client.put<ApiResponse>(`/leave-policies/${id}`, data),
    );
  }

  deletePolicy(id: string) {
    return this.parse(this.client.delete<ApiResponse>(`/leave-policies/${id}`));
  }
  // ---------------- HOLIDAYS ----------------

  getHolidays() {
    return this.parse(this.client.get<ApiResponse<HolidayApi[]>>("/holidays"));
  }

  createHoliday(data: {
    name: string;
    start_date: string;
    end_date: string;
    holiday_type: string;
  }) {
    return this.parse(this.client.post<ApiResponse>("/holidays", data));
  }

  deleteHoliday(id: string) {
    return this.parse(this.client.delete<ApiResponse>(`/holidays/${id}`));
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
    return this.parse(this.client.put<ApiResponse>(`/holidays/${id}`, data));
  }

  // ---------------- ASSETS ----------------
  getAssets(filters?: Record<string, unknown>) {
    return this.parse<AssetApi[]>(
      this.client.get<ApiResponse<AssetApi[]>>("/assets", { params: filters }),
    );
  }

  createAsset(data: Record<string, unknown>) {
    return this.parse(this.client.post<ApiResponse>("/assets", data));
  }

  assignAsset(id: string, employeeId: string, data?: Record<string, unknown>) {
    return this.parse(
      this.client.patch<ApiResponse>(`/assets/${id}/assign`, {
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
    return this.client.get("/assets/export", {
      responseType: "blob",
    });
  }
  importAssets(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    return this.client.post("/assets/import", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  }

  // ---------------- TAKE-HOME REQUESTS ----------------

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

  // Offboarding
  getOffboardingEmployees() {
    return this.parse<Employee[]>(
      this.client.get<ApiResponse<Employee[]>>("/offboarding"),
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
}

export const apiClient = new ApiClient();
