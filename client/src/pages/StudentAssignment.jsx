// src/pages/StudentAssignment.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { getJSON, postAuthJSON } from "../lib/api";
import Swal from "sweetalert2";

export default function StudentAssignment() {
  const { assignmentId } = useParams(); // route param: /student/assignments/:assignmentId
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // answers: array of indices (number) or null; same length as questions
  const [answers, setAnswers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [gradedInfo, setGradedInfo] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    async function load() {
      if (!assignmentId) return;
      try {
        setLoading(true);
        setErr("");

        // GET /api/ai/assignments/:id
        const data = await getJSON(`/api/ai/assignments/${assignmentId}`);
        const a = data.assignment;
        setAssignment(a || null);

        if (a?.questions) {
          // initialize answers: use existing studentAnswers if present
          const initial = (a.studentAnswers || []).map((val) =>
            typeof val === "number" ? val : null
          );
          while (initial.length < a.questions.length) {
            initial.push(null);
          }
          setAnswers(initial);
        }

        if (a?.status === "graded") {
          setGradedInfo({
            numericGrade: a.numericGrade,
            grade: a.grade,
            aiFeedback: a.aiFeedback,
          });
        }
      } catch (e) {
        setErr(e.message || "Failed to load assignment");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user, assignmentId, navigate]);

  function handleChangeAnswer(qIndex, optIndex) {
    setAnswers((prev) => {
      const copy = [...prev];
      copy[qIndex] = optIndex;
      return copy;
    });
  }

    async function handleSubmit(e) {
    e.preventDefault();
    if (!assignment?._id) return;

    // Optional: ensure all questions answered
    const unanswered = assignment.questions.some(
      (_q, i) => typeof answers[i] !== "number"
    );
    if (unanswered) {
      const ok = window.confirm(
        "You have unanswered questions. Submit anyway?"
      );
      if (!ok) return;
    }

    try {
      setSubmitting(true);
      setErr("");

      // POST /api/ai/assignments/:id/grade
      const data = await postAuthJSON(
        `/api/ai/assignments/${assignment._id}/grade`,
        {
          answers,
        }
      );

      const updated = data.assignment;
      setAssignment((prev) => ({ ...(prev || {}), ...updated }));
      setGradedInfo({
        numericGrade: updated.numericGrade,
        grade: updated.grade,
        aiFeedback: updated.aiFeedback,
      });

      const score = updated.numericGrade ?? 0;


if (score < 50) {
  Swal.fire({
    title: `Score: ${score}/100`,
    text: "This attempt is considered a fail (below 50%). Please retake the quiz until you reach at least 70%.",
    icon: "error",
    confirmButtonText: "OK",
    confirmButtonColor: "#d33",
  });

} else if (score < 70) {
  Swal.fire({
    title: `Score: ${score}/100`,
    text: "You need at least 70% to pass. You can retake the quiz to improve your grade.",
    icon: "warning",
    confirmButtonText: "OK",
    confirmButtonColor: "#f6c23e",
  });

} else {
  Swal.fire({
    title: `Score: ${score}/100`,
    text: "Great job! You have passed this assignment (≥ 70%).",
    icon: "success",
    confirmButtonText: "OK",
    confirmButtonColor: "#3085d6",
  });
}

    } catch (e) {
      setErr(e.message || "Failed to submit answers");
    } finally {
      setSubmitting(false);
    }
  }


  if (!assignmentId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="p-6 bg-white shadow rounded-xl">
          <p className="text-sm text-red-600">Missing assignment ID.</p>
          <button
            onClick={() => navigate("/student/dashboard")}
            className="px-4 py-2 mt-3 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl px-4 py-8 mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-indigo-700">
              Course Assignment
            </h1>
            {assignment?.courseId && (
              <p className="text-sm text-gray-700">
                Course:{" "}
                <strong>
                  {assignment.courseId.title || "Untitled course"}
                </strong>
              </p>
            )}
          </div>

          <button
            onClick={() => navigate("/student/dashboard")}
            className="px-3 py-2 text-sm text-white bg-gray-700 rounded hover:bg-gray-800"
          >
            ← Back
          </button>
        </div>

        {/* Status / errors */}
        {loading ? (
          <p className="text-sm text-gray-500">Loading assignment…</p>
        ) : err ? (
          <div className="px-4 py-2 mb-4 text-sm text-red-700 border border-red-200 rounded bg-red-50">
            {err}
          </div>
        ) : !assignment ? (
          <p className="text-sm text-gray-500">Assignment not found.</p>
        ) : (
          <>
            <div className="p-4 mb-4 bg-white border border-gray-100 rounded-xl">
              <p className="text-sm text-gray-700">
                Status:{" "}
                <strong className="capitalize">{assignment.status}</strong>
              </p>

              {gradedInfo && (
                <div className="mt-3 text-sm">
                  <p>
                    Your grade:{" "}
                    <span className="font-semibold text-green-700">
                      {gradedInfo.grade || `${gradedInfo.numericGrade}/100`}
                    </span>
                  </p>
                  {gradedInfo.aiFeedback && (
                    <p className="mt-2 text-gray-700 whitespace-pre-line">
                      <span className="font-semibold">Feedback:</span>{" "}
                      {gradedInfo.aiFeedback}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Questions form */}
            <form
              onSubmit={handleSubmit}
              className="p-4 bg-white border border-gray-100 rounded-xl"
            >
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                Questions
              </h2>

              {(!assignment.questions || !assignment.questions.length) && (
                <p className="text-sm text-gray-500">
                  This assignment has no questions.
                </p>
              )}

              <ol className="space-y-4 list-decimal list-inside">
                {assignment.questions?.map((q, qIndex) => (
                  <li key={qIndex} className="text-sm">
                    <div className="font-medium text-gray-900">
                      {q.text}
                    </div>
                    <div className="mt-2 space-y-1">
                      {q.options?.map((opt, optIndex) => {
                        const name = `q-${qIndex}`;
                        const checked = answers[qIndex] === optIndex;
                        return (
                          <label
                            key={optIndex}
                            className="flex items-center gap-2 text-gray-700 cursor-pointer"
                          >
                            <input
                              type="radio"
                              name={name}
                              className="w-4 h-4"
                              checked={checked}
                              onChange={() =>
                                handleChangeAnswer(qIndex, optIndex)
                              }
                            />
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ol>

              <button
                type="submit"
                disabled={submitting || loading || !assignment.questions?.length}
                className="w-full px-4 py-2 mt-6 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-60"
              >
                {submitting ? "Submitting & grading…" : "Submit answers"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
