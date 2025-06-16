// controllers/puskesmasController.js
import Puskesmas from "../models/puskesmas.js";

export const createPuskesmas = async (req, res) => {
  try {
    const { name, kabupaten, desaList } = req.body;
    const newPuskesmas = new Puskesmas({ name, kabupaten, desaList });
    await newPuskesmas.save();
    res.status(201).json(newPuskesmas);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getAllPuskesmas = async (req, res) => {
  try {
    const data = await Puskesmas.find();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPuskesmasById = async (req, res) => {
  try {
    const puskesmas = await Puskesmas.findById(req.params.id);
    if (!puskesmas) return res.status(404).json({ message: "Not found" });
    res.json(puskesmas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
