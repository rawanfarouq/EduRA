import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { submitReview } from "../lib/api";
import Swal from "sweetalert2";

export default function StudentReview() {
const { tutorId, courseId } = useParams();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  async function handleSubmit() {
    try {
      setLoading(true);
      setErr("");
      await submitReview(tutorId, { rating, comment,courseId });
Swal.fire({
      title: "Review Submitted",
      text: "Your review has been submitted successfully!",
      icon: "success",
      confirmButtonText: "OK",
      confirmButtonColor: "#3085d6",
    }).then(() => {
      // Redirect AFTER popup closes
      navigate("/student/dashboard");
    });      navigate(`/student/dashboard`);
    } catch (e) {
      setErr(e.message || "Failed to submit review");
         Swal.fire({
      title: "Error",
      text: e.message || "Failed to submit review.",
      icon: "error",
      confirmButtonText: "OK",
      confirmButtonColor: "#d33",
    });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg p-6 mx-auto mt-10 bg-white rounded shadow">
      <h1 className="text-xl font-semibold">Review Your Tutor</h1>

      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}

      <label className="block mt-4 text-sm font-medium">Rating</label>
      <select
        value={rating}
        onChange={(e) => setRating(Number(e.target.value))}
        className="w-full px-3 py-2 mt-1 border rounded"
      >
        {[1, 2, 3, 4, 5].map((v) => (
          <option key={v} value={v}>
            {v} Star{v > 1 ? "s" : ""}
          </option>
        ))}
      </select>

      <label className="block mt-4 text-sm font-medium">Comment</label>
      <textarea
        rows={4}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="w-full px-3 py-2 mt-1 border rounded"
        placeholder="Write your feedback..."
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full px-4 py-2 mt-4 text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-60"
      >
        {loading ? "Submitting..." : "Submit Review"}
      </button>
    </div>
  );
}
