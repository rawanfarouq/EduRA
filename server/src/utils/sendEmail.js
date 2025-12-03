// server/src/utils/sendEmail.js
import nodemailer from 'nodemailer';

// We'll create the transporter lazily, using the *current* env values
let transporter = null;

// 🔸 GLOBAL throttle state
let lastSendAt = 0;
const MIN_INTERVAL_MS = 1200; // 1.2 seconds between emails

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createTransporter() {
  const host = process.env.MAIL_HOST || 'smtp.gmail.com';
  const port = Number(process.env.MAIL_PORT) || 587;
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASS;

  console.log('[Mail] Creating transporter with:', host, port);

  const secure = port === 465; // Gmail: 587 -> false (STARTTLS)

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });
}

function getTransporter() {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
}

export async function sendEmail({ to, subject, text, html }) {
  const host = process.env.MAIL_HOST;
  const port = process.env.MAIL_PORT;
  console.log('[Mail] Using SMTP env:', host, port, '→ to:', to);

  try {
    // throttle a bit so we don't hit any small limits
    const now = Date.now();
    const diff = now - lastSendAt;
    if (diff < MIN_INTERVAL_MS) {
      const waitMs = MIN_INTERVAL_MS - diff;
      console.log(
        `[Mail] Throttling to avoid rate limit. Waiting ${waitMs} ms before sending...`,
      );
      await sleep(waitMs);
    }

    const t = getTransporter();

    const info = await t.sendMail({
      // IMPORTANT: use your verified Gmail as "from"
      from: `"EduProject" <${process.env.MAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });

    lastSendAt = Date.now();
    console.log('[Mail] Email sent. messageId =', info.messageId);
    return info;
  } catch (err) {
    console.error('[Mail] Error sending email:', err);
    throw err;
  }
}

// ========================
// Helper: admin gets email when tutor applies to a course
// ========================
export function buildTutorAppliedAdminEmail({
  tutorName,
  tutorEmail,
  tutorExperience,
  tutorLanguages,
  tutorBio,
  tutorCvUrl,
  courseTitle,
  courseDescription,
  categoryName,
  level,
  price,
  acceptUrl,
  rejectUrl,
  adminDashboardUrl,
}) {
  const safeCourseDesc = courseDescription || '—';
  const safeCategory = categoryName || '—';
  const safeLevel = level || '—';
  const safePrice = price != null ? `$${price}` : '—';
  const safeLanguages = tutorLanguages || '—';
  const safeBio = tutorBio || '—';

  const cvHtml = tutorCvUrl
    ? `<p><strong>CV:</strong> <a href="${tutorCvUrl}" target="_blank" rel="noopener noreferrer">View CV</a></p>`
    : '<p><strong>CV:</strong> Not uploaded.</p>';

  const html = `
    <h2>Tutor application for: ${courseTitle}</h2>
    <p>A tutor has applied to teach this course.</p>

    <h3>Course details</h3>
    <ul>
      <li><strong>Title:</strong> ${courseTitle}</li>
      <li><strong>Category:</strong> ${safeCategory}</li>
      <li><strong>Level:</strong> ${safeLevel}</li>
      <li><strong>Price:</strong> ${safePrice}</li>
    </ul>
    <p><strong>Description:</strong><br/>${safeCourseDesc}</p>

    <h3>Tutor details</h3>
    <ul>
      <li><strong>Name:</strong> ${tutorName}</li>
      <li><strong>Email:</strong> ${tutorEmail}</li>
      <li><strong>Experience:</strong> ${tutorExperience} years</li>
      <li><strong>Languages:</strong> ${safeLanguages}</li>
    </ul>
    <p><strong>Bio:</strong><br/>${safeBio}</p>
    ${cvHtml}

    <hr/>
    <p>You can also review this application in the admin dashboard:</p>
    <p><a href="${adminDashboardUrl}" target="_blank" rel="noopener noreferrer">${adminDashboardUrl}</a></p>

    <p>
      <a href="${acceptUrl}"
         style="display:inline-block;margin-right:8px;padding:10px 16px;background:#16a34a;color:#fff;text-decoration:none;border-radius:4px;"
         target="_blank" rel="noopener noreferrer">
         ACCEPT
      </a>
      <a href="${rejectUrl}"
         style="display:inline-block;padding:10px 16px;background:#dc2626;color:#fff;text-decoration:none;border-radius:4px;"
         target="_blank" rel="noopener noreferrer">
         REJECT
      </a>
    </p>
  `;

  return {
    subject: `Tutor ${tutorName} applied to teach "${courseTitle}"`,
    html,
  };
}

// ========================
// Helper: email to tutor when application is accepted/rejected
// ========================
export function buildTutorDecisionEmail({
  tutorName,
  courseTitle,
  decision, // 'accepted' or 'rejected'
  reason, // optional short reason / message
  dashboardUrl, // link to tutor dashboard or course page
}) {
  const safeName = tutorName || 'Tutor';
  const safeCourse = courseTitle || 'the course';
  const isAccepted = decision === 'accepted';

  const subject = isAccepted
    ? `Good news! Your application for "${safeCourse}" has been accepted`
    : `Update on your application for "${safeCourse}"`;

  const intro = isAccepted
    ? `We are happy to inform you that your application to teach "${safeCourse}" has been accepted. 🎉`
    : `Thank you for applying to teach "${safeCourse}". After reviewing your profile, we will not be proceeding with this application at this time.`;

  const reasonText = reason
    ? `<p><strong>Note from the team:</strong><br/>${reason}</p>`
    : '';

  const actionText = isAccepted
    ? 'You can manage your course and bookings from your tutor dashboard.'
    : 'You are welcome to apply for other courses that match your expertise.';

  const dashboardLinkHtml = dashboardUrl
    ? `
      <p style="margin:16px 0;">
        <a href="${dashboardUrl}"
           style="
             background-color:#4f46e5;
             color:#ffffff;
             padding:10px 20px;
             border-radius:6px;
             text-decoration:none;
             font-weight:500;
             display:inline-block;
           ">
          Open Tutor Dashboard
        </a>
      </p>
    `
    : '';

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <p>Hi ${safeName},</p>
      <p>${intro}</p>
      ${reasonText}
      <p>${actionText}</p>
      ${dashboardLinkHtml}
      <p style="margin-top:24px;">
        Best regards,<br/>
        <strong>EduProject Team</strong>
      </p>
    </div>
  `;

  return { subject, html };
}
