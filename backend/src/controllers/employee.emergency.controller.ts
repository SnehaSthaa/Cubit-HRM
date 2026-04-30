import { Request, Response } from "express";
import { prisma } from "@/db/prisma";

export class EmployeeEmergencyController {
  static async addEmergencyContact(req: Request, res: Response) {
    try {
      const { employeeId } = req.params;
      const { name, relation, phone, email } = req.body;

      if (!name || !phone || !relation) {
        return res.status(400).json({
          message: "Name, phone, and relationship are required",
        });
      }

      const contact = await prisma.emergencyContact.create({
        data: {
          employee_id: employeeId,
          name,
          relation,
          phone,
          email,
        },
      });

      res.status(201).json({
        message: "Emergency contact added",
        data: contact,
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({
        message: "Failed to add contact",
        error: err.message,
      });
    }
  }
  static async getEmergencyContacts(req: Request, res: Response) {
    try {
      const { employeeId } = req.params;

      const contacts = await prisma.emergencyContact.findMany({
        where: { employee_id: employeeId },
      });

      res.status(200).json({
        message: "Emergency contacts fetched",
        data: contacts,
      });
    } catch (err: any) {
      res.status(500).json({
        message: "Failed to fetch contacts",
        error: err.message,
      });
    }
  }
  static async updateEmergencyContact(req: Request, res: Response) {
    try {
      const { employeeId, contactId } = req.params;
      const { name, relation, phone, email } = req.body;

      const existing = await prisma.emergencyContact.findFirst({
        where: {
          id: contactId,
          employee_id: employeeId,
        },
      });

      if (!existing) {
        return res.status(404).json({
          message: "Contact not found for this employee",
        });
      }

      const updated = await prisma.emergencyContact.update({
        where: { id: contactId },
        data: { name, relation, phone, email },
      });

      return res.status(200).json({
        message: "Emergency contact updated",
        data: updated,
      });
    } catch (err: any) {
      return res.status(500).json({
        message: "Failed to update contact",
        error: err.message,
      });
    }
  }
  static async deleteEmergencyContact(req: Request, res: Response) {
    try {
      const { employeeId, contactId } = req.params;

      const existing = await prisma.emergencyContact.findFirst({
        where: {
          id: contactId,
          employee_id: employeeId,
        },
      });

      if (!existing) {
        return res.status(404).json({
          message: "Contact not found for this employee",
        });
      }

      await prisma.emergencyContact.delete({
        where: { id: contactId },
      });

      return res.status(200).json({
        message: "Emergency contact deleted",
        success: true,
      });
    } catch (err: any) {
      return res.status(500).json({
        message: "Failed to delete contact",
        error: err.message,
      });
    }
  }
}
