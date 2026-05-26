import { Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { ApiResponse } from "../types/index.js";
import { minioClient, MINIO_BASE_URL, ensureBucket } from "@/utils/minio.js";

const EMPLOYEE_DOCS_BUCKET = "employee-files";

export class EmployeeDocumentController {
  // ─── GET /employees/:employeeId/documents ─────────────────────────────────

  static async getAll(req: Request, res: Response<ApiResponse>) {
    try {
      const { employeeId } = req.params;

      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
      });
      if (!employee) {
        return res
          .status(404)
          .json({ success: false, message: "Employee not found" });
      }

      const documents = await prisma.employeeDocument.findMany({
        where: { employee_id: employeeId },
        orderBy: { uploaded_at: "desc" },
      });

      res.json({
        success: true,
        message: "Documents retrieved",
        data: documents,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ─── GET /employees/:employeeId/documents/:id ─────────────────────────────

  static async getById(req: Request, res: Response<ApiResponse>) {
    try {
      const { employeeId, id } = req.params;

      const document = await prisma.employeeDocument.findFirst({
        where: { id, employee_id: employeeId },
      });

      if (!document) {
        return res
          .status(404)
          .json({ success: false, message: "Document not found" });
      }

      res.json({
        success: true,
        message: "Document retrieved",
        data: document,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ─── POST /employees/:employeeId/documents ────────────────────────────────
  // Accepts multipart/form-data with file + name + type fields

  static async upload(req: Request, res: Response<ApiResponse>) {
    try {
      const { employeeId } = req.params;
      const file = req.file;
      const { name, type } = req.body;

      if (!file) {
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded" });
      }

      if (!name || !type) {
        return res.status(400).json({
          success: false,
          message: "Document name and type are required",
        });
      }

      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
      });
      if (!employee) {
        return res
          .status(404)
          .json({ success: false, message: "Employee not found" });
      }

      await ensureBucket(EMPLOYEE_DOCS_BUCKET);

      const fileName = `documents/${employeeId}/${Date.now()}-${file.originalname}`;
      const fileUrl = `${MINIO_BASE_URL}/${EMPLOYEE_DOCS_BUCKET}/${fileName}`;
      const fileSize = `${(file.size / 1024).toFixed(2)} KB`;

      await minioClient.putObject(
        EMPLOYEE_DOCS_BUCKET,
        fileName,
        file.buffer,
        file.size,
        { "Content-Type": file.mimetype },
      );

      const document = await prisma.employeeDocument.create({
        data: {
          employee_id: employeeId,
          name,
          type,
          file_url: fileUrl,
          file_size: fileSize,
          status: "Pending",
        },
      });

      res.status(201).json({
        success: true,
        message: "Document uploaded successfully",
        data: document,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ─── PATCH /employees/:employeeId/documents/:id ───────────────────────────
  // Update name, type, or status only (not the file itself)

  static async update(req: Request, res: Response<ApiResponse>) {
    try {
      const { employeeId, id } = req.params;
      const { name, type, status } = req.body;

      const existing = await prisma.employeeDocument.findFirst({
        where: { id, employee_id: employeeId },
      });
      if (!existing) {
        return res
          .status(404)
          .json({ success: false, message: "Document not found" });
      }

      const VALID_STATUSES = ["Pending", "Approved", "Rejected"];
      if (status && !VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${VALID_STATUSES.join(", ")}`,
        });
      }

      const document = await prisma.employeeDocument.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(type && { type }),
          ...(status && { status }),
        },
      });

      res.json({
        success: true,
        message: "Document updated",
        data: document,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // ─── PATCH /employees/:employeeId/documents/:id/status ───────────────────
  // Dedicated status update (approve / reject)

  static async updateStatus(req: Request, res: Response<ApiResponse>) {
    try {
      const { employeeId, id } = req.params;
      const { status } = req.body;

      const VALID_STATUSES = ["Pending", "Approved", "Rejected"];
      if (!status || !VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${VALID_STATUSES.join(", ")}`,
        });
      }

      const existing = await prisma.employeeDocument.findFirst({
        where: { id, employee_id: employeeId },
      });
      if (!existing) {
        return res
          .status(404)
          .json({ success: false, message: "Document not found" });
      }

      const document = await prisma.employeeDocument.update({
        where: { id },
        data: { status },
      });

      res.json({
        success: true,
        message: `Document ${status.toLowerCase()}`,
        data: document,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // ─── DELETE /employees/:employeeId/documents/:id ──────────────────────────

  static async delete(req: Request, res: Response<ApiResponse>) {
    try {
      const { employeeId, id } = req.params;

      const document = await prisma.employeeDocument.findFirst({
        where: { id, employee_id: employeeId },
      });
      if (!document) {
        return res
          .status(404)
          .json({ success: false, message: "Document not found" });
      }

      // Delete from MinIO if a file exists
      if (document.file_url) {
        try {
          // Extract the object name from the full URL
          const objectName = document.file_url.replace(
            `${MINIO_BASE_URL}/${EMPLOYEE_DOCS_BUCKET}/`,
            "",
          );
          await minioClient.removeObject(EMPLOYEE_DOCS_BUCKET, objectName);
        } catch (_) {
          // Non-fatal — log but don't block deletion
          console.warn("Could not delete file from MinIO:", document.file_url);
        }
      }

      await prisma.employeeDocument.delete({ where: { id } });

      res.json({ success: true, message: "Document deleted successfully" });
    } catch (error: any) {
      if (error.code === "P2025") {
        return res
          .status(404)
          .json({ success: false, message: "Document not found" });
      }
      res.status(400).json({ success: false, message: error.message });
    }
  }
}
