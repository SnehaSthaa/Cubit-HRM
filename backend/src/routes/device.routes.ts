import { Router } from "express";
import { DeviceController } from "../controllers/device.controller.js";
import { authenticate, hasRequiredPermission } from "../middleware/auth.js";
import { DeviceAction } from "@/permissions/permission.js";

const router = Router();

router.use(authenticate);

// ── Static / prefixed routes BEFORE parameterized ones ───────────────────────

router.get(
  "/mappings/all",
  hasRequiredPermission([DeviceAction.View]),
  DeviceController.getAllMappings,
);

router.post(
  "/mappings",
  hasRequiredPermission([DeviceAction.Create]),
  DeviceController.addMapping,
);

router.delete(
  "/mappings/:id",
  hasRequiredPermission([DeviceAction.Delete]),
  DeviceController.removeMapping,
);

// ── Root routes ───────────────────────────────────────────────────────────────

router.get(
  "/",
  hasRequiredPermission([DeviceAction.View]),
  DeviceController.getAll,
);

router.post(
  "/",
  hasRequiredPermission([DeviceAction.Create]),
  DeviceController.create,
);

// ── Parameterized routes last ─────────────────────────────────────────────────

router.get(
  "/:id",
  hasRequiredPermission([DeviceAction.View]),
  DeviceController.getById,
);

router.patch(
  "/:id",
  hasRequiredPermission([DeviceAction.Update]),
  DeviceController.update,
);

router.delete(
  "/:id",
  hasRequiredPermission([DeviceAction.Delete]),
  DeviceController.delete,
);

router.post(
  "/:id/ping",
  hasRequiredPermission([DeviceAction.View]),
  DeviceController.ping,
);

router.post(
  "/:id/sync",
  hasRequiredPermission([DeviceAction.Sync]),
  DeviceController.sync,
);

router.get(
  "/:id/mappings",
  hasRequiredPermission([DeviceAction.View]),
  DeviceController.getMappings,
);

export default router;
