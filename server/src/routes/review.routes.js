// routes/review.routes.js
import { Router } from "express";

import { requireAuth } from "../middleware/auth.js";
import {
  createReview,
  getMyTutorReviews,
} from "../controllers/review.controller.js";

const router = Router();

// student submits / updates review for a tutor
router.post("/:tutorId", requireAuth, createReview);

// 🆕 tutor views **their own** reviews
router.get("/tutor/me", requireAuth, getMyTutorReviews);

export default router;
