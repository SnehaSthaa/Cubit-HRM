import { z } from "zod";

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
  // ── Name fields ──────────────────────────────────────────────────────────
  first_name: z
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name must be at most 50 characters")
    .regex(
      /^[a-zA-Z\s'-]+$/,
      "First name can only contain letters, spaces, hyphens, or apostrophes",
    )
    .optional(),

  last_name: z
    .string()
    .trim()
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name must be at most 50 characters")
    .regex(
      /^[a-zA-Z\s'-]+$/,
      "Last name can only contain letters, spaces, hyphens, or apostrophes",
    )
    .optional(),

  // ── Email ─────────────────────────────────────────────────────────────────
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address (e.g. name@example.com)")
    .max(100, "Email must be at most 100 characters")
    .optional(),

  // ── Phone ─────────────────────────────────────────────────────────────────
  phone: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.string().optional(),
  ),

  // ── Date of birth ─────────────────────────────────────────────────────────
  date_of_birth: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z
      .string()
      .refine((val) => !val || !isNaN(new Date(val).getTime()), {
        message: "Please enter a valid date",
      })
      .optional(),
  ),

  // ── Enums ─────────────────────────────────────────────────────────────────
  gender: fuzzyEnum(["Male", "Female", "Others"]).optional(),
  marital_status: fuzzyEnum([
    "Single",
    "Married",
    "Divorced",
    "Widowed",
  ]).optional(),

  // ── ID numbers ────────────────────────────────────────────────────────────
  citizenship_number: z.string().optional(),
  pan_number: z.string().optional(),
  nid_number: z.string().optional(),

  ssid_number: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z
      .string()
      .regex(/^\d+$/, "SSID number must contain only digits")
      .min(5, "SSID number must be at least 5 digits")
      .max(20, "SSID number must be at most 20 digits")
      .optional(),
  ),

  ssf_number: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z
      .string()
      .regex(/^\d+$/, "SSF number must contain only digits")
      .min(5, "SSF number must be at least 5 digits")
      .max(20, "SSF number must be at most 20 digits")
      .optional(),
  ),

  // ── Family ────────────────────────────────────────────────────────────────
  father_name: z.string().optional(),
  mother_name: z.string().optional(),
  grandfather_name: z.string().optional(),
  spouse_name: z.string().optional(),

  // ── Address ───────────────────────────────────────────────────────────────
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

export type UpdatePersonalDetailInput = z.infer<
  typeof updatePersonalDetailSchema
>;
