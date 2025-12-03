import mongoose from 'mongoose';

const studentProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    schoolOrUniversity: { type: String, trim: true, maxlength: 120 },
    grade: { type: String, trim: true, maxlength: 40 },
    // NOTE: do NOT embed courses/assignments here; use Enrollment/Assignment collections.
  },
  { timestamps: true },
);

export default mongoose.model('StudentProfile', studentProfileSchema);
