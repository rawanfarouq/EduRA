// routes/payments.routes.js
import { Router } from "express";

import { requireAuth } from "../middleware/auth.js";
import { payForBooking } from "../controllers/payment.controller.js";

const router = Router();

// Student pays for a booking
router.post("/pay-booking", requireAuth, payForBooking);

export default router;
