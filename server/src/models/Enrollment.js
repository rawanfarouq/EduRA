import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'dropped'],
      default: 'pending',
      index: true,
    },
    progress: { type: Number, min: 0, max: 100, default: 0 },

    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
    },

    startedAt: Date,
    completedAt: Date,
  },
  

  { timestamps: true },
);

// prevent duplicate enrollment
enrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

export default mongoose.model('Enrollment', enrollmentSchema);
