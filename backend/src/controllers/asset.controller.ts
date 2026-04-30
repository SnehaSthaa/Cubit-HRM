import { Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { ApiResponse, Asset } from "../types/index.js";

export class AssetController {
  static async getAll(req: Request, res: Response<ApiResponse>) {
    try {
      const { status, category, assigned_to } = req.query;
      const where: any = {};

      if (status) where.status = status;
      if (category) where.category = category;
      if (assigned_to) {
        where.assigned_to = String(assigned_to);
      }

      const assets = await prisma.asset.findMany({
        where,
        include: {
          employee: true,
        },
        orderBy: {
          created_at: "desc",
        },
      });

      res.json({
        success: true,
        message: "Assets retrieved",
        data: assets,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async getById(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const asset = await prisma.asset.findUnique({
        where: { id },
        include: {
          employee: true,
        },
      });

      if (!asset) {
        return res.status(404).json({
          success: false,
          message: "Asset not found",
        });
      }

      res.json({
        success: true,
        message: "Asset retrieved",
        data: asset,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async create(req: Request, res: Response<ApiResponse>) {
    try {
      const assetData: Partial<Asset> = req.body;

      if (!assetData.asset_id || !assetData.name || !assetData.category) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }

      const asset = await prisma.asset.create({
        data: {
          asset_id: assetData.asset_id,
          name: assetData.name,
          category: assetData.category,
          serial_number: assetData.serial_number,
          purchase_cost: assetData.purchase_cost,
          purchase_date: assetData.purchase_date
            ? new Date(assetData.purchase_date)
            : null,
          status: assetData.status || "available",
          assigned_to: assetData.assigned_to,
          assigned_date: assetData.assigned_date
            ? new Date(assetData.assigned_date)
            : null,
          return_date: assetData.return_date
            ? new Date(assetData.return_date)
            : null,
          location: assetData.location,
          notes: assetData.notes,
        },
        include: {
          employee: true,
        },
      });

      res.status(201).json({
        success: true,
        message: "Asset created",
        data: asset,
      });
    } catch (error: any) {
      if (error.code === "P2002") {
        return res.status(400).json({
          success: false,
          message: "Asset ID or serial number already exists",
        });
      }
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async update(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const asset = await prisma.asset.update({
        where: { id },
        data: {
          ...(updateData.name && { name: updateData.name }),
          ...(updateData.asset_id && { asset_id: updateData.asset_id }),
          ...(updateData.category && { category: updateData.category }),

          ...(updateData.serial_number !== undefined && {
            serial_number: updateData.serial_number,
          }),
          ...(updateData.purchase_cost !== undefined && {
            purchase_cost: updateData.purchase_cost,
          }),
          ...(updateData.purchase_date && {
            purchase_date: new Date(updateData.purchase_date),
          }),
          ...(updateData.status && { status: updateData.status }),
          ...(updateData.location && { location: updateData.location }),
          ...(updateData.notes && { notes: updateData.notes }),
        },
        include: {
          employee: true,
        },
      });

      res.json({
        success: true,
        message: "Asset updated",
        data: asset,
      });
    } catch (error: any) {
      if (error.code === "P2025") {
        return res.status(404).json({
          success: false,
          message: "Asset not found",
        });
      }
      if (error.code === "P2002") {
        return res.status(400).json({
          success: false,
          message: "Asset ID or serial number already exists",
        });
      }
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async assign(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const { assigned_to } = req.body;

      if (!assigned_to) {
        return res.status(400).json({
          success: false,
          message: "Assigned employee ID is required",
        });
      }

      const asset = await prisma.asset.update({
        where: { id },
        data: {
          assigned_to,
          status: "assigned",
          assigned_date: new Date(),
          return_date: null,
        },
        include: {
          employee: true,
        },
      });

      res.json({
        success: true,
        message: "Asset assigned",
        data: asset,
      });
    } catch (error: any) {
      if (error.code === "P2025") {
        return res.status(404).json({
          success: false,
          message: "Asset not found",
        });
      }
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async unassign(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;

      const asset = await prisma.asset.findUnique({ where: { id } });

      if (!asset) {
        return res.status(404).json({
          success: false,
          message: "Asset not found",
        });
      }

      if (asset.status === "available") {
        return res.json({
          success: true,
          message: "Asset already returned",
          data: asset,
        });
      }
      const updated = await prisma.asset.update({
        where: { id },
        data: {
          assigned_to: null, // ✔ valid FK
          status: "available",
          return_date: new Date(),
        },
      });
      return res.json({
        success: true,
        message: "Asset returned successfully",
        data: updated,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  static async delete(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;

      await prisma.asset.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: "Asset deleted",
      });
    } catch (error: any) {
      if (error.code === "P2025") {
        return res.status(404).json({
          success: false,
          message: "Asset not found",
        });
      }
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}
