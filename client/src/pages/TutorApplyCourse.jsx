// src/pages/TutorApplyCourse.jsx
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { postAuthJSON } from "../lib/api";

export default function TutorApplyCourse() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    async function sendNotification() {
      try {
        await postAuthJSON("/api/notifications/tutor-applied", { courseId });
        console.log("Tutor applied for course:", courseId);
      } catch (e) {
        console.error("Failed to create tutor-applied notification:", e);
      }
    }
    sendNotification();
  }, [courseId]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-6 text-center bg-white rounded-lg shadow-md">
        <h2 className="mb-3 text-xl font-semibold text-green-700">
          Request sent ✅
        </h2>
        <p className="mb-4 text-sm text-gray-700">
          Your request to teach this course has been sent to the admin.
          Please wait for approval.
        </p>
        <button
          onClick={() => navigate("/tutor/dashboard")}
          className="px-4 py-2 text-white bg-purple-600 rounded hover:bg-purple-700"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
