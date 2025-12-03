// src/pages/TutorAssignment.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getJSON } from "../lib/api";

export default function TutorAssignment() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      if (!bookingId) return;
      try {
        setLoading(true);
        setErr("");
        // 👀 GET (view-only)
        const data = await getJSON(
          `/api/ai/tutor/bookings/${bookingId}/assignment`
        );
        setAssignment(data.assignment || null);
      } catch (e) {
        setErr(e.message || "Failed to load assignment");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [bookingId]);

  const studentAnswers = assignment?.studentAnswers || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl px-4 py-8 mx-auto">
        <button
          onClick={() => navigate("/tutor/bookings")}
          className="px-3 py-1 mb-4 text-sm text-white bg-gray-700 rounded hover:bg-gray-800"
        >
          ← Back to bookings
        </button>

        <h1 className="mb-3 text-2xl font-bold text-gray-900">
          Assignment Overview
        </h1>

        {loading ? (
          <p className="text-sm text-gray-500">Loading assignment…</p>
        ) : err ? (
          <p className="text-sm text-red-600">{err}</p>
        ) : !assignment ? (
          <p className="text-sm text-gray-600">
            No assignment has been created yet for this booking.
          </p>
        ) : (
          <>
            {/* Header info */}
            <div className="p-4 mb-4 bg-white border rounded-xl">
              <p className="text-sm text-gray-700">
                Course:{" "}
                <strong>
                  {assignment.courseId?.title || "Untitled course"}
                </strong>
              </p>
              {assignment.studentId && (
                <p className="mt-1 text-sm text-gray-700">
                  Student:{" "}
                  <strong>{assignment.studentId.name}</strong>{" "}
                  <span className="text-xs text-gray-500">
                    ({assignment.studentId.email})
                  </span>
                </p>
              )}
              <p className="mt-2 text-sm text-gray-700">
                Status:{" "}
                <strong className="capitalize">
                  {assignment.status || "created"}
                </strong>
              </p>

              {assignment.status === "graded" && (
                <div className="mt-3 text-sm">
                  <p>
                    Grade:{" "}
                    <span className="font-semibold text-green-700">
                      {assignment.grade ||
                        `${assignment.numericGrade ?? 0}/100`}
                    </span>
                  </p>
                  {assignment.aiFeedback && (
                    <p className="mt-2 text-gray-700 whitespace-pre-line">
                      <span className="font-semibold">AI feedback: </span>
                      {assignment.aiFeedback}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Questions + student's answers */}
            <div className="p-4 bg-white border rounded-xl">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                Questions & Answers
              </h2>

              {!assignment.questions?.length ? (
                <p className="text-sm text-gray-500">
                  This assignment has no questions.
                </p>
              ) : (
                <ol className="space-y-4 list-decimal list-inside">
                  {assignment.questions.map((q, i) => {
                    const studentIndex = studentAnswers[i];
                    const correctIndex =
                      typeof q.correctIndex === "number"
                        ? q.correctIndex
                        : null;

                    const studentAnswered =
                      typeof studentIndex === "number" &&
                      q.options &&
                      q.options[studentIndex] != null;

                    

                    return (
                      <li key={i} className="text-sm">
                        <div className="font-medium text-gray-900">
                          {q.text}
                        </div>

                        <div className="mt-1 text-xs text-gray-600">
                          Type:{" "}
                          <span className="capitalize">
                            {q.type || "mcq"}
                          </span>
                        </div>

                        <ul className="mt-2 ml-4 text-xs text-gray-700 list-disc">
                          {q.options?.map((opt, idx) => {
                            const isStudentChoice =
                              studentIndex === idx;
                            const isCorrectChoice =
                              correctIndex === idx;

                            return (
                              <li key={idx}>
                                <span>{opt}</span>
                                {isCorrectChoice && (
                                  <span className="ml-2 text-green-700">
                                    (correct)
                                  </span>
                                )}
                                {isStudentChoice && !isCorrectChoice && (
                                  <span className="ml-2 text-red-600">
                                    (student answer)
                                  </span>
                                )}
                                {isStudentChoice && isCorrectChoice && (
                                  <span className="ml-2 text-green-700">
                                    (student answer ✓)
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>

                        {!studentAnswered && (
                          <p className="mt-1 text-xs text-gray-500">
                            Student did not answer this question.
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
