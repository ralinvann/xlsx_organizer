import mongoose from "mongoose";
import * as dotenv from "dotenv";

dotenv.config();

async function resetDb() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI is not defined in .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection is not ready.");
    }
    const dbName = db.databaseName;
    console.log(`Connected to MongoDB database: ${dbName}`);

    // WARNING: this drops the entire database referenced by MONGO_URI.
    // Use only in development.
    await db.dropDatabase();
    console.log(`Dropped database '${dbName}'.`);
  } catch (err) {
    console.error("Error resetting database:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

resetDb();
