import { z } from "zod";

export const dateString = z
  .string()
  .refine((val) => !isNaN(new Date(val).getTime()), {
    message: "Invalid date format",
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const dateRangeRefinement = (data: any, ctx: z.RefinementCtx) => {
  if (new Date(data.start_date) > new Date(data.end_date)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "End date must be after or equal to the start date",
      path: ["end_date"],
    });
  }
};

export const createLeaveSchema = z
  .object({
    start_date: dateString,
    end_date: dateString,
    leave_type_id: z.string().uuid("Invalid leave type"),
    reason: z.string().optional(),
  })
  .superRefine(dateRangeRefinement);

export type CreateLeaveInput = z.infer<typeof createLeaveSchema>;
