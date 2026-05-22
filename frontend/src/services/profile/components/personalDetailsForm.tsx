import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  updatePersonalDetailSchema, 
  type UpdatePersonalDetailInput 
} from "@/validator/personal.detail.validator";

import { employeeService } from "@/services/api";

interface PersonalDetailFormProps {
  employeeId: string;
}

export default function PersonalDetailForm({ employeeId }: PersonalDetailFormProps) {
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
      ward: undefined,
    },
  });

  const onSubmit = async (data: UpdatePersonalDetailInput) => {
    try {
      // Passes validated fields straight into your current API layer structure
      const updatedEmployee = await employeeService.update(employeeId, data);
      
      console.log("Mock database entry synchronized:", updatedEmployee);
      alert("Personal details saved successfully!");
    } catch (error) {
      console.error("Failed to update details:", error);
      alert("An error occurred while saving information.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <div>
        <label className="block font-medium mb-1">First Name</label>
        <input 
          type="text" 
          {...register("first_name")} 
          className="border p-2 rounded w-full" 
        />
        {errors.first_name && (
          <p className="text-red-500 text-sm mt-1">{errors.first_name.message}</p>
        )}
      </div>

      <div>
        <label className="block font-medium mb-1">Last Name</label>
        <input 
          type="text" 
          {...register("last_name")} 
          className="border p-2 rounded w-full" 
        />
        {errors.last_name && (
          <p className="text-red-500 text-sm mt-1">{errors.last_name.message}</p>
        )}
      </div>

      <div>
        <label className="block font-medium mb-1">Email</label>
        <input 
          type="text" 
          {...register("email")} 
          className="border p-2 rounded w-full" 
        />
        {errors.email && (
          <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="block font-medium mb-1">Ward Number</label>
        <input 
          type="number" 
          {...register("ward")} 
          className="border p-2 rounded w-full" 
        />
        {errors.ward && (
          <p className="text-red-500 text-sm mt-1">{errors.ward.message}</p>
        )}
      </div>

      <button 
        type="submit" 
        disabled={isSubmitting}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400 mt-2 transition-colors"
      >
        {isSubmitting ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}