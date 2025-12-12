import { Router } from "express";
import {
  createElderlyMonthlyReport,
  getElderlyMonthlyReports,
  getElderlyMonthlyReportById,
} from "../controllers/elderlyMonthlyReportController";

const router = Router();

router.post("/", createElderlyMonthlyReport);
router.get("/", getElderlyMonthlyReports);
router.get("/:id", getElderlyMonthlyReportById);

export default router;
