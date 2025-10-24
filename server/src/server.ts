import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { connectDB } from './db/db';
import apiRoutes from './routes'; // Centralized routes

dotenv.config({ path: './.env' });

const app = express();
// Fix CORS: allow credentials and set specific origin
app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true
}));

app.use(bodyParser.json());

// Connect DB
connectDB()
  .then(() => console.log('Database connected'))
  .catch((err) => {
    console.error('DB connection failed:', err);
    process.exit(1);
  });

// Root endpoint
app.get('/home', (req: Request, res: Response) => {
  res.send('Welcome to the AI Model API');
});

// Centralized API routing
app.use('/api', apiRoutes);


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
