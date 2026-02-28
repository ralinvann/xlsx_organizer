import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
  throw new Error('MONGO_URI is not defined. Check your .env file.');
}

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB successfully!');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};
