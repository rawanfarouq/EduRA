// controllers/tutor.controller.js
import Tutor from '../models/Tutor.js';
import Course from '../models/Course.js';
import Booking from '../models/Booking.js';

/**
 * GET /api/tutor/me
 * Returns the logged-in user's tutor profile.
 */
export const getTutorMe = async (req, res) => {
  try {
    // req.user is set by requireAuth middleware
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const tutor = await Tutor.findOne({ userId })
      .populate({ path: 'courses', select: 'title _id' })
      .lean();

    if (!tutor) {
      // If a tutor account doesn’t have a Tutor doc yet, return a sane empty shape
      return res.status(200).json({
        tutor: {
          userId,
          bio: '',
          hourlyRate: 0,
          experienceYears: 0,
          achievements: [],
          languages: [],
          availability: [],
          timezone: 'UTC',
          ratingAvg: 0,
          reviewsCount: 0,
          courses: [],
          cvUrl: '',
        },
      });
    }

    return res.json({ tutor });
  } catch (e) {
    console.error('getTutorMe error:', e);
    res.status(500).json({ message: e.message });
  }
};

/**
 * ➊ List courses with NO assigned instructor
 * GET /api/tutor/unassigned-courses  (if you wired such a route)
 */
export const listUnassignedCourses = async (_req, res) => {
  try {
    // Course schema uses "instructorId" (ref: Tutor) for the assigned instructor
    const courses = await Course.find({
      $or: [{ instructorId: { $exists: false } }, { instructorId: null }],
    }).select('_id title');

    res.json({ courses });
  } catch (e) {
    console.error('listUnassignedCourses error:', e);
    res.status(500).json({ message: e.message });
  }
};

/**
 * ➋ Attach current tutor as instructor to an unassigned course
 * POST /api/tutor/courses
 * body: { courseId }
 *
 * (Only use this if you want a "self-assign" flow in addition to the apply/accept flow.)
 */
export const addCourseToTutor = async (req, res) => {
  try {
    const userId = req.user?._id; // current logged-in tutor's user id
    const { courseId } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (!courseId) {
      return res.status(400).json({ message: 'courseId is required' });
    }

    const tutor = await Tutor.findOne({ userId });
    if (!tutor) {
      return res.status(404).json({ message: 'Tutor profile not found' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // disallow if already assigned to any instructor
    if (course.instructorId) {
      return res
        .status(409)
        .json({ message: 'Course already has an instructor assigned' });
    }

    // assign both sides
    course.instructorId = tutor._id; // Course field points to Tutor doc
    await course.save();

    await Tutor.updateOne(
      { _id: tutor._id },
      { $addToSet: { courses: course._id } },
    );

    const updated = await Tutor.findById(tutor._id).populate({
      path: 'courses',
      select: 'title _id',
    });

    res.json({ tutor: updated });
  } catch (e) {
    console.error('addCourseToTutor error:', e);
    res.status(500).json({ message: e.message });
  }
};

/**
 * GET /api/tutor/bookings
 * Return all bookings for the logged-in tutor, with course + student details.
 */
export const listTutorBookings = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Find the Tutor doc for this user
    const tutor = await Tutor.findOne({ userId }).select('_id').lean();
    if (!tutor) {
      return res.status(404).json({ message: 'Tutor profile not found' });
    }

    // Booking schema: tutorId ref: 'Tutor'
    const bookings = await Booking.find({ tutorId: tutor._id })
      .populate({ path: 'courseId', select: 'title _id' })
      .populate({ path: 'studentId', select: 'name email _id' })
      .sort({ start: 1 })
      .lean();

    return res.json({ bookings });
  } catch (e) {
    console.error('listTutorBookings error:', e);
    res.status(500).json({ message: e.message || 'Failed to load bookings' });
  }
};

/**
 * DELETE /api/tutor/courses/:courseId
 * Remove a course from the logged-in tutor and unassign it as instructor.
 */
export const removeCourseFromTutor = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { courseId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (!courseId) {
      return res.status(400).json({ message: 'courseId is required' });
    }

    // Find tutor by userId
    const tutor = await Tutor.findOne({ userId });
    if (!tutor) {
      return res.status(404).json({ message: 'Tutor profile not found' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Make sure this tutor is actually the instructor for that course
    if (
      course.instructorId &&
      course.instructorId.toString() !== tutor._id.toString()
    ) {
      return res
        .status(403)
        .json({
          message: 'You are not assigned as instructor for this course',
        });
    }

    // 1) Unassign instructor from course
    course.instructorId = null;
    await course.save();

    // 2) Remove course from tutor.courses array
    await Tutor.updateOne(
      { _id: tutor._id },
      { $pull: { courses: course._id } },
    );

    // 3) Return updated tutor
    const updated = await Tutor.findById(tutor._id).populate({
      path: 'courses',
      select: 'title _id',
    });

    return res.json({ tutor: updated });
  } catch (e) {
    console.error('removeCourseFromTutor error:', e);
    res.status(500).json({ message: e.message || 'Failed to remove course' });
  }
};

// helper: HH:MM -> minutes
function timeToMin(t = '00:00') {
  const [hh, mm] = (t || '00:00').split(':').map((x) => parseInt(x, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return 0;
  return hh * 60 + mm;
}

// ✅ POST /api/tutor/availability  (add new slot)
export async function addAvailabilitySlot(req, res) {
  const userId = req.user?._id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const { date, start, end } = req.body;

  if (!date || !start || !end) {
    return res
      .status(400)
      .json({ message: 'date, start and end are required' });
  }

  const d = new Date(date);
  if (Number.isNaN(d.getTime())) {
    return res.status(400).json({ message: 'Invalid date format' });
  }

  const startMin = timeToMin(start);
  const endMin = timeToMin(end);

  if (endMin <= startMin) {
    return res
      .status(400)
      .json({ message: 'End time must be after start time' });
  }

  const tutor = await Tutor.findOne({ userId });
  if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

  // 🧹 Clean up old legacy slots that have no date (avoid weird data)
  tutor.availability = tutor.availability.filter((s) => !!s.date);

  // Add new slot (assumes availabilitySlotSchema has "date" + "day" + "startMin" + "endMin")
  tutor.availability.push({
    date: d,
    day: d.getDay(),
    startMin,
    endMin,
  });

  await tutor.save();

  return res.json({ tutor });
}

// ✅ PUT /api/tutor/availability/:slotId  (edit slot)
export async function updateAvailabilitySlot(req, res) {
  const userId = req.user?._id;
  const { slotId } = req.params;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const { date, start, end } = req.body;

  const tutor = await Tutor.findOne({ userId });
  if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

  // safer lookup
  let slot = tutor.availability.id(slotId);
  if (!slot) {
    slot = tutor.availability.find((s) => String(s._id) === String(slotId));
  }
  if (!slot) {
    return res.status(404).json({ message: 'Slot not found' });
  }

  if (date) {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    slot.date = d;
    slot.day = d.getDay();
  }

  if (start) slot.startMin = timeToMin(start);
  if (end) slot.endMin = timeToMin(end);

  if (slot.endMin <= slot.startMin) {
    return res
      .status(400)
      .json({ message: 'End time must be after start time' });
  }

  // 🧹 Clean any legacy slots without date
  tutor.availability = tutor.availability.filter((s) => !!s.date);

  await tutor.save();
  return res.json({ tutor });
}

// ✅ DELETE /api/tutor/availability/:slotId
export async function deleteAvailabilitySlot(req, res) {
  const userId = req.user?._id;
  const { slotId } = req.params;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!slotId) {
    return res.status(400).json({ message: 'Missing slot id' });
  }

  // Use $pull so we don't need slot.remove()
  const tutor = await Tutor.findOneAndUpdate(
    { userId },
    { $pull: { availability: { _id: slotId } } },
    { new: true },
  );

  if (!tutor) {
    return res.status(404).json({ message: 'Tutor not found' });
  }

  return res.json({
    message: 'Slot deleted',
    availability: tutor.availability,
  });
}
