import { z } from "zod";
export const createAssetSchema = z.object({
  asset_id: z.string().min(1, "Asset ID is required"),
  name: z.string().min(1, "Asset name is required"),
  category: z.string().min(1, "Asset type is required"),
  serial_number: z.string().min(5, "Serial number is required"),
  purchase_date: z.string().min(1, "Purchase date is required"),
});
export const updateAssetSchema = z.object({
  asset_id: z.string().min(1, "Asset ID is required").optional(),
  name: z.string().min(1, "Asset name is required").optional(),
  category: z.string().min(1, "Asset type is required").optional(),
  serial_number: z.string().optional().nullable(),
  purchase_date: z.string().optional().nullable(),
});
