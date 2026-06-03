import { z } from "zod";
export const employeeSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  department: z.string().min(1, "Department is required"),
  joining_date: z.string().min(1, "Joining date is required"),
  employee_id: z.string().min(1, "Employee_id is required"),
  phone: z
    .string()
    .min(1, "Phone is required")
    .regex(/^\d{10}$/, "Phone must be 10 digits"),
  position: z.string(),
  gender: z.enum(["Male", "Female", "Others"]).optional(),
  marital_status: z
    .enum(["Single", "Married", "Divorced", "Widowed"])
    .optional(),
  employment_type: z.enum(["Full-time", "Part-time", "Contract-type"]),
  date_of_birth: z.string(),
  salary: z.number().min(0, "Salary must be positive").optional(),
  contract_type: z.string().optional(),
  employment_status: z.enum(["active", "notice_period", "resigned"]).optional(),
  level: z.string().optional(),
  hierarchy: z.string().optional(),
  previous_experience: z.string().optional(),

  // Address
  current_address: z.string().optional(),
  permanent_address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),

  // Family
  father_name: z.string().optional(),
  grandfather_name: z.string().optional(),
  mother_name: z.string().optional(),
  spouse_name: z.string().optional(),

  // Identity
  citizenship_number: z.string().optional(),
  pan_number: z.string().optional(),
  nid_number: z.string().optional(),
  ssid_number: z.string().optional(),
  account_number: z.string().optional(),
  bank_name: z.string().optional(),
  branch: z.string().optional(),

  // Manager
  manager_id: z.string().optional(),
});
export type EmployeeFormData = z.infer<typeof employeeSchema>;
