import { NextFunction, Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { minioClient, MINIO_BASE_URL, ensureBucket } from "../utils/minio.js";

const BUCKET = "employee-documents";

export class EmployeeDocumentController {
  static updateStatus(
    arg0: string,
    arg1: (
      req: Request,
      res: Response,
      next: NextFunction,
    ) => Response<any, Record<string, any>> | undefined,
    updateStatus: any,
  ) {
    throw new Error("Method not implemented.");
  }
  static async upload(req: Request, res: Response) {
    try {
      const { employeeId } = req.params;
      const { type, name } = req.body;

      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "File is required" });
      }

      const file = req.file;
      const fileName = `${employeeId}/${Date.now()}-${file.originalname}`;
      const fileUrl = `${MINIO_BASE_URL}/${BUCKET}/${fileName}`;

      await ensureBucket(BUCKET);

      await minioClient.putObject(BUCKET, fileName, file.buffer, file.size, {
        "Content-Type": file.mimetype,
      });

      let document;
      try {
        document = await prisma.employeeDocument.create({
          data: {
            employee_id: employeeId,
            type,
            name: name || file.originalname,
            file_size: `${(file.size / 1024).toFixed(2)} KB`,
            file_url: fileUrl,
          },
        });
      } catch (dbError) {
        // Rollback: remove the uploaded file from MinIO
        await minioClient.removeObject(BUCKET, fileName).catch(() => {});
        throw dbError;
      }

      res.status(201).json({
        success: true,
        message: "Document uploaded",
        data: document,
      });
    } catch (err: any) {
      console.error("Document upload error:", err);
      res.status(500).json({
        success: false,
        message: "Upload failed",
        error: err.message,
      });
    }
  }

  static async getByEmployee(req: Request, res: Response) {
    try {
      const { employeeId } = req.params;

      const docs = await prisma.employeeDocument.findMany({
        where: { employee_id: employeeId },
        orderBy: { uploaded_at: "desc" },
      });

      res.json({ success: true, data: docs });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async updateDocumentStatus(req: Request, res: Response) {
    try {
      const { docId } = req.params;
      const { status } = req.body;

      const doc = await prisma.employeeDocument.update({
        where: { id: docId },
        data: { status },
      });

      res.json({ success: true, message: "Status updated", data: doc });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const doc = await prisma.employeeDocument.findUnique({ where: { id } });
      if (!doc) {
        return res
          .status(404)
          .json({ success: false, message: "Document not found" });
      }

      const objectName = doc.file_url?.replace(
        `${MINIO_BASE_URL}/${BUCKET}/`,
        "",
      );

      await prisma.employeeDocument.delete({ where: { id } });

      if (objectName) {
        await minioClient.removeObject(BUCKET, objectName).catch((err) => {
          console.warn("MinIO cleanup warning:", err.message);
        });
      }

      res.json({ success: true, message: "Document deleted" });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
