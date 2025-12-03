// routes/courses.routes.js
import {Router } from 'express';

import { createCourse } from '../controllers/course.controller.js';
import Course from '../models/Course.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const includeAll = req.query.all === '1' || req.query.includeAll === 'true';

    const detailed =
      req.query.detailed === '1' || req.query.detailed === 'true';

    const publishedFilter = {
      $or: [
        { published: true },
        { isPublished: true },
        {
          $and: [
            { published: { $exists: false } },
            { isPublished: { $exists: false } },
          ],
        },
      ],
    };

    const query = includeAll ? {} : publishedFilter;

    const projection = detailed
      ? 'title description price level language categoryId instructorId isPublished createdAt updatedAt'
      : '_id title';

    let mongoQuery = Course.find(query).select(projection).sort({ title: 1 });

    if (detailed) {
      // ✅ populate category
      mongoQuery = mongoQuery
        .populate('categoryId', 'name description')
        // ✅ populate instructor -> tutor -> user name
        .populate({
          path: 'instructorId', // Tutor
          select: 'userId bio',
          populate: {
            path: 'userId', // User
            select: 'name',
          },
        });
    }

    const courses = await mongoQuery.lean();
    res.json({ courses });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/', createCourse);

export default router;
