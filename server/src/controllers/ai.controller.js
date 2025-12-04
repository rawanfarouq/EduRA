// src/controllers/ai.controller.js
import path from 'path';

import dotenv from 'dotenv';
dotenv.config();
import OpenAI from 'openai';

import { extractTextFromCV } from '../utils/cv-text.js';
import Course from '../models/Course.js';
import Tutor from '../models/Tutor.js';
import Notification from '../models/Notification.js';
import Booking from '../models/Booking.js';
import Assignment from '../models/Assignment.js';
import Enrollment from '../models/Enrollment.js';
import { sendEmail } from '../utils/sendEmail.js'; // ✅ use the shared mailer

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

console.log('OPENAI_API_KEY present?', !!process.env.OPENAI_API_KEY);

function cosineSim(A, B) {
  const dot = A.reduce((s, a, i) => s + a * B[i], 0);
  const normA = Math.sqrt(A.reduce((s, a) => s + a * a, 0));
  const normB = Math.sqrt(B.reduce((s, b) => s + b * b, 0));
  if (!normA || !normB) return 0;
  return dot / (normA * normB);
}

// ---- helper to extract field + keywords from CV using LLM ----
async function extractExpertiseFromCV(cvText) {
  const prompt = `
You will receive the text of a tutor's CV.

1) Infer:
   - the main professional field (e.g. "pharmacy", "mathematics", "computer science", "English language", "physics", "biology").
   - 3–8 related subfields or topics (e.g. "pharmacology", "clinical pharmacy", "organic chemistry").
   - 5–15 important keywords that capture subjects they could teach.

2) Reply ONLY in strict JSON with this shape:
{
  "primaryField": "...",
  "relatedFields": ["...", "..."],
  "keywords": ["...", "..."]
}
Do not add any explanation text.
  `.trim();

  const chat = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are an assistant that extracts structured teaching expertise from CV text.',
      },
      { role: 'user', content: prompt },
      { role: 'user', content: cvText.slice(0, 8000) },
    ],
    temperature: 0.2,
  });

  const raw = chat.choices[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(raw);
    return {
      primaryField: (parsed.primaryField || '').toString(),
      relatedFields: Array.isArray(parsed.relatedFields)
        ? parsed.relatedFields.map(String)
        : [],
      keywords: Array.isArray(parsed.keywords)
        ? parsed.keywords.map(String)
        : [],
    };
  } catch {
    return {
      primaryField: '',
      relatedFields: [],
      keywords: [],
    };
  }
}

function normalize(str = '') {
  return str.toLowerCase();
}

function includesAny(text, words = []) {
  const t = normalize(text);
  return words.some((w) => t.includes(normalize(w)));
}

// 🔔 Notify tutors (by CV/AI match) when a NEW course is created
export async function notifyTutorsForNewCourse(courseDoc) {
  try {
    // Ensure we have a plain object + category name
    const course = courseDoc.toObject ? courseDoc.toObject() : courseDoc;

    const populatedCourse =
      course.categoryId && !course.categoryId.name
        ? await Course.findById(course._id).populate('categoryId').lean()
        : course;

    const categoryName = populatedCourse.categoryId?.name || '';

    // Use title + description + category as the “course text”
    const courseText = `${populatedCourse.title || ''} ${
      populatedCourse.description || ''
    } ${categoryName}`;

    // 🔹 Embed THIS single course ONCE (reused for all tutors)
    const courseEmbedding = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: courseText.slice(0, 8000),
    });
    const courseVector = courseEmbedding.data[0].embedding;

    // 1) Find tutors that have a CV uploaded + populate user to get email
    const tutors = await Tutor.find({
      cvUrl: { $exists: true, $ne: null },
    })
      .populate('userId', 'name email')
      .lean();

    if (!tutors.length) {
      console.log('notifyTutorsForNewCourse: no tutors with CVs found.');
      return;
    }

    console.log(
      `notifyTutorsForNewCourse: checking ${tutors.length} tutors for course "${populatedCourse.title}"`,
    );

    const notificationsToInsert = [];

    // similarity threshold – tweak as you like
    const STRICT_THRESHOLD = 0.35;

    // 2) For each tutor: extract text + expertise, compute similarity
    for (const tutor of tutors) {
      if (!tutor.cvUrl) continue;

      const relPath = tutor.cvUrl.startsWith('/')
        ? tutor.cvUrl.slice(1)
        : tutor.cvUrl;

      const filePath = path.join(process.cwd(), relPath);

      const ext = path.extname(relPath).toLowerCase();
      let mime = '';
      if (ext === '.pdf') {
        mime = 'application/pdf';
      } else if (ext === '.docx') {
        mime =
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      }

      let cvText = '';
      try {
        cvText = await extractTextFromCV(filePath, mime, relPath);
      } catch (err) {
        console.error(
          'notifyTutorsForNewCourse: CV extract failed for tutor',
          tutor._id,
          err,
        );
        continue;
      }

      if (!cvText) continue;

      // 🔹 Use LLM-based expertise extractor
      const expertise = await extractExpertiseFromCV(cvText);
      const allKeywords = [
        expertise.primaryField,
        ...(expertise.relatedFields || []),
        ...(expertise.keywords || []),
      ].filter(Boolean);

      // 2b) Embed the tutor CV
      let cvVector;
      try {
        const cvEmbedding = await client.embeddings.create({
          model: 'text-embedding-3-small',
          input: cvText.slice(0, 8000),
        });
        cvVector = cvEmbedding.data[0].embedding;
      } catch (err) {
        console.error(
          'notifyTutorsForNewCourse: embedding failed for tutor',
          tutor._id,
          err,
        );
        continue;
      }

      // 3) Base similarity via cosine similarity
      const sim = cosineSim(cvVector, courseVector);

      // 4) Boosts (soft, not hard filters)
      let boost = 0;

      // If category name overlaps with primary/related fields → boost
      if (
        includesAny(categoryName, [
          expertise.primaryField,
          ...(expertise.relatedFields || []),
        ])
      ) {
        boost += 0.08;
      }

      // If title has any keyword → small boost
      if (includesAny(populatedCourse.title || '', allKeywords)) {
        boost += 0.05;
      }

      // If we had a keyword hit anywhere in combined text → extra small boost
      const hasKeywordHit =
        allKeywords.length > 0 ? includesAny(courseText, allKeywords) : false;
      if (hasKeywordHit) {
        boost += 0.03;
      }

      const finalScore = sim + boost;

      console.log(
        `Tutor ${tutor._id}: sim=${sim.toFixed(3)}, boost=${boost.toFixed(
          3,
        )}, final=${finalScore.toFixed(3)}`,
      );

      // Only keep tutors above similarity threshold
      if (finalScore < STRICT_THRESHOLD) {
        continue;
      }

      if (!tutor.userId) {
        console.log(
          'notifyTutorsForNewCourse: tutor has no linked userId, skipping email+notif. Tutor:',
          tutor._id.toString(),
        );
        continue;
      }

      const user = tutor.userId;
      const userId = user._id || user;
      const tutorEmail = user.email;
      const tutorName = user.name || 'Tutor';

      const notifTitle = `New course: ${populatedCourse.title}`;
      const notifMessage = `A new course "${populatedCourse.title}" in ${
        categoryName || 'this category'
      } matches your CV.`;

      // ✅ Always create notification (later inserted with insertMany)
      notificationsToInsert.push({
        userId,
        type: 'course_match',
        title: notifTitle,
        message: notifMessage,
        isRead: false,
        actionStatus: 'none',
        data: {
          courseId: populatedCourse._id,
          courseTitle: populatedCourse.title,
          categoryName,
        },
      });

      // ✅ Try to send email for every matched tutor that has an email
      if (!tutorEmail) {
        console.log(
          '[AI Course Match] Tutor',
          userId.toString(),
          'has NO email → only notification will be created.',
        );
        continue;
      }

      const subject = `New Course Matching Your CV: ${populatedCourse.title}`;

      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2 style="color:#111827;">New Course Opportunity: ${
            populatedCourse.title
          }</h2>
          <p>Hi ${tutorName},</p>
          <p>
            Based on your CV, we found a new course on EduProject that looks relevant to your profile.
          </p>

          <h3 style="margin-top:16px;color:#111827;">Course Details</h3>
          <ul>
            <li><strong>Title:</strong> ${populatedCourse.title}</li>
            ${
              categoryName
                ? `<li><strong>Category:</strong> ${categoryName}</li>`
                : ''
            }
            <li><strong>Level:</strong> ${populatedCourse.level || 'N/A'}</li>
          </ul>

          ${
            populatedCourse.description
              ? `<p><strong>Description:</strong><br>${populatedCourse.description}</p>`
              : ''
          }

          <p style="margin-top:16px;">
            If you are interested in teaching this course, please
            <strong>sign in to your tutor account on EduProject</strong>
            to review the course and accept or reject it.
          </p>

          <p>If you're not interested, you can simply ignore this email.</p>
          <p style="margin-top:24px;">
            Best regards,<br/>
            <strong>EduProject Team</strong>
          </p>
        </div>
      `;

      try {
        await sendEmail({
          to: tutorEmail,
          subject,
          html,
        });

        console.log(
          '[AI Course Match] Email successfully sent to',
          tutorEmail,
          'for tutor',
          userId.toString(),
        );
      } catch (err) {
        console.error(
          '[AI Course Match] Email ERROR for tutor',
          userId.toString(),
          '→',
          err.message,
        );
      }
    }

    // Insert notifications for all matched tutors
    if (!notificationsToInsert.length) {
      console.log(
        'notifyTutorsForNewCourse: no relevant tutors found above threshold.',
      );
      return;
    }

    await Notification.insertMany(notificationsToInsert);
    console.log(
      `notifyTutorsForNewCourse: created ${notificationsToInsert.length} notifications`,
    );
  } catch (err) {
    console.error('notifyTutorsForNewCourse error:', err);
  }
}

/**
 * 🔧 Core ranking logic reused by both:
 * - suggestCoursesFromCV (upload)
 * - suggestCoursesForTutorCV (logged-in tutor, stored CV)
 */
async function rankCoursesForCVText(cvText) {
  const expertise = await extractExpertiseFromCV(cvText);
  const allKeywords = [
    expertise.primaryField,
    ...(expertise.relatedFields || []),
    ...(expertise.keywords || []),
  ].filter(Boolean);

  const cvEmbedding = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: cvText.slice(0, 8000),
  });
  const cvVector = cvEmbedding.data[0].embedding;

  // ✅ consider ALL non-archived courses
  const courses = await Course.find({ instructorId: null })
    .populate('categoryId')
    .lean();

  const scored = [];

  for (const course of courses) {
    const categoryName = course.categoryId?.name || '';
    const combinedText = `${course.title || ''} ${
      course.description || ''
    } ${categoryName}`;

    const hasKeywordHit =
      allKeywords.length > 0 ? includesAny(combinedText, allKeywords) : false;

    const courseEmbed = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: combinedText.slice(0, 8000),
    });
    const courseVector = courseEmbed.data[0].embedding;

    const sim = cosineSim(cvVector, courseVector);

    let boost = 0;
    if (
      includesAny(categoryName, [
        expertise.primaryField,
        ...(expertise.relatedFields || []),
      ])
    ) {
      boost += 0.08;
    }
    if (includesAny(course.title || '', allKeywords)) {
      boost += 0.05;
    }
    if (hasKeywordHit) {
      boost += 0.03;
    }

    const finalScore = sim + boost;

    scored.push({
      id: course._id,
      title: course.title,
      category: categoryName,
      similarity: sim,
      finalScore,
    });
  }

  // ✅ Softer threshold + ensure we always send at least e.g. 5
  const MAX_RESULTS = 12;
  const STRICT_THRESHOLD = 0.25; // was 0.35
  const MIN_RESULTS = 5;

  let strictMatches = scored
    .filter((c) => c.finalScore >= STRICT_THRESHOLD)
    .sort((a, b) => b.finalScore - a.finalScore);

  // fill up with top results even if below threshold
  if (strictMatches.length < MIN_RESULTS) {
    const extra = scored
      .filter((c) => !strictMatches.includes(c))
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, MIN_RESULTS - strictMatches.length);

    strictMatches = [...strictMatches, ...extra];
  }

  strictMatches = strictMatches.slice(0, MAX_RESULTS);

  const suggested = strictMatches.map((c) => c.id);

  return {
    suggested,
    matches: strictMatches,
    expertise,
    fallback: strictMatches.length < scored.length,
  };
}

/**
 * 📌 Existing endpoint – upload CV in register form
 * POST /api/ai/suggest-courses
 */
export async function suggestCoursesFromCV(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Missing CV file' });
    }

    const cvText = await extractTextFromCV(
      req.file.path,
      req.file.mimetype,
      req.file.originalname,
    );
    if (!cvText) {
      return res
        .status(400)
        .json({ message: 'Unable to extract text from CV' });
    }

    const ranked = await rankCoursesForCVText(cvText);

    return res.json(ranked);
  } catch (err) {
    console.error('AI suggestion error:', err);
    res.status(500).json({ message: 'Failed to analyze CV' });
  }
}

/**
 * ✨ NEW: suggest courses for the LOGGED-IN tutor based on stored CV
 * GET /api/ai/tutor-courses
 */
export async function suggestCoursesForTutorCV(req, res) {
  try {
    const userId = req.user?._id;
    console.log('suggestCoursesForTutorCV user:', req.user);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const tutor = await Tutor.findOne({ userId }).lean();
    if (!tutor || !tutor.cvUrl) {
      return res.status(400).json({ message: 'Tutor has no CV uploaded yet.' });
    }

    // cvUrl is like "/uploads/cv123.pdf" or "uploads/cv123.pdf"
    const relPath = tutor.cvUrl.startsWith('/')
      ? tutor.cvUrl.slice(1)
      : tutor.cvUrl;

    const filePath = path.join(process.cwd(), relPath);

    // infer mimetype from extension so pdf-parse / mammoth are used
    const ext = path.extname(relPath).toLowerCase();
    let mime = '';
    if (ext === '.pdf') {
      mime = 'application/pdf';
    } else if (ext === '.docx') {
      mime =
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    const cvText = await extractTextFromCV(filePath, mime, relPath);
    if (!cvText) {
      return res
        .status(400)
        .json({ message: 'Unable to extract text from stored CV' });
    }

    const ranked = await rankCoursesForCVText(cvText);

    return res.json(ranked);
  } catch (err) {
    console.error('AI tutor suggestion error:', err);
    res.status(500).json({ message: 'Failed to analyze tutor CV' });
  }
}

// 📚 Create AI quiz assignment for a confirmed booking
// POST /api/ai/tutor/bookings/:bookingId/assignment
export async function createAIQuizForBooking(req, res) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (user.role !== 'tutor') {
      return res
        .status(403)
        .json({ message: 'Only tutors can create assignments' });
    }

    const { bookingId } = req.params;

    // find tutor doc
    const tutor = await Tutor.findOne({ userId: user._id });
    if (!tutor) {
      return res.status(400).json({ message: 'Tutor profile not found' });
    }

    // find booking and ensure it belongs to this tutor
    const booking = await Booking.findById(bookingId)
      .populate({ path: 'courseId' })
      .populate({ path: 'studentId', select: 'name email' });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (String(booking.tutorId) !== String(tutor._id)) {
      return res
        .status(403)
        .json({ message: 'You are not the tutor for this booking' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        message: `Assignment allowed only for confirmed bookings (current: ${booking.status})`,
      });
    }

    const course = booking.courseId;

    // 🔑 small "salt" to encourage different quizzes each time
    const nowIso = new Date().toISOString();

    const prompt = `
You are a tutor assistant. Create a short quiz for a student.

This quiz is a NEW attempt generated at "${nowIso}" for booking ID "${booking._id}".

Course title: "${course.title}"
Course description: "${course.description || ''}"

Goal:
- 5 short questions only.
- Use a mix of:
  - multiple-choice (mcq) with 4 options.
  - true/false (boolean) with 2 options: "True", "False".
- Keep questions clear and not too long.
- They should be answerable by a beginner who attended an intro session.

VERY IMPORTANT:
- Vary the wording, focus, or combinations of concepts so that this quiz is NOT identical
  to any previous quiz you might have generated for the same course.
- It is okay if some ideas repeat, but at least 3 questions should be clearly different
  in wording or angle compared to a basic "intro biology" quiz.

Return STRICT JSON only in this format (no extra text):

{
  "questions": [
    {
      "text": "Question text ...",
      "type": "mcq",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 1
    },
    {
      "text": "Another question ...",
      "type": "boolean",
      "options": ["True", "False"],
      "correctIndex": 0
    }
  ]
}
    `.trim();

    const chat = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You generate structured quizzes in JSON format only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7, // 🔼 a bit more variety
    });

    const raw = chat.choices[0]?.message?.content || '{}';

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error('AI quiz JSON parse error:', raw, err);
      return res
        .status(500)
        .json({ message: 'Failed to parse AI quiz response' });
    }

    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
    if (!questions.length) {
      return res
        .status(500)
        .json({ message: 'AI did not return any questions' });
    }

    // ✅ ALWAYS create a new assignment
    const assignment = await Assignment.create({
      courseId: booking.courseId,
      studentId: booking.studentId,
      tutorId: tutor._id,
      bookingId: booking._id,
      questions: questions.map((q) => ({
        text: q.text,
        type: q.type === 'boolean' ? 'boolean' : 'mcq',
        options: Array.isArray(q.options) ? q.options : [],
        correctIndex:
          typeof q.correctIndex === 'number' ? q.correctIndex : undefined,
      })),
      status: 'created',
    });

    // 🔗 Update enrollment to point to latest assignment (so student solves newest)
    const enrollment = await Enrollment.findOne({
      studentId: booking.studentId,
      courseId: booking.courseId,
    });

    if (enrollment) {
      enrollment.assignmentId = assignment._id;
      await enrollment.save();
    }

    return res.json({ assignment, alreadyExists: false });
  } catch (err) {
    console.error('createAIQuizForBooking error:', err);
    res.status(500).json({ message: 'Failed to create assignment' });
  }
}

// 👀 Tutor view: get assignment for a specific booking (no creation)
// GET /api/ai/tutor/bookings/:bookingId/assignment
export async function getAssignmentForBookingTutor(req, res) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (user.role !== 'tutor') {
      return res.status(403).json({
        message: 'Only tutors can view this assignment',
      });
    }

    const { bookingId } = req.params;

    // find tutor doc from user
    const tutor = await Tutor.findOne({ userId: user._id });
    if (!tutor) {
      return res.status(400).json({ message: 'Tutor profile not found' });
    }

    // find booking and ensure it belongs to this tutor
    const booking = await Booking.findById(bookingId)
      .populate({ path: 'courseId' })
      .populate({ path: 'studentId', select: 'name email' });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (String(booking.tutorId) !== String(tutor._id)) {
      return res
        .status(403)
        .json({ message: 'You are not the tutor for this booking' });
    }

    // find *all* assignments for this booking + student + course
    const assignments = await Assignment.find({
      bookingId: booking._id,
      studentId: booking.studentId,
      courseId: booking.courseId,
    })
      .sort({ createdAt: -1 }) // newest first
      .populate({ path: 'courseId', select: 'title description' })
      .populate({ path: 'studentId', select: 'name email' });

    return res.json({ assignments });
  } catch (err) {
    console.error('getAssignmentForBookingTutor error:', err);
    res.status(500).json({ message: 'Failed to load assignment' });
  }
}

// GET /api/ai/assignments/:id
export async function getAssignmentById(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const assignment = await Assignment.findById(id)
      .populate({ path: 'courseId', select: 'title description' })
      .populate({ path: 'studentId', select: 'name email' })
      .populate({
        path: 'tutorId',
        populate: { path: 'userId', select: 'name email' },
      });

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // permission: student or tutor or admin
    const isStudent =
      user.role === 'student' &&
      String(assignment.studentId._id || assignment.studentId) ===
        String(user._id);
    const tutorDoc = await Tutor.findOne({ userId: user._id }).lean();
    const isTutor =
      user.role === 'tutor' &&
      tutorDoc &&
      String(assignment.tutorId) === String(tutorDoc._id);

    const isAdmin = user.role === 'admin';

    if (!isStudent && !isTutor && !isAdmin) {
      return res
        .status(403)
        .json({ message: 'Not allowed to view this assignment' });
    }

    return res.json({ assignment });
  } catch (err) {
    console.error('getAssignmentById error:', err);
    res.status(500).json({ message: 'Failed to load assignment' });
  }
}

// POST /api/ai/assignments/:id/grade
export async function gradeAssignmentWithAI(req, res) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (user.role !== 'student') {
      return res
        .status(403)
        .json({ message: 'Only students can submit answers' });
    }

    const { id } = req.params;
    const { answers } = req.body; // expected: array of indices (numbers)

    if (!Array.isArray(answers)) {
      return res
        .status(400)
        .json({ message: 'answers must be an array of indices' });
    }

    const assignment = await Assignment.findById(id).populate({
      path: 'courseId',
      select: 'title',
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (String(assignment.studentId) !== String(user._id)) {
      return res.status(403).json({ message: 'Not your assignment' });
    }

    if (!assignment.questions || !assignment.questions.length) {
      return res.status(400).json({ message: 'Assignment has no questions' });
    }

    // save student answers (trim/pad to same length as questions)
    const trimmed = answers
      .slice(0, assignment.questions.length)
      .map((a) => (typeof a === 'number' ? a : null));
    assignment.studentAnswers = trimmed;

    // grade in backend (deterministic)
    let correct = 0;
    assignment.questions.forEach((q, i) => {
      const correctIndex =
        typeof q.correctIndex === 'number' ? q.correctIndex : null;
      const studentIndex = trimmed[i];
      if (
        correctIndex !== null &&
        typeof studentIndex === 'number' &&
        studentIndex === correctIndex
      ) {
        correct += 1;
      }
    });

    const total = assignment.questions.length;
    const numericGrade = total > 0 ? Math.round((correct / total) * 100) : 0;
    assignment.numericGrade = numericGrade;
    assignment.grade = `${numericGrade}/100`;
    assignment.status = 'graded';

    // Ask AI to explain the result briefly
    const feedbackPrompt = `
You are grading a quiz. I will show you each question, the options, the correct answer index, and the student's chosen index.

Course: "${assignment.courseId?.title || 'Course'}"
Total questions: ${total}
Correct answers: ${correct}
Final score: ${numericGrade}/100

Questions data:
${assignment.questions
  .map((q, i) => {
    return `
Q${i + 1}: ${q.text}
Type: ${q.type}
Options: ${JSON.stringify(q.options || [])}
Correct index: ${typeof q.correctIndex === 'number' ? q.correctIndex : 'null'}
Student answer index: ${typeof trimmed[i] === 'number' ? trimmed[i] : 'null'}
`;
  })
  .join('\n')}

Please give a short friendly feedback to the student:
- Mention total score.
- Mention general strengths or weaknesses.
- NO JSON, just 3–6 short sentences.
    `.trim();

    let aiFeedback = '';
    try {
      const chat = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              "You are a kind tutor giving short feedback to a student's quiz.",
          },
          { role: 'user', content: feedbackPrompt },
        ],
        temperature: 0.4,
      });

      aiFeedback = chat.choices[0]?.message?.content || '';
    } catch (err) {
      console.error('AI feedback error:', err);
      aiFeedback = '';
    }

    assignment.aiFeedback = aiFeedback;
    await assignment.save();

    // Update enrollment progress based on this assignment grade
    try {
      await Enrollment.findOneAndUpdate(
        {
          studentId: assignment.studentId,
          courseId: assignment.courseId,
        },
        {
          progress: assignment.numericGrade ?? 0,
        },
      );
    } catch (err) {
      console.error('Failed to update enrollment progress:', err);
    }

    return res.json({
      assignment: {
        _id: assignment._id,
        numericGrade: assignment.numericGrade,
        grade: assignment.grade,
        aiFeedback: assignment.aiFeedback,
        status: assignment.status,
        studentAnswers: assignment.studentAnswers,
        questions: assignment.questions,
      },
    });
  } catch (err) {
    console.error('gradeAssignmentWithAI error:', err);
    res.status(500).json({ message: 'Failed to grade assignment' });
  }
}
