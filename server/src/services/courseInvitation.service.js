// server/src/services/courseInvitation.service.js
import Course from '../models/Course.js';
import Tutor from '../models/Tutor.js';
import Category from '../models/Category.js';
import Notification from '../models/Notification.js';
import { sendEmail } from '../utils/sendEmail.js';

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

/* ------------------------------------------------------------------
   Helper: Build HTML email sent to tutors for NEW course
------------------------------------------------------------------- */
function buildCourseEmailHtml(tutorName, course, categoryName) {
  // You can later link directly to the login or dashboard if you like
  const websiteUrl = CLIENT_URL;

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2 style="color:#111827;">New Course Opportunity: ${course.title}</h2>
      <p>Hi ${tutorName || 'Tutor'},</p>
      <p>
        A new course has been created on EduProject that matches your profile
        and teaching experience.
      </p>

      <h3 style="margin-top:16px;color:#111827;">Course Details</h3>
      <ul>
        <li><strong>Title:</strong> ${course.title}</li>
        <li><strong>Category:</strong> ${categoryName || 'N/A'}</li>
        <li><strong>Level:</strong> ${course.level || 'N/A'}</li>
        <li><strong>Price per student:</strong> ${
          course.price ? course.price + ' USD' : 'N/A'
        }</li>
        <li><strong>Max students:</strong> ${course.maxStudents || 'N/A'}</li>
      </ul>

      ${
        course.description
          ? `<p><strong>Description:</strong><br>${course.description}</p>`
          : ''
      }

      <p style="margin-top:16px;">
        If you are interested in teaching this course, please
        <strong>sign in to your tutor account on the website</strong>
        to review the course and accept or reject it.
      </p>

      <p style="margin:16px 0;">
        You can access EduProject from:
        <a href="${websiteUrl}" target="_blank" rel="noopener noreferrer">
          ${websiteUrl}
        </a>
      </p>

      <p>If you're not interested, you can simply ignore this email.</p>

      <p style="margin-top:24px;">
        Best regards,<br/>
        <strong>EduProject Team</strong>
      </p>
    </div>
  `;
}

/* ------------------------------------------------------------------
   MAIN FUNCTION: Send invitation emails & notifications
------------------------------------------------------------------- */
export async function sendCourseInvitationsForNewCourse(courseDoc) {
  const course = courseDoc.toObject ? courseDoc.toObject() : courseDoc;

  if (!course.categoryId) {
    console.log('[CourseInvitations] Course has no categoryId, skipping');
    return;
  }

  const categoryId = course.categoryId;

  // 1) Fetch category name
  const category = await Category.findById(categoryId).lean();
  const categoryName = category?.name || 'N/A';

  // 2) List all courses in same category
  const categoryCourses = await Course.find({ categoryId }, { _id: 1 }).lean();
  const categoryCourseIds = categoryCourses.map((c) => c._id);

  if (!categoryCourseIds.length) {
    console.log('[CourseInvitations] No other courses in category, skipping');
    return;
  }

  // 3) Find tutors who teach in this category
  const MIN_EXPERIENCE_YEARS = 0;

  const tutors = await Tutor.find({
    courses: { $in: categoryCourseIds },
    experienceYears: { $gte: MIN_EXPERIENCE_YEARS },
  })
    .populate('userId', 'name email')
    .lean();

  if (!tutors.length) {
    console.log(
      `[CourseInvitations] No tutors found teaching category (${categoryName})`,
    );
    return;
  }

  console.log(
    `[CourseInvitations] Found ${tutors.length} tutors for course "${course.title}"`,
  );

  /* ------------------------------------------------------------------
      LOOP THROUGH TUTORS → Send Emails + Create Notifications
  ------------------------------------------------------------------- */

  const tasks = tutors.map(async (t) => {
    const user = t.userId;
    if (!user || !user.email) return null;

    const tutorName = user.name;
    const tutorEmail = user.email;

    const html = buildCourseEmailHtml(tutorName, course, categoryName);

    // A) Send Email
    try {
      await sendEmail({
        to: tutorEmail,
        subject: `New Course Matching Your Experience: ${course.title}`,
        text: `A new course "${course.title}" in category "${categoryName}" matches your experience. Please sign in to your tutor account on EduProject to accept or reject this course.`,
        html,
      });

      console.log(
        `[CourseInvitations] Email sent to tutor ${user._id} (${tutorEmail})`,
      );
    } catch (err) {
      console.error(
        '[CourseInvitations] Email error for tutor',
        user._id.toString(),
        ':',
        err.message,
      );
    }

    // B) Create in-app notification (matches Notification schema)
    try {
      const notif = await Notification.create({
        userId: user._id,
        type: 'course_match',
        isRead: false,
        data: {
          courseId: course._id,
          courseTitle: course.title,
          categoryName,
        },
      });

      console.log(
        '[CourseInvitations] Created course_match notification',
        notif._id.toString(),
        'for user',
        user._id.toString(),
      );
    } catch (err) {
      console.error(
        '[CourseInvitations] Notification error for tutor',
        user._id.toString(),
        ':',
        err.message,
      );
    }

    return true;
  });

  await Promise.all(tasks.filter(Boolean));

  console.log(
    `[CourseInvitations] Finished sending invites for "${course.title}"`,
  );
}
