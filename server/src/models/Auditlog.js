import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    action: { type: String, required: true }, // e.g., "USER_BANNED", "COURSE_PUBLISHED"
    entity: { type: String, required: true }, // e.g., "User","Course","Booking"
    entityId: { type: mongoose.Schema.Types.ObjectId, index: true },
    meta: {}, // arbitrary JSON payload
  },
  { timestamps: true },
);

auditLogSchema.index({ action: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
