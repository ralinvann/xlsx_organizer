import { Router } from "express";
import {
  createElderlyMonthlyReport,
  getElderlyMonthlyReports,
  getElderlyMonthlyReportById,
  downloadElderlyMonthlyReport,
} from "../controllers/elderlyMonthlyReportController";

const router = Router();

router.post("/", createElderlyMonthlyReport);
router.get("/", getElderlyMonthlyReports);
router.get("/:id", getElderlyMonthlyReportById);
router.get("/:id/download", downloadElderlyMonthlyReport);

export default router;
