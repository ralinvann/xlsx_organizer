import { Router } from "express";
import { listActivityLogs } from "../controllers/activityLogController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, listActivityLogs);

export default router;
