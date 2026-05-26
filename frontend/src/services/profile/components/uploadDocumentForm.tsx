import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { uploadDocumentSchema, type UploadDocumentBody } from "@/validator/employee.document.validator";
type UploadDocumentFields = UploadDocumentBody & {
  file?: FileList;
};

const DOCUMENT_TYPES = [
  "Citizenship/ID Card",
  "Academic Certificate",
  "PAN/Tax Document",
  "Contract/Offer Letter",
  "Experience Letter",
  "Other Support Document"
];

export default function UploadDocumentForm() {
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UploadDocumentFields>({
    resolver: zodResolver(uploadDocumentSchema),
    defaultValues: {
      name: "",
      type: "",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFileName(e.target.files[0].name);
    }
  };

  const handleClearFile = () => {
    setSelectedFileName(null);
    const fileInput = document.getElementById("document-file-input") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const onSubmit = async (data: UploadDocumentFields) => {
    try {
      if (!data.file || data.file.length === 0) {
        alert("Please select a physical file to upload before submitting.");
        return;
      }

      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("type", data.type);
      formData.append("file", data.file[0]);

      console.log("Submitting form data stream for:", data.name);


      alert("Document uploaded successfully!");
      handleClearFile();
      reset(); 
    } catch (error) {
      console.error("Upload process encountered an error:", error);
      alert("Failed to complete document upload.");
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 p-6 bg-white rounded-lg shadow-md border border-gray-100">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">Upload Document</h2>
        <p className="text-sm text-gray-500 mt-1">Attach mandatory files to this employee profile record.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        
        {/* Document Custom Name Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Document Title / Display Name *
          </label>
          <input
            type="text"
            {...register("name")}
            placeholder="e.g., Bachelor Degree Transcript"
            className="w-full border border-gray-300 p-2.5 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
          {errors.name && (
            <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.name.message}</p>
          )}
        </div>

        {/* Document Classification Type Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Document Type Classification *
          </label>
          <select
            {...register("type")}
            className="w-full border border-gray-300 p-2.5 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
          >
            <option value="">-- Choose Classification Category --</option>
            {DOCUMENT_TYPES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          {errors.type && (
            <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.type.message}</p>
          )}
        </div>

        {/* Physical File Attachment Area */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Physical File *
          </label>
          
          <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition-colors flex flex-col items-center justify-center text-center cursor-pointer">
            <input
              id="document-file-input"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.docx"
              {...register("file")}
              onChange={(e) => {
                register("file").onChange(e); 
                handleFileChange(e); 
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            
            <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            
            <span className="text-sm font-medium text-blue-600 block">
              {selectedFileName ? "Change selected file" : "Click to select or drag document"}
            </span>
            <span className="text-xs text-gray-400 block mt-1">
              Supports PDF, PNG, JPG, or DOCX (Max 10MB)
            </span>
          </div>

          {/* Active File Name Indicator Badge */}
          {selectedFileName && (
            <div className="mt-3 flex items-center justify-between p-2 bg-blue-50 border border-blue-100 rounded-md">
              <span className="text-xs font-medium text-blue-800 truncate max-w-[85%]">
                📎 {selectedFileName}
              </span>
              <button 
                type="button" 
                onClick={handleClearFile}
                className="text-xs text-red-500 hover:text-red-700 font-semibold px-1"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-medium p-2.5 rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm flex items-center justify-center shadow-sm"
        >
          {isSubmitting ? "Uploading file structure..." : "Upload Document"}
        </button>

      </form>
    </div>
  );
}