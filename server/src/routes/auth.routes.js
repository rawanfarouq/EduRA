// routes/auth.routes.js
import fs from 'fs';
import path from 'path';

import { Router } from 'express';
import multer from 'multer';

import {
  login,
  register,
  me,
  logout,
  refresh,
  simpleResetPassword,
} from '../controllers/auth.controller.js';
// import { login, register, me, logout, refresh,forgotPassword,
//   resetPassword, } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';

// Ensure upload dir exists: uploads/cv
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'cv');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Multer storage that ensures .pdf filenames
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    // sanitize base name & force .pdf extension
    const base = (file.originalname || 'cv')
      .replace(/\s+/g, '_')
      .replace(/[^\w.-]/g, '');
    const stem = base.replace(/\.[^.]+$/i, ''); // drop original ext
    const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    cb(null, `${stem}_${unique}.pdf`);
  },
});

// PDF-only file filter
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'), false);
  },
});

const router = Router();
router.post('/register', upload.single('cv'), register);
router.post('/login', login);
router.get('/me', requireAuth, me);
router.post('/refresh', refresh);
router.post('/logout', requireAuth, logout);
router.post('/reset-password-simple', simpleResetPassword);

// router.post('/forgot-password', forgotPassword);
// router.post('/reset-password/:token', resetPassword);
export default router;
