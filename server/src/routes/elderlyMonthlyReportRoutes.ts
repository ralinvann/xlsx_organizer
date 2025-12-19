import { Router } from "express";
import {
  createElderlyMonthlyReport,
  getElderlyMonthlyReports,
  getElderlyMonthlyReportById,
  getElderlyMonthlyReportSummary,
} from "../controllers/elderlyMonthlyReportController";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/summary", asyncHandler(getElderlyMonthlyReportSummary));
router.get("/", asyncHandler(getElderlyMonthlyReports));
router.get("/:id", asyncHandler(getElderlyMonthlyReportById));
router.post("/", requireAuth, asyncHandler(createElderlyMonthlyReport));

export default router;
