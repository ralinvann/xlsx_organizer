import express from 'express';
import {
  excelUpload,
  getAllPuskesmas,
  getPuskesmasById,
  updatePuskesmas,
  uploadPuskesmasExcel
} from '../controllers/puskesmasController';

const router = express.Router();
const asyncHandler = (fn: any) => (req: express.Request, res: express.Response, next: express.NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.get('/', getAllPuskesmas);
router.get('/:id', getPuskesmasById);
router.put('/:id', updatePuskesmas);
router.post('/upload', excelUpload, asyncHandler(uploadPuskesmasExcel));

export default router;
