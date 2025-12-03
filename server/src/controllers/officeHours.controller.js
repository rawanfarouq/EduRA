// server/src/controllers/officeHours.controller.js
import Tutor from '../models/Tutor.js';
import OfficeHourMessage from '../models/OfficeHourMessage.js';
import TutorResource from '../models/TutorResource.js';
import { isNowWithinAvailability } from '../utils/availability.js';
import Enrollment from '../models/Enrollment.js';   // 👈 NEW
import Booking from '../models/Booking.js';         // 👈 NEW




// ----------------- STUDENT: Send question during office hours -----------------
export async function sendOfficeHourQuestion(req, res) {
  const studentUserId = req.user?._id;
  const { tutorId } = req.params;
  const { message, courseId } = req.body;

  if (!studentUserId) return res.status(401).json({ message: 'Unauthorized' });

  if (!message || !message.trim()) {
    return res.status(400).json({ message: 'Message is required' });
  }

  if (!courseId) {
    return res.status(400).json({ message: 'courseId is required' });
  }

  // 1) Load tutor
  const tutor = await Tutor.findById(tutorId).populate('userId');
  if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

  // 2) Check that student is enrolled in this course
  const enrollment = await Enrollment.findOne({
    studentId: studentUserId,
    courseId,
  });

  if (!enrollment) {
    return res.status(400).json({
      message: 'You are not enrolled in this course.',
    });
  }

  // 3) Check that there is a confirmed booking for this course & tutor
  const booking = await Booking.findOne({
    studentId: studentUserId,
    tutorId: tutor._id,
    courseId,
    status: 'confirmed', // 👈 adjust if your final status name is different
  });

  if (!booking) {
    return res.status(400).json({
      message:
        'You need a confirmed booking with this tutor for this course before sending questions.',
    });
  }

  // 4) Check if we are inside this tutor's availability (office hours)
  const inOfficeHours = isNowWithinAvailability(tutor.availability || []);
  if (!inOfficeHours) {
    return res.status(400).json({
      message:
        'The tutor is not currently in office hours. Please try again during their available time.',
    });
  }

  // 5) Save the message (linked to tutor, student, course)
  const msg = await OfficeHourMessage.create({
    tutorId: tutor._id,
    studentId: studentUserId,
    courseId,
    message: message.trim(),
  });

  return res.status(201).json({
    message: 'Question sent',
    officeHourMessage: msg,
  });
}


// ----------------- TUTOR: List questions for me -----------------
export async function listMyOfficeHourMessages(req, res) {
  const tutorUserId = req.user?._id;
  if (!tutorUserId) return res.status(401).json({ message: 'Unauthorized' });

  const tutor = await Tutor.findOne({ userId: tutorUserId });
  if (!tutor) return res.status(400).json({ message: 'Tutor profile not found' });

  const messages = await OfficeHourMessage.find({ tutorId: tutor._id })
    .populate({ path: 'studentId', select: 'name email', model: 'User' })
    .sort({ createdAt: -1 })
    .lean();

  res.json({ messages });
}

// ----------------- TUTOR: Add resource (only in office hours) -----------------
export async function addTutorResourceLink(req, res) {
  const tutorUserId = req.user?._id;
  if (!tutorUserId) return res.status(401).json({ message: 'Unauthorized' });

  const { title, url, courseId } = req.body;
  if (!title || !title.trim() || !url || !url.trim()) {
    return res.status(400).json({ message: 'Title and URL are required' });
  }

  const tutor = await Tutor.findOne({ userId: tutorUserId });
  if (!tutor) return res.status(400).json({ message: 'Tutor profile not found' });

  // Only allow adding while in office hours
  const inOfficeHours = isNowWithinAvailability(tutor.availability || []);
  if (!inOfficeHours) {
    return res.status(400).json({
      message: 'You can only add resources while you are in an availability slot.',
    });
  }

  const resource = await TutorResource.create({
    tutorId: tutor._id,
    courseId: courseId || null,
    title: title.trim(),
    type: 'link',
    url: url.trim(),
  });

  res.status(201).json({ resource });
}

// (optional) TUTOR: later you can add a file upload version using multer, reusing your CV upload logic

// ----------------- PUBLIC / STUDENT: List a tutor's resources -----------------
export async function listTutorResources(req, res) {
  const { tutorId } = req.params;
  const tutor = await Tutor.findById(tutorId);
  if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

  const resources = await TutorResource.find({ tutorId: tutor._id })
    .sort({ createdAt: -1 })
    .lean();

  res.json({ resources });
}


// POST /api/tutor/office-hours/:id/reply
export const replyOfficeHourMessage = async (req, res) => {
  try {
    const messageId = req.params.id;
    const { reply } = req.body;

    if (!reply || !reply.trim()) {
      return res.status(400).json({ message: "Reply text is required" });
    }

    // Find tutor by logged-in user
    const tutor = await Tutor.findOne({ userId: req.user._id });
    if (!tutor) {
      return res.status(403).json({ message: "Not a tutor" });
    }

    const msg = await OfficeHourMessage.findById(messageId);
    if (!msg) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Ensure this message belongs to this tutor
    if (String(msg.tutorId) !== String(tutor._id)) {
      return res.status(403).json({ message: "Not allowed to reply to this message" });
    }

    msg.reply = reply.trim();
    await msg.save();

    return res.json({
      message: "Reply saved",
      data: msg,
    });
  } catch (e) {
    console.error("replyOfficeHourMessage error:", e);
    res.status(500).json({ message: e.message || "Failed to save reply" });
  }
};

// ----------------- STUDENT: List my office-hour messages -----------------
export async function listMyOfficeHourMessagesStudent(req, res) {
  try {
    const studentUserId = req.user?._id;
    if (!studentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const filter = { studentId: studentUserId };

    // optional: filter by courseId ?courseId=...
    if (req.query.courseId) {
      filter.courseId = req.query.courseId;
    }

    const messages = await OfficeHourMessage.find(filter)
      .populate({
        path: "tutorId",
        populate: { path: "userId", select: "name email", model: "User" },
      })
      .populate({ path: "courseId", select: "title" })
      .sort({ createdAt: 1 }) // oldest first so it feels like chat
      .lean();

    res.json({ messages });
  } catch (e) {
    console.error("listMyOfficeHourMessagesStudent error:", e);
    res
      .status(500)
      .json({ message: e.message || "Failed to load student messages" });
  }
}
