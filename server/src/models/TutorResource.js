// server/src/models/TutorResource.js
import mongoose from 'mongoose';

const tutorResourceSchema = new mongoose.Schema(
  {
    tutorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tutor',
      required: true,
    },
    // 🔥 now required: every resource must belong to a course
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    title: { type: String, required: true },

    type: {
      type: String,
      enum: ['file', 'link'],
      required: true,
    },

    url: { type: String, required: true },
  },
  { timestamps: true }
);

// (optional but nice) unique index per tutor+course+title
tutorResourceSchema.index({ tutorId: 1, courseId: 1, title: 1 });

const TutorResource = mongoose.model('TutorResource', tutorResourceSchema);
export default TutorResource;
