// routes/elderlyMonthlyReportRoutes.ts
import { Router } from "express";
import {
  createElderlyMonthlyReport,
  getElderlyMonthlyReports,
  getElderlyMonthlyReportById,
  getDashboardData,
} from "../controllers/elderlyMonthlyReportController";

const router = Router();

router.post("/", createElderlyMonthlyReport);
router.get("/", getElderlyMonthlyReports);

router.get("/dashboard", getDashboardData);

router.get("/:id", getElderlyMonthlyReportById);

export default router;