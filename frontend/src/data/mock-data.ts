// ===== Centralized Mock Data Store =====
// Single source of truth for all mock data, ready to be replaced by API calls.

import type {
  Employee, EmployeeDocument, EmergencyContact, BankDetails,
  AttendanceLog, BiometricDevice, LeaveRequest, Holiday, LeavePolicy,
  Asset, EmployeeAsset, OffboardingCase, RoleDefinition, UserAssignment,
  LeaveBalance, PendingAction, ActivityItem
} from "@/types";

// ──── Employees ────
export const EMPLOYEES: Employee[] = [
  { id: "EMP-1001", name: "Aarav Bhandari", email: "aarav@nexus.io", phone: "+977-9812345678", department: "Engineering", designation: "Sr. Developer", status: "Active", joinDate: "2023-01-15", type: "Full-time", dob: "1995-03-15", gender: "Male", maritalStatus: "Single", fatherName: "Ram Bhandari", grandfatherName: "Hari Bhandari", motherName: "Sita Bhandari", currentAddress: "Kathmandu, Nepal", permanentAddress: "Pokhara, Nepal", level: "Senior", hierarchy: "Team Lead → Engineering Manager → CTO", previousExperience: "4 years", employmentStatus: "Active" },
  { id: "EMP-1002", name: "Priya Sharma", email: "priya@nexus.io", phone: "+977-9823456789", department: "Engineering", designation: "DevOps Lead", status: "Active", joinDate: "2022-06-01", type: "Full-time", dob: "1993-07-22", gender: "Female", maritalStatus: "Married", fatherName: "Shyam Sharma", grandfatherName: "Gopal Sharma", motherName: "Gita Sharma", currentAddress: "Lalitpur, Nepal", permanentAddress: "Birgunj, Nepal", level: "Lead", hierarchy: "DevOps Lead → Engineering Manager → CTO", previousExperience: "6 years", employmentStatus: "Active" },
  { id: "EMP-1003", name: "Raj Thapa", email: "raj@nexus.io", department: "Marketing", designation: "Campaign Manager", status: "On Leave", joinDate: "2023-03-20", type: "Full-time" },
  { id: "EMP-1004", name: "Sita Magar", email: "sita@nexus.io", department: "HR", designation: "HR Coordinator", status: "Active", joinDate: "2022-11-10", type: "Full-time" },
  { id: "EMP-1005", name: "Bikash Gurung", email: "bikash@nexus.io", department: "Operations", designation: "Ops Manager", status: "Resigned", joinDate: "2021-08-05", type: "Full-time" },
  { id: "EMP-1006", name: "Anita KC", email: "anita@nexus.io", department: "Finance", designation: "Accountant", status: "Onboarding", joinDate: "2024-01-08", type: "Full-time" },
  { id: "EMP-1007", name: "Dipesh Karki", email: "dipesh@nexus.io", department: "Engineering", designation: "Frontend Dev", status: "Active", joinDate: "2023-07-12", type: "Contract" },
  { id: "EMP-1008", name: "Manisha Rai", email: "manisha@nexus.io", department: "Design", designation: "UI Designer", status: "Active", joinDate: "2023-05-22", type: "Full-time" },
  { id: "EMP-1009", name: "Suresh Tamang", email: "suresh@nexus.io", department: "Engineering", designation: "Backend Dev", status: "Notice Period", joinDate: "2022-09-14", type: "Full-time" },
  { id: "EMP-1010", name: "Kavita Shrestha", email: "kavita@nexus.io", department: "Support", designation: "Support Lead", status: "Active", joinDate: "2023-02-28", type: "Full-time" },
];

export const DEPARTMENTS = ["Engineering", "Marketing", "HR", "Operations", "Finance", "Design", "Support"];
export const EMPLOYEE_STATUSES: Employee["status"][] = ["Active", "Onboarding", "On Leave", "Notice Period", "Resigned", "Inactive"];
export const EMPLOYMENT_TYPES: Employee["type"][] = ["Full-time", "Contract", "Part-time"];

// ──── Documents ────
export const DOCUMENTS: EmployeeDocument[] = [
  { id: "1", employeeId: "EMP-1001", name: "Citizenship Certificate", type: "Citizenship", uploadedAt: "2023-01-10", status: "Verified", fileSize: "2.4 MB" },
  { id: "2", employeeId: "EMP-1001", name: "PAN Card", type: "PAN", uploadedAt: "2023-01-10", status: "Verified", fileSize: "1.1 MB" },
  { id: "3", employeeId: "EMP-1001", name: "Bachelor's Degree", type: "Certificate", uploadedAt: "2023-01-12", status: "Pending", fileSize: "3.8 MB" },
  { id: "4", employeeId: "EMP-1001", name: "National ID", type: "National Identification", uploadedAt: "2023-01-12", status: "Verified", fileSize: "1.5 MB" },
  { id: "5", employeeId: "EMP-1001", name: "Police Report", type: "Police Report", uploadedAt: "2023-02-01", status: "Pending", fileSize: "0.9 MB" },
  { id: "6", employeeId: "EMP-1001", name: "SSF Document", type: "SSF", uploadedAt: "2023-02-05", status: "Verified", fileSize: "1.2 MB" },
];

export const DOCUMENT_TYPES: EmployeeDocument["type"][] = ["Citizenship", "PAN", "Certificate", "National Identification", "Police Report", "SSF", "Other"];

// ──── Emergency Contacts ────
export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  { id: "1", employeeId: "EMP-1001", name: "Ram Bhandari", relation: "Father", phone: "+977-9801234567", email: "ram@email.com" },
  { id: "2", employeeId: "EMP-1001", name: "Sita Bhandari", relation: "Mother", phone: "+977-9801234568", email: "sita@email.com" },
];

// ──── Bank Details ────
export const BANK_DETAILS: Record<string, BankDetails> = {
  "EMP-1001": { employeeId: "EMP-1001", bankName: "Nepal Bank Ltd.", accountNumber: "1234567890123456", branch: "Kathmandu Main Branch", salaryAmount: "NPR 85,000", contractType: "Permanent" },
  "EMP-1002": { employeeId: "EMP-1002", bankName: "Nabil Bank", accountNumber: "9876543210123456", branch: "Patan Branch", salaryAmount: "NPR 95,000", contractType: "Permanent" },
};

// ──── Attendance ────
export const ATTENDANCE_LOG: AttendanceLog[] = [
  { id: "1", employeeId: "EMP-1001", employeeName: "Aarav Bhandari", date: "2024-01-15", checkIn: "08:02", checkOut: "—", hours: "6h 12m", status: "Present", source: "Biometric" },
  { id: "2", employeeId: "EMP-1002", employeeName: "Priya Sharma", date: "2024-01-15", checkIn: "08:15", checkOut: "—", hours: "5h 59m", status: "Present", source: "Biometric" },
  { id: "3", employeeId: "EMP-1004", employeeName: "Sita Magar", date: "2024-01-15", checkIn: "08:45", checkOut: "—", hours: "5h 29m", status: "Late", source: "Biometric" },
  { id: "4", employeeId: "EMP-1007", employeeName: "Dipesh Karki", date: "2024-01-15", checkIn: "07:58", checkOut: "—", hours: "6h 16m", status: "Present", source: "Biometric" },
  { id: "5", employeeId: "EMP-1009", employeeName: "Suresh Tamang", date: "2024-01-15", checkIn: "—", checkOut: "—", hours: "—", status: "Absent", source: "—" },
  { id: "6", employeeId: "EMP-1010", employeeName: "Kavita Shrestha", date: "2024-01-15", checkIn: "08:00", checkOut: "16:05", hours: "8h 05m", status: "Complete", source: "Biometric" },
];

export const BIOMETRIC_DEVICES: BiometricDevice[] = [
  { id: "1", name: "Main Entrance", ip: "192.168.1.201", model: "ZKTeco SpeedFace-V5L", status: "online", lastSync: "2 min ago", port: "4370", protocol: "TCP" },
  { id: "2", name: "Back Gate", ip: "192.168.1.202", model: "ZKTeco ProFace X", status: "online", lastSync: "5 min ago", port: "4370", protocol: "TCP" },
  { id: "3", name: "Parking", ip: "192.168.1.203", model: "ZKTeco MultiBio 800", status: "offline", lastSync: "3h ago", port: "4370", protocol: "TCP" },
];

export const DEVICE_MODELS = [
  "ZKTeco SpeedFace-V5L", "ZKTeco ProFace X", "ZKTeco MultiBio 800",
  "ZKTeco ZFace-M", "ZKTeco uFace 800", "ZKTeco iClock 9000-G",
];

// ──── Leave ────
export const LEAVE_REQUESTS: LeaveRequest[] = [
  { id: "LV-201", employee: "Raj Thapa", type: "Paid Leave", from: "2024-01-20", to: "2024-01-22", days: 3, status: "Pending", reason: "Family function in hometown", appliedOn: "2024-01-18" },
  { id: "LV-200", employee: "Sita Magar", type: "Sick Leave", from: "2024-01-18", to: "2024-01-18", days: 1, status: "Approved", reason: "Flu and fever", appliedOn: "2024-01-17", approvedBy: "HR Admin", remarks: "Get well soon" },
  { id: "LV-199", employee: "Dipesh Karki", type: "Unpaid Leave", from: "2024-01-15", to: "2024-01-16", days: 2, status: "Rejected", reason: "Personal work", appliedOn: "2024-01-14", rejectionReason: "Project deadline approaching, cannot approve" },
  { id: "LV-198", employee: "Aarav Bhandari", type: "Paid Leave", from: "2024-01-10", to: "2024-01-12", days: 3, status: "Approved", reason: "Vacation trip", appliedOn: "2024-01-05", approvedBy: "HR Admin" },
];

export const HOLIDAYS: Holiday[] = [
  { id: "H1", date: "2024-01-26", name: "Republic Day", type: "public" },
  { id: "H2", date: "2024-02-19", name: "Democracy Day", type: "public" },
  { id: "H3", date: "2024-03-25", name: "Holi", type: "public" },
  { id: "H4", date: "2024-04-14", name: "Nepali New Year", type: "public" },
  { id: "H5", date: "2024-10-12", name: "Dashain", type: "public" },
  { id: "H6", date: "2024-11-01", name: "Tihar", type: "public" },
];

export const LEAVE_POLICIES: LeavePolicy[] = [
  { id: "LP1", name: "Paid Leave", type: "paid", annualQuota: 12, proRata: true, carryForward: true, maxCarryForward: 5, active: true },
  { id: "LP2", name: "Sick Leave", type: "sick", annualQuota: 12, proRata: false, carryForward: false, maxCarryForward: 0, active: true },
  { id: "LP3", name: "Unpaid Leave", type: "unpaid", annualQuota: 30, proRata: false, carryForward: false, maxCarryForward: 0, active: true },
  { id: "LP4", name: "Compensatory Leave", type: "compensatory", annualQuota: 0, proRata: false, carryForward: false, maxCarryForward: 0, active: true },
];

export const LEAVE_BALANCE: LeaveBalance[] = [
  { type: "Paid Leave", total: 12, used: 3, remaining: 9 },
  { type: "Sick Leave", total: 6, used: 1, remaining: 5 },
  { type: "Unpaid Leave", total: "∞", used: 0, remaining: "∞" },
];

export const EMPLOYEE_NAMES = ["Aarav Bhandari", "Priya Sharma", "Raj Thapa", "Sita Magar", "Dipesh Karki", "Bikash Gurung", "Anita KC"];

// ──── Assets ────
export const ASSETS: Asset[] = [
  { id: "AST-001", name: 'MacBook Pro 14"', type: "Laptop", serialNumber: "MBP-2023-0041", assignedTo: "Aarav Bhandari", assignedToId: "EMP-1001", department: "Engineering", purchaseDate: "2023-01-10", status: "Assigned", condition: "Good" },
  { id: "AST-002", name: 'Dell Monitor 27"', type: "Monitor", serialNumber: "DM-2023-0112", assignedTo: "Aarav Bhandari", assignedToId: "EMP-1001", department: "Engineering", purchaseDate: "2023-01-10", status: "Assigned", condition: "Good" },
  { id: "AST-003", name: "Logitech MX Keys", type: "Keyboard", serialNumber: "LMK-2023-0089", assignedTo: "Aarav Bhandari", assignedToId: "EMP-1001", department: "Engineering", purchaseDate: "2023-01-10", status: "Assigned", condition: "Good" },
  { id: "AST-004", name: "iPhone 15", type: "Mobile", serialNumber: "IP15-2024-0022", assignedTo: null, assignedToId: null, department: null, purchaseDate: "2024-03-01", status: "Pending Approval", condition: "Good" },
  { id: "AST-005", name: "Dell Latitude 15", type: "Laptop", serialNumber: "DL-2022-0203", assignedTo: "Priya Sharma", assignedToId: "EMP-1002", department: "Engineering", purchaseDate: "2022-05-15", status: "Assigned", condition: "Fair" },
  { id: "AST-006", name: 'LG Monitor 24"', type: "Monitor", serialNumber: "LG-2022-0088", assignedTo: null, assignedToId: null, department: null, purchaseDate: "2022-05-15", status: "Available", condition: "Good" },
  { id: "AST-007", name: "Jabra Headset", type: "Headset", serialNumber: "JH-2023-0044", assignedTo: "Manisha Rai", assignedToId: "EMP-1008", department: "Design", purchaseDate: "2023-05-22", status: "Assigned", condition: "Good" },
  { id: "AST-008", name: "ThinkPad X1 Carbon", type: "Laptop", serialNumber: "TP-2021-0099", assignedTo: null, assignedToId: null, department: null, purchaseDate: "2021-03-10", status: "Under Maintenance", condition: "Needs Repair" },
  { id: "AST-009", name: 'Samsung Monitor 32"', type: "Monitor", serialNumber: "SM-2020-0010", assignedTo: null, assignedToId: null, department: null, purchaseDate: "2020-08-01", status: "Retired", condition: "Fair" },
  { id: "AST-010", name: "Seagate 2TB", type: "Hard Drive", serialNumber: "SG-2023-0015", assignedTo: "Dipesh Karki", assignedToId: "EMP-1007", department: "Engineering", purchaseDate: "2023-07-12", status: "Assigned", condition: "Good" },
];

export const ASSET_TYPES = ["Laptop", "Monitor", "Mobile", "Keyboard", "Hard Drive", "Headset", "Other"];

export const EMPLOYEE_ASSETS: EmployeeAsset[] = [
  { id: "A-001", name: 'MacBook Pro 14"', type: "Laptop", serialNumber: "MBP-2023-0041", assignedDate: "2023-01-15", status: "Active" },
  { id: "A-002", name: 'Dell Monitor 27"', type: "Monitor", serialNumber: "DM-2023-0112", assignedDate: "2023-01-15", status: "Active" },
  { id: "A-003", name: "Logitech MX Keys", type: "Keyboard", serialNumber: "LMK-2023-0089", assignedDate: "2023-01-15", status: "Active" },
  { id: "A-004", name: "iPhone 15", type: "Mobile", serialNumber: "IP15-2024-0022", assignedDate: "2024-03-01", status: "Pending Approval" },
];

// ──── Offboarding ────
export const OFFBOARDING_CASES: OffboardingCase[] = [
  { id: "EMP-0998", name: "Bikash Gurung", department: "Operations", resignDate: "2024-01-05", lastDay: "2024-02-05", noticePeriod: "30 days", clearance: { it: true, finance: false, hr: false }, status: "In Progress" },
  { id: "EMP-0985", name: "Ramesh Adhikari", department: "Sales", resignDate: "2023-12-20", lastDay: "2024-01-20", noticePeriod: "30 days", clearance: { it: true, finance: true, hr: true }, status: "Completed" },
];

// ──── Roles ────
import { ALL_PERMISSIONS } from "@/types";

export const ROLES: RoleDefinition[] = [
  {
    id: "super_admin", name: "Super Admin", description: "Full system access. Only one Super Admin allowed.",
    maxUsers: 1, locked: true,
    permissions: Object.fromEntries(["Dashboard", "Employees", "Attendance", "Leave Management", "Payroll", "Assets", "Offboarding", "Reports", "Roles & Access", "Employee Self-Service"].map(m => [m, [...ALL_PERMISSIONS]])),
  },
  {
    id: "hr_admin", name: "HR / Admin", description: "Can manage employees, leaves, payroll, documents, and assets.",
    maxUsers: null, locked: false,
    permissions: { Dashboard: ["view"], Employees: ["view", "create", "edit", "delete"], Attendance: ["view", "create", "edit"], "Leave Management": ["view", "create", "edit", "delete"], Payroll: ["view", "create", "edit"], Assets: ["view", "create", "edit", "delete"], Offboarding: ["view", "create", "edit"], Reports: ["view"], "Roles & Access": ["view"], "Employee Self-Service": ["view", "edit"] },
  },
  {
    id: "employee", name: "Employee", description: "Self-service access. Can view own profile, apply leave, and view attendance.",
    maxUsers: null, locked: false,
    permissions: { Dashboard: ["view"], Employees: [], Attendance: ["view"], "Leave Management": ["view", "create"], Payroll: ["view"], Assets: ["view", "create"], Offboarding: [], Reports: [], "Roles & Access": [], "Employee Self-Service": ["view", "edit"] },
  },
];

export const USERS: UserAssignment[] = [
  { id: "1", name: "Rajesh Sharma", email: "rajesh@cubit.io", role: "super_admin" },
  { id: "2", name: "Sita Thapa", email: "sita@cubit.io", role: "hr_admin" },
  { id: "3", name: "Binod KC", email: "binod@cubit.io", role: "hr_admin" },
  { id: "4", name: "Priya Gurung", email: "priya@cubit.io", role: "hr_admin" },
  { id: "5", name: "Aarav Bhandari", email: "aarav@cubit.io", role: "employee" },
  { id: "6", name: "Deepa Rai", email: "deepa@cubit.io", role: "employee" },
  { id: "7", name: "Sunil Tamang", email: "sunil@cubit.io", role: "employee" },
  { id: "8", name: "Anita Shrestha", email: "anita@cubit.io", role: "employee" },
  { id: "9", name: "Ramesh Adhikari", email: "ramesh@cubit.io", role: "employee" },
];

// ──── Dashboard ────
export const DASHBOARD_STATS = [
  { label: "Active Employees", value: "342", change: "+12", positive: true },
  { label: "Pending Onboarding", value: "12", change: "+3", positive: false },
  { label: "On Leave Today", value: "8", change: "—", positive: true },
  { label: "Clearance Required", value: "4", change: "+1", positive: false },
];

export const PENDING_ACTIONS: PendingAction[] = [
  { id: "EMP-1042", name: "Priya Sharma", action: "Document Verification", dept: "Engineering", time: "2h ago" },
  { id: "EMP-1038", name: "Raj Thapa", action: "Leave Approval", dept: "Marketing", time: "4h ago" },
  { id: "EMP-1045", name: "Anita KC", action: "Onboarding Review", dept: "Finance", time: "5h ago" },
  { id: "EMP-0998", name: "Bikash Gurung", action: "Exit Clearance", dept: "Operations", time: "1d ago" },
  { id: "EMP-1041", name: "Sita Magar", action: "Bank Details Update", dept: "HR", time: "1d ago" },
];

export const RECENT_ACTIVITY: ActivityItem[] = [
  { text: "Priya Sharma clocked in", time: "08:02 AM", type: "clockin" },
  { text: "Leave approved for Raj Thapa", time: "07:45 AM", type: "leave" },
  { text: "New employee Anita KC added", time: "Yesterday", type: "new" },
  { text: "Bikash Gurung submitted resignation", time: "Yesterday", type: "exit" },
];

export const TODAY_LEAVES = [
  { name: "Raj Thapa", type: "Paid Leave", dept: "Marketing", from: "Jan 20", to: "Jan 22" },
  { name: "Manisha Rai", type: "Sick Leave", dept: "Design", from: "Jan 15", to: "Jan 15" },
  { name: "Suresh Tamang", type: "Unpaid Leave", dept: "Engineering", from: "Jan 14", to: "Jan 16" },
];

export const UPCOMING_HOLIDAYS = [
  { date: "2024-01-26", name: "Republic Day" },
  { date: "2024-02-19", name: "Democracy Day" },
  { date: "2024-03-08", name: "Women's Day" },
  { date: "2024-03-25", name: "Holi" },
  { date: "2024-04-14", name: "New Year (Baisakh 1)" },
];

// ──── Payroll sample employees ────
import type { PayrollEmployee } from "@/lib/payroll-engine";

export const PAYROLL_EMPLOYEES: PayrollEmployee[] = [
  { id: 1, name: "Aarav Bhandari", tp: "single", gd: "male", absentDays: 0, unpaidLeave: 0, monthlySalary: 85000, disabled: false, pf: 0, dashain: 0, extraTime: 0, bonus: 0, cit: 0, healthInsurance: 0, lifeInsurance: 0, pan: "123456789", ssfId: "SSF-001", designation: "Sr. Developer", totalWorkingDays: 20, workingDaysAttended: 20, paidLeave: 0, sickLeave: 0, hasSSF: true, employmentType: "full-time" },
  { id: 2, name: "Priya Sharma", tp: "couple", gd: "female", absentDays: 1, unpaidLeave: 0, monthlySalary: 95000, disabled: false, pf: 0, dashain: 0, extraTime: 2000, bonus: 0, cit: 0, healthInsurance: 0, lifeInsurance: 0, pan: "987654321", ssfId: "SSF-002", designation: "DevOps Lead", totalWorkingDays: 20, workingDaysAttended: 19, paidLeave: 1, sickLeave: 0, hasSSF: true, employmentType: "full-time" },
  { id: 3, name: "Raj Thapa", tp: "single", gd: "male", absentDays: 2, unpaidLeave: 1, monthlySalary: 65000, disabled: false, pf: 5000, dashain: 0, extraTime: 0, bonus: 0, cit: 1000, healthInsurance: 0, lifeInsurance: 0, pan: "456789123", ssfId: "SSF-003", designation: "Campaign Mgr", totalWorkingDays: 20, workingDaysAttended: 17, paidLeave: 0, sickLeave: 0, hasSSF: true, employmentType: "full-time" },
];

// ──── Monthly Attendance for Reports ────
export const MONTHLY_ATTENDANCE = [
  { month: "Oct", present: 92, late: 5, absent: 3 },
  { month: "Nov", present: 89, late: 7, absent: 4 },
  { month: "Dec", present: 85, late: 8, absent: 7 },
  { month: "Jan", present: 91, late: 6, absent: 3 },
];
