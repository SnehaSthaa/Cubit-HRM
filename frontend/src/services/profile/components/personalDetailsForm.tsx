"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  updatePersonalDetailSchema,
  type UpdatePersonalDetailInput,
} from "@/validator/personal.detail.validator";
import { employeeService } from "@/services/api";

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
          {/* Arrow points at the field above */}
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
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdatePersonalDetailInput>({
    resolver: zodResolver(updatePersonalDetailSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      ssid_number: "",
      ssf_number: "",
      ward: undefined,
    },
  });

  const onSubmit = async (data: UpdatePersonalDetailInput) => {
    try {
      const updatedEmployee = await employeeService.update(employeeId, data);
      console.log("Updated:", updatedEmployee);
      alert("Personal details saved successfully!");
    } catch (error) {
      console.error("Failed to update details:", error);
      alert("An error occurred while saving information.");
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

      {/* ── Email ── */}
      <Field label="Email" error={errors.email?.message}>
        <input
          type="email"
          {...register("email")}
          className={errors.email ? errorInputClass : inputClass}
          placeholder="e.g. ram@example.com"
        />
      </Field>

      {/* ── SSF & SSID ── */}
      <Field label="SSF Number" error={errors.ssf_number?.message}>
        <input
          type="text"
          inputMode="numeric"
          {...register("ssf_number")}
          className={errors.ssf_number ? errorInputClass : inputClass}
          placeholder="Digits only, 5–20 characters"
        />
      </Field>

      <Field label="SSID Number" error={errors.ssid_number?.message}>
        <input
          type="text"
          inputMode="numeric"
          {...register("ssid_number")}
          className={errors.ssid_number ? errorInputClass : inputClass}
          placeholder="Digits only, 5–20 characters"
        />
      </Field>

      {/* ── Ward ── */}
      <Field label="Ward Number" error={errors.ward?.message}>
        <input
          type="number"
          {...register("ward")}
          className={errors.ward ? errorInputClass : inputClass}
          placeholder="e.g. 5"
        />
      </Field>

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400 mt-2 transition-colors hover:bg-blue-700 w-full"
      >
        {isSubmitting ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}