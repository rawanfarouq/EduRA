// server/src/routes/admin.routes.js
import { Router } from 'express';

import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  listTutors,
  listUsers,
  listCourses,
  createCourse,
  getCourse,
  deleteCourse,
  updateCourse,
  listBookings,
  listCourseApplications,
  acceptTutorForCourse,
  rejectTutorForCourse,
} from '../controllers/admin.controller.js';
import Course from '../models/Course.js';


const r = Router();

/**
 * ⚠️ Public email action links
 * These are called from the email buttons (no JWT), so they CANNOT be behind requireAuth.
 */
r.get('/course/accept/:courseId/:tutorId', acceptTutorForCourse);
r.get('/course/reject/:courseId/:tutorId', rejectTutorForCourse);


// 🔐 Everything below this requires admin auth (for dashboard usage)
r.use(requireAuth, requireRole('admin'));

// ✅ Add these POST routes for your React dashboard
r.post('/course/accept/:courseId/:tutorId', acceptTutorForCourse);
r.post('/course/reject/:courseId/:tutorId', rejectTutorForCourse);

// 📌 Tutors / Users
r.get('/tutors', listTutors);
r.get('/users', listUsers);

// 📌 Courses CRUD
r.get('/courses', listCourses);
r.post('/courses', createCourse);
r.get('/courses/:id', getCourse);
r.put('/courses/:id', updateCourse);
r.delete('/courses/:id', deleteCourse);

// 📌 Bookings
r.get('/bookings', listBookings);

// 📌 Tutors applying for courses (for admin dashboard view)
r.get('/course-applications', listCourseApplications);

// Default admin home
r.get('/', async (_req, res) => {
  const courses = await Course.find()
    .select('title categoryId')
    .populate({ path: 'categoryId', select: 'name', model: 'Category' })
    .lean();

  res.json({
    courses: courses.map((c) => ({
      _id: c._id,
      title: c.title,
      category: c.categoryId
        ? { _id: c.categoryId._id, name: c.categoryId.name }
        : null,
    })),
  });
});



export default r;
