import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import authRoutes from './routes/authRoutes';
import { errorHandler } from './middleware/errorHandler';
import bookRoutes from './routes/bookRoutes';
import ticketRoutes from './routes/ticketRoutes';

export const app = express();

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth Routes
app.use('/api/auth', authRoutes);

// Book Routes
app.use('/api/books', bookRoutes);

// Ticket Routes
app.use('/api/tickets', ticketRoutes);

// Admin Routes
import adminRoutes from './routes/adminRoutes';
app.use('/api/admin', adminRoutes);

// Centralized error handler
app.use(errorHandler);
