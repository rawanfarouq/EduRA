import mongoose from 'mongoose';

const avatarSchema = new mongoose.Schema(
  {
    data: Buffer, // actual image bytes
    contentType: String, // e.g., "image/png"
  },
  { _id: false },
);

/* Student-only fields */
const studentSubSchema = new mongoose.Schema(
  {
    schoolOrUniversity: { type: String, trim: true, maxlength: 120 },
    grade: { type: String, trim: true, maxlength: 40 },
  },
  { _id: false },
);

/* Tutor-only fields */
const availabilitySlotSchema = new mongoose.Schema(
  {
    // 0 = Sun .. 6 = Sat
    day: { type: Number, min: 0, max: 6, required: true },
    // minutes since midnight
    startMin: { type: Number, min: 0, max: 1439, required: true },
    endMin: { type: Number, min: 1, max: 1440, required: true },
  },
  { _id: false },
);

const tutorSubSchema = new mongoose.Schema(
  {
    subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
    availability: [availabilitySlotSchema],
    timezone: { type: String, default: 'UTC' },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false }, // never return by default
    role: {
      type: String,
      enum: ['student', 'tutor', 'admin'],
      default: 'student',
      index: true,
    },
    resetPasswordExpires: Date,

    // ✅ avatar stored inside Mongo as binary
    avatar: avatarSchema,

    birthdate: { type: Date },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_say'],
    },

    // models/User.js
    tokenVersion: { type: Number, default: 0 },

    // role-specific embedded subdocs (optional)
    student: studentSubSchema,
    tutor: tutorSubSchema,

    // Optional (prod-friendly) account state
    isEmailVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String, select: false },
    emailVerifyTokenExp: { type: Date, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExp: { type: Date, select: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });

export default mongoose.model('User', userSchema);
