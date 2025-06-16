import express from 'express';
import {
  getAllPuskesmas,
  getPuskesmasById,
  updatePuskesmas
} from '../controllers/puskesmasController';

const router = express.Router();

router.get('/', getAllPuskesmas);
router.get('/:id', getPuskesmasById);
router.put('/:id', updatePuskesmas);

export default router;
