// routes/index.ts
import { Router } from 'express';
import authRoutes from '../routes/authRoutes';
import userRoutes from '../routes/userRoutes';
import elderlyMonthlyReportRoutes from '../routes/elderlyMonthlyReportRoutes';
import locationConfigRoutes from '../routes/locationConfigRoutes';
import activityLogRoutes from '../routes/activityLogRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/elderly-reports', elderlyMonthlyReportRoutes);
router.use('/lwreports', elderlyMonthlyReportRoutes);
router.use('/locations', locationConfigRoutes);
router.use('/activity-logs', activityLogRoutes);

export default router;