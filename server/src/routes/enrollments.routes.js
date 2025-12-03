import { Router } from "express";

import { requireAuth } from "../middleware/auth.js";
import {
  listMyEnrollments,
  updateEnrollmentProgress,
} from "../controllers/enrollment.controller.js";

const router = Router();

router.get("/me", requireAuth, listMyEnrollments);

// 🆕 progress update route (student)
router.patch("/:id/progress", requireAuth, updateEnrollmentProgress);

export default router;
