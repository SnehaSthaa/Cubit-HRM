// ===== CSS Class Maps =====
// Centralized status-to-CSS mappings used across the app.

import type { EmployeeStatus, AssetStatus, AssetCondition, DocStatus } from "@/types";

export const employeeStatusClass: Record<EmployeeStatus, string> = {
  Active: "status-active",
  Onboarding: "status-pending",
  "On Leave": "status-pending",
  Resigned: "status-resigned",
  Inactive: "status-inactive",
  "Notice Period": "status-notice",
};

export const assetStatusClass: Record<AssetStatus, string> = {
  Assigned: "status-active",
  Available: "bg-primary/10 text-primary border-primary/20",
  "Under Maintenance": "status-pending",
  Retired: "status-inactive",
  "Pending Approval": "status-notice",
};

export const assetConditionClass: Record<AssetCondition, string> = {
  Good: "status-active",
  Fair: "status-pending",
  "Needs Repair": "status-resigned",
};

export const docStatusClass: Record<DocStatus, string> = {
  Verified: "status-active",
  Pending: "status-pending",
  Rejected: "status-resigned",
};

export const leaveStatusClass: Record<string, string> = {
  Pending: "status-pending",
  Approved: "status-active",
  Rejected: "status-resigned",
};

export const attendanceStatusClass: Record<string, string> = {
  Present: "status-active",
  Late: "status-pending",
  Absent: "status-resigned",
  Complete: "status-active",
};

export const leaveTypeStatusClass: Record<string, string> = {
  "Paid Leave": "status-active",
  "Sick Leave": "status-pending",
  "Unpaid Leave": "status-notice",
};

export const empProfileStatusClass: Record<string, string> = {
  Active: "status-active",
  "On Leave": "status-pending",
  "Notice Period": "status-notice",
  Resigned: "status-resigned",
  Inactive: "status-inactive",
};

export const employeeAssetStatusClass: Record<string, string> = {
  Active: "status-active",
  "Pending Approval": "status-pending",
  Returned: "status-inactive",
  "Pending Return": "status-notice",
};
