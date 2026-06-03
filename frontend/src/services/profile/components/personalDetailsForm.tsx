"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  updatePersonalDetailSchema,
  type UpdatePersonalDetailInput,
} from "@/validator/personal.detail.validator";
import { apiClient } from "@/services/apiClient";
import { useToast } from "@/hooks/use-toast";

interface PersonalDetailFormProps {
  employeeId: string;
}

// ── Reusable field wrapper ────────────────────────────────────────────────────
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block font-medium mb-1 text-sm text-gray-700">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-red-500 text-xs mt-1 flex items-start gap-1">
          <span className="mt-0.5">↑</span>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

const inputClass =
  "border p-2 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent";
const errorInputClass =
  "border-red-400 bg-red-50 p-2 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent";

// ── Main form ─────────────────────────────────────────────────────────────────
export default function PersonalDetailForm({
  employeeId,
}: PersonalDetailFormProps) {
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdatePersonalDetailInput>({
    resolver: zodResolver(updatePersonalDetailSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      date_of_birth: "",
      gender: undefined,
      marital_status: undefined,
      citizenship_number: "",
      pan_number: "",
      nid_number: "",
      ssf_ssid: "",   // ← correct field name from schema
      ssf_number: "",
      father_name: "",
      mother_name: "",
      grandfather_name: "",
      current_address: "",
      permanent_address: "",
      country: "",
      state: "",
      district: "",
      city: "",
      municipality: undefined,
      ward: undefined,
      tole: "",
    },
  });

  const onSubmit = async (data: UpdatePersonalDetailInput) => {
    try {
      // Strip empty / undefined values so HR sees only changed fields
      const requested_data = Object.fromEntries(
        Object.entries(data).filter(
          ([, v]) => v !== undefined && v !== "" && v !== null,
        ),
      );

      if (Object.keys(requested_data).length === 0) {
        toast({
          title: "Nothing to submit",
          description: "Please fill in at least one field before submitting.",
          variant: "destructive",
        });
        return;
      }

      // ✅ Creates a pending request for HR — does NOT update the profile directly
      await apiClient.createProfileUpdateRequest({
        section: "personal",
        requested_data,
      });

      toast({
        title: "Request submitted",
        description:
          "Your profile update has been sent to HR for approval. You'll be notified once it's reviewed.",
      });

      reset();
    } catch (error) {
      toast({
        title: "Submission failed",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred while submitting your request.",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">

      {/* ── Name ── */}
      <Field label="First Name" error={errors.first_name?.message}>
        <input
          type="text"
          {...register("first_name")}
          className={errors.first_name ? errorInputClass : inputClass}
          placeholder="e.g. Ram"
        />
      </Field>

      <Field label="Last Name" error={errors.last_name?.message}>
        <input
          type="text"
          {...register("last_name")}
          className={errors.last_name ? errorInputClass : inputClass}
          placeholder="e.g. Sharma"
        />
      </Field>

      {/* ── Contact ── */}
      <Field label="Email" error={errors.email?.message}>
        <input
          type="email"
          {...register("email")}
          className={errors.email ? errorInputClass : inputClass}
          placeholder="e.g. ram@example.com"
        />
      </Field>

      <Field label="Phone" error={errors.phone?.message}>
        <input
          type="tel"
          {...register("phone")}
          className={errors.phone ? errorInputClass : inputClass}
          placeholder="e.g. 9800000000"
        />
      </Field>

      {/* ── Personal ── */}
      <Field label="Date of Birth" error={errors.date_of_birth?.message}>
        <input
          type="date"
          {...register("date_of_birth")}
          className={errors.date_of_birth ? errorInputClass : inputClass}
        />
      </Field>

      <Field label="Gender" error={errors.gender?.message}>
        <select
          {...register("gender")}
          className={errors.gender ? errorInputClass : inputClass}
        >
          <option value="">Select gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Others">Others</option>
        </select>
      </Field>

      <Field label="Marital Status" error={errors.marital_status?.message}>
        <select
          {...register("marital_status")}
          className={errors.marital_status ? errorInputClass : inputClass}
        >
          <option value="">Select status</option>
          <option value="Single">Single</option>
          <option value="Married">Married</option>
          <option value="Divorced">Divorced</option>
          <option value="Widowed">Widowed</option>
        </select>
      </Field>

      {/* ── ID Numbers ── */}
      <Field label="Citizenship Number" error={errors.citizenship_number?.message}>
        <input
          type="text"
          {...register("citizenship_number")}
          className={errors.citizenship_number ? errorInputClass : inputClass}
          placeholder="e.g. 12-34-56789"
        />
      </Field>

      <Field label="PAN Number" error={errors.pan_number?.message}>
        <input
          type="text"
          {...register("pan_number")}
          className={errors.pan_number ? errorInputClass : inputClass}
          placeholder="e.g. 123456789"
        />
      </Field>

      <Field label="NID Number" error={errors.nid_number?.message}>
        <input
          type="text"
          {...register("nid_number")}
          className={errors.nid_number ? errorInputClass : inputClass}
          placeholder="National ID number"
        />
      </Field>

      {/* ssf_ssid — the active field in schema (ssid_number is commented out) */}
      <Field label="SSF/SSID Number" error={errors.ssf_ssid?.message}>
        <input
          type="text"
          inputMode="numeric"
          {...register("ssf_ssid")}
          className={errors.ssf_ssid ? errorInputClass : inputClass}
          placeholder="Digits only"
        />
      </Field>

      <Field label="SSF Number" error={errors.ssf_number?.message}>
        <input
          type="text"
          inputMode="numeric"
          {...register("ssf_number")}
          className={errors.ssf_number ? errorInputClass : inputClass}
          placeholder="Digits only, 5–20 characters"
        />
      </Field>

      {/* ── Family ── */}
      <Field label="Father's Name" error={errors.father_name?.message}>
        <input
          type="text"
          {...register("father_name")}
          className={errors.father_name ? errorInputClass : inputClass}
          placeholder="e.g. Robert Sharma"
        />
      </Field>

      <Field label="Mother's Name" error={errors.mother_name?.message}>
        <input
          type="text"
          {...register("mother_name")}
          className={errors.mother_name ? errorInputClass : inputClass}
          placeholder="e.g. Sita Sharma"
        />
      </Field>

      <Field label="Grandfather's Name" error={errors.grandfather_name?.message}>
        <input
          type="text"
          {...register("grandfather_name")}
          className={errors.grandfather_name ? errorInputClass : inputClass}
          placeholder="e.g. Hari Sharma"
        />
      </Field>

      {/* ── Address ── */}
      <Field label="Current Address" error={errors.current_address?.message}>
        <input
          type="text"
          {...register("current_address")}
          className={errors.current_address ? errorInputClass : inputClass}
          placeholder="e.g. Kathmandu, Nepal"
        />
      </Field>

      <Field label="Permanent Address" error={errors.permanent_address?.message}>
        <input
          type="text"
          {...register("permanent_address")}
          className={errors.permanent_address ? errorInputClass : inputClass}
          placeholder="e.g. Pokhara, Nepal"
        />
      </Field>

      <Field label="Country" error={errors.country?.message}>
        <input
          type="text"
          {...register("country")}
          className={errors.country ? errorInputClass : inputClass}
          placeholder="e.g. Nepal"
        />
      </Field>

      <Field label="State" error={errors.state?.message}>
        <input
          type="text"
          {...register("state")}
          className={errors.state ? errorInputClass : inputClass}
          placeholder="e.g. Bagmati"
        />
      </Field>

      <Field label="District" error={errors.district?.message}>
        <input
          type="text"
          {...register("district")}
          className={errors.district ? errorInputClass : inputClass}
          placeholder="e.g. Kathmandu"
        />
      </Field>

      <Field label="City" error={errors.city?.message}>
        <input
          type="text"
          {...register("city")}
          className={errors.city ? errorInputClass : inputClass}
          placeholder="e.g. Kathmandu"
        />
      </Field>

      <Field label="Municipality" error={errors.municipality?.message}>
        <select
          {...register("municipality")}
          className={errors.municipality ? errorInputClass : inputClass}
        >
          <option value="">Select municipality type</option>
          <option value="metropolitian">Metropolitian</option>
          <option value="sub_metropolitian">Sub-Metropolitian</option>
          <option value="municipality">Municipality</option>
          <option value="rural_municipality">Rural Municipality</option>
        </select>
      </Field>

      <Field label="Ward Number" error={errors.ward?.message}>
        <input
          type="number"
          {...register("ward")}
          className={errors.ward ? errorInputClass : inputClass}
          placeholder="e.g. 5"
        />
      </Field>

      <Field label="Tole" error={errors.tole?.message}>
        <input
          type="text"
          {...register("tole")}
          className={errors.tole ? errorInputClass : inputClass}
          placeholder="e.g. Lazimpat"
        />
      </Field>

      {/* Pending state notice */}
      <p className="text-xs text-muted-foreground">
        Changes require HR approval before they take effect.
      </p>

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400 mt-2 transition-colors hover:bg-blue-700 w-full"
      >
        {isSubmitting ? "Submitting request..." : "Request Changes"}
      </button>
    </form>
  );
}