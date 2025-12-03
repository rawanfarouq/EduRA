// models/Assignment.js
import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema(
  { key: String, url: String, size: Number, mime: String },
  { _id: false },
);

// 👉 NEW: question schema for MCQ / True-False
const questionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    type: {
      type: String,
      enum: ['mcq', 'boolean'],
      default: 'mcq',
    }, // 'mcq' or 'boolean'
    options: [{ type: String }], // for MCQ or ["True","False"] for boolean
    correctIndex: { type: Number }, // index in options[] (0-based)
  },
  { _id: false },
);

const assignmentSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tutorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tutor' },

    // 🔗 link to booking
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      index: true,
    },

    files: [fileSchema],

    // 📝 NEW: quiz-based assignment fields
    questions: [questionSchema],           // AI-generated questions
    studentAnswers: [{ type: Number }],    // indices chosen by student (per question)
    status: {
      type: String,
      enum: ['created', 'submitted', 'graded'],
      default: 'created',
      index: true,
    },

    // keep old grade/comments but make them match quiz
    grade: { type: String, default: '' },  // e.g. "80/100"
    numericGrade: { type: Number },        // 0 – 100
    aiFeedback: { type: String, default: '' }, // textual feedback from AI
    comments: { type: String, default: '' },
  },
  { timestamps: true },
);

assignmentSchema.index({ courseId: 1, studentId: 1 });

export default mongoose.model('Assignment', assignmentSchema);
