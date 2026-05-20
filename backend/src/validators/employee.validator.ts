import { z } from "zod";
export const createEmployeeSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  department: z.string().min(1, "Department is required"),
  joining_date: z.string().min(1, "Joining date is required"),
  employee_id: z.string().min(1, "Employee ID is required"),
  position: z.string().min(1, "Position is required"),
  date_of_birth: z.string().min(1, "Date of birth is required"),
  employment_type: z.string().min(1, "Employment type is required"),
  phone: z
    .string()
    .min(1, "Phone is required")
    .regex(/^\d{10}$/, "Phone must be exactly 10 digits"),

  manager_id: z.string().optional(),
});
export const updateEmployeeSchema = z
  .object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().email().optional(),
    department: z.string().optional(),
    phone: z.string().optional(),

    current_address: z.string().optional(),
    permanent_address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    salary: z.preprocess(
      (val) => (val === "" || val === null ? undefined : Number(val)),
      z.number().min(0).optional(),
    ),

    citizenship_number: z.string().optional(),
    pan_number: z.string().optional(),
    nid_number: z.string().optional(),
    ssid_number: z.string().optional(),

    manager_id: z.string().optional(),

    date_of_birth: z.string().optional(),

    contract_type: z.string().optional(),

    employment_status: z
      .enum(["active", "notice_period", "resigned"])
      .optional(),

    level: z.string().optional(),
    hierarchy: z.string().optional(),
    previous_experience: z.string().optional(),

    marital_status: z
      .enum(["Single", "Married", "Divorced", "Widowed"])
      .optional(),
    gender: z.enum(["Male", "Female", "Others"]).optional(),

    position: z.string().optional(),
    account_number: z.string().optional(),
    bank_name: z.string().optional(),
    branch: z.string().optional(),
  })
  .partial();
