// routes/index.ts
import { Router } from 'express';
import puskesmasRoutes from '../routes/puskesmasRoute';
import authRoutes from '../routes/authRoutes';

const router = Router();

router.use('/puskesmas', puskesmasRoutes);
router.use('/auth', authRoutes);

export default router;
