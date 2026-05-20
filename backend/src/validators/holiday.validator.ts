import { z } from "zod";
export const createHolidaySchema = z
  .object({
    name: z.string().min(1, "Holiday Name is required"),
    start_date: z.string().min(1, "Start Date is required"),
    end_date: z.string().min(1, "End Date is required"),
    holiday_type: z.string().min(1, "Holiday's Type is Required"),
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
export const updateHolidaySchema = z.object({
  name: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  holiday_type: z.string().optional(),
});
