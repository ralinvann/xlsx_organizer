// routes/elderlyMonthlyReportRoutes.ts
import { Router } from "express";
import {
  createElderlyMonthlyReport,
  getElderlyMonthlyReports,
  getElderlyMonthlyReportById,
  ElderlyMonthlyReportController,
} from "../controllers/elderlyMonthlyReportController";

const router = Router();

router.post("/", createElderlyMonthlyReport);
router.get("/", getElderlyMonthlyReports);

router.get("/dashboard", ElderlyMonthlyReportController.getDashboardData);

router.get("/:id", getElderlyMonthlyReportById);

export default router;