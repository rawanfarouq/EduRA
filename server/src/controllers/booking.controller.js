// controllers/booking.controller.js
import Booking from "../models/Booking.js";
import Course from "../models/Course.js";


// POST /api/bookings
// Student creates a booking request
export async function createBooking(req, res) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can create bookings" });
    }

    const { courseId, start, end } = req.body;
    if (!courseId) {
      return res.status(400).json({ message: "courseId is required" });
    }

    const course = await Course.findById(courseId).populate("instructorId");
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    if (!course.instructorId) {
      return res
        .status(400)
        .json({ message: "Course has no instructor assigned yet" });
    }

    const tutorId = course.instructorId._id;

    let startDate, endDate;
    if (start && end) {
      startDate = new Date(start);
      endDate = new Date(end);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return res.status(400).json({ message: "Invalid start or end datetime" });
      }
    } else {
      // simple default: now + 1 hour (you can later wire this to availability slots)
      startDate = new Date();
      endDate = new Date(Date.now() + 60 * 60 * 1000);
    }

    const booking = await Booking.create({
      studentId: req.user._id,
      tutorId,
      courseId: course._id,
      start: startDate,
      end: endDate,
      status: "requested",
      price: typeof course.price === "number" ? course.price : 0,
    });

    const populated = await Booking.findById(booking._id)
      .populate({ path: "courseId", select: "title" })
      .populate({
        path: "tutorId",
        populate: { path: "userId", select: "name email" },
      });

    res.status(201).json({ booking: populated });
  } catch (e) {
    console.error("createBooking error:", e);
    res.status(500).json({ message: e.message || "Failed to create booking" });
  }
}

// GET /api/bookings/mine
// List bookings for the logged-in student
export async function listMyBookings(req, res) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can view this list" });
    }

    const bookings = await Booking.find({ studentId: req.user._id })
      .sort({ createdAt: -1 })
      .populate({ path: "courseId", select: "title" })
      .populate({
        path: "tutorId",
        populate: { path: "userId", select: "name email" },
      })
      .lean();

    res.json({ bookings });
  } catch (e) {
    console.error("listMyBookings error:", e);
    res.status(500).json({ message: e.message || "Failed to load bookings" });
  }
}

// PATCH /api/bookings/:id/cancel
// STUDENT: cancel own booking (but keep it in history)
export async function cancelMyBooking(req, res) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can cancel bookings" });
    }

    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // must be the owner
    if (String(booking.studentId) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not authorized to cancel this booking" });
    }

    // optional rule: only allow cancel before it's fully confirmed/paid
    if (!["requested", "awaiting_payment"].includes(booking.status)) {
      return res.status(400).json({
        message: `Cannot cancel a booking in status "${booking.status}"`,
      });
    }

    booking.status = "canceled";
    await booking.save();

    return res.json({ booking });
  } catch (e) {
    console.error("cancelMyBooking error:", e);
    res.status(500).json({ message: e.message || "Failed to cancel booking" });
  }
}

// GET /api/bookings/admin
// Admin sees all bookings
export async function listAllBookings(req, res) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admin can view all bookings" });
    }

    const bookings = await Booking.find()
      .sort({ createdAt: -1 })
      .populate({ path: "courseId", select: "title" })
      .populate({ path: "studentId", select: "name email" })
      .populate({
        path: "tutorId",
        populate: { path: "userId", select: "name email" },
      })
      .lean();

    res.json({ bookings });
  } catch (e) {
    console.error("listAllBookings error:", e);
    res.status(500).json({ message: e.message || "Failed to load bookings" });
  }
}

// PATCH /api/bookings/:id/status
// ADMIN: update booking status (accept / reject / cancel)
export const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'awaiting_payment' | 'declined' | 'canceled'

    if (!["awaiting_payment", "declined", "canceled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    booking.status = status;
    await booking.save();

    // ❌ NO enrollment created here.
    // Enrollment will be created WHEN payment is marked as paid.

    return res.json({ booking });
  } catch (e) {
    console.error("updateBookingStatus error:", e);
    res.status(500).json({ message: e.message || "Failed to update status" });
  }
};

// ADMIN: list all bookings
export const listAllBookingsForAdmin = async (_req, res) => {
  try {
    const bookings = await Booking.find()
      .populate({
        path: "studentId",
        select: "name email",
      })
      .populate({
        path: "tutorId",
        populate: {
          path: "userId",
          select: "name email",
        },
      })
      .populate({
        path: "courseId",
        select: "title",
      })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ bookings });
  } catch (e) {
    console.error("*** ADMIN LIST BOOKINGS ERROR ***", e);
    res.status(500).json({ message: "Failed to load bookings" });
  }
};