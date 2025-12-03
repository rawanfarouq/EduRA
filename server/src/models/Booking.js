import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    studentId: {
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
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },

    start: { type: Date, required: true, index: true },
    end: { type: Date, required: true },

    status: {
      type: String,
      enum: [
        'requested',        // student requested
        'awaiting_payment', // admin approved, waiting for student to pay
        'confirmed',        // paid & enrolled
        'declined',
        'canceled',
      ],
      default: 'requested',
      index: true,
    },
    price: { type: Number, min: 0 },
  },
  { timestamps: true },
);

bookingSchema.index({ tutorId: 1, start: 1, end: 1 });

export default mongoose.model('Booking', bookingSchema);
