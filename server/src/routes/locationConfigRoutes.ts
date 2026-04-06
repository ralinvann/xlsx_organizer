import { Router } from "express";
import { listLocationConfigs, upsertLocationConfig } from "../controllers/locationConfigController";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, listLocationConfigs);
router.put("/:kabupaten", requireAuth, requireRole("admin", "superadmin"), upsertLocationConfig);

export default router;
