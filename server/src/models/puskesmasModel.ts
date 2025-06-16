// models/puskesmas.js
import mongoose from "mongoose";

const puskesmasSchema = new mongoose.Schema({
  name: { type: String, required: true },
  kabupaten: { type: String, required: true },
  desaList: [{ type: String }]
});

const puskesmas = mongoose.model("Puskesmas", puskesmasSchema);
export default puskesmas;
