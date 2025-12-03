import mongoose from 'mongoose';

const adminProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    // Optional: fine-grained permissions
    permissions: [{ type: String, trim: true }], // e.g., ["users:ban","payouts:refund"]
  },
  { timestamps: true },
);

export default mongoose.model('AdminProfile', adminProfileSchema);
