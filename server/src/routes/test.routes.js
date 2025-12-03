// server/src/routes/test.routes.js
import express from 'express';

import { sendEmail } from '../utils/sendEmail.js';

const router = express.Router();

router.get('/test-email', async (req, res) => {
  try {
    await sendEmail({
      to: 'test@example.com',
      subject: 'Mailtrap Test Email',
      html: '<h1>Hello from Mailtrap!</h1>',
    });
    res.json({ message: 'Email sent successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
