// server/src/controllers/notification.controller.js
import Notification from '../models/Notification.js';
import Tutor from '../models/Tutor.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import { sendEmail, buildTutorAppliedAdminEmail } from '../utils/sendEmail.js';




// ------------------ LIST MY NOTIFICATIONS ------------------
export async function listMyNotifications(req, res) {
  const userId = req.user._id || req.user.id;

  // 1) Base query:
  //    - course_match → only not yet acted on
  //    - tutor_application → only not yet acted on
  //    - all other types → always returned
  let notifications = await Notification.find({
    userId,
    $or: [
      // course_match only if not yet acted upon
      {
        type: 'course_match',
        $or: [
          { actionStatus: { $exists: false } },
          { actionStatus: 'none' },
        ],
      },
      // tutor_application only if not yet acted upon
      {
        type: 'tutor_application',
        $or: [
          { actionStatus: { $exists: false } },
          { actionStatus: 'none' },
        ],
      },
      // any other notification type is always returned
      {
        type: { $nin: ['course_match', 'tutor_application'] },
      },
    ],
  })
    .sort({ createdAt: -1 })
    .lean();

  // 2) Collect all courseIds referenced in notifications (if any)
  const courseIds = [];
  for (const n of notifications) {
    if (n.data && n.data.courseId) {
      courseIds.push(n.data.courseId);
    }
  }

  if (courseIds.length) {
    const uniqueIds = [...new Set(courseIds.map((id) => String(id)))];

    const existingCourses = await Course.find({ _id: { $in: uniqueIds } })
      .select('_id')
      .lean();

    const existingSet = new Set(existingCourses.map((c) => String(c._id)));

    notifications = notifications.filter((n) => {
      if (!n.data || !n.data.courseId) return true;
      return existingSet.has(String(n.data.courseId));
    });
  }

  res.json({ notifications });
}




// ------------------ MARK AS READ ------------------
export async function markNotificationRead(req, res) {
  const userId = req.user?._id;
  const { id } = req.params;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const notif = await Notification.findOne({ _id: id, userId });
  if (!notif) return res.status(404).json({ message: 'Not found' });

  notif.isRead = true;
  await notif.save();

  res.json({ message: 'Marked as read' });
}

// ------------------ HELPER: NOTIFY ADMINS OF TUTOR APPLICATION ------------------
async function notifyAdminsOfTutorApplication(tutor, course) {
  const admins = await User.find({ role: 'admin' })
    .select('_id name email')
    .lean();

  if (!admins.length) return;

  const categoryName = course.categoryId?.name || course.categoryName || '';

  // 1) DB notifications for admins
  const adminNotifs = admins.map((admin) => ({
    userId: admin._id,
    type: 'tutor_application',
    title: 'Tutor application received',
    message: `Tutor ${tutor.userId?.name || ''} has applied to teach "${course.title}". Please check your email to accept or reject this application.`,
    data: {
      courseId: course._id,
      courseTitle: course.title,
      categoryName,
      tutorId: tutor._id,
      tutorName: tutor.userId?.name || '',
    },
    isRead: false,
    actionStatus: 'none',
  }));

  await Notification.insertMany(adminNotifs);

  // 2) Email to admins
  const API_BASE = process.env.API_BASE_URL || 'http://localhost:8080';
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  const ADMIN_DASH_URL =
    process.env.ADMIN_DASH_URL || `${FRONTEND_URL}/admin/dashboard`;

  const tutorName = tutor.userId?.name || '';
  const tutorEmail = tutor.userId?.email || '';
  const tutorExperience = tutor.experienceYears ?? 0;
  const tutorLanguages = (tutor.languages || []).join(', ');
  const tutorBio = tutor.bio || '';
  const cvUrl = tutor.cvUrl
    ? `${API_BASE}${tutor.cvUrl.startsWith('/') ? tutor.cvUrl : `/${tutor.cvUrl}`}`
    : null;

  for (const admin of admins) {
    if (!admin.email) continue;

    const acceptUrl = `${API_BASE}/api/admin/course/accept/${course._id}/${tutor._id}`;
    const rejectUrl = `${API_BASE}/api/admin/course/reject/${course._id}/${tutor._id}`;

    const { subject, html } = buildTutorAppliedAdminEmail({
      tutorName,
      tutorEmail,
      tutorExperience,
      tutorLanguages,
      tutorBio,
      tutorCvUrl: cvUrl,
      courseTitle: course.title,
      courseDescription: course.description,
      categoryName,
      level: course.level,
      price: course.price,
      acceptUrl,
      rejectUrl,
      adminDashboardUrl: ADMIN_DASH_URL,
    });

    try {
      await sendEmail({
        to: admin.email,
        subject,
        html,
      });
    } catch (err) {
      console.error(
        '[Notifications] Error emailing admin about tutor application:',
        admin.email,
        err.message,
      );
    }
  }
}

// ------------------ OLD ENDPOINT: DIRECT tutor-applied (USED BY YOUR FRONTEND) ------------------
export async function createTutorAppliedNotification(req, res) {
  const userId = req.user?._id;
  const { courseId } = req.body;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  if (!courseId)
    return res.status(400).json({ message: 'courseId is required' });

  const course = await Course.findById(courseId).populate('categoryId');
  if (!course) {
    return res.status(404).json({ message: 'Course not found' });
  }

  // 1) Create notification for the tutor himself
  const notif = await Notification.create({
    userId,
    type: 'tutor_applied',
    title: 'Course application submitted',
    message: `You have applied to teach "${course.title}". Please wait for the admin's approval.`,
    isRead: false,
    actionStatus: 'none',
    data: {
      courseId: course._id,
      courseTitle: course.title,
    },
  });

  console.log(
    '[Notifications] Tutor',
    userId.toString(),
    'applied to course',
    course._id.toString(),
    'notification',
    notif._id.toString(),
  );

  // 2) Fetch tutor profile + user info
  const tutor = await Tutor.findOne({ userId }).populate({
    path: 'userId',
    select: 'name email',
    model: 'User',
  });

  if (tutor) {
    // 3) Notify admins in DB + email
    await notifyAdminsOfTutorApplication(tutor, course);
  } else {
    console.warn(
      '[Notifications] No tutor profile found for user',
      userId.toString(),
      '– skipping admin notification.',
    );
  }

  return res.json({ notification: notif });
}

// ------------------ MAIN: APPLY FOR COURSE FROM NOTIFICATION (if you use it later) ------------------
export async function applyForCourseFromNotification(req, res) {
  const userId = req.user?._id;
  const { id } = req.params;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const notif = await Notification.findOne({ _id: id, userId }).lean();
  if (!notif)
    return res.status(404).json({ message: 'Notification not found' });

  if (notif.type !== 'course_match' || !notif.data?.courseId) {
    return res
      .status(400)
      .json({ message: 'This notification is not a valid course match.' });
  }

  const tutor = await Tutor.findOne({ userId }).populate({
    path: 'userId',
    select: 'name email',
    model: 'User',
  });
  if (!tutor) {
    return res.status(400).json({ message: 'Tutor profile not found' });
  }

  const course = await Course.findById(notif.data.courseId).populate(
    'categoryId',
  );
  if (!course) {
    return res.status(400).json({ message: 'Course not found' });
  }

  // Mark original notif
  await Notification.updateOne(
    { _id: id },
    { $set: { actionStatus: 'applied', isRead: true } },
  );

  // Create a "tutor_applied" notification
  await Notification.create({
    userId,
    type: 'tutor_applied',
    title: 'Course application submitted',
    message: `You have applied to teach "${course.title}". Please wait for the admin's approval.`,
    isRead: false,
    actionStatus: 'none',
    data: {
      courseId: course._id,
      courseTitle: course.title,
    },
  });

  // Notify admins
  await notifyAdminsOfTutorApplication(tutor, course);

  return res.json({
    message: 'Applied to teach this course.',
  });
}

// ------------------ DISMISS NOTIFICATION ------------------
export async function dismissNotification(req, res) {
  const userId = req.user?._id;
  const { id } = req.params;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const notif = await Notification.findOne({ _id: id, userId });
  if (!notif) return res.status(404).json({ message: 'Not found' });

  notif.actionStatus = 'dismissed';
  notif.isRead = true;
  await notif.save();

  res.json({ message: 'Notification dismissed.', notification: notif });
}
