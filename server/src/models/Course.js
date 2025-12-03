import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },

    // ✅ was: subjectId
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", index: true },

    // instructor = Tutor document
    instructorId: { type: mongoose.Schema.Types.ObjectId, ref: "Tutor", required: false, index: true , default: null},

    description: { type: String, maxlength: 4000 },
    price: { type: Number, min: 0, default: 0 },

    prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],

    language: { type: String, default: "en" },
    level: { type: String, enum: ["beginner", "intermediate", "advanced"], default: "beginner" },

    // optional: for limiting class size
    maxStudents: { type: Number, min: 0, default: 0 },

    isPublished: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// search
courseSchema.index({ title: "text", description: "text" });

export default mongoose.model("Course", courseSchema);
