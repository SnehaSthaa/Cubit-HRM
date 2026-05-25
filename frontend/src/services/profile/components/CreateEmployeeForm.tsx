import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createEmployeeSchema,
  type CreateEmployeeBody,
  GenderEnum,
  MaritalStatusEnum,
  MunicipalityTypeEnum
} from "@/validator/employee.validator";


const STEPS = [
  { id: 1, name: "Account Details" },
  { id: 2, name: "Personal Details" },
  { id: 3, name: "Department Details" },
  { id: 4, name: "Financial Details" },
];

export default function CreateEmployeeForm() {
  const [currentStep, setCurrentStep] = useState(1);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<CreateEmployeeBody>({
    resolver: zodResolver(createEmployeeSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      first_name: "",
      last_name: "",
      department_name: "",
      joining_date: "",
      phone: "",
      citizenship_number: "",
      pan_number: "",
      nid_number: "",
      ssid_number: "",
      father_name: "",
      mother_name: "",
      grandfather_name: "",
      current_address: "",
      permanent_address: "",
      country: "",
      state: "",
      district: "",
      city: "",
      tole: "",
      hierarchy: "",
      previous_experience: "",
      employment_type: "",
      employment_status: "",
      designation: "",
      level: "",
      account_number: "",
      bank_name: "",
      branch: "",
      contract_type: "",
    }
  });

  // Step fields validation map to prevent moving forward with invalid data
  const stepFields: Record<number, (keyof CreateEmployeeBody)[]> = {
    1: ["email", "first_name", "last_name", "department_name", "joining_date"],
    2: [
      "phone", "date_of_birth", "gender", "marital_status", "citizenship_number", 
      "pan_number", "nid_number", "ssid_number", "father_name", "mother_name", 
      "grandfather_name", "current_address", "permanent_address", "country", 
      "state", "district", "city", "municipality", "ward", "tole"
    ],
    3: ["hierarchy", "previous_experience", "employment_type", "employment_status", "designation", "level"],
    4: ["salary", "account_number", "bank_name", "branch", "contract_type"],
  };

  const handleNext = async () => {
    const fieldsToValidate = stepFields[currentStep];
    const isStepValid = await trigger(fieldsToValidate);
    if (isStepValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const onSubmit = async (data: CreateEmployeeBody) => {
    try {
      console.log("Submitting flat legacy payload to backend controller:", data);
      
      // Example API call:
      // await axios.post('/api/employees', data);
      
      alert("Employee profile created successfully!");
    } catch (err) {
      console.error("Submission failed:", err);
      alert("An error occurred while creating the employee.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto my-8 p-6 bg-white rounded-lg shadow-md border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Onboard New Employee</h2>

      {/* Step Progress Bar */}
      <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
        {STEPS.map((step) => (
          <div key={step.id} className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
              currentStep === step.id 
                ? "bg-blue-600 text-white" 
                : currentStep > step.id 
                ? "bg-green-500 text-white" 
                : "bg-gray-100 text-gray-500"
            }`}>
              {currentStep > step.id ? "✓" : step.id}
            </div>
            <span className={`text-sm font-medium hidden sm:inline ${
              currentStep === step.id ? "text-blue-600" : "text-gray-500"
            }`}>
              {step.name}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* ─── STEP 1: ACCOUNT & CORE DETAILS ──────────────────────────────── */}
        {currentStep === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input type="text" {...register("first_name")} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
              {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input type="text" {...register("last_name")} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
              {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
              <input type="email" {...register("email")} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department Name *</label>
              <input type="text" {...register("department_name")} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
              {errors.department_name && <p className="text-red-500 text-xs mt-1">{errors.department_name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date *</label>
              <input type="date" {...register("joining_date")} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
              {errors.joining_date && <p className="text-red-500 text-xs mt-1">{errors.joining_date.message}</p>}
            </div>
          </div>
        )}

        {/* ─── STEP 2: PERSONAL DETAILS ───────────────────────────────────── */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h3 className="text-md font-semibold text-gray-700 border-b pb-2">Demographics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input type="text" {...register("phone")} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <input type="date" {...register("date_of_birth")} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                {errors.date_of_birth && <p className="text-red-500 text-xs mt-1">{errors.date_of_birth.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select {...register("gender")} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="">Select Gender</option>
                  {GenderEnum.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
                <select {...register("marital_status")} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="">Select Status</option>
                  {MaritalStatusEnum.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            <h3 className="text-md font-semibold text-gray-700 border-b pb-2">Identification & Family</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Citizenship Number</label>
                <input type="text" {...register("citizenship_number")} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
                <input type="text" {...register("pan_number")} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NID Number</label>
                <input type="text" {...register("nid_number")} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SSID Number</label>
                <input type="text" {...register("ssid_number")} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Father's Full Name</label>
                <input type="text" {...register("father_name")} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mother's Full Name</label>
                <input type="text" {...register("mother_name")} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>

            <h3 className="text-md font-semibold text-gray-700 border-b pb-2">Address Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Address</label>
                <input type="text" {...register("current_address")} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Permanent Address</label>
                <input type="text" {...register("permanent_address")} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input type="text" {...register("country")} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input type="text" {...register("state")} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                <input type="text" {...register("district")} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input type="text" {...register("city")} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Municipality Type</label>
                <select {...register("municipality")} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="">Select Type</option>
                  {MunicipalityTypeEnum.options.map(o => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ward Number</label>
                <input type="number" {...register("ward", { valueAsNumber: true })} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tole / Street</label>
                <input type="text" {...register("tole")} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 3: DEPARTMENT & EXPERIENCE ────────────────────────────── */}
        {currentStep === 3 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
              <input type="text" {...register("designation")} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
              <input type="text" {...register("level")} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
              <input type="text" {...register("employment_type")} placeholder="e.g. Full-time, Permanent" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employment Status</label>
              <input type="text" {...register("employment_status")} placeholder="e.g. Active, On Probation" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hierarchy Line</label>
              <input type="text" {...register("hierarchy")} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Previous Experience Records</label>
              <textarea rows={3} {...register("previous_experience")} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
        )}

        {/* ─── STEP 4: FINANCIALS ─────────────────────────────────────────── */}
        {currentStep === 4 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base Salary</label>
              <input type="number" step="0.01" {...register("salary", { valueAsNumber: true })} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
              {errors.salary && <p className="text-red-500 text-xs mt-1">{errors.salary.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
              <input type="text" {...register("bank_name")} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
              <input type="text" {...register("account_number")} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch Location</label>
              <input type="text" {...register("branch")} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contract Type</label>
              <input type="text" {...register("contract_type")} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
        )}

        {/* ─── STEPPER CONTROLS ────────────────────────────────────────────── */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 1}
            className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Back
          </button>

          {currentStep < STEPS.length ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400"
            >
              {isSubmitting ? "Onboarding..." : "Finalize Employee Creation"}
            </button>
          )}
        </div>

      </form>
    </div>
  );
}