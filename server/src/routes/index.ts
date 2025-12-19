// routes/index.ts
import { Router } from 'express';
import authRoutes from '../routes/authRoutes';
import userRoutes from '../routes/userRoutes';
import elderlyMonthlyReportRoutes from '../routes/elderlyMonthlyReportRoutes';
import uploadRoutes from '../routes/uploadRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/elderly-reports', elderlyMonthlyReportRoutes);
router.use('/upload', uploadRoutes);

export default router;