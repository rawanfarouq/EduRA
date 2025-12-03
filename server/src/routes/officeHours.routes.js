// server/src/routes/officeHours.routes.js
import { Router } from 'express';

import { requireAuth } from '../middleware/auth.js';
import {
  sendOfficeHourQuestion,
  listMyOfficeHourMessages,
  addTutorResourceLink,
  listTutorResources,replyOfficeHourMessage,listMyOfficeHourMessagesStudent,
} from '../controllers/officeHours.controller.js';

const r = Router();

// STUDENT → send question (must be logged in)
r.post('/tutor/:tutorId/question', requireAuth, sendOfficeHourQuestion);

// TUTOR → see all office-hour questions
r.get('/me/messages', requireAuth, listMyOfficeHourMessages);

// TUTOR → add a resource (link) while in office hours
r.post('/me/resources', requireAuth, addTutorResourceLink);

// PUBLIC/STUDENT → list tutor resources
r.get('/tutor/:tutorId/resources', listTutorResources);

// POST /api/office-hours/:id/reply   ✅
r.post(
  "/:id/reply",
  requireAuth,
  replyOfficeHourMessage
);

// STUDENT → list my messages for given tutor/course
r.get("/my-messages", requireAuth, listMyOfficeHourMessagesStudent);


export default r;
