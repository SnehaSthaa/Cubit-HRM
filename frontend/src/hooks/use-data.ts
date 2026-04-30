// ===== React Query Hooks for Data Fetching =====
// Wraps the service layer for caching, loading states, and mutations.
// When backend is connected, these hooks remain unchanged.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  employeeService, documentService, emergencyContactService,
  bankService, attendanceService, leaveService, assetService,
  offboardingService, roleService,
} from "@/services/api";
import type { Employee, EmployeeDocument, EmergencyContact, BankDetails, LeaveRequest, Holiday, LeavePolicy, Asset, RoleDefinition } from "@/types";

// ──── Employees ────
export const useEmployees = () =>
  useQuery({ queryKey: ["employees"], queryFn: employeeService.list });

export const useEmployee = (id: string) =>
  useQuery({ queryKey: ["employees", id], queryFn: () => employeeService.getById(id), enabled: !!id });

export const useCreateEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Employee, "id">) => employeeService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
};

export const useUpdateEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Employee> }) => employeeService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
};

export const useDeleteEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => employeeService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
};

// ──── Documents ────
export const useDocuments = (employeeId: string) =>
  useQuery({ queryKey: ["documents", employeeId], queryFn: () => documentService.listByEmployee(employeeId), enabled: !!employeeId });

export const useUploadDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (doc: Omit<EmployeeDocument, "id">) => documentService.upload(doc),
    onSuccess: (_, doc) => qc.invalidateQueries({ queryKey: ["documents", doc.employeeId] }),
  });
};

export const useUpdateDocumentStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: EmployeeDocument["status"] }) => documentService.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
};

export const useDeleteDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
};

// ──── Emergency Contacts ────
export const useEmergencyContacts = (employeeId: string) =>
  useQuery({ queryKey: ["emergencyContacts", employeeId], queryFn: () => emergencyContactService.listByEmployee(employeeId), enabled: !!employeeId });

export const useCreateEmergencyContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contact: Omit<EmergencyContact, "id">) => emergencyContactService.create(contact),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emergencyContacts"] }),
  });
};

export const useDeleteEmergencyContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => emergencyContactService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emergencyContacts"] }),
  });
};

// ──── Bank Details ────
export const useBankDetails = (employeeId: string) =>
  useQuery({ queryKey: ["bankDetails", employeeId], queryFn: () => bankService.getByEmployee(employeeId), enabled: !!employeeId });

export const useUpdateBankDetails = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, data }: { employeeId: string; data: Partial<BankDetails> }) => bankService.update(employeeId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bankDetails"] }),
  });
};

// ──── Attendance ────
export const useAttendanceLog = () =>
  useQuery({ queryKey: ["attendance"], queryFn: attendanceService.getToday });

export const useBiometricDevices = () =>
  useQuery({ queryKey: ["devices"], queryFn: attendanceService.getDevices });

export const useAddDevice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: attendanceService.addDevice,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devices"] }),
  });
};

export const useDeleteDevice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: attendanceService.deleteDevice,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devices"] }),
  });
};

export const useSyncDevices = () =>
  useMutation({ mutationFn: attendanceService.sync });

// ──── Leave ────
export const useLeaveRequests = () =>
  useQuery({ queryKey: ["leaveRequests"], queryFn: leaveService.list });

export const useCreateLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: Omit<LeaveRequest, "id">) => leaveService.create(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leaveRequests"] }),
  });
};

export const useUpdateLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LeaveRequest> }) => leaveService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leaveRequests"] }),
  });
};

export const useDeleteLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leaveService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leaveRequests"] }),
  });
};

export const useHolidays = () =>
  useQuery({ queryKey: ["holidays"], queryFn: leaveService.getHolidays });

export const useLeavePolicies = () =>
  useQuery({ queryKey: ["leavePolicies"], queryFn: leaveService.getPolicies });

// ──── Assets ────
export const useAssets = () =>
  useQuery({ queryKey: ["assets"], queryFn: assetService.list });

export const useCreateAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (asset: Omit<Asset, "id">) => assetService.create(asset),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });
};

export const useUpdateAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Asset> }) => assetService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });
};

export const useDeleteAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => assetService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });
};

// ──── Offboarding ────
export const useOffboardingCases = () =>
  useQuery({ queryKey: ["offboarding"], queryFn: offboardingService.list });

// ──── Roles ────
export const useRoles = () =>
  useQuery({ queryKey: ["roles"], queryFn: roleService.getRoles });

export const useRoleUsers = () =>
  useQuery({ queryKey: ["roleUsers"], queryFn: roleService.getUsers });

export const useAssignRole = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) => roleService.assignUserRole(userId, roleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roleUsers"] }),
  });
};
