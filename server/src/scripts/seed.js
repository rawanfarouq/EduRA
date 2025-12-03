import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import StudentProfile from '../models/StudentProfile.js';
import Tutor from '../models/Tutor.js';
import AdminProfile from '../models/AdminProfile.js';

async function ensureUser({ name, email, password, role }) {
  let user = await User.findOne({ email }).select('_id role');
  if (!user) {
    const passwordHash = await bcrypt.hash(password, 10);
    user = await User.create({ name, email, passwordHash, role });
    console.log(`Created user ${email} (${role})`);
  } else {
    console.log(`User exists ${email} (${user.role})`);
  }
  return user;
}

async function ensureProfiles(user) {
  if (user.role === 'student') {
    const exists = await StudentProfile.findOne({ userId: user._id });
    if (!exists) await StudentProfile.create({ userId: user._id });
  }
  if (user.role === 'tutor') {
    const exists = await Tutor.findOne({ userId: user._id });
    if (!exists)
      await Tutor.create({
        userId: user._id,
        subjects: [],
        availability: [],
        timezone: 'UTC',
      });
  }
  if (user.role === 'admin') {
    const exists = await AdminProfile.findOne({ userId: user._id });
    if (!exists) await AdminProfile.create({ userId: user._id });
  }
}

(async () => {
  try {
    await connectDB();

    const admin = await ensureUser({
      name: 'Admin One',
      email: 'admin@demo.com',
      password: 'Admin@123',
      role: 'admin',
    });
    const tutor = await ensureUser({
      name: 'Tutor One',
      email: 'tutor@demo.com',
      password: 'Tutor@123',
      role: 'tutor',
    });
    const student = await ensureUser({
      name: 'Student One',
      email: 'student@demo.com',
      password: 'Student@123',
      role: 'student',
    });

    await ensureProfiles(tutor);
    await ensureProfiles(student);
    await ensureProfiles(admin);

    console.log('✅ Seed complete');
    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error('Seed error:', e);
    process.exit(1);
  }
})();
