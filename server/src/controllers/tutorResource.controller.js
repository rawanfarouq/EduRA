// server/src/controllers/tutorResource.controller.js
import TutorResource from '../models/TutorResource.js';
import Tutor from '../models/Tutor.js';

// helper: get tutorId from logged-in user
async function getTutorIdFromUser(userId) {
  if (!userId) return null;
  const tutor = await Tutor.findOne({ userId }).select('_id');
  return tutor?._id || null;
}

// POST /api/tutor/resources
export const addTutorResourceLink = async (req, res) => {
  try {
    const userId = req.user?._id;
    const tutorId = await getTutorIdFromUser(userId);
    if (!tutorId) {
      return res.status(403).json({ message: 'Tutor profile not found' });
    }

    const { courseId, title, url } = req.body;
    if (!courseId || !title || !url) {
      return res
        .status(400)
        .json({ message: 'courseId, title and url are required' });
    }

    const resource = await TutorResource.create({
      tutorId,
      courseId,          // 🔥 important
      title,
      type: 'link',
      url,
    });

    res.status(201).json({ resource });
  } catch (err) {
    console.error('addTutorResourceLink error:', err);
    res
      .status(500)
      .json({ message: err.message || 'Failed to add resource' });
  }
};


/**
 * GET /api/tutor/:tutorId/resources?courseId=...
 * List resources for a tutor, optionally filtered by courseId
 */
export const listTutorResources = async (req, res) => {
  try {
    const { tutorId } = req.params;
    const { courseId } = req.query;

    if (!tutorId) {
      return res.status(400).json({ message: "tutorId is required" });
    }

    const query = { tutorId };

    // 🔥 only resources of this course
    if (courseId) {
      query.courseId = courseId;
    }

    const resources = await TutorResource.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ resources });
  } catch (err) {
    console.error("listTutorResources error:", err);
    res
      .status(500)
      .json({ message: err.message || "Failed to load tutor resources" });
  }
};