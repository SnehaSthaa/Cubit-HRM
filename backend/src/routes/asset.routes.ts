import { Router } from "express";
import { AssetController } from "../controllers/asset.controller.js";
import {
  authenticate,
  authorize,
  hasRequiredPermission,
} from "../middleware/auth.js";
import { AssetsAction } from "@/permissions/permission.js";
import { validate } from "@/middleware/validate.js";
import {
  createAssetSchema,
  updateAssetSchema,
} from "@/validators/asset.validator.js";
import { uploadAny } from "@/middleware/upload.js";

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
  validate(createAssetSchema),
  AssetController.create,
);
router.get("/export", AssetController.exportAssets);
router.post("/import", uploadAny.single("file"), AssetController.importAssets);

router.get("/take-home", AssetController.getTakeHomeRequest);
router.get(
  "/take-home/my",
  authenticate,
  AssetController.getMyTakeHomeRequests,
);
router.patch("/take-home-requests/:id", AssetController.reviewTakeHomeRequest);
router.get(
  "/:id",
  hasRequiredPermission([AssetsAction.View]),
  AssetController.getById,
);
router.put(
  "/:id",
  authorize("hr_admin", "super_admin"),
  hasRequiredPermission([AssetsAction.Edit]),
  validate(updateAssetSchema),
  AssetController.update,
);

router.patch(
  "/:id/assign",
  authorize("hr_admin", "super_admin"),
  hasRequiredPermission([AssetsAction.Edit]),
  AssetController.assign,
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

//prefix/take-home
//prefix/take-homep

router.post(
  "/:id/take-home",
  authenticate,
  AssetController.createTakeHomeRequest,
);

export default router;
