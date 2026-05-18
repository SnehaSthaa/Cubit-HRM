// ===== API Service Layer =====
// All data operations go through this layer. Currently uses mock data.
// When backend is connected, replace implementations with actual API calls.
// Each function returns a Promise to match real API behavior.

import type {
  Employee,
  EmployeeDocument,
  EmergencyContact,
  BankDetail,
  AttendanceLog,
  BiometricDevice,
  LeaveRequest,
  Holiday,
  LeavePolicy,
  AssetRecord,
  OffboardingCase,
  RoleDefinition,
  UserAssignment,
} from "@/types";

import {
  EMPLOYEES,
  DOCUMENTS,
  EMERGENCY_CONTACTS,
  BANK_DETAILS,
  ATTENDANCE_LOG,
  BIOMETRIC_DEVICES,
  LEAVE_REQUESTS,
  HOLIDAYS,
  LEAVE_POLICIES,
  ASSETS,
  OFFBOARDING_CASES,
  ROLES,
  USERS,
} from "@/data/mock-data";

// Simulate network delay
const delay = (ms = 100) => new Promise((r) => setTimeout(r, ms));

// ──── Employee Service ────
export const employeeService = {
  async list(): Promise<Employee[]> {
    await delay();
    return [...EMPLOYEES];
  },
  async getById(id: string): Promise<Employee | undefined> {
    await delay();
    return EMPLOYEES.find((e) => e.id === id);
  },
  async create(data: Omit<Employee, "id">): Promise<Employee> {
    await delay();
    const emp: Employee = {
      ...data,
      id: `EMP-${String(EMPLOYEES.length + 1001).padStart(4, "0")}`,
    };
    EMPLOYEES.push(emp);
    return emp;
  },
  async update(id: string, data: Partial<Employee>): Promise<Employee> {
    await delay();
    const idx = EMPLOYEES.findIndex((e) => e.id === id);
    if (idx >= 0) Object.assign(EMPLOYEES[idx], data);
    return EMPLOYEES[idx];
  },
  async delete(id: string): Promise<void> {
    await delay();
    const idx = EMPLOYEES.findIndex((e) => e.id === id);
    if (idx >= 0) EMPLOYEES.splice(idx, 1);
  },
};

// ──── Document Service ────
export const documentService = {
  async listByEmployee(employeeId: string): Promise<EmployeeDocument[]> {
    await delay();
    return DOCUMENTS.filter((d) => d.employee_id === employeeId);
  },
  async upload(doc: Omit<EmployeeDocument, "id">): Promise<EmployeeDocument> {
    await delay();
    const newDoc = { ...doc, id: String(Date.now()) };
    DOCUMENTS.push(newDoc);
    return newDoc;
  },
  async updateStatus(
    id: string,
    status: EmployeeDocument["status"],
  ): Promise<void> {
    await delay();
    const doc = DOCUMENTS.find((d) => d.id === id);
    if (doc) doc.status = status;
  },
  async delete(id: string): Promise<void> {
    await delay();
    const idx = DOCUMENTS.findIndex((d) => d.id === id);
    if (idx >= 0) DOCUMENTS.splice(idx, 1);
  },
};

// ──── Emergency Contact Service ────
export const emergencyContactService = {
  async listByEmployee(employeeId: string): Promise<EmergencyContact[]> {
    await delay();
    return EMERGENCY_CONTACTS.filter((c) => c.employee_id === employeeId);
  },
  async create(
    contact: Omit<EmergencyContact, "id">,
  ): Promise<EmergencyContact> {
    await delay();
    const newContact = { ...contact, id: String(Date.now()) };
    EMERGENCY_CONTACTS.push(newContact);
    return newContact;
  },
  async update(id: string, data: Partial<EmergencyContact>): Promise<void> {
    await delay();
    const contact = EMERGENCY_CONTACTS.find((c) => c.id === id);
    if (contact) Object.assign(contact, data);
  },
  async delete(id: string): Promise<void> {
    await delay();
    const idx = EMERGENCY_CONTACTS.findIndex((c) => c.id === id);
    if (idx >= 0) EMERGENCY_CONTACTS.splice(idx, 1);
  },
};

// ──── Bank Details Service ────
export const bankService = {
  async getByEmployee(employeeId: string): Promise<BankDetail | undefined> {
    await delay();
    return BANK_DETAILS[employeeId];
  },
  async update(
    employeeId: string,
    data: Partial<BankDetail>,
  ): Promise<BankDetail> {
    await delay();
    BANK_DETAILS[employeeId] = {
      ...BANK_DETAILS[employeeId],
      ...data,
      employee_id: employeeId,
    };
    return BANK_DETAILS[employeeId];
  },
};

// ──── Attendance Service ────
export const attendanceService = {
  async getToday(): Promise<AttendanceLog[]> {
    await delay();
    return [...ATTENDANCE_LOG];
  },
  async getDevices(): Promise<BiometricDevice[]> {
    await delay();
    return [...BIOMETRIC_DEVICES];
  },
  async addDevice(
    device: Omit<BiometricDevice, "id" | "status" | "lastSync">,
  ): Promise<BiometricDevice> {
    await delay();
    const d: BiometricDevice = {
      ...device,
      id: String(Date.now()),
      status: "online",
      lastSync: "Just now",
    };
    BIOMETRIC_DEVICES.push(d);
    return d;
  },
  async deleteDevice(id: string): Promise<void> {
    await delay();
    const idx = BIOMETRIC_DEVICES.findIndex((d) => d.id === id);
    if (idx >= 0) BIOMETRIC_DEVICES.splice(idx, 1);
  },
  async sync(): Promise<void> {
    await delay(2000);
  },
};

// ──── Leave Service ────
export const leaveService = {
  async list(): Promise<LeaveRequest[]> {
    await delay();
    return [...LEAVE_REQUESTS];
  },
  async create(req: Omit<LeaveRequest, "id">): Promise<LeaveRequest> {
    await delay();
    const newReq = { ...req, id: `LV-${202 + LEAVE_REQUESTS.length}` };
    LEAVE_REQUESTS.unshift(newReq);
    return newReq;
  },
  async update(id: string, data: Partial<LeaveRequest>): Promise<void> {
    await delay();
    const req = LEAVE_REQUESTS.find((r) => r.id === id);
    if (req) Object.assign(req, data);
  },
  async delete(id: string): Promise<void> {
    await delay();
    const idx = LEAVE_REQUESTS.findIndex((r) => r.id === id);
    if (idx >= 0) LEAVE_REQUESTS.splice(idx, 1);
  },
  async getHolidays(): Promise<Holiday[]> {
    await delay();
    return [...HOLIDAYS];
  },
  async createHoliday(h: Omit<Holiday, "id">): Promise<Holiday> {
    await delay();
    const holiday = { ...h, id: `H${Date.now()}` };
    HOLIDAYS.push(holiday);
    return holiday;
  },
  async updateHoliday(id: string, data: Partial<Holiday>): Promise<void> {
    await delay();
    const h = HOLIDAYS.find((x) => x.id === id);
    if (h) Object.assign(h, data);
  },
  async deleteHoliday(id: string): Promise<void> {
    await delay();
    const idx = HOLIDAYS.findIndex((h) => h.id === id);
    if (idx >= 0) HOLIDAYS.splice(idx, 1);
  },
  async getPolicies(): Promise<LeavePolicy[]> {
    await delay();
    return [...LEAVE_POLICIES];
  },
  async createPolicy(p: Omit<LeavePolicy, "id">): Promise<LeavePolicy> {
    await delay();
    const policy = { ...p, id: `LP${Date.now()}` };
    LEAVE_POLICIES.push(policy);
    return policy;
  },
  async updatePolicy(id: string, data: Partial<LeavePolicy>): Promise<void> {
    await delay();
    const p = LEAVE_POLICIES.find((x) => x.id === id);
    if (p) Object.assign(p, data);
  },
  async deletePolicy(id: string): Promise<void> {
    await delay();
    const idx = LEAVE_POLICIES.findIndex((p) => p.id === id);
    if (idx >= 0) LEAVE_POLICIES.splice(idx, 1);
  },
};

// ──── Asset Service ────
export const assetService = {
  async list(): Promise<AssetRecord[]> {
    await delay();
    return [...ASSETS];
  },
  async create(asset: Omit<AssetRecord, "id">): Promise<AssetRecord> {
    await delay();
    const a = {
      ...asset,
      id: `AST-${String(ASSETS.length + 1).padStart(3, "0")}`,
    };
    ASSETS.push(a);
    return a;
  },
  async update(id: string, data: Partial<AssetRecord>): Promise<void> {
    await delay();
    const a = ASSETS.find((x) => x.id === id);
    if (a) Object.assign(a, data);
  },
  async delete(id: string): Promise<void> {
    await delay();
    const idx = ASSETS.findIndex((a) => a.id === id);
    if (idx >= 0) ASSETS.splice(idx, 1);
  },
};

// ──── Offboarding Service ────
export const offboardingService = {
  async list(): Promise<OffboardingCase[]> {
    await delay();
    return [...OFFBOARDING_CASES];
  },
};

// ──── Role Service ────
export const roleService = {
  async getRoles(): Promise<RoleDefinition[]> {
    await delay();
    return [...ROLES];
  },
  async getUsers(): Promise<UserAssignment[]> {
    await delay();
    return [...USERS];
  },
  async updateRole(id: string, data: Partial<RoleDefinition>): Promise<void> {
    await delay();
    const role = ROLES.find((r) => r.id === id);
    if (role) Object.assign(role, data);
  },
  async assignUserRole(userId: string, roleId: string): Promise<void> {
    await delay();
    const user = USERS.find((u) => u.id === userId);
    if (user) user.role = roleId;
  },
};
