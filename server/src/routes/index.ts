// routes/index.ts
import { Router } from 'express';
import puskesmasRoutes from '../routes/puskesmasRoute';

const router = Router();

router.use('/puskesmas', puskesmasRoutes);

export default router;
