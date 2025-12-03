// routes/bookings.routes.js
import { Router } from "express";

import { requireAuth } from "../middleware/auth.js";
import {
  createBooking,
  listMyBookings,
  updateBookingStatus,
  listAllBookingsForAdmin,cancelMyBooking,
} from "../controllers/booking.controller.js";

const router = Router();

// Student endpoints
router.post("/", requireAuth, createBooking);
router.get("/mine", requireAuth, listMyBookings);
router.patch("/:id/cancel", requireAuth, cancelMyBooking);


// Admin endpoints
// ADMIN: list all bookings
router.get("/admin", requireAuth, async (req, res, next) => {
  // if you have a requireAdmin middleware, use it here
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admins only" });
  }
  return listAllBookingsForAdmin(req, res, next);
});

// ADMIN: update status (accept / reject / cancel)
router.patch("/:id/status", requireAuth, (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admins only" });
  }
  return updateBookingStatus(req, res, next);
});

export default router;
