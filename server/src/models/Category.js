import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 80,
    },
    description: { type: String, maxlength: 2000 },
  },
  { timestamps: true },
);

categorySchema.index({ name: 1 }, { unique: true });

export default mongoose.model('Category', categorySchema);