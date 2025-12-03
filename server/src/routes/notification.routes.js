import { Router } from 'express';

import { requireAuth } from '../middleware/auth.js'; // ← use the SAME path you use in other routes
import {
  listMyNotifications,
  markNotificationRead,
  applyForCourseFromNotification,
  dismissNotification,
  createTutorAppliedNotification,
  
} from '../controllers/notification.controller.js';

const router = Router();

router.get('/', requireAuth, listMyNotifications);
router.patch('/:id/read', requireAuth, markNotificationRead);
router.post(
  '/:id/apply-from-course',
  requireAuth,
  applyForCourseFromNotification,
);
router.post('/:id/dismiss', requireAuth, dismissNotification);

// tutor clicked "Apply" from email
router.post('/tutor-applied', requireAuth, createTutorAppliedNotification);

export default router;
