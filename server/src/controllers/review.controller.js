// controllers/review.controller.js
import Review from "../models/Review.js";
import Tutor from "../models/Tutor.js";
import Course from "../models/Course.js"; // 🆕 import Course

export const createReview = async (req, res) => {
  try {
    const studentId = req.user?._id;
    if (!studentId) return res.status(401).json({ message: "Unauthorized" });

    const { tutorId } = req.params;
    const { rating, comment, courseId } = req.body; // 🆕 include courseId

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Invalid rating" });
    }

    // ensure tutor exists
    const tutor = await Tutor.findById(tutorId);
    if (!tutor) {
      return res.status(404).json({ message: "Tutor not found" });
    }

    // 🆕 optional: ensure course exists (if provided)
    let course = null;
    if (courseId) {
      course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
    }

    // one review per (student,tutor,course)
    const review = await Review.findOneAndUpdate(
      { reviewerId: studentId, tutorId, courseId: courseId || null },
      { rating, comment, courseId: courseId || null },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({ review });
  } catch (err) {
    console.error("createReview error:", err);
    res.status(500).json({ message: "Failed to submit review" });
  }
};

// 🆕 NEW: get reviews for the LOGGED-IN tutor
export const getMyTutorReviews = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // find Tutor doc linked to this user
    const tutor = await Tutor.findOne({ userId }).lean();
    if (!tutor) {
      return res.status(404).json({ message: "Tutor profile not found" });
    }

    const reviews = await Review.find({ tutorId: tutor._id })
      .populate({ path: "reviewerId", select: "name email" })
      .populate({ path: "courseId", select: "title" }) // 🆕 populate course
      .sort({ createdAt: -1 });

    return res.json({ reviews });
  } catch (err) {
    console.error("getMyTutorReviews error:", err);
    res.status(500).json({ message: "Failed to load reviews" });
  }
};
