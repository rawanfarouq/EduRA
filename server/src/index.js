import path from 'path';
import fs from 'fs';

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import categoryRoutes from './routes/category.routes.js';
import adminRoutes from './routes/admin.routes.js';
import coursePublicRoutes from './routes/courses.routes.js';
import tutorRoutes from './routes/tutor.routes.js';
import aiRoutes from './routes/ai.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import bookingsRouter from './routes/bookings.routes.js';
import enrollmentsRoutes from './routes/enrollments.routes.js';
import paymentsRoutes from './routes/payments.routes.js';
import testRoutes from './routes/test.routes.js';
import officeHoursRoutes from './routes/officeHours.routes.js';
import reviewRoutes from './routes/review.routes.js';

dotenv.config();

const app = express();

// ✅ ensure uploads dir exists
const uploadsRoot = path.join(process.cwd(), 'uploads');
fs.mkdirSync(uploadsRoot, { recursive: true });

// ✅ CORS whitelist for dev + prod
const whitelist = [
  'http://localhost:5173', // local dev
  'https://edura-client.onrender.com', // Render frontend
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow server-to-server / curl (no origin) and whitelisted origins
      if (!origin || whitelist.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

// ✅ health check for Render
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', time: new Date().toISOString() }),
);

// ✅ static uploads
app.use('/uploads', express.static(uploadsRoot));

// ✅ API routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/courses', coursePublicRoutes);
app.use('/api/tutor', tutorRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/bookings', bookingsRouter);
app.use('/api/enrollments', enrollmentsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/test', testRoutes);
app.use('/api/office-hours', officeHoursRoutes);
app.use('/api/reviews', reviewRoutes);

const PORT = process.env.PORT || 8080;

connectDB().then(() => {
  app.listen(PORT, () =>
    console.log(`API running on http://localhost:${PORT}`),
  );
});
