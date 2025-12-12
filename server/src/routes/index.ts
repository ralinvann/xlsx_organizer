// routes/index.ts
import { Router } from 'express';
import authRoutes from '../routes/authRoutes';
import userRoutes from '../routes/userRoutes';
import elderlyMonthlyReportRoutes from '../routes/elderlyMonthlyReportRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/elderly-reports', elderlyMonthlyReportRoutes);

export default router;