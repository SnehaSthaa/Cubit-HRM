import { Router } from "express";
import { AssetController } from "../controllers/asset.controller.js";
import {
  authenticate,
  authorize,
  hasRequiredPermission,
} from "../middleware/auth.js";
import { AssetsAction } from "@/permissions/permission.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  hasRequiredPermission([AssetsAction.View]),
  AssetController.getAll,
);
router.post(
  "/",
  authorize("hr_admin", "super_admin"),
  hasRequiredPermission([AssetsAction.Create]),
  AssetController.create,
);
router.patch(
  "/:id/assign",
  authorize("hr_admin", "super_admin"),
  hasRequiredPermission([AssetsAction.Edit]),
  AssetController.assign,
);

router.get(
  "/:id",
  hasRequiredPermission([AssetsAction.View]),
  AssetController.getById,
);
router.patch(
  "/:id/unassign",
  authorize("hr_admin", "super_admin"),
  hasRequiredPermission([AssetsAction.Edit]),
  AssetController.unassign,
);
router.delete(
  "/:id",
  authorize("hr_admin", "super_admin"),
  hasRequiredPermission([AssetsAction.Delete]),
  AssetController.delete,
);
router.put(
  "/:id",
  authorize("hr_admin", "super_admin"),
  hasRequiredPermission([AssetsAction.Edit]),
  AssetController.update,
);

export default router;
