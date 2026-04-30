import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../db/prisma.js";
import { ApiResponse, Employee } from "../types/index.js";

import { minioClient, MINIO_BASE_URL, ensureBucket } from "@/utils/minio.js";
import { sendWelcomeEmail } from "@/utils/mailer.js";
import { generateRandomPassword } from "@/utils/generatePassword.js";
const EMPLOYEE_FILES_BUCKET = "employee-files";

export class EmployeeController {
  static async getAll(req: Request, res: Response<ApiResponse>) {
    try {
      const employees = await prisma.employee.findMany({
        include: {
          user: true,
          manager: true,
          assets: true,
          emergencyContacts: true,
          documents: true,
        },
      });
      const normalizedEmployees = employees.map((e) => ({
        ...e,
        email: e.user?.email ?? e.email,
        name: `${e.first_name} ${e.last_name}`.trim(),
      }));
      res.json({
        success: true,
        message: "Employees retrieved",
        data: normalizedEmployees,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getById(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const employee = await prisma.employee.findUnique({
        where: { id },
        include: {
          user: true,
          manager: true,
          assets: true,
          emergencyContacts: true,
          documents: true,
        },
      });

      if (!employee) {
        return res
          .status(404)
          .json({ success: false, message: "Employee not found" });
      }

      res.json({
        success: true,
        message: "Employee retrieved",
        data: {
          ...employee,
          email: employee.user?.email ?? employee.email,
          name: `${employee.first_name} ${employee.last_name}`.trim(),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async create(req: Request, res: Response<ApiResponse>) {
    try {
      const employeeData: Partial<Employee> = req.body;

      if (
        !employeeData.email ||
        !employeeData.first_name ||
        !employeeData.last_name ||
        !employeeData.department ||
        !employeeData.joining_date
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Missing required fields" });
      }

      if (!req.user) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: employeeData.email! },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Employee email is already in use",
        });
      }
      const randomPassword = generateRandomPassword();
      const createdUser = await prisma.user.create({
        data: {
          email: employeeData.email!,
          password_hash: await bcrypt.hash(randomPassword, 10),
          name: `${employeeData.first_name} ${employeeData.last_name}`.trim(),
          role: "employee",
          is_active: true,
        },
      });

      const employee = await prisma.employee.create({
        data: {
          user_id: createdUser.id,
          employee_id: employeeData.employee_id ?? `EMP-${Date.now()}`,
          first_name: employeeData.first_name!,
          last_name: employeeData.last_name!,
          email: employeeData.email!,
          department: employeeData.department!,
          position: employeeData.position ?? "",
          joining_date: new Date(employeeData.joining_date!),
          ...(employeeData.date_of_birth && {
            date_of_birth: new Date(employeeData.date_of_birth),
          }),
          ...(employeeData.gender && { gender: employeeData.gender }),
          ...(employeeData.phone && { phone: employeeData.phone }),
          ...(employeeData.salary !== undefined && {
            salary: employeeData.salary,
          }),
          ...(employeeData.manager_id && {
            manager_id: employeeData.manager_id,
          }),
          ...(employeeData.current_address && {
            current_address: employeeData.current_address,
          }),
          ...(employeeData.permanent_address && {
            permanent_address: employeeData.permanent_address,
          }),
          ...(employeeData.marital_status && {
            marital_status: employeeData.marital_status,
          }),
          ...(employeeData.father_name && {
            father_name: employeeData.father_name,
          }),
          ...(employeeData.grandfather_name && {
            grandfather_name: employeeData.grandfather_name,
          }),
          ...(employeeData.mother_name && {
            mother_name: employeeData.mother_name,
          }),
          ...(employeeData.previous_experience && {
            previous_experience: employeeData.previous_experience,
          }),
          ...(employeeData.level && { level: employeeData.level }),
          ...(employeeData.hierarchy && { hierarchy: employeeData.hierarchy }),
          ...(employeeData.employment_status && {
            employment_status: employeeData.employment_status,
          }),
          ...(employeeData.citizenship_number && {
            citizenship_number: employeeData.citizenship_number,
          }),
          ...(employeeData.pan_number && {
            pan_number: employeeData.pan_number,
          }),
          ...(employeeData.nid_number && {
            nid_number: employeeData.nid_number,
          }),
          ...(employeeData.ssid_number && {
            ssid_number: employeeData.ssid_number,
          }),
          ...(employeeData.contract_type && {
            contract_type: employeeData.contract_type,
          }),
          ...(employeeData.type && { type: employeeData.type }),
          ...(employeeData.city && { city: employeeData.city }),
          ...(employeeData.state && { state: employeeData.state }),
          ...(employeeData.postal_code && {
            postal_code: employeeData.postal_code,
          }),
          ...(employeeData.notes && { notes: employeeData.notes }),
        },
        include: { user: true, manager: true },
      });
      try {
        await sendWelcomeEmail({
          to: employee.email,
          name: `${employee.first_name} ${employee.last_name}`,
          employeeId: employee.employee_id,
          department: employee.department,
          position: employee.position,
          email: employee.email,
          password: randomPassword,
        });
      } catch (mailError) {
        console.log("Failed to send welcome email:", mailError);
      }

      res.status(201).json({
        success: true,
        message: "Employee created",
        data: {
          ...employee,
          name: `${employee.first_name} ${employee.last_name}`.trim(),
        },
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async update(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const u = req.body;
      const data: Record<string, any> = {};

      // Personal info
      if (u.first_name !== undefined) data.first_name = u.first_name;
      if (u.last_name !== undefined) data.last_name = u.last_name;
      if (u.email !== undefined) data.email = u.email;
      if (u.phone !== undefined) data.phone = u.phone;
      if (u.gender !== undefined) data.gender = u.gender;
      if (u.marital_status !== undefined)
        data.marital_status = u.marital_status;
      if (u.father_name !== undefined) data.father_name = u.father_name;
      if (u.grandfather_name !== undefined)
        data.grandfather_name = u.grandfather_name;
      if (u.mother_name !== undefined) data.mother_name = u.mother_name;
      if (u.current_address !== undefined)
        data.current_address = u.current_address;
      if (u.permanent_address !== undefined)
        data.permanent_address = u.permanent_address;
      if (u.city !== undefined) data.city = u.city;
      if (u.state !== undefined) data.state = u.state;
      if (u.postal_code !== undefined) data.postal_code = u.postal_code;
      if (u.notes !== undefined) data.notes = u.notes;
      if (u.citizenship_number !== undefined)
        data.citizenship_number = u.citizenship_number;
      if (u.pan_number !== undefined) data.pan_number = u.pan_number;
      if (u.nid_number !== undefined) data.nid_number = u.nid_number;
      if (u.ssid_number !== undefined) data.ssid_number = u.ssid_number;

      if (u.date_of_birth && u.date_of_birth !== "") {
        data.date_of_birth = new Date(u.date_of_birth);
      }
      if (u.joining_date && u.joining_date !== "") {
        data.joining_date = new Date(u.joining_date);
      }

      // Department / role
      if (u.department !== undefined) data.department = u.department;
      if (u.position !== undefined) data.position = u.position;
      if (u.level !== undefined) data.level = u.level;
      if (u.hierarchy !== undefined) data.hierarchy = u.hierarchy;
      if (u.previous_experience !== undefined)
        data.previous_experience = u.previous_experience;
      if (u.employment_type !== undefined)
        data.employment_type = u.employment_type;
      if (u.employment_status !== undefined)
        data.employment_status = u.employment_status;
      if (u.manager_id !== undefined) data.manager_id = u.manager_id || null;

      if (u.bank_name !== undefined) data.bank_name = u.bank_name;
      if (u.account_number !== undefined)
        data.account_number = u.account_number;
      if (u.branch !== undefined) data.branch = u.branch;
      if (u.contract_type !== undefined) data.contract_type = u.contract_type;

      if (u.salary !== undefined && u.salary !== "") {
        data.salary = u.salary;
      }

      if (Object.keys(data).length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "No valid fields to update" });
      }

      data.employee_verified = false;
      const employee = await prisma.employee.update({
        where: { id },
        data,
        include: {
          user: true,
          manager: true,
          emergencyContacts: true,
          documents: true,
          assets: true,
        },
      });

      if (u.email) {
        await prisma.user
          .update({
            where: { id: employee.user_id },
            data: { email: u.email },
          })
          .catch(() => {});
      }

      res.json({
        success: true,
        message: "Employee updated",
        data: {
          ...employee,
          name: `${employee.first_name} ${employee.last_name}`.trim(),
        },
      });
    } catch (error: any) {
      if (error.code === "P2025") {
        return res
          .status(404)
          .json({ success: false, message: "Employee not found" });
      }
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async delete(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;

      const employee = await prisma.employee.findUnique({
        where: { id },
        select: { user_id: true },
      });

      if (!employee) {
        return res
          .status(404)
          .json({ success: false, message: "Employee not found" });
      }

      await prisma.user.delete({ where: { id: employee.user_id } });

      res.json({ success: true, message: "Employee deleted successfully" });
    } catch (error: any) {
      if (error.code === "P2025") {
        return res
          .status(404)
          .json({ success: false, message: "Employee not found" });
      }
      res.status(400).json({ success: false, message: error.message });
    }
  }
  static async verifyEmployee(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;

      const employee = await prisma.employee.update({
        where: { id },
        data: {
          employee_verified: true,
        },
      });

      return res.json({
        success: true,
        message: "Employee verified successfully",
        data: employee,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  // Replace the uploadProfileImage method in EmployeeController with this:

  static async uploadProfileImage(req: Request, res: Response) {
    try {
      const file = req.file;
      const { id } = req.params;

      if (!file) {
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded" });
      }

      if (!file.mimetype.startsWith("image/")) {
        return res
          .status(400)
          .json({ success: false, message: "Only image files allowed" });
      }

      await ensureBucket(EMPLOYEE_FILES_BUCKET);

      const fileName = `profile/${id}/${Date.now()}-${file.originalname}`;
      const fileUrl = `${MINIO_BASE_URL}/${EMPLOYEE_FILES_BUCKET}/${fileName}`;

      await minioClient.putObject(
        EMPLOYEE_FILES_BUCKET,
        fileName,
        file.buffer,
        file.size,
        {
          "Content-Type": file.mimetype,
        },
      );

      const updatedEmployee = await prisma.employee.update({
        where: { id },
        data: { profile_image: fileUrl },
      });

      return res.json({
        success: true,
        message: "Profile image uploaded",
        data: updatedEmployee,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}
