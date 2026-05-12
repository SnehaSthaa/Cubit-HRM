import { z } from "zod";

// Helper to handle casing and empty values
const fuzzyEnum = (options: string[]) =>
  z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      if (typeof val === "string") {
        const normalized = val.trim().toLowerCase();
        const match = options.find((opt) => opt.toLowerCase() === normalized);
        return match || val;
      }
      return val;
    },
    z.enum(options as [string, ...string[]]),
  );

export const updatePersonalDetailSchema = z.object({
  first_name: z.string().trim().min(1).optional(),
  last_name: z.string().trim().min(1).optional(),
  email: z.string().email().optional(),
  // Transform null/empty string to undefined to satisfy Prisma Update types
  phone: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.string().optional(),
  ),
  date_of_birth: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z
      .string()
      .refine((val) => !val || !isNaN(new Date(val).getTime()))
      .optional(),
  ),
  gender: fuzzyEnum(["Male", "Female", "Others"]).optional(),
  marital_status: fuzzyEnum([
    "Single",
    "Married",
    "Divorced",
    "Widowed",
  ]).optional(),
  citizenship_number: z.string().optional(),
  pan_number: z.string().optional(),
  nid_number: z.string().optional(),
  ssid_number: z.string().optional(),
  father_name: z.string().optional(),
  mother_name: z.string().optional(),
  grandfather_name: z.string().optional(),
  current_address: z.string().optional(),
  permanent_address: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  municipality: z
    .enum([
      "metropolitian",
      "sub_metropolitian",
      "municipality",
      "rural_municipality",
    ])
    .optional(),
  ward: z.preprocess(
    (val) => (val === "" || val === null ? undefined : Number(val)),
    z.number().int().optional(),
  ),
  tole: z.string().optional(),
});
