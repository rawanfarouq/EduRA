// src/routes/ai.routes.js
import { Router } from "express";
import multer from "multer";

import {
  suggestCoursesFromCV,
  suggestCoursesForTutorCV,createAIQuizForBooking, getAssignmentById, gradeAssignmentWithAI,getAssignmentForBookingTutor
} from "../controllers/ai.controller.js";
import { requireAuth } from "../middleware/auth.js";

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = Router();

// Upload CV (used in RegisterForm)
router.post("/suggest-courses", upload.single("cv"), suggestCoursesFromCV);

// ✨ NEW: use stored tutor CV (for Tutor Dashboard)
router.get("/tutor-courses", requireAuth, suggestCoursesForTutorCV);

router.post(
  "/tutor/bookings/:bookingId/assignment",
  requireAuth,
  createAIQuizForBooking
);

// ✨ NEW: get assignment (tutor/student)
router.get("/assignments/:id", requireAuth, getAssignmentById);

// ✨ NEW: student submits and AI grades
router.post("/assignments/:id/grade", requireAuth, gradeAssignmentWithAI);

router.get("/tutor/bookings/:bookingId/assignment", requireAuth, getAssignmentForBookingTutor);

export default router;
