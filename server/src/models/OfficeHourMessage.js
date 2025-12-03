// server/src/models/OfficeHourMessage.js
import mongoose from 'mongoose';

const officeHourMessageSchema = new mongoose.Schema(
  {
    tutorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tutor', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' }, // optional
    message: { type: String, required: true },
     reply: {
      type: String,
      default: "",
    },
  
  },
 
  { timestamps: true }
);

const OfficeHourMessage = mongoose.model('OfficeHourMessage', officeHourMessageSchema);
export default OfficeHourMessage;
