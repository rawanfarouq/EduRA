// controllers/admin.controller.js
import mongoose from 'mongoose';

import Course from '../models/Course.js';
import Category from '../models/Category.js';
import Tutor from '../models/Tutor.js';
import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js';
import Booking from '../models/Booking.js';
import Notification from '../models/Notification.js';
import { sendEmail } from '../utils/sendEmail.js'; // for acceptance/rejection emails

import { notifyTutorsForNewCourse } from './ai.controller.js';

// ---- Tutors list: show courses they teach ----
export async function listTutors(_req, res) {
  const tutors = await Tutor.find()
    .populate({ path: 'userId', select: 'name email' })
    .lean();

  const tutorIds = tutors.map((t) => t._id);
  const coursesByTutor = await Course.aggregate([
    { $match: { instructorId: { $in: tutorIds } } },
    {
      $group: {
        _id: '$instructorId',
        courses: { $push: { _id: '$_id', title: '$title' } },
      },
    },
  ]);

  const map = new Map(coursesByTutor.map((x) => [String(x._id), x.courses]));

  res.json({
    tutors: tutors.map((t) => ({
      _id: t._id,
      user: t.userId, // {name,email}
      courses: map.get(String(t._id)) || [],
    })),
  });
}

// ---- Users tab: students + tutors with course titles ----
export async function listUsers(_req, res) {
  const students = await User.find({ role: 'student' })
    .select('name email createdAt')
    .lean();

  const tutors = await Tutor.find()
    .populate({ path: 'userId', select: 'name email' })
    .lean();

  const tutorIds = tutors.map((t) => t._id);
  const coursesByTutor = await Course.aggregate([
    { $match: { instructorId: { $in: tutorIds } } },
    { $group: { _id: '$instructorId', titles: { $push: '$title' } } },
  ]);
  const map = new Map(coursesByTutor.map((x) => [String(x._id), x.titles]));

  res.json({
    students,
    tutors: tutors.map((t) => ({
      _id: t.userId._id,
      name: t.userId.name,
      email: t.userId.email,
      courses: map.get(String(t._id)) || [],
    })),
  });
}

// ---- Courses list ----
export async function listCourses(_req, res) {
  const courses = await Course.find()
    .select('title categoryId instructorId maxStudents isPublished price') // ⬅ add price
    .lean();
  res.json({ courses });
}


// ---- Create course (uses categoryId, not subjectId) ----
export async function createCourse(req, res) {
  const {
    title,
    categoryId,
    instructorId, // now optional
    description,
    price,
    level,
    maxStudents,
    prerequisites = [],
    isPublished = false,
  } = req.body;

  console.log('▶ createCourse called with body:', req.body);

  if (!title) {
    return res.status(400).json({ message: 'Course title is required' });
  }

  if (categoryId) {
    const cat = await Category.findById(categoryId);
    if (!cat) return res.status(404).json({ message: 'Category not found' });
  }

  let tutor = null;
  if (instructorId) {
    tutor = await Tutor.findById(instructorId);
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });
  }

  const finalIsPublished = instructorId ? !!isPublished : false;

  const course = await Course.create({
    title,
    categoryId: categoryId || null,
    instructorId: instructorId || null,
    description,
    price: Number(price) || 0,
    level: level || 'beginner',
    maxStudents: Number(maxStudents) || 0,
    prerequisites,
    isPublished: finalIsPublished,
  });

  if (tutor) {
    await Tutor.updateOne(
      { _id: instructorId },
      { $addToSet: { courses: course._id } },
    );
  }

  // 🔔 Notify tutors (AI matching logic)
  try {
    await notifyTutorsForNewCourse(course);
  } catch (err) {
    console.error('Failed to notify tutors for new course:', err);
  }

  res.status(201).json({
    course,
    note: !instructorId
      ? 'Course created without instructor. It remains unpublished.'
      : 'Course created successfully.',
  });
}

// ---- Course details ----
export async function getCourse(req, res) {
  const { id } = req.params;

  const course = await Course.findById(id)
    .populate({ path: 'categoryId', select: 'name', model: 'Category' })
    .populate({
      path: 'instructorId',
      populate: { path: 'userId', select: 'name email', model: 'User' },
      model: 'Tutor',
    })
    .populate({ path: 'prerequisites', select: 'title', model: 'Course' })
    .lean();

  if (!course) return res.status(404).json({ message: 'Not found' });

  let enrolled = [];
  enrolled = await Enrollment.find({ courseId: id })
    .populate({ path: 'studentId', select: 'name email', model: 'User' })
    .lean();

  res.json({
    course: {
      _id: course._id,
      title: course.title,
      description: course.description,
      level: course.level,
      price: course.price,
      maxStudents: course.maxStudents,
      isPublished: course.isPublished,
      category: course.categoryId
        ? { _id: course.categoryId._id, name: course.categoryId.name }
        : null,
      instructor: course.instructorId?.userId
        ? {
            _id: course.instructorId._id, // tutor id
            name: course.instructorId.userId.name,
            email: course.instructorId.userId.email,
          }
        : null,
      prerequisites: (course.prerequisites || []).map((p) => ({
        _id: p._id,
        title: p.title,
      })),
      enrolled: enrolled.map((e) => e.studentId),
    },
  });
}

export async function deleteCourse(req, res) {
  const { id } = req.params;
  await Course.findByIdAndDelete(id);
  await Tutor.updateMany({ courses: id }, { $pull: { courses: id } });
  res.json({ message: 'Deleted' });
}

// ---- Bookings list (unchanged structurally) ----
export async function listBookings(_req, res) {
  const bookings = await Booking.find()
    .populate({ path: 'studentId', select: 'name', model: 'User' })
    .populate({
      path: 'tutorId',
      populate: { path: 'userId', select: 'name', model: 'User' },
      model: 'Tutor',
    })
    .populate({ path: 'courseId', select: 'title price', model: 'Course' }) // ⬅ add price
    .lean();

  res.json({
    bookings: bookings.map((b) => ({
      _id: b._id,
      student: b.studentId
        ? { _id: b.studentId._id, name: b.studentId.name }
        : null,
      tutor: b.tutorId?.userId
        ? { _id: b.tutorId.userId._id, name: b.tutorId.userId.name }
        : null,
      course: b.courseId
        ? {
            _id: b.courseId._id,
            title: b.courseId.title,
            price: b.courseId.price, // ⬅ expose price
          }
        : null,
      start: b.start,
      status: b.status,
    })),
  });
}


// ---- Update course ----
export async function updateCourse(req, res) {
  const { id } = req.params;

  const body = { ...req.body };

  let instructorId =
    body.instructorId === '' ||
    body.instructorId === 'null' ||
    body.instructorId === undefined
      ? null
      : body.instructorId;

  let categoryId =
    body.categoryId === '' ||
    body.categoryId === 'null' ||
    body.categoryId === undefined
      ? null
      : body.categoryId;

  const updates = {
    ...body,
    instructorId,
    categoryId,
  };

  const course = await Course.findById(id);
  if (!course) {
    return res.status(404).json({ message: 'Course not found' });
  }

  const oldInstructorId = course.instructorId
    ? course.instructorId.toString()
    : null;

  if (instructorId === null) {
    updates.isPublished = false;
  } else if (!oldInstructorId && instructorId) {
    updates.isPublished = true;
  }

  if (categoryId) {
    if (!mongoose.isValidObjectId(categoryId)) {
      delete updates.categoryId;
    } else {
      const cat = await Category.findById(categoryId);
      if (!cat) {
        delete updates.categoryId;
      }
    }
  }

  if (instructorId) {
    if (!mongoose.isValidObjectId(instructorId)) {
      instructorId = null;
      updates.instructorId = null;
      updates.isPublished = false;
    } else {
      const tutor = await Tutor.findById(instructorId);
      if (!tutor) {
        instructorId = null;
        updates.instructorId = null;
        updates.isPublished = false;
      }
    }
  }

  Object.assign(course, updates);
  await course.save();

  const newInstructorId = course.instructorId
    ? course.instructorId.toString()
    : null;

  if (oldInstructorId && oldInstructorId !== newInstructorId) {
    await Tutor.updateOne(
      { _id: oldInstructorId },
      { $pull: { courses: course._id } },
    );
  }

  if (newInstructorId && newInstructorId !== oldInstructorId) {
    await Tutor.updateOne(
      { _id: newInstructorId },
      { $addToSet: { courses: course._id } },
    );
  }

  return res.json({
    message: 'Course updated successfully',
    course,
  });
}

// ---- List courses (no instructor) + tutors who applied ----
export async function listCourseApplications(_req, res) {
  const courses = await Course.find({ instructorId: null })
    .populate({ path: 'categoryId', select: 'name' })
    .lean();

  if (!courses.length) {
    return res.json({ courses: [] });
  }

  const courseIds = courses.map((c) => c._id);

  const appliedNotifs = await Notification.find({
    type: 'course_match',
    actionStatus: 'applied',
    'data.courseId': { $in: courseIds },
  })
    .populate({ path: 'userId', select: 'name email', model: 'User' })
    .lean();

  const byCourse = new Map();
  for (const n of appliedNotifs) {
    const cId = String(n.data.courseId);
    if (!byCourse.has(cId)) byCourse.set(cId, []);
    byCourse.get(cId).push({
      notificationId: n._id,
      tutorUserId: n.userId?._id,
      tutorName: n.userId?.name,
      tutorEmail: n.userId?.email,
      appliedAt: n.createdAt,
    });
  }

  const result = courses.map((c) => ({
    _id: c._id,
    title: c.title,
    category: c.categoryId ? c.categoryId.name : null,
    applicants: byCourse.get(String(c._id)) || [],
  }));

  res.json({ courses: result });
}

// ---- Accept tutor for course (from email or dashboard) ----
export async function acceptTutorForCourse(req, res) {
  const { courseId, tutorId } = req.params;

  try {
    // 1) Load course + tutor (with user info)
    const course = await Course.findById(courseId).populate('categoryId');
    if (!course) return res.status(404).send('Course not found');

    const tutor = await Tutor.findById(tutorId).populate({
      path: 'userId',
      select: 'name email',
      model: 'User',
    });
    if (!tutor) return res.status(404).send('Tutor not found');

    const tutorUserId = tutor.userId?._id;
    const tutorName = tutor.userId?.name || 'Tutor';
    const tutorEmail = tutor.userId?.email || null;

    // 2) Assign instructor + publish course
    course.instructorId = tutor._id;
    course.isPublished = true;
    await course.save();

    // Keep Tutor.courses in sync
    await Tutor.updateOne(
      { _id: tutorId },
      { $addToSet: { courses: course._id } },
    );

    // 🔹 Mark admin tutor_application notifications as accepted
    await Notification.updateMany(
  {
    type: 'tutor_application',
    'data.courseId': course._id,
    'data.tutorId': tutor._id,
  },
  { $set: { actionStatus: 'accepted', isRead: true } },
);

    // 3) Find all other tutors who applied BEFORE closing the course_match notifications
    const otherApplied = await Notification.find({
      type: 'course_match',
      'data.courseId': course._id,
      actionStatus: 'applied',
      userId: { $ne: tutorUserId },
    }).lean();

    // 4) Close all course_match notifications for this course
    // 0.5) Mark this tutor's tutor_application as rejected
await Notification.updateMany(
  {
    type: 'tutor_application',
    'data.courseId': course._id,
    'data.tutorId': tutor._id,
  },
  { $set: { actionStatus: 'rejected', isRead: true } },
);
    // 5) Notify accepted tutor (in-app)
    await Notification.create({
      userId: tutorUserId,
      type: 'course_accepted',
      title: 'Application Approved 🎉',
      message: `Congratulations! You have been accepted to teach "${course.title}".`,
      isRead: false,
      actionStatus: 'none',
      data: {
        courseId: course._id,
        courseTitle: course.title,
      },
    });

    // 6) Notify other applicants that the course is taken
    if (otherApplied.length) {
      const otherNotifs = otherApplied.map((n) => ({
        userId: n.userId,
        type: 'course_assigned_elsewhere',
        title: 'Course assigned to another tutor',
        message: `Thank you for applying to teach "${course.title}", but the course has been assigned to another instructor.`,
        isRead: false,
        actionStatus: 'none',
        data: {
          courseId: course._id,
          courseTitle: course.title,
        },
      }));

      await Notification.insertMany(otherNotifs);
    }

    // 7) Notify admins that tutor X is now instructor for course Y
    const admins = await User.find({ role: 'admin' })
      .select('_id name email')
      .lean();

    if (admins.length) {
      const adminNotifs = admins.map((admin) => ({
        userId: admin._id,
        type: 'course_assigned_admin',
        title: 'Tutor assigned to course',
        message: `Tutor ${tutorName} has been assigned to teach "${course.title}".`,
        isRead: false,
        actionStatus: 'none',
        data: {
          courseId: course._id,
          courseTitle: course.title,
          tutorId: tutor._id,
          tutorName,
        },
      }));

      await Notification.insertMany(adminNotifs);
    }

    // 8) Email accepted tutor (if we have email)
    if (tutorEmail) {
      try {
        await sendEmail({
          to: tutorEmail,
          subject: `You have been accepted to teach "${course.title}"`,
          html: `
            <p>Dear ${tutorName},</p>
            <p>
              Congratulations! 🎉<br/>
              You have been <strong>accepted</strong> to teach the course
              <strong>"${course.title}"</strong>.
            </p>
            <p>
              You can now log into your tutor dashboard to see the course details
              and manage your bookings.
            </p>
            <p>Best regards,<br/>EduProject Team</p>
          `,
        });
      } catch (err) {
        console.error(
          '[Email] Failed to send acceptance email to tutor:',
          tutorEmail,
          err.message,
        );
      }
    }

    return res.send('Tutor accepted successfully!');
  } catch (e) {
    console.error('[Admin] acceptTutorForCourse error:', e);
    return res.status(500).send('Internal server error');
  }
}


// ---- Reject tutor for course (from email or dashboard) ----
export async function rejectTutorForCourse(req, res) {
  const { courseId, tutorId } = req.params;

  try {
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).send('Course not found');

    const tutor = await Tutor.findById(tutorId).populate({
      path: 'userId',
      select: 'name email',
      model: 'User',
    });
    if (!tutor) return res.status(404).send('Tutor not found');

    const tutorUserId = tutor.userId?._id;
    const tutorName = tutor.userId?.name || 'Tutor';
    const tutorEmail = tutor.userId?.email || null;

    // 1) Mark this tutor's course_match notifications as rejected
    await Notification.updateMany(
      {
        type: 'course_match',
        'data.courseId': course._id,
        userId: tutorUserId,
      },
      { $set: { actionStatus: 'rejected', isRead: true } },
    );

    // 🔹 Mark admin tutor_application notifications as rejected
    await Notification.updateMany(
      {
        type: 'tutor_application',
        'data.courseId': course._id,
        'data.tutorId': tutor._id,
      },
      { $set: { actionStatus: 'rejected', isRead: true } },
    );

    // 2) In-app notification: rejected
    await Notification.create({
      userId: tutorUserId,
      type: 'course_rejected',
      title: 'Application Rejected',
      message: `Unfortunately, your application to teach "${course.title}" was not accepted. It did not fully align with the course perspective at this time.`,
      isRead: false,
      actionStatus: 'none',
      data: {
        courseId: course._id,
        courseTitle: course.title,
      },
    });

    // 3) Email the tutor about rejection
    if (tutorEmail) {
      try {
        await sendEmail({
          to: tutorEmail,
          subject: `Update on your application for "${course.title}"`,
          html: `
            <p>Dear ${tutorName},</p>
            <p>
              Thank you for applying to teach the course
              <strong>"${course.title}"</strong>.
            </p>
            <p>
              After reviewing all applications, we decided to proceed with another tutor
              whose profile more closely aligns with the current course perspective.
            </p>
            <p>
              We truly appreciate your interest, and we encourage you to keep your profile
              updated and apply for future courses that match your expertise.
            </p>
            <p>Best regards,<br/>EduProject Team</p>
          `,
        });
      } catch (err) {
        console.error(
          '[Email] Failed to send rejection email to tutor:',
          tutorEmail,
          err.message,
        );
      }
    }

    return res.send('Tutor rejected successfully.');
  } catch (e) {
    console.error('[Admin] rejectTutorForCourse error:', e);
    return res.status(500).send('Internal server error');
  }
}

