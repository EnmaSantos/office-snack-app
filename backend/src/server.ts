// Server entry point
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';

import { initDb } from './db';
import { seedDatabase } from './db/seed';
import { startWeeklyCreditJob } from './services/weeklyCreditJob';

import authRoutes from './routes/auth';
import snackRoutes from './routes/snacks';
import userRoutes from './routes/users';
import adminRoutes from './routes/admin';
import snackRequestRoutes from './routes/snackRequests';

const PORT = parseInt(process.env.PORT || '3000', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

async function main(): Promise<void> {
  // 1. Initialize database
  await initDb();

  // 2. Seed database (creates tables, seeds default snacks if empty)
  seedDatabase();

  // 3. Create Express app
  const app = express();

  // --- Middleware ---

  // Parse JSON bodies
  app.use(express.json());

  // Parse cookies
  app.use(cookieParser());

  // CORS — allow frontend origin with credentials
  const frontendOrigins = FRONTEND_URL.split(',').map(s => s.trim()).filter(Boolean);
  app.use(cors({
    origin: frontendOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'Cookie'],
  }));

  // Session (cookie-based, replacing .NET cookie auth)
  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
    name: 'SnackTracker.Auth',
  }));

  // --- Routes ---
  app.use('/api/auth', authRoutes);
  app.use('/api/snacks', snackRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/snackrequests', snackRequestRoutes);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 4. Start weekly credit distribution cron job
  startWeeklyCreditJob();

  // 5. Start listening
  app.listen(PORT, () => {
    console.log(`\n🚀 SnackTracker API (Node.js) listening on http://localhost:${PORT}`);
    console.log(`   Frontend URL: ${FRONTEND_URL}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

main().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
