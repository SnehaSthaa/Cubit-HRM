import { z } from "zod";
import { dateString, dateRangeRefinement } from "./common.validator";

export const createLeaveSchema = z
  .object({
    start_date: dateString,
    end_date: dateString,
    leave_type_id: z.string().uuid("Invalid leave type"),
    reason: z.string().optional(),
  })
  .superRefine(dateRangeRefinement);
