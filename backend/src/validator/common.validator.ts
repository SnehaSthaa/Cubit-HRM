import { z } from "zod";

// Any valid date string → converts to Date object
export const dateString = z
  .string({ error: "Date is required" })
  .refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format. Use YYYY-MM-DD",
  })
  .transform((val) => new Date(val));

// Optional date string
export const optionalDateString = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format. Use YYYY-MM-DD",
  })
  .transform((val) => new Date(val))
  .optional()
  .nullable();

// Must be in the past (for date_of_birth)
export const pastDateString = z
  .string({ error: "Date is required" })
  .refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format. Use YYYY-MM-DD",
  })
  .refine((val) => new Date(val) < new Date(), {
    message: "Date must be in the past",
  })
  .transform((val) => new Date(val));

// Optional past date
export const optionalPastDateString = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format. Use YYYY-MM-DD",
  })
  .refine((val) => new Date(val) < new Date(), {
    message: "Date must be in the past",
  })
  .transform((val) => new Date(val))
  .optional()
  .nullable();

// Must be today or in the future
export const futureDateString = z
  .string({ error: "Date is required" })
  .refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format. Use YYYY-MM-DD",
  })
  .refine((val) => new Date(val) >= new Date(new Date().toDateString()), {
    message: "Date must be today or in the future",
  })
  .transform((val) => new Date(val));

// Date range validator — use with .superRefine() at schema level
export const dateRangeRefinement = (
  data: { start_date: Date; end_date: Date },
  ctx: z.RefinementCtx,
) => {
  if (data.end_date < data.start_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "end_date must be after start_date",
      path: ["end_date"],
    });
  }
};
