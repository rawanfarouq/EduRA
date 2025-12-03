// controllers/enrollment.controller.js
import Enrollment from "../models/Enrollment.js";
// 🆕 adjust this import name/path to match your real resource model
import TutorResource from "../models/TutorResource.js";

/**
 * GET /api/enrollments/me
 * List current student's enrollments (pending + active)
 */
export const listMyEnrollments = async (req, res) => {
  try {
    const studentId = req.user?._id;
    if (!studentId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const enrollments = await Enrollment.find({
      studentId,
      status: { $in: ["pending", "active"] },
    })
      .populate({
        path: "courseId",
        populate: [
          // ✅ Category info
          {
            path: "categoryId",
            select: "name description",
          },
          // ✅ Tutor / instructor with availability + user (name/email)
          {
            path: "instructorId",
            model: "Tutor",
            select: "availability userId",
            populate: {
              path: "userId",
              model: "User",
              select: "name email",
            },
          },
        ],
      })
      .lean();

    return res.json({ enrollments });
  } catch (e) {
    console.error("listMyEnrollments error:", e);
    res
      .status(500)
      .json({ message: e.message || "Failed to load enrollments" });
  }
};

/**
 * PATCH /api/enrollments/:id/progress
 *
 * Body:
 *  - completedResourceIds: string[]
 *  - assignmentCompleted: boolean
 *
 * Logic:
 *  - Progress from resources = up to 70%
 *  - Progress from assignment = 30% if completed, else 0
 *  - Total progress = round(resourcesPart + assignmentPart)
 */
export const updateEnrollmentProgress = async (req, res) => {
  try {
    const studentId = req.user?._id;
    if (!studentId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const {
      completedResourceIds = [],
      assignmentCompleted = false,
    } = req.body || {};

    // Ensure we only touch the enrollment that belongs to THIS student
    const enrollment = await Enrollment.findOne({
      _id: id,
      studentId,
    });

    if (!enrollment) {
      return res
        .status(404)
        .json({ message: "Enrollment not found for this student" });
    }

    // Normalize completedResourceIds to an array of strings
    const cleanCompletedIds = Array.isArray(completedResourceIds)
      ? completedResourceIds.map((x) => String(x))
      : [];

    // 🧮 Get total number of resources for this course
    const courseId = enrollment.courseId;
    let totalResources = 0;

    if (courseId) {
      // ⚠️ If your model is not TutorResource, change this query accordingly
      totalResources = await TutorResource.countDocuments({
        courseId: courseId,
      });
    }

    // 🎯 Weighting
    const MAX_RESOURCES_PART = 70; // resources contribute up to 70%
    const MAX_ASSIGNMENT_PART = 30; // assignment contributes 30%

    let resourcesPart = 0;
    if (totalResources > 0) {
      const ratio = cleanCompletedIds.length / totalResources;
      resourcesPart = Math.min(MAX_RESOURCES_PART, ratio * MAX_RESOURCES_PART);
    }

    const assignmentPart = assignmentCompleted ? MAX_ASSIGNMENT_PART : 0;

    const newProgress = Math.round(resourcesPart + assignmentPart);

    // ✅ Save fields on enrollment
    enrollment.completedResourceIds = cleanCompletedIds;
    enrollment.assignmentCompleted = !!assignmentCompleted;
    enrollment.progress = newProgress;

    await enrollment.save();

    return res.json({
      message: "Progress updated",
      enrollment,
    });
  } catch (e) {
    console.error("updateEnrollmentProgress error:", e);
    res
      .status(500)
      .json({ message: e.message || "Failed to update enrollment progress" });
  }
};
