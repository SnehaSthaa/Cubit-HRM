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
  salary: z.number().optional(),
  manager_id: z.string().optional(),
});
export const updateEmployeeSchema = z
  .object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().email().optional(),
    department: z.string().optional(),
    phone: z.string().optional(),
  })
  .partial();
