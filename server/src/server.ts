import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { connectDB } from './db/db';
import apiRoutes from './routes';

dotenv.config({ path: './.env' });

const app = express();
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://xlsx-organizer.onrender.com',
  ],
  credentials: true,
}));

app.use(cookieParser());

// simple request logger to help diagnose hanging requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

connectDB()
  .then(() => console.log('Database connected'))
  .catch((err) => {
    console.error('DB connection failed:', err);
    process.exit(1);
  });

app.get('/home', (req: Request, res: Response) => {
  res.send('Welcome to the AI Model API');
});

app.use('/api', apiRoutes);

// catch‑all 404 handler (helps avoid hanging when client requests unknown path)
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

// global error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
