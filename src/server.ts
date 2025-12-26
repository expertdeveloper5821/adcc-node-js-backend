import dotenv from 'dotenv';

// Load environment variables FIRST, before any other imports
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { connectDB } from './data/database';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';
import { notFound } from './middleware/not-found.middleware';

const app = express();
const PORT = process.env.PORT || 3000;
const API_VERSION = process.env.API_VERSION || 'v1';

// Connect database
connectDB();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Route
app.use(`/${API_VERSION}`, routes);
// Error handling
app.use(notFound as any);
app.use(errorHandler as any);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});