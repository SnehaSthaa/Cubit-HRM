import { z } from "zod";
export const createLeaveSchema = z
  .object({
    employee_id: z.string().min(1, "Employee ID is required"),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().min(1, "End date is Required"),
    leave_type_id: z.string().min(1, "Leave type is required"),
    reason: z.string().min(1, "Reason is required"),
  })
  .refine(
    (data) => {
      return new Date(data.end_date) >= new Date(data.start_date);
    },
    {
      message: "End date cannot be before start date",
      path: ["end_date"],
    },
  );
export const updateLeaveSchema = z
  .object({
    leave_type_id: z.string().optional,
    start_date: z.string().optional,
    end_date: z.string().optional,
    reason: z.string().optional,
  })
  .partial();
