import crypto from 'crypto';

import bcrypt from 'bcryptjs';

import User from '../models/User.js';
import StudentProfile from '../models/StudentProfile.js';
import AdminProfile from '../models/AdminProfile.js';
import Tutor from '../models/Tutor.js';
import { verifyRefresh, signAccess, signRefresh } from '../utils/jwt.js';

const isProd = process.env.NODE_ENV === 'production';

const refreshCookieOptions = {
  httpOnly: true,
  // For cross-site cookies (frontend ↔ backend on different domains)
  sameSite: isProd ? 'none' : 'lax',
  secure: isProd, // must be true when sameSite is 'none'
  path: '/api/auth/refresh',
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
};

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// POST /api/auth/register
export const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = 'student',
      birthdate,
      gender,
      schoolOrUniversity,
      grade,
      bio,
      experienceYears,
      achievements,
      languages,
      hourlyRate,
      availability,
      timezone,
      courses,
    } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: 'Missing required fields' });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(409).json({ message: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      birthdate: birthdate ? new Date(birthdate) : undefined,
      gender,
    });

    if (role === 'student') {
      await StudentProfile.create({
        userId: user._id,
        schoolOrUniversity,
        grade,
      });
    }

    if (role === 'admin') {
      await AdminProfile.create({ userId: user._id });
    }

    // controllers/auth.controller.js (inside register)
    if (role === 'tutor') {
      let cvUrl = '';
      if (req.file) {
        // Double-check mimetype (defense in depth)
        if (req.file.mimetype !== 'application/pdf') {
          return res.status(400).json({ message: 'CV must be a PDF file' });
        }
        // Multer storage already gave a .pdf filename in /uploads/cv/
        cvUrl = `/uploads/cv/${req.file.filename}`;
      }

      // Helpers to normalize arrays
      const toArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);

      let avail = availability;
      if (typeof avail === 'string') {
        try {
          avail = JSON.parse(avail);
        } catch {
          avail = [];
        }
      }
      if (!Array.isArray(avail)) avail = [];

      await Tutor.create({
        userId: user._id,
        bio: bio || '',
        courses: toArray(courses),
        experienceYears: Number(experienceYears) || 0,
        achievements: toArray(achievements),
        languages: toArray(languages),
        hourlyRate: Number(hourlyRate) || 0,
        availability: avail,
        cvUrl, // ← stored as a .pdf path
        timezone: timezone || 'UTC',
      });
    }

    const accessToken = signAccess({ sub: user._id, role: user.role });
    const refreshToken = signRefresh({
      sub: user._id,
      tv: user.tokenVersion || 0,
    });

    return res
      .cookie('refreshToken', refreshToken, refreshCookieOptions) // ← unified name
      .status(201)
      .json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        accessToken,
      });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Missing credentials' });

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (user.isActive === false)
      return res.status(403).json({ message: 'Account disabled' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    // ✅ NEW: issue access & refresh
    const accessToken = signAccess({ sub: user._id, role: user.role });
    const refreshToken = signRefresh({
      sub: user._id,
      tv: user.tokenVersion || 0,
    });

    return res
      .cookie('refreshToken', refreshToken, refreshCookieOptions) // ← unified name
      .json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        accessToken,
      });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// GET /api/auth/me
export const me = async (req, res) => {
  const u = req.user; // from middleware
  res.json({ user: { id: u._id, name: u.name, email: u.email, role: u.role } });
};

export const refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken; // ← unified name
    if (!token) return res.status(401).json({ message: 'No refresh token' });

    const payload = verifyRefresh(token); // { sub, tv, ... }
    const user = await User.findById(payload.sub);
    if (!user || user.isActive === false)
      return res.status(401).json({ message: 'Unauthorized' });

    // tokenVersion mismatch → refresh token invalid
    if ((user.tokenVersion || 0) !== payload.tv) {
      return res.status(401).json({ message: 'Invalid refresh' });
    }

    // rotate refresh (optional but recommended)
    const newRefresh = signRefresh({ sub: user._id, tv: user.tokenVersion });
    res.cookie('refreshToken', newRefresh, refreshCookieOptions); // ← unified name

    // always issue a fresh access token
    const accessToken = signAccess({ sub: user._id, role: user.role });
    return res.json({ accessToken });
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

// POST /api/auth/logout
export const logout = async (req, res) => {
  if (req.user?._id) {
    await User.findByIdAndUpdate(req.user._id, { $inc: { tokenVersion: 1 } });
  }
  res.clearCookie('refreshToken', { ...refreshCookieOptions, maxAge: 0 }); // ← unified name
  res.json({ message: 'Logged out' });
};

// POST /api/auth/reset-password-simple
export const simpleResetPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and new password are required' });
    }

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    user.passwordHash = passwordHash;
    await user.save();

    return res.json({ message: 'Password updated successfully' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: e.message });
  }
};

/*
// POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });

    // Always respond with generic message to avoid leaking which emails exist
    if (!user) {
      return res.json({
        message:
          'If an account exists with this email, a reset link has been sent.',
      });
    }

    // 1) Generate token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // 2) Save token + expiry on user
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 15; // 15 mins
    await user.save();

    // 3) Build reset URL for frontend
    const resetUrl = `${CLIENT_URL}/reset-password/${resetToken}`;

    // 4) Send email here in real app (nodemailer, SendGrid, etc.)
    // For now, just log so you can test locally
    console.log('🔗 Password reset link:', resetUrl);

    return res.json({
      message:
        'If an account exists with this email, a reset link has been sent.',
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message });
  }
};

// POST /api/auth/reset-password/:token
export const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const { token } = req.params;

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }, // still valid
    }).select('+passwordHash');

    if (!user) {
      return res
        .status(400)
        .json({ message: 'Token is invalid or has expired' });
    }

    // Hash new password and save
    const newHash = await bcrypt.hash(password, 10);
    user.passwordHash = newHash;

    // Invalidate reset token
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    // (Optional) bump tokenVersion so old refresh tokens are invalid
    user.tokenVersion = (user.tokenVersion || 0) + 1;

    await user.save();

    return res.json({ message: 'Password has been reset successfully' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message });
  }
};*/
