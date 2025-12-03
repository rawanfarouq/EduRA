// models/Notification.js
import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Notification category / purpose
    // e.g. "course_match", "tutor_applied", "tutor_assigned", "application_rejected"
    type: { type: String, required: true },

    // Short title for list preview
    title: { type: String, required: true },

    // Main message shown inside notification panel
    message: { type: String, required: true },

    // Extra information passed to frontend
    data: { type: Object, default: {} },

    // used in tutor application flow: "none" | "pending" | "accepted" | "rejected"
    actionStatus: { type: String, default: 'none' },

    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.model('Notification', NotificationSchema);
