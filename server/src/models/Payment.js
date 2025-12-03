// models/Payment.js
import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      index: true,
    },
    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enrollment',
      index: true,
    },

    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
    provider: { type: String, enum: ['stripe', 'paypal'], default: 'stripe' },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'], // ⬅️ added "failed"
      default: 'pending',
      index: true,
    },

    receiptUrl: String,

    // optional extra info
    providerMeta: {
      type: Object,
    },
  },
  { timestamps: true },
);

export default mongoose.model('Payment', paymentSchema);
