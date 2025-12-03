import { Router } from 'express';

import { requireAuth } from '../middleware/auth.js';
import {
  listTutorBookings,
  removeCourseFromTutor,
  addAvailabilitySlot,
  updateAvailabilitySlot,
  deleteAvailabilitySlot,
  getTutorMe,
  addCourseToTutor,
  listUnassignedCourses,
} from '../controllers/tutor.controller.js';
import {
  addTutorResourceLink,
  listTutorResources
} from '../controllers/tutorResource.controller.js';

const router = Router();

// ===============================
// 📌 GET /api/tutor/me
// ===============================
router.get('/me', requireAuth, getTutorMe);

// ===============================
// 📌 GET /api/tutor/available-courses
//    (Courses with no assigned instructor)
// ===============================
router.get('/available-courses', requireAuth, listUnassignedCourses);

// ===============================
// 📌 POST /api/tutor/courses/add
//    Tutor self-assigns to a course
// ===============================
router.post('/courses/add', requireAuth, addCourseToTutor);

// ===============================
// 📌 Availability Routes
// ===============================
router.post('/availability', requireAuth, addAvailabilitySlot);

router.put('/availability/:slotId', requireAuth, updateAvailabilitySlot);

// ❗ MUST BE :slotId not :id
router.delete('/availability/:slotId', requireAuth, deleteAvailabilitySlot);

// ===============================
// 📌 Tutor Bookings
// ===============================
router.get('/bookings', requireAuth, listTutorBookings);

// ===============================
// 📌 Remove assigned course from tutor
// ===============================
router.delete('/courses/:courseId', requireAuth, removeCourseFromTutor);


// tutor adds resource
router.post('/tutor/resources', requireAuth, addTutorResourceLink);

// student fetches resources
router.get('/:tutorId/resources', requireAuth, listTutorResources);

export default router;
