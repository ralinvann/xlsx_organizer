// routes/elderlyMonthlyReportRoutes.ts
import { Router } from "express";
import {
  createElderlyMonthlyReport,
  downloadElderlyMonthlyReport,
  deleteElderlyMonthlyReport,
  getElderlyMonthlyReports,
  getElderlyMonthlyReportById,
  ElderlyMonthlyReportController,
  downloadAnnualReportA,
  downloadAnnualReportB,
} from "../controllers/elderlyMonthlyReportController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/", requireAuth, createElderlyMonthlyReport);
router.get("/", getElderlyMonthlyReports);

router.get("/dashboard", ElderlyMonthlyReportController.getDashboardData);

// Annual report downloads — must come before /:id routes
router.get("/annual/:year/report-a", downloadAnnualReportA);
router.get("/annual/:year/report-b", downloadAnnualReportB);

router.get("/:id/download", downloadElderlyMonthlyReport);

router.get("/:id", getElderlyMonthlyReportById);
router.delete("/:id", requireAuth, deleteElderlyMonthlyReport);

export default router;