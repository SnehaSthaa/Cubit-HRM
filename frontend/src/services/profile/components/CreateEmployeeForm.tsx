import React, { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  createEmployeeSchema,
  GenderEnum,
  MaritalStatusEnum,
  MunicipalityTypeEnum,
} from "@/validator/employee.validator";

// ─── Frontend schema — extends the shared backend contract ────────────────────
const frontendSchema = createEmployeeSchema.extend({

  // ── Required fields ────────────────────────────────────────────────────────
  first_name: z
    .string()
    .min(1, "First name is required")
    .max(50, "Max 50 characters"),

  last_name: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Max 50 characters"),

  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),

  department_name: z
    .string()
    .min(1, "Department is required"),

  joining_date: z
    .string()
    .min(1, "Joining date is required")
    .refine((val) => !isNaN(new Date(val).getTime()), "Invalid date"),

  // ── Phone ──────────────────────────────────────────────────────────────────
  phone: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val === "" ? undefined : val))
    .refine(
      (val) => val == null || /^\+?[\d\s\-().]{7,15}$/.test(val),
      "Enter a valid phone number (7–15 digits)"
    ),

  // ── Enum fields ────────────────────────────────────────────────────────────
  gender: z
    .string()
    .optional()
    .refine(
      (val) => !val || GenderEnum.options.includes(val as never),
      "Please select a gender"
    )
    .transform((val) => (val === "" ? undefined : val)),

  marital_status: z
    .string()
    .optional()
    .refine(
      (val) => !val || MaritalStatusEnum.options.includes(val as never),
      "Please select a marital status"
    )
    .transform((val) => (val === "" ? undefined : val)),

  municipality: z
    .string()
    .optional()
    .refine(
      (val) => !val || MunicipalityTypeEnum.options.includes(val as never),
      "Please select a municipality type"
    )
    .transform((val) => (val === "" ? undefined : val)),

  // ── Number fields ──────────────────────────────────────────────────────────
  ward: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const n = Number(val);
      return isNaN(n) ? undefined : n;
    },
    z
      .number()
      .int("Ward must be a whole number")
      .positive("Ward must be a positive number")
      .optional()
  ),

  salary: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const n = Number(val);
      return isNaN(n) ? undefined : n;
    },
    z
      .number()
      .positive("Salary must be greater than 0")
      .multipleOf(0.01, "Max 2 decimal places")
      .optional()
  ),

  // ── SSF & SSID — preprocess empty string → undefined, then validate ────────
  ssf_number: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z
      .string()
      .regex(/^\d+$/, "SSF number must contain digits only")
      .min(5, "SSF number must be at least 5 digits")
      .max(20, "SSF number must be at most 20 digits")
      .optional()
  ),

  ssid_number: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z
      .string()
      .regex(/^\d+$/, "SSID number must contain digits only")
      .min(5, "SSID number must be at least 5 digits")
      .max(20, "SSID number must be at most 20 digits")
      .optional()
  ),

  // ── Account number ─────────────────────────────────────────────────────────
  account_number: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{8,20}$/.test(val),
      "Account number must be 8–20 digits"
    ),

  // ── Date of birth ──────────────────────────────────────────────────────────
  date_of_birth: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const dob = new Date(val);
      if (isNaN(dob.getTime())) return false;
      const today = new Date();
      const cutoff = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
      return dob <= cutoff;
    }, "Employee must be at least 18 years old"),
});

type FormValues = z.infer<typeof frontendSchema>;

// ─── Steps config ─────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Account Details" },
  { id: 2, label: "Personal Details" },
  { id: 3, label: "Department" },
  { id: 4, label: "Financial" },
] as const;

const STEP_FIELDS: Record<number, (keyof FormValues)[]> = {
  1: ["first_name", "last_name", "email", "department_name", "joining_date"],
  2: [
    "phone", "date_of_birth", "gender", "marital_status",
    "citizenship_number", "pan_number", "nid_number",
    "ssid_number", "ssf_number",                          // ← ssf_number added
    "father_name", "mother_name", "grandfather_name",
    "current_address", "permanent_address",
    "country", "state", "district", "city", "municipality", "ward", "tole",
  ],
  3: ["designation", "level", "employment_type", "employment_status", "hierarchy", "previous_experience"],
  4: ["salary", "account_number", "bank_name", "branch", "contract_type"],
};

// ─── UI helpers ───────────────────────────────────────────────────────────────

function FieldError({ message, id }: { message?: string; id: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="flex items-center gap-1 text-red-500 text-xs mt-1">
      <svg className="w-3 h-3 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 4a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0V5zm.75 7a1 1 0 110-2 1 1 0 010 2z"/>
      </svg>
      {message}
    </p>
  );
}

function Field({
  label, required, error, errorId, children, col2,
}: {
  label: string; required?: boolean; error?: string;
  errorId: string; children: React.ReactNode; col2?: boolean;
}) {
  return (
    <div className={col2 ? "md:col-span-2" : ""}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5" aria-hidden>*</span>}
      </label>
      {children}
      <FieldError message={error} id={errorId} />
    </div>
  );
}

const iCls = (err?: string) =>
  `w-full border rounded px-3 py-2 text-sm outline-none transition-colors
   focus:ring-2 focus:border-transparent
   ${err
     ? "border-red-400 bg-red-50 focus:ring-red-400"
     : "border-gray-300 focus:ring-blue-500"
   }`;

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest
                   border-b border-gray-200 pb-1.5 mt-1">
      {children}
    </h3>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CreateEmployeeForm() {
  const [step, setStep] = useState(1);
  const [attempted, setAttempted] = useState<Set<number>>(new Set());
  const formRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    trigger,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(frontendSchema),
    mode: "onTouched",
    defaultValues: {
      email: "", first_name: "", last_name: "",
      department_name: "", joining_date: "",
      phone: "",
      citizenship_number: "", pan_number: "",
      nid_number: "",
      ssid_number: "",   // ← existing
      ssf_number: "",    // ← NEW
      father_name: "", mother_name: "", grandfather_name: "",
      current_address: "", permanent_address: "",
      country: "", state: "", district: "", city: "", tole: "",
      hierarchy: "", previous_experience: "",
      employment_type: "", employment_status: "",
      designation: "", level: "",
      account_number: "", bank_name: "", branch: "", contract_type: "",
    },
  });

  const focusFirstError = useCallback(
    (currentStep: number) => {
      const firstErrorField = STEP_FIELDS[currentStep].find((f) => errors[f]);
      if (firstErrorField) setFocus(firstErrorField, { shouldSelect: true });
    },
    [errors, setFocus]
  );

  const handleNext = async () => {
    setAttempted((prev) => new Set(prev).add(step));
    const valid = await trigger(STEP_FIELDS[step]);
    if (!valid) {
      setTimeout(() => focusFirstError(step), 50);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const onSubmit = async (data: FormValues) => {
    try {
      console.log("Submitting:", data);
      // await apiClient.createEmployee(data);
      alert("Employee created successfully!");
    } catch (err) {
      console.error(err);
    }
  };

  const errorsByStep = Object.keys(errors).reduce<Record<number, number>>((acc, key) => {
    for (const [s, fields] of Object.entries(STEP_FIELDS)) {
      if (fields.includes(key as keyof FormValues)) {
        acc[Number(s)] = (acc[Number(s)] ?? 0) + 1;
      }
    }
    return acc;
  }, {});

  return (
    <div ref={formRef} className="max-w-4xl mx-auto my-8 p-6 bg-white rounded-xl shadow-md border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Onboard New Employee</h2>
      <p className="text-sm text-gray-500 mb-6">
        Fields marked <span className="text-red-500 font-medium">*</span> are required.
      </p>

      {/* ── Step indicator ── */}
      <div className="flex items-center mb-8" role="list" aria-label="Form steps">
        {STEPS.map((s, idx) => {
          const isActive  = step === s.id;
          const isDone    = step > s.id;
          const hasErrors = attempted.has(s.id) && (errorsByStep[s.id] ?? 0) > 0 && !isActive;
          return (
            <React.Fragment key={s.id}>
              <div className="flex flex-col items-center" role="listitem">
                <div className={`
                  w-9 h-9 rounded-full flex items-center justify-center
                  font-semibold text-sm transition-all duration-200
                  ${hasErrors ? "bg-red-500 text-white ring-2 ring-red-200"
                    : isActive ? "bg-blue-600 text-white ring-4 ring-blue-100"
                    : isDone   ? "bg-green-500 text-white"
                    :            "bg-gray-100 text-gray-500"}
                `}
                  aria-current={isActive ? "step" : undefined}
                >
                  {hasErrors ? "!" : isDone ? "✓" : s.id}
                </div>
                <span className={`text-xs font-medium mt-1.5 hidden sm:block whitespace-nowrap ${
                  isActive ? "text-blue-600" : "text-gray-400"
                }`}>
                  {s.label}
                  {hasErrors && (
                    <span className="ml-1 text-red-500">({errorsByStep[s.id]})</span>
                  )}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mb-5 transition-colors ${
                  step > s.id ? "bg-green-400" : "bg-gray-200"
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">

        {/* ══ STEP 1: Account & Core ══════════════════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-4">
            <SectionHead>Core Information</SectionHead>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <Field label="First Name" required
                error={errors.first_name?.message} errorId="err-first_name">
                <input id="first_name" type="text" {...register("first_name")}
                  placeholder="e.g. Aarav" autoComplete="given-name"
                  aria-describedby={errors.first_name ? "err-first_name" : undefined}
                  aria-invalid={!!errors.first_name}
                  className={iCls(errors.first_name?.message)} />
              </Field>

              <Field label="Last Name" required
                error={errors.last_name?.message} errorId="err-last_name">
                <input id="last_name" type="text" {...register("last_name")}
                  placeholder="e.g. Sharma" autoComplete="family-name"
                  aria-describedby={errors.last_name ? "err-last_name" : undefined}
                  aria-invalid={!!errors.last_name}
                  className={iCls(errors.last_name?.message)} />
              </Field>

              <Field label="Email Address" required
                error={errors.email?.message} errorId="err-email">
                <input id="email" type="email" {...register("email")}
                  placeholder="aarav.sharma@company.com" autoComplete="email"
                  aria-describedby={errors.email ? "err-email" : undefined}
                  aria-invalid={!!errors.email}
                  className={iCls(errors.email?.message)} />
              </Field>

              <Field label="Department" required
                error={errors.department_name?.message} errorId="err-department_name">
                <input id="department_name" type="text" {...register("department_name")}
                  placeholder="e.g. Engineering"
                  aria-describedby={errors.department_name ? "err-department_name" : undefined}
                  aria-invalid={!!errors.department_name}
                  className={iCls(errors.department_name?.message)} />
              </Field>

              <Field label="Date of Joining" required
                error={errors.joining_date?.message} errorId="err-joining_date">
                <input id="joining_date" type="date" {...register("joining_date")}
                  aria-describedby={errors.joining_date ? "err-joining_date" : undefined}
                  aria-invalid={!!errors.joining_date}
                  className={iCls(errors.joining_date?.message)} />
              </Field>

            </div>
          </div>
        )}

        {/* ══ STEP 2: Personal Details ════════════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-5">
            <SectionHead>Demographics</SectionHead>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <Field label="Phone Number"
                error={errors.phone?.message} errorId="err-phone">
                <input id="phone" type="tel" {...register("phone")}
                  placeholder="+977 9800000000" autoComplete="tel"
                  aria-describedby={errors.phone ? "err-phone" : undefined}
                  aria-invalid={!!errors.phone}
                  className={iCls(errors.phone?.message)} />
              </Field>

              <Field label="Date of Birth"
                error={errors.date_of_birth?.message} errorId="err-date_of_birth">
                <input id="date_of_birth" type="date" {...register("date_of_birth")}
                  max={(() => {
                    const d = new Date();
                    d.setFullYear(d.getFullYear() - 18);
                    return d.toISOString().split("T")[0];
                  })()}
                  aria-describedby={errors.date_of_birth ? "err-date_of_birth" : undefined}
                  aria-invalid={!!errors.date_of_birth}
                  className={iCls(errors.date_of_birth?.message)} />
              </Field>

              <Field label="Gender"
                error={errors.gender?.message} errorId="err-gender">
                <select id="gender" {...register("gender")}
                  aria-describedby={errors.gender ? "err-gender" : undefined}
                  aria-invalid={!!errors.gender}
                  className={iCls(errors.gender?.message)}>
                  <option value="">Select gender</option>
                  {GenderEnum.options.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </Field>

              <Field label="Marital Status"
                error={errors.marital_status?.message} errorId="err-marital_status">
                <select id="marital_status" {...register("marital_status")}
                  aria-describedby={errors.marital_status ? "err-marital_status" : undefined}
                  aria-invalid={!!errors.marital_status}
                  className={iCls(errors.marital_status?.message)}>
                  <option value="">Select status</option>
                  {MaritalStatusEnum.options.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </Field>

            </div>

            <SectionHead>Identification Numbers</SectionHead>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(
                [
                  { key: "citizenship_number", label: "Citizenship Number", placeholder: "e.g. 12-34-56-78901", inputMode: undefined },
                  { key: "pan_number",          label: "PAN Number",         placeholder: "e.g. 123456789",      inputMode: undefined },
                  { key: "nid_number",          label: "NID Number",         placeholder: "National ID number",  inputMode: undefined },
                  { key: "ssid_number",         label: "SSID Number",        placeholder: "Digits only, 5–20",   inputMode: "numeric" as const },
                  { key: "ssf_number",          label: "SSF Number",         placeholder: "Digits only, 5–20",   inputMode: "numeric" as const },
                ] as const
              ).map(({ key, label, placeholder, inputMode }) => (
                <Field key={key} label={label}
                  error={errors[key]?.message} errorId={`err-${key}`}>
                  <input
                    id={key}
                    type="text"
                    inputMode={inputMode}
                    {...register(key)}
                    placeholder={placeholder}
                    aria-describedby={errors[key] ? `err-${key}` : undefined}
                    aria-invalid={!!errors[key]}
                    className={iCls(errors[key]?.message)}
                  />
                </Field>
              ))}
            </div>

            <SectionHead>Family Details</SectionHead>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(
                [
                  { key: "father_name",      label: "Father's Name" },
                  { key: "mother_name",      label: "Mother's Name" },
                  { key: "grandfather_name", label: "Grandfather's Name" },
                ] as const
              ).map(({ key, label }) => (
                <Field key={key} label={label}
                  error={errors[key]?.message} errorId={`err-${key}`}>
                  <input id={key} type="text" {...register(key)} placeholder={label}
                    aria-describedby={errors[key] ? `err-${key}` : undefined}
                    aria-invalid={!!errors[key]}
                    className={iCls(errors[key]?.message)} />
                </Field>
              ))}
            </div>

            <SectionHead>Address</SectionHead>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Current Address"
                error={errors.current_address?.message} errorId="err-current_address">
                <input id="current_address" type="text" {...register("current_address")}
                  placeholder="Where you currently live"
                  className={iCls(errors.current_address?.message)} />
              </Field>
              <Field label="Permanent Address"
                error={errors.permanent_address?.message} errorId="err-permanent_address">
                <input id="permanent_address" type="text" {...register("permanent_address")}
                  placeholder="Permanent/home address"
                  className={iCls(errors.permanent_address?.message)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(["country", "state", "district", "city", "tole"] as const).map((key) => (
                <Field key={key} label={key.charAt(0).toUpperCase() + key.slice(1)}
                  error={errors[key]?.message} errorId={`err-${key}`}>
                  <input id={key} type="text" {...register(key)}
                    className={iCls(errors[key]?.message)} />
                </Field>
              ))}

              <Field label="Municipality Type"
                error={errors.municipality?.message} errorId="err-municipality">
                <select id="municipality" {...register("municipality")}
                  aria-invalid={!!errors.municipality}
                  className={iCls(errors.municipality?.message)}>
                  <option value="">Select type</option>
                  {MunicipalityTypeEnum.options.map((o) => (
                    <option key={o} value={o}>{o.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </Field>

              <Field label="Ward Number"
                error={errors.ward?.message} errorId="err-ward">
                <input id="ward" type="number" min={1}
                  {...register("ward", { valueAsNumber: true })}
                  placeholder="e.g. 4"
                  aria-describedby={errors.ward ? "err-ward" : undefined}
                  aria-invalid={!!errors.ward}
                  className={iCls(errors.ward?.message)} />
              </Field>
            </div>
          </div>
        )}

        {/* ══ STEP 3: Department & Role ════════════════════════════════════════ */}
        {step === 3 && (
          <div className="space-y-4">
            <SectionHead>Role & Employment</SectionHead>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(
                [
                  { key: "designation",       label: "Designation",      placeholder: "e.g. Software Engineer" },
                  { key: "level",             label: "Grade Level",       placeholder: "e.g. L3, Senior" },
                  { key: "employment_type",   label: "Employment Type",   placeholder: "e.g. Full-time, Contract" },
                  { key: "employment_status", label: "Employment Status", placeholder: "e.g. Active, Probation" },
                  { key: "hierarchy",         label: "Hierarchy Line",    placeholder: "e.g. CTO → VP Eng → Manager" },
                ] as const
              ).map(({ key, label, placeholder }) => (
                <Field key={key} label={label}
                  error={errors[key]?.message} errorId={`err-${key}`}>
                  <input id={key} type="text" {...register(key)} placeholder={placeholder}
                    aria-invalid={!!errors[key]}
                    className={iCls(errors[key]?.message)} />
                </Field>
              ))}

              <Field label="Previous Experience"
                error={errors.previous_experience?.message}
                errorId="err-previous_experience" col2>
                <textarea id="previous_experience" rows={3}
                  {...register("previous_experience")}
                  placeholder="Brief summary of prior roles…"
                  aria-invalid={!!errors.previous_experience}
                  className={iCls(errors.previous_experience?.message) + " resize-none"} />
              </Field>
            </div>
          </div>
        )}

        {/* ══ STEP 4: Financial Details ════════════════════════════════════════ */}
        {step === 4 && (
          <div className="space-y-4">
            <SectionHead>Salary & Banking</SectionHead>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <Field label="Base Salary (NPR)"
                error={errors.salary?.message} errorId="err-salary">
                <input id="salary" type="number" step="0.01" min="0"
                  {...register("salary", { valueAsNumber: true })}
                  placeholder="e.g. 75000.00"
                  aria-describedby={errors.salary ? "err-salary" : undefined}
                  aria-invalid={!!errors.salary}
                  className={iCls(errors.salary?.message)} />
              </Field>

              <Field label="Bank Name"
                error={errors.bank_name?.message} errorId="err-bank_name">
                <input id="bank_name" type="text" {...register("bank_name")}
                  placeholder="e.g. Nepal Investment Bank"
                  aria-invalid={!!errors.bank_name}
                  className={iCls(errors.bank_name?.message)} />
              </Field>

              <Field label="Account Number"
                error={errors.account_number?.message} errorId="err-account_number">
                <input id="account_number" type="text" {...register("account_number")}
                  placeholder="8–20 digit account number"
                  aria-describedby={errors.account_number ? "err-account_number" : undefined}
                  aria-invalid={!!errors.account_number}
                  className={iCls(errors.account_number?.message)} />
              </Field>

              <Field label="Branch Location"
                error={errors.branch?.message} errorId="err-branch">
                <input id="branch" type="text" {...register("branch")}
                  placeholder="e.g. New Road, Kathmandu"
                  aria-invalid={!!errors.branch}
                  className={iCls(errors.branch?.message)} />
              </Field>

              <Field label="Contract Type"
                error={errors.contract_type?.message} errorId="err-contract_type">
                <input id="contract_type" type="text" {...register("contract_type")}
                  placeholder="e.g. Permanent, Fixed-term"
                  aria-invalid={!!errors.contract_type}
                  className={iCls(errors.contract_type?.message)} />
              </Field>

            </div>
          </div>
        )}

        {/* ── Navigation ─────────────────────────────────────────────────────── */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <button type="button" onClick={handleBack} disabled={step === 1}
            className="px-5 py-2 border border-gray-300 rounded-lg text-sm text-gray-600
                       hover:bg-gray-50 transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed">
            ← Back
          </button>

          <span className="text-xs text-gray-400">Step {step} of {STEPS.length}</span>

          {step < STEPS.length ? (
            <button type="button" onClick={handleNext}
              className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg
                         hover:bg-blue-700 transition-colors font-medium">
              Continue →
            </button>
          ) : (
            <button type="submit" disabled={isSubmitting}
              className="px-6 py-2 bg-green-600 text-white text-sm rounded-lg
                         hover:bg-green-700 transition-colors font-medium
                         disabled:bg-gray-400 disabled:cursor-not-allowed">
              {isSubmitting ? "Creating…" : "Create Employee →"}
            </button>
          )}
        </div>

      </form>
    </div>
  );
}