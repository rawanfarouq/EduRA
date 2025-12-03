// models/Review.js
import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tutorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tutor',
      required: true,
      index: true,
    },
    // 🆕 which course this review is about
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: false, // can be optional for old reviews
      index: true,
    },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, maxlength: 2000 },
  },
  { timestamps: true }
);

// 🆕 one review per (student, tutor, course) combo
reviewSchema.index(
  { reviewerId: 1, tutorId: 1, courseId: 1 },
  { unique: true }
);

export default mongoose.model('Review', reviewSchema);
