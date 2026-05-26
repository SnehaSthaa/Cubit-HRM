import { z } from "zod";

// ─── Reusable primitives ───────────────────────────────────────────────────────

const dateString = z.string().refine((val) => {
  if (!val) return true;
  return !isNaN(new Date(val).getTime());
}, "Invalid date format");

const pastDateString = dateString.refine((val) => {
  if (!val) return true;
  return new Date(val) <= new Date();
}, "Date cannot be in the future");

const adultDobString = dateString.refine((val) => {
  if (!val) return true;
  const dob = new Date(val);
  const today = new Date();
  const cutoff = new Date(
    today.getFullYear() - 18,
    today.getMonth(),
    today.getDate(),
  );
  return dob <= cutoff;
}, "Employee must be at least 18 years old");

const uuidString = z.string().uuid("Invalid UUID format");

const decimalNumber = z
  .number()
  .positive("Must be a positive number")
  .multipleOf(0.01, "Max 2 decimal places");

// ─── Shared ID number rules ────────────────────────────────────────────────────
// Both ssid_number and ssf_number: digits only, 5–20 chars, optional.
const socialIdNumber = z
  .string()
  .regex(/^\d+$/, "Must contain digits only")
  .min(5, "Must be at least 5 digits")
  .max(20, "Must be at most 20 digits")
  .optional();

// ─── Enums ────────────────────────────────────────────────────────────────────

export const UserRoleEnum = z.enum(["super_admin", "hr_admin", "employee"]);
export const GenderEnum = z.enum(["Male", "Female", "Others"]);
export const MaritalStatusEnum = z.enum([
  "Single",
  "Married",
  "Divorced",
  "Widowed",
]);
export const MunicipalityTypeEnum = z.enum([
  "metropolitian",
  "sub_metropolitian",
  "municipality",
  "rural_municipality",
]);
export const AttendanceStatusEnum = z.enum([
  "present",
  "absent",
  "late",
  "half_day",
  "on_leave",
]);
export const LeaveStatusEnum = z.enum(["pending", "approved", "rejected"]);
export const PayrollStatusEnum = z.enum(["pending", "processed", "paid"]);
export const AssetStatusEnum = z.enum([
  "available",
  "assigned",
  "maintenance",
  "retired",
]);
export const ReportTypeEnum = z.enum([
  "attendance",
  "payroll",
  "leave",
  "performance",
]);
export const HolidayTypeEnum = z.enum([
  "public",
  "company",
  "regional",
  "religious",
]);

// ─── User ─────────────────────────────────────────────────────────────────────

export const createUserSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  role: UserRoleEnum,
});
export const updateUserSchema = createUserSchema
  .omit({ password: true })
  .partial();

// ─── Personal Details ─────────────────────────────────────────────────────────

export const createPersonalDetailSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().nullable().optional(),
  date_of_birth: adultDobString.optional(),
  gender: GenderEnum.optional(),
  marital_status: MaritalStatusEnum.optional(),
  citizenship_number: z.string().optional(),
  pan_number: z.string().optional(),
  nid_number: z.string().optional(),
  ssid_number: socialIdNumber, // ← validated
  ssf_number: socialIdNumber, // ← NEW
  father_name: z.string().optional(),
  mother_name: z.string().optional(),
  grandfather_name: z.string().optional(),
  current_address: z.string().optional(),
  permanent_address: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  municipality: MunicipalityTypeEnum.optional(),
  ward: z.number().int().positive().optional(),
  tole: z.string().optional(),
});
export const updatePersonalDetailSchema = createPersonalDetailSchema.partial();

// ─── Department ───────────────────────────────────────────────────────────────

export const createDepartmentSchema = z.object({
  department_name: z.string().min(1, "Department name is required"),
  joining_date: dateString,
  hierarchy: z.string().optional(),
  previous_experience: z.string().optional(),
  employment_type: z.string().optional(),
  employment_status: z.string().optional(),
  designation: z.string().optional(),
  level: z.string().optional(),
});
export const updateDepartmentSchema = createDepartmentSchema.partial().extend({
  id: uuidString.optional(),
});

// ─── Bank Details ─────────────────────────────────────────────────────────────

export const createBankDetailSchema = z.object({
  account_number: z.string().min(1, "Account number is required"),
  salary: decimalNumber,
  bank_name: z.string().min(1, "Bank name is required"),
  branch: z.string().min(1, "Branch is required"),
  contract_type: z.string().optional(),
});
export const updateBankDetailSchema = createBankDetailSchema.partial();

// ─── Employee — CREATE ────────────────────────────────────────────────────────

export const createEmployeeSchema = z.object({
  email: z.string().email("Invalid email"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  department_name: z.string().min(1, "Department is required"),
  joining_date: dateString,
  employee_id: z.string().optional(),
  manager_id: uuidString.optional(),
  notes: z.string().optional(),
  phone: z.string().nullable().optional(),
  date_of_birth: adultDobString.optional(),
  gender: GenderEnum.optional(),
  marital_status: MaritalStatusEnum.optional(),
  citizenship_number: z.string().optional(),
  pan_number: z.string().optional(),
  nid_number: z.string().optional(),
  ssid_number: socialIdNumber, // ← validated
  ssf_number: socialIdNumber, // ← NEW
  father_name: z.string().optional(),
  mother_name: z.string().optional(),
  grandfather_name: z.string().optional(),
  current_address: z.string().optional(),
  permanent_address: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  municipality: MunicipalityTypeEnum.optional(),
  ward: z.number().int().positive().optional(),
  tole: z.string().optional(),
  hierarchy: z.string().optional(),
  previous_experience: z.string().optional(),
  employment_type: z.string().optional(),
  employment_status: z.string().optional(),
  designation: z.string().optional(),
  level: z.string().optional(),
  salary: decimalNumber.optional(),
  account_number: z.string().optional(),
  bank_name: z.string().optional(),
  branch: z.string().optional(),
  contract_type: z.string().optional(),
});

// ─── Employee — UPDATE ────────────────────────────────────────────────────────

export const updateEmployeeSchema = z
  .object({
    profile_image: z.string().url("Invalid URL").optional(),
    notes: z.string().optional(),
    manager_id: uuidString.optional(),
    employee_verified: z.boolean().optional(),
    verification_pending: z.boolean().optional(),
    is_active: z.boolean().optional(),
    personal_details: updatePersonalDetailSchema.optional(),
    department: updateDepartmentSchema.optional(),
    bank_details: updateBankDetailSchema.optional(),
  })
  .strict();

export const createEmergencyContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  relation: z.string().min(1, "Relation is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email").optional(),
});
export const updateEmergencyContactSchema =
  createEmergencyContactSchema.partial();

export const createEmployeeDocumentSchema = z.object({
  name: z.string().min(1, "Document name is required"),
  type: z.string().min(1, "Document type is required"),
  status: z.string().default("Pending"),
  file_size: z.string().optional(),
  file_url: z.string().url("Invalid URL").optional(),
});
export const updateEmployeeDocumentSchema =
  createEmployeeDocumentSchema.partial();

export const createAttendanceSchema = z.object({
  employee_id: uuidString,
  date: dateString,
  check_in: z.string().optional(),
  check_out: z.string().optional(),
  status: AttendanceStatusEnum,
  notes: z.string().optional(),
});
export const updateAttendanceSchema = createAttendanceSchema
  .omit({ employee_id: true, date: true })
  .partial();

const createLeaveBaseSchema = z.object({
  employee_id: uuidString,
  start_date: dateString,
  end_date: dateString,
  leave_type_id: uuidString,
  days_count: z
    .number()
    .int()
    .positive("Days count must be a positive integer"),
  reason: z.string().optional(),
});
export const createLeaveSchema = createLeaveBaseSchema.refine(
  (data) => new Date(data.end_date) >= new Date(data.start_date),
  { message: "End date must be on or after start date", path: ["end_date"] },
);
export const updateLeaveSchema = z.object({
  status: LeaveStatusEnum.optional(),
  approval_notes: z.string().optional(),
  approved_by: uuidString.optional(),
});

const createHolidayBaseSchema = z.object({
  name: z.string().min(1, "Holiday name is required"),
  start_date: dateString,
  end_date: dateString,
  holiday_type: HolidayTypeEnum.optional(),
});
export const createHolidaySchema = createHolidayBaseSchema.refine(
  (data) => new Date(data.end_date) >= new Date(data.start_date),
  { message: "End date must be on or after start date", path: ["end_date"] },
);
export const updateHolidaySchema = createHolidayBaseSchema.partial();

export const createPayrollSchema = z.object({
  employee_id: uuidString,
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  base_salary: decimalNumber,
  bonus: z.number().min(0).multipleOf(0.01).default(0),
  deductions: z.number().min(0).multipleOf(0.01).default(0),
  net_salary: decimalNumber,
  status: PayrollStatusEnum.optional(),
  paid_date: dateString.optional(),
});
export const updatePayrollSchema = createPayrollSchema
  .omit({ employee_id: true, month: true, year: true })
  .partial();

export const createAssetSchema = z.object({
  asset_id: z.string().min(1, "Asset ID is required"),
  name: z.string().min(1, "Asset name is required"),
  category: z.string().min(1, "Category is required"),
  serial_number: z.string().optional(),
  purchase_cost: decimalNumber.optional(),
  purchase_date: dateString.optional(),
  status: AssetStatusEnum.optional(),
  assigned_to: uuidString.optional(),
  assigned_date: dateString.optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  return_date: dateString.optional(),
});
export const updateAssetSchema = createAssetSchema
  .omit({ asset_id: true })
  .partial();

export const createLeavePolicySchema = z.object({
  name: z.string().min(1, "Policy name is required"),
  type: z.string().min(1, "Type is required"),
  annual_quota: z.number().int().min(0),
  pro_rata: z.boolean().default(false),
  carry_forward: z.boolean().default(false),
  max_carry_forward: z.number().int().min(0).default(0),
  description: z.string().optional(),
  active: z.boolean().default(true),
});
export const updateLeavePolicySchema = createLeavePolicySchema.partial();

export const createReportSchema = z.object({
  name: z.string().min(1, "Report name is required"),
  type: ReportTypeEnum,
  from_date: dateString.optional(),
  to_date: dateString.optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
});

// ─── Types ────────────────────────────────────────────────────────────────────
export type CreateUserBody = z.infer<typeof createUserSchema>;
export type UpdateUserBody = z.infer<typeof updateUserSchema>;
export type CreatePersonalDetailBody = z.infer<
  typeof createPersonalDetailSchema
>;
export type UpdatePersonalDetailBody = z.infer<
  typeof updatePersonalDetailSchema
>;
export type CreateDepartmentBody = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentBody = z.infer<typeof updateDepartmentSchema>;
export type CreateBankDetailBody = z.infer<typeof createBankDetailSchema>;
export type UpdateBankDetailBody = z.infer<typeof updateBankDetailSchema>;
export type CreateEmployeeBody = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeBody = z.infer<typeof updateEmployeeSchema>;
export type CreateEmergencyContactBody = z.infer<
  typeof createEmergencyContactSchema
>;
export type UpdateEmergencyContactBody = z.infer<
  typeof updateEmergencyContactSchema
>;
export type CreateEmployeeDocumentBody = z.infer<
  typeof createEmployeeDocumentSchema
>;
export type UpdateEmployeeDocumentBody = z.infer<
  typeof updateEmployeeDocumentSchema
>;
export type CreateAttendanceBody = z.infer<typeof createAttendanceSchema>;
export type UpdateAttendanceBody = z.infer<typeof updateAttendanceSchema>;
export type CreateLeaveBody = z.infer<typeof createLeaveSchema>;
export type UpdateLeaveBody = z.infer<typeof updateLeaveSchema>;
export type CreatePayrollBody = z.infer<typeof createPayrollSchema>;
export type UpdatePayrollBody = z.infer<typeof updatePayrollSchema>;
export type CreateAssetBody = z.infer<typeof createAssetSchema>;
export type UpdateAssetBody = z.infer<typeof updateAssetSchema>;
export type CreateHolidayBody = z.infer<typeof createHolidaySchema>;
export type UpdateHolidayBody = z.infer<typeof updateHolidaySchema>;
export type CreateLeavePolicyBody = z.infer<typeof createLeavePolicySchema>;
export type UpdateLeavePolicyBody = z.infer<typeof updateLeavePolicySchema>;
export type CreateReportBody = z.infer<typeof createReportSchema>;
