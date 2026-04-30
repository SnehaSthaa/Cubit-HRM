import { Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { ApiResponse, Payroll } from "../types/index.js";

export class PayrollController {
  static async getAll(req: Request, res: Response<ApiResponse>) {
    try {
      const { employee_id, month, year, status } = req.query;

      const where: any = {};
      if (employee_id) where.employee_id = employee_id;
      if (month) where.month = parseInt(month as string);
      if (year) where.year = parseInt(year as string);
      if (status) where.status = status;

      const payrolls = await prisma.payroll.findMany({
        where,
        include: {
          employee: {
            include: {
              user: true
            }
          }
        },
        orderBy: { created_at: 'desc' }
      });

      res.json({
        success: true,
        message: "Payroll records retrieved",
        data: payrolls,
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
      const payrollData: Partial<Payroll> = req.body;

      if (!payrollData.employee_id || !payrollData.month || !payrollData.year) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }

      const net_salary =
        (payrollData.base_salary || 0) +
        (payrollData.bonus || 0) -
        (payrollData.deductions || 0);

      const payroll = await prisma.payroll.create({
        data: {
          employee_id: payrollData.employee_id,
          month: payrollData.month,
          year: payrollData.year,
          base_salary: payrollData.base_salary || 0,
          bonus: payrollData.bonus || 0,
          deductions: payrollData.deductions || 0,
          net_salary,
          status: 'pending'
        },
        include: {
          employee: {
            include: {
              user: true
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        message: "Payroll record created",
        data: payroll,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async process(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;

      const payroll = await prisma.payroll.update({
        where: { id },
        data: { status: 'processed' },
        include: {
          employee: {
            include: {
              user: true
            }
          }
        }
      });

      res.json({
        success: true,
        message: "Payroll processed",
        data: payroll,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: "Payroll not found",
        });
      }
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async markPaid(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;

      const payroll = await prisma.payroll.update({
        where: { id },
        data: {
          status: 'paid',
          paid_date: new Date()
        },
        include: {
          employee: {
            include: {
              user: true
            }
          }
        }
      });

      res.json({
        success: true,
        message: "Payroll marked as paid",
        data: payroll,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: "Payroll not found",
        });
      }
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}
