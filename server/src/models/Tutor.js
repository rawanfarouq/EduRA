// models/Tutor.js
import mongoose from "mongoose";

const availabilitySlotSchema = new mongoose.Schema(
  {
    date: {
      type: Date,              // full date
      required: true,
    },
    day: {
      type: Number,            // 0–6 (Sun–Sat)
      required: true,
    },
    startMin: {
      type: Number,            // minutes from 00:00
      required: true,
    },
    endMin: {
      type: Number,
      required: true,
    },
  },
  { _id: true } // we need _id for editing/deleting
);

const tutorSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    bio: { type: String, maxlength: 2000 },


    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course', index: true }],


    experienceYears: { type: Number, min: 0, default: 0 },
    achievements: [{ type: String, maxlength: 200 }],
    languages: [{ type: String, trim: true }],

    hourlyRate: { type: Number, min: 0, default: 0 },

    ratingAvg: { type: Number, min: 0, max: 5, default: 0 },
    reviewsCount: { type: Number, min: 0, default: 0 },

    availability: [availabilitySlotSchema],
    cvUrl: { type: String, default: "", match: [/\.pdf$/i, "CV must be a .pdf file path"] },

    timezone: { type: String, default: "UTC" }
  },
  { timestamps: true }
);

export default mongoose.model("Tutor", tutorSchema);
