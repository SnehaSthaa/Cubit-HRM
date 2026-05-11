import { Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { ApiResponse, Asset } from "../types/index.js";
import * as XLSX from "xlsx";
import { start } from "repl";
import { date } from "zod";
import { JwtPayload } from "jsonwebtoken";

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

      console.log("UPDATE ASSET ID:", id);
      console.log("UPDATE ASSET BODY:", req.body);

      if (!req.body) {
        return res.status(400).json({
          success: false,
          message: "Missing request body",
        });
      }

      const asset = await prisma.asset.update({
        where: { id },
        data: {
          name: req.body.name,
          asset_id: req.body.asset_id,
          category: req.body.category,
          serial_number: req.body.serial_number,
          purchase_date: req.body.purchase_date
            ? new Date(req.body.purchase_date)
            : undefined,
        },
        include: { employee: true },
      });

      return res.json({
        success: true,
        message: "Asset updated",
        data: asset,
      });
    } catch (error: any) {
      console.error("UPDATE ERROR:", error);

      if (error.code === "P2025") {
        return res.status(404).json({
          success: false,
          message: "Asset not found",
        });
      }

      return res.status(500).json({
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
          assigned_to: null,
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
  static async exportAssets(req: Request, res: Response) {
    try {
      const assets = await prisma.asset.findMany({
        include: { employee: true },
      });
      const data = assets.map((a) => ({
        AssetID: a.asset_id,
        Name: a.name,
        Type: a.category,
        SerialNumber: a.serial_number,
        Status: a.status,

        AssignedTo: a.employee
          ? `${a.employee.first_name} ${a.employee.last_name}`
          : "",
        Department: a.employee?.department || "",
        PurchaseDate: a.purchase_date,
      }));
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Assets");
      const buffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });
      res.setHeader("Content-Disposition", "attachment; filename=assets.xlsx");
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.send(buffer);
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "Export failed" });
    }
  }
  static async importAssets(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet);
      const assets = rows.map((row: any) => ({
        asset_id: row.AssetID,
        name: row.Name,
        category: row.Type,
        serial_number: row.SerialNumber,
        status: row.Status || "available",
      }));
      await prisma.asset.createMany({
        data: assets,
        skipDuplicates: true,
      });
      res.json({ message: "Assets imported successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Import failed" });
    }
  }
  static async createTakeHomeRequest(req: Request, res: Response) {
    try {
      const assetId = req.params.id;
      const { start_date, end_date, reason } = req.body;

      if (!reason?.trim()) {
        return res.status(400).json({ message: "Reason is required" });
      }

      const asset = await prisma.asset.findUnique({
        where: { id: assetId },
      });

      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }

      if (!asset.assigned_to) {
        return res.status(400).json({
          message: "Asset is not assigned to any employee",
        });
      }

      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: "Invalid dates" });
      }

      if (endDate < startDate) {
        return res.status(400).json({
          message: "End date cannot be before start date",
        });
      }
      const overlappingRequest = await prisma.assetsTakeHomeDate.findFirst({
        where: {
          asset_id: assetId,
          status: {
            in: ["pending", "approved"],
          },
          OR: [
            {
              start_date: { lte: endDate },
              end_date: { gte: startDate },
            },
          ],
        },
      });
      if (overlappingRequest) {
        return res.status(400).json({
          message:
            "This asset already has a request in the selected date range",
        });
      }

      const request = await prisma.assetsTakeHomeDate.create({
        data: {
          asset_id: assetId,
          start_date: startDate,
          end_date: endDate,
          reason,
          status: "pending",
        },
      });

      return res.json({
        success: true,
        message: "Take-home request submitted",
        data: request,
      });
    } catch (err: any) {
      console.error("TAKE_HOME_ERROR:", err);
      return res.status(500).json({
        message: err.message,
      });
    }
  }
  static async getTakeHomeRequest(req: Request, res: Response) {
    try {
      const requests = await prisma.assetsTakeHomeDate.findMany({
        include: {
          asset: {
            include: {
              employee: true,
              reviewer: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: {
          created_at: "desc",
        },
      });
      console.log(
        "FIRST REQUEST ASSET REVIEWER:",
        JSON.stringify(requests[0]?.asset?.reviewer, null, 2),
      );
      console.log(
        "FIRST REQUEST ASSET reviewed_by_user_id:",
        requests[0]?.asset?.reviewed_by_user_id,
      );
      return res.json({
        success: true,
        data: requests,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
  static async getMyTakeHomeRequests(req: Request, res: Response) {
    try {
      const { userId } = req.user as JwtPayload;

      const employee = await prisma.employee.findUnique({
        where: { user_id: userId },
      });

      if (!employee) {
        return res
          .status(404)
          .json({ success: false, message: "Employee not found" });
      }

      const requests = await prisma.assetsTakeHomeDate.findMany({
        where: {
          asset: {
            assigned_to: employee.id,
          },
        },
        include: {
          asset: {
            include: {
              employee: true,
              reviewer: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { created_at: "desc" },
      });

      return res.json({ success: true, data: requests });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
  static async reviewTakeHomeRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const takeHomeRequest = await prisma.assetsTakeHomeDate.findUnique({
        where: { id },
      });

      if (!takeHomeRequest) {
        return res.status(404).json({ message: "Request not found" });
      }

      const updatedRequest = await prisma.assetsTakeHomeDate.update({
        where: { id },
        data: { status },
      });

      const updatedAsset = await prisma.asset.update({
        where: { id: takeHomeRequest.asset_id },
        data: {
          reviewed_by_user_id: (req.user as JwtPayload).userId,
          reveiwed_at: new Date(),
        },
        include: {
          employee: true,
          reviewer: {
            select: { id: true, name: true },
          },
        },
      });

      return res.json({
        success: true,
        message: "Request reviewed",
        data: {
          request: updatedRequest,
          asset: updatedAsset,
          reviewedBy: updatedAsset.reviewer?.name ?? null,
        },
      });
    } catch (err: any) {
      console.error("REVIEW_TAKEHOME_ERROR:", err);
      return res.status(500).json({ message: err.message });
    }
  }
}
