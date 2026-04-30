import { Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { ApiResponse } from "../types/index.js";

export class LeavePolicyController {
  // GET ALL POLICIES
  static async getAll(req: Request, res: Response<ApiResponse>) {
    try {
      const policies = await prisma.leavePolicy.findMany({
        orderBy: { created_at: "desc" },
      });

      res.json({
        success: true,
        message: "Leave policies fetched successfully",
        data: policies,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // CREATE POLICY
  static async create(req: Request, res: Response<ApiResponse>) {
    try {
      const {
        name,
        type,
        annual_quota,
        pro_rata,
        carry_forward,
        max_carry_forward,
        description,
        active,
      } = req.body;

      if (!name || !type) {
        return res.status(400).json({
          success: false,
          message: "Name and type are required",
        });
      }

      const policy = await prisma.leavePolicy.create({
        data: {
          name,
          type,
          annual_quota: Number(annual_quota) || 0,
          pro_rata: Boolean(pro_rata),
          carry_forward: Boolean(carry_forward),
          max_carry_forward: Number(max_carry_forward) || 0,
          description,
          active: active ?? true,
        },
      });

      res.status(201).json({
        success: true,
        message: "Leave policy created successfully",
        data: policy,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // UPDATE POLICY
  static async update(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;

      const {
        name,
        type,
        annual_quota,
        pro_rata,
        carry_forward,
        max_carry_forward,
        description,
        active,
      } = req.body;

      const policy = await prisma.leavePolicy.update({
        where: { id },
        data: {
          name,
          type,
          annual_quota,
          pro_rata,
          carry_forward,
          max_carry_forward,
          description,
          active,
        },
      });

      res.json({
        success: true,
        message: "Leave policy updated successfully",
        data: policy,
      });
    } catch (error: any) {
      if (error.code === "P2025") {
        return res.status(404).json({
          success: false,
          message: "Policy not found",
        });
      }

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // DELETE POLICY
  static async remove(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;

      await prisma.leavePolicy.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: "Leave policy deleted successfully",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}
