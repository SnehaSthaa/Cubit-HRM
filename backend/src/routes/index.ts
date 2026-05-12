import { Router } from "express";
import authRoutes from "./auth.routes.js";
import employeeRoutes from "./employee.routes.js";
import attendanceRoutes from "./attendance.routes.js";
import leaveRoutes from "./leave.routes.js";
import payrollRoutes from "./payroll.routes.js";
import assetRoutes from "./asset.routes.js";
import holidaysRoutes from "./holidays.routes.js";
import leavePolicyRoutes from "./policy.routes.js";
import employeeDocumentRoutes from "./employee.document.routes.js";
import employeeEmergencyRoutes from "./employee.emergency.routes.js";
import userRoutes from "./user.routes.js";
import personalDetailRoutes from "./personal.details.js";
import bankDetailRoutes from "./bank.details.routes.js";
const router = Router();

router.use("/api/auth", authRoutes);
router.use("/api/users", userRoutes);
router.use("/api/employees", employeeRoutes);
router.use("/api/attendance", attendanceRoutes);
router.use("/api/leaves", leaveRoutes);
router.use("/api/payroll", payrollRoutes);
router.use("/api/assets", assetRoutes);
router.use("/api/holidays", holidaysRoutes);
router.use("/api/leave-policies", leavePolicyRoutes);
router.use("/api/employee-documents", employeeDocumentRoutes);
router.use("/api/employees", employeeEmergencyRoutes);
router.use("/api/employees", personalDetailRoutes);
router.use("/api/employees", bankDetailRoutes);

router.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Server is running" });
});

export default router;
