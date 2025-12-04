import path from 'path';
import fs from 'fs';

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import { connectDB } from './config/db.js';

dotenv.config();

const app = express();

const uploadsRoot = path.join(process.cwd(), 'uploads');
fs.mkdirSync(uploadsRoot, { recursive: true });

// CORS whitelist for dev + prod
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

app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

const PORT = process.env.PORT || 8080;
connectDB().then(() => {
  app.listen(PORT, () =>
    console.log(`API running on http://localhost:${PORT}`),
  );
});
