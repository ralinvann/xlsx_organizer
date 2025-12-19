import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./db/db";
import apiRoutes from "./routes";

dotenv.config({ path: "./.env" });

const app = express();

// CORS
app.use(
  cors({
    origin: ["http://localhost:3001", "https://xlsx-organizer.onrender.com"],
    credentials: true,
  })
);

// Use Express JSON parser (no need for body-parser)
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

// Connect DB
connectDB()
  .then(() => console.log("Database connected"))
  .catch((err) => {
    console.error("DB connection failed:", err);
    process.exit(1);
  });

// Root endpoint
app.get("/home", (_req: Request, res: Response) => {
  res.send("Welcome to the AI Model API");
});

// Centralized API routing
app.use("/api", apiRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
