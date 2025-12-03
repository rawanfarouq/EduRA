// server/src/controllers/course.controller.js
import Course from '../models/Course.js';
import Category from '../models/Category.js';
import Tutor from '../models/Tutor.js';

import { notifyTutorsForNewCourse } from './ai.controller.js';

/**
 * POST /api/courses
 * Create a new course (admin)
 */
export const createCourse = async (req, res) => {
  try {
    console.log('▶ createCourse called with body:', req.body);

    const {
      title,
      categoryId,
      description,
      price,
      level,
      maxStudents,
      instructorId,
    } = req.body;

    if (!title || !categoryId) {
      return res
        .status(400)
        .json({ message: 'title and categoryId are required' });
    }

    // Optional: verify category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(400).json({ message: 'Invalid categoryId' });
    }

    // Optional: validate instructor if provided
    let instructor = null;
    if (instructorId) {
      instructor = await Tutor.findById(instructorId);
      if (!instructor) {
        return res.status(400).json({ message: 'Invalid instructorId' });
      }
    }

    // 1) Create the course document
    const course = await Course.create({
      title,
      categoryId,
      description,
      price,
      level,
      maxStudents,
      instructorId: instructor ? instructor._id : null,
    });

    // 2) Fire-and-forget: notify tutors (AI CV-based match + email + in-app notifications)
    notifyTutorsForNewCourse(course).catch((err) => {
      console.error('Error notifying tutors for new course:', err);
    });

    // 3) Respond to client
    return res.status(201).json(course);
  } catch (error) {
    console.error('createCourse error:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

/**
 * GET /api/courses
 * Public list of courses (students/tutors)
 * Optional query params:
 *   - categoryId
 *   - search (text search on title/description)
 *   - level
 */
export const listCourses = async (req, res) => {
  try {
    const { categoryId, search, level } = req.query;

    const filter = {};

    if (categoryId) {
      filter.categoryId = categoryId;
    }
    if (level) {
      filter.level = level;
    }

    if (search) {
      filter.$text = { $search: search };
    }

    const courses = await Course.find(filter)
      .populate({ path: 'categoryId', select: 'name _id' })
      .populate({ path: 'instructorId', select: 'userId' })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ courses });
  } catch (error) {
    console.error('listCourses error:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

/**
 * GET /api/courses/:id
 * Get single course details
 */
export const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id)
      .populate({ path: 'categoryId', select: 'name _id' })
      .populate({
        path: 'instructorId',
        populate: { path: 'userId', select: 'name email' },
      })
      .lean();

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    return res.json({ course });
  } catch (error) {
    console.error('getCourseById error:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

/**
 * PUT /api/courses/:id
 * Update an existing course (admin)
 */
export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      categoryId,
      description,
      price,
      level,
      maxStudents,
      instructorId,
      isPublished,
    } = req.body;

    const update = {};

    if (title !== undefined) update.title = title;
    if (categoryId !== undefined) update.categoryId = categoryId;
    if (description !== undefined) update.description = description;
    if (price !== undefined) update.price = price;
    if (level !== undefined) update.level = level;
    if (maxStudents !== undefined) update.maxStudents = maxStudents;
    if (isPublished !== undefined) update.isPublished = isPublished;

    if (instructorId !== undefined) {
      if (instructorId === null || instructorId === '') {
        update.instructorId = null;
      } else {
        const instructor = await Tutor.findById(instructorId);
        if (!instructor) {
          return res.status(400).json({ message: 'Invalid instructorId' });
        }
        update.instructorId = instructor._id;
      }
    }

    const course = await Course.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    return res.json({ course });
  } catch (error) {
    console.error('updateCourse error:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

/**
 * DELETE /api/courses/:id
 * Delete a course (admin)
 */
export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findByIdAndDelete(id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    return res.json({ message: 'Course deleted', courseId: id });
  } catch (error) {
    console.error('deleteCourse error:', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};
