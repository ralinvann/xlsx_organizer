import { Router } from "express";
import {
  createElderlyMonthlyReport,
  getElderlyMonthlyReports,
  getElderlyMonthlyReportById,
  getElderlyMonthlyReportSummary,
} from "../controllers/elderlyMonthlyReportController";

const router = Router();

// summary for dashboard
router.get("/summary", getElderlyMonthlyReportSummary);

// list + detail
router.get("/", getElderlyMonthlyReports);
router.get("/:id", getElderlyMonthlyReportById);

// create (import)
router.post("/", createElderlyMonthlyReport);

export default router;
