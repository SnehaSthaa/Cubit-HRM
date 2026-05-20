export const DashboardAction = {
  View: "dashboard.view",
  Create: "dashboard.create",
  Edit: "dashboard.edit",
  Delete: "dashboard.delete",
} as const;

export const EmployeesAction = {
  View: "employee.view",
  Create: "employee.create",
  Edit: "employee.edit",
  Delete: "employee.delete",
} as const;

export const AttendanceAction = {
  View: "attendance.view",
  Create: "attendance.create",
  Edit: "attendance.edit",
  Delete: "attendance.delete",
} as const;
export const LeaveManagementAction = {
  View: "leavemanagement.view",
  Create: "leavemanagement.create",
  Edit: "leavemanagement.edit",
  Delete: "leavemanagement.delete",
} as const;
export const PayrollAction = {
  View: "payroll.view",
  Create: "payroll.create",
  Edit: "payroll.edit",
  Delete: "payroll.delete",
} as const;
export const AssetsAction = {
  View: "assets.view",
  Create: "assets.create",
  Edit: "assets.edit",
  Delete: "assets.delete",
} as const;
export const OffboardingAction = {
  View: "offboarding.view",
  Create: "offboarding.create",
  Edit: "offboarding.edit",
  Delete: "offboarding.delete",
} as const;
export const ReportsAction = {
  View: "reports.view",
  Create: "reports.create",
  Edit: "reports.edit",
  Delete: "reports.delete",
} as const;
export const RolesandAccessAction = {
  View: "rolesandaccess.view",
  Create: "rolesandaccess.create",
  Edit: "rolesandaccess.edit",
  Delete: "rolesandaccess.delete",
} as const;
export const EmployeeSelfServiceAction = {
  View: "employeeselfservice.view",
  Create: "employeeselfservice.create",
  Edit: "employeeselfservice.edit",
  Delete: "employeeselfservice.delete",
} as const;

export type AllowedType = {
  dashboard: {
    [K in (typeof DashboardAction)[keyof typeof DashboardAction]]: boolean;
  };
  employee: {
    [K in (typeof EmployeesAction)[keyof typeof EmployeesAction]]: boolean;
  };
  attendance: {
    [K in (typeof AttendanceAction)[keyof typeof AttendanceAction]]: boolean;
  };
  leave_management: {
    [K in (typeof LeaveManagementAction)[keyof typeof LeaveManagementAction]]: boolean;
  };
  payroll: {
    [K in (typeof PayrollAction)[keyof typeof PayrollAction]]: boolean;
  };
  assets: {
    [K in (typeof AssetsAction)[keyof typeof AssetsAction]]: boolean;
  };
  offboarding: {
    [K in (typeof OffboardingAction)[keyof typeof OffboardingAction]]: boolean;
  };
  reports: {
    [K in (typeof ReportsAction)[keyof typeof ReportsAction]]: boolean;
  };
  roles_and_access: {
    [K in (typeof RolesandAccessAction)[keyof typeof RolesandAccessAction]]: boolean;
  };
  Employee_self_service: {
    [K in (typeof EmployeeSelfServiceAction)[keyof typeof EmployeeSelfServiceAction]]: boolean;
  };
};
