// routes/puskesmasRoutes.js
import express from "express";
import {
  createPuskesmas,
  getAllPuskesmas,
  getPuskesmasById
} from "../controllers/puskesmasController.js";

const router = express.Router();

router.post("/", createPuskesmas);
router.get("/", getAllPuskesmas);
router.get("/:id", getPuskesmasById);

export default router;
