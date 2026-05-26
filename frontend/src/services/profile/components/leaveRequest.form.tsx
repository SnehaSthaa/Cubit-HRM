import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createLeaveSchema, type CreateLeaveInput } from "@/validator/leave.validator";
import { leaveService } from "@/services/api";

export default function LeaveRequestForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateLeaveInput>({
    resolver: zodResolver(createLeaveSchema),
    defaultValues: {
      start_date: "",
      end_date: "",
      leave_type_id: "",
      reason: "",
    },
  });

  const onSubmit = async (data: CreateLeaveInput) => {
    try {
      const completeLeavePayload = {
        start_date: data.start_date,
        end_date: data.end_date,
        leave_type_id: data.leave_type_id,
        reason: data.reason || "",
        
        status: "pending" as const,
        employee: "Current Employee",
        type: "Requested Leave",
        from: data.start_date,
        to: data.end_date,
        days: Math.max(
          1,
          Math.ceil(
            (new Date(data.end_date).getTime() - new Date(data.start_date).getTime()) / 
            (1000 * 60 * 60 * 24)
          ) + 1
        ),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newLeaveRequest = await leaveService.create(completeLeavePayload as any);
      
      console.log("Leave requested successfully:", newLeaveRequest);
      alert("Leave application submitted successfully!");
    } catch (error) {
      console.error("Submission failed:", error);
      alert("Failed to submit leave request.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      {/* Start Date Field */}
      <div>
        <label className="block font-medium mb-1">Start Date</label>
        <input 
          type="date" 
          {...register("start_date")} 
          className="border p-2 rounded w-full" 
        />
        {errors.start_date && (
          <p className="text-red-500 text-sm mt-1">{errors.start_date.message}</p>
        )}
      </div>

      {/* End Date Field */}
      <div>
        <label className="block font-medium mb-1">End Date</label>
        <input 
          type="date" 
          {...register("end_date")} 
          className="border p-2 rounded w-full" 
        />
        {/* Displays range errors like "End date must be after or equal to start date" */}
        {errors.end_date && (
          <p className="text-red-500 text-sm mt-1">{errors.end_date.message}</p>
        )}
      </div>

      {/* Leave Type UUID Field */}
      <div>
        <label className="block font-medium mb-1">Leave Type ID (UUID)</label>
        <input 
          type="text" 
          {...register("leave_type_id")} 
          placeholder="e.g., 123e4567-e88b-12d3-a456-426614174000" 
          className="border p-2 rounded w-full" 
        />
        {errors.leave_type_id && (
          <p className="text-red-500 text-sm mt-1">{errors.leave_type_id.message}</p>
        )}
      </div>

      {/* Reason TextArea Field */}
      <div>
        <label className="block font-medium mb-1">Reason for Leave (Optional)</label>
        <textarea 
          {...register("reason")} 
          rows={3} 
          className="border p-2 rounded w-full" 
        />
      </div>

      {/* Submission Button */}
      <button 
        type="submit" 
        disabled={isSubmitting} 
        className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded transition-colors disabled:bg-gray-400"
      >
        {isSubmitting ? "Submitting Request..." : "Apply for Leave"}
      </button>
    </form>
  );
}