import { Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { ApiResponse } from "../types/index.js";

export class BankDetailController {
  static async get(req: Request, res: Response<ApiResponse>) {
    try {
      const { employeeId } = req.params;

      const bank = await prisma.bankDetail.findUnique({
        where: { employee_id: employeeId },
      });

      if (!bank) {
        return res
          .status(404)
          .json({ success: false, message: "Bank details not found" });
      }

      res.json({
        success: true,
        message: "Bank details retrieved",
        data: bank,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async upsert(req: Request, res: Response<ApiResponse>) {
    try {
      const { employeeId } = req.params;
      const body = req.body;

      if (
        !body.account_number ||
        !body.salary ||
        !body.bank_name ||
        !body.branch
      ) {
        return res.status(400).json({
          success: false,
          message: "account_number, salary, bank_name, branch are required",
        });
      }

      const [bank] = await prisma.$transaction([
        prisma.bankDetail.upsert({
          where: { employee_id: employeeId },
          update: {
            ...(body.account_number !== undefined && {
              account_number: body.account_number,
            }),
            ...(body.salary !== undefined && { salary: body.salary }),
            ...(body.bank_name !== undefined && { bank_name: body.bank_name }),
            ...(body.branch !== undefined && { branch: body.branch }),
            ...(body.contract_type !== undefined && {
              contract_type: body.contract_type,
            }),
          },
          create: {
            employee_id: employeeId,
            account_number: body.account_number,
            salary: body.salary,
            bank_name: body.bank_name,
            branch: body.branch,
            ...(body.contract_type && { contract_type: body.contract_type }),
          },
        }),
        prisma.employee.update({
          where: { id: employeeId },
          data: { employee_verified: false },
        }),
      ]);

      res.json({ success: true, message: "Bank details saved", data: bank });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}
