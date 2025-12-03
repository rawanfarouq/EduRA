// src/pages/TutorBookings.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getJSON, postAuthJSON } from "../lib/api";
import { useAuthStore } from "../store/useAuthStore";
import Swal from "sweetalert2";


const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = DAY[d.getDay()];
  const date = d.toLocaleDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${day} ${date} • ${time}`;
}

export default function TutorBookings() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // 🔄 which booking is currently creating an assignment
  const [creatingId, setCreatingId] = useState(null);

  // 👀 assignments modal state
  const [assignmentsOpen, setAssignmentsOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null); // full booking object
  const [bookingAssignments, setBookingAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentsErr, setAssignmentsErr] = useState("");

  function handleLogout() {
    logout();
    navigate("/");
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const data = await getJSON("/api/tutor/bookings");
        setBookings(Array.isArray(data.bookings) ? data.bookings : []);
      } catch (e) {
        setErr(e.message || "Failed to load bookings");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // 🔧 Create AI assignment for this booking
  async function handleCreateAssignment(bookingId) {
    if (!bookingId) return;
    const ok = window.confirm(
      "Create (or regenerate) an AI quiz for this booking?"
    );
    if (!ok) return;

    try {
      setErr("");
      setCreatingId(bookingId);

      const data = await postAuthJSON(
        `/api/ai/tutor/bookings/${bookingId}/assignment`,
        {}
      );
      if (data.alreadyExists) {
Swal.fire({
      title: "Assignment Already Exists",
      text: "An assignment already exists. It has been loaded.",
      icon: "warning",
      confirmButtonText: "OK",
      confirmButtonColor: "#f6c23e",
    });      } else {
        Swal.fire({
      title: "Assignment Created",
      text: "Assignment created successfully.",
      icon: "success",
      confirmButtonText: "OK",
      confirmButtonColor: "#3085d6",
    });
      }
    } catch (e) {
      setErr(e.message || "Failed to create assignment");
      Swal.fire({
    title: "Error",
    text: e.message || "Failed to create assignment.",
    icon: "error",
    confirmButtonText: "OK",
    confirmButtonColor: "#d33",
  });
    } finally {
      setCreatingId(null);
    }
  }

  // 👀 Load ALL assignments for a booking and open modal
  async function handleViewAssignments(booking) {
    if (!booking?._id) return;
    setSelectedBooking(booking);
    setAssignmentsOpen(true);
    setAssignmentsLoading(true);
    setAssignmentsErr("");
    setBookingAssignments([]);

    try {
      const data = await getJSON(
        `/api/ai/tutor/bookings/${booking._id}/assignment`
      );

      let list = [];
      if (Array.isArray(data.assignments)) {
        list = data.assignments;
      } else if (data.assignment) {
        list = [data.assignment];
      }

      list.sort(
        (a, b) =>
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime()
      );

      setBookingAssignments(list);
    } catch (e) {
      setAssignmentsErr(e.message || "Failed to load assignments");
    } finally {
      setAssignmentsLoading(false);
    }
  }

  // group bookings by course
  const grouped = useMemo(() => {
    const map = new Map(); // courseId -> { title, bookings: [] }
    for (const b of bookings) {
      const cid = b.courseId?._id || b.courseId;
      const title = b.courseId?.title || "Untitled course";
      if (!map.has(cid)) {
        map.set(cid, { title, bookings: [] });
      }
      map.get(cid).bookings.push(b);
    }
    return Array.from(map.entries()).map(([courseId, v]) => ({
      courseId,
      ...v,
    }));
  }, [bookings]);

  return (
    <>
      {/* HEADER – same style as admin/tutor dashboard */}
      <header className="text-white bg-slate-900">
        <div className="flex items-center justify-between px-6 py-3 mx-auto max-w-7xl">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="/img/logo.png"
                alt="EduRA"
                style={{ width: "90px", height: "auto" }}
              />
            </Link>
            <div className="hidden text-sm text-slate-200 sm:block">
              <div className="font-semibold">Tutor Bookings</div>
              <div className="text-xs text-slate-300">
                Hello {user?.name || "Tutor"} 👋
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-slate-300 md:inline">
              eduteam.app@gmail.com
            </span>
            {user && (
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-5xl px-4 py-8 mx-auto">
          {/* Page header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                My Bookings
              </h1>
              <p className="text-gray-600">
                Tutor: <strong>{user?.name}</strong>
              </p>
            </div>

            <button
              onClick={() => navigate("/tutor/dashboard")}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-md shadow-sm hover:bg-gray-800"
            >
              ← Back to Dashboard
            </button>
          </div>

          {/* Error banner */}
          {err && (
            <div className="px-4 py-2 mb-4 text-sm text-red-700 border border-red-200 rounded-md bg-red-50">
              {err}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <p className="text-sm text-gray-500 animate-pulse">
              Loading bookings…
            </p>
          ) : !grouped.length ? (
            <p className="text-sm text-gray-600">
              You don&apos;t have any bookings yet.
            </p>
          ) : (
            <div className="space-y-6">
              {grouped.map((course) => (
                <div
                  key={course.courseId}
                  className="p-5 bg-white border border-slate-200 shadow-sm rounded-2xl transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {course.title}
                      </h2>
                      <p className="text-xs text-gray-500">
                        {course.bookings.length} booking
                        {course.bookings.length === 1 ? "" : "s"}
                      </p>
                    </div>

                    <button
                      onClick={() => navigate("/tutor/reviews")}
                      className="px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-100 rounded-full bg-indigo-50 hover:bg-indigo-100"
                    >
                      View Student Reviews
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead>
                        <tr className="text-xs text-gray-500 uppercase border-b bg-slate-50">
                          <th className="px-2 py-2">Student</th>
                          <th className="px-2 py-2">Email</th>
                          <th className="px-2 py-2">Start</th>
                          <th className="px-2 py-2">End</th>
                          <th className="px-2 py-2">Status</th>
                          <th className="px-2 py-2">Price</th>
                          <th className="px-2 py-2">Assignment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {course.bookings.map((b) => (
                          <tr
                            key={b._id}
                            className="border-b last:border-0 hover:bg-slate-50"
                          >
                            <td className="px-2 py-2">
                              {b.studentId?.name || "—"}
                            </td>
                            <td className="px-2 py-2 text-gray-600">
                              {b.studentId?.email || "—"}
                            </td>
                            <td className="px-2 py-2">
                              {formatDateTime(b.start)}
                            </td>
                            <td className="px-2 py-2">
                              {formatDateTime(b.end)}
                            </td>
                            <td className="px-2 py-2">
                              <span
                                className={
                                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
                                  (b.status === "confirmed"
                                    ? "bg-green-100 text-green-800"
                                    : b.status === "requested"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-700")
                                }
                              >
                                {b.status}
                              </span>
                            </td>
                            <td className="px-2 py-2">
                              {b.price != null ? `$${b.price}` : "—"}
                            </td>

                            {/* Assignment actions */}
                            <td className="px-2 py-2">
                              {b.status === "confirmed" ? (
                                <div className="flex flex-col gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCreateAssignment(b._id)
                                    }
                                    disabled={creatingId === b._id}
                                    className={`px-2 py-1 text-xs text-white rounded ${
                                      creatingId === b._id
                                        ? "bg-gray-400 cursor-not-allowed"
                                        : "bg-indigo-600 hover:bg-indigo-700"
                                    }`}
                                  >
                                    {creatingId === b._id
                                      ? "Creating…"
                                      : "Create"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleViewAssignments(b)}
                                    className="text-xs text-indigo-600 hover:underline"
                                  >
                                    View attempts
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 📋 Assignments Modal */}
        {assignmentsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-lg p-5 bg-white shadow-lg rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold">
                    Assignments for this booking
                  </h3>
                  {selectedBooking?.courseId?.title && (
                    <p className="text-xs text-gray-500">
                      Course:{" "}
                      <span className="font-semibold">
                        {selectedBooking.courseId.title}
                      </span>
                    </p>
                  )}
                  {selectedBooking?.studentId?.name && (
                    <p className="text-xs text-gray-500">
                      Student:{" "}
                      <span className="font-semibold">
                        {selectedBooking.studentId.name}
                      </span>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setAssignmentsOpen(false);
                    setSelectedBooking(null);
                    setBookingAssignments([]);
                    setAssignmentsErr("");
                  }}
                  className="px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                >
                  ✕ Close
                </button>
              </div>

              {assignmentsLoading ? (
                <p className="text-sm text-gray-500">
                  Loading assignments…
                </p>
              ) : assignmentsErr ? (
                <p className="text-sm text-red-600">{assignmentsErr}</p>
              ) : !bookingAssignments.length ? (
                <p className="text-sm text-gray-500">
                  No assignments have been created yet for this booking.
                </p>
              ) : (
                <div className="space-y-2 overflow-y-auto max-h-80">
                  {bookingAssignments.map((a, idx) => {
                    const studentAnswers = Array.isArray(a.studentAnswers)
                      ? a.studentAnswers
                      : [];

                    return (
                      <div
                        key={a._id}
                        className="p-3 text-sm border rounded-lg bg-gray-50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-800">
                            Attempt #{idx + 1}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {a.createdAt
                              ? new Date(a.createdAt).toLocaleString()
                              : ""}
                          </span>
                        </div>

                        <div className="mt-1 text-xs text-gray-700">
                          <div>
                            Status:{" "}
                            <span className="font-semibold capitalize">
                              {a.status || "created"}
                            </span>
                          </div>
                          {typeof a.numericGrade === "number" && (
                            <div>
                              Score:{" "}
                              <span className="font-semibold">
                                {a.numericGrade}/100
                              </span>
                            </div>
                          )}
                          {a.questions?.length != null && (
                            <div>
                              Questions:{" "}
                              <span className="font-semibold">
                                {a.questions.length}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Questions & options */}
                        {Array.isArray(a.questions) &&
                          a.questions.length > 0 && (
                            <div className="mt-2 space-y-2 text-xs text-gray-800">
                              {a.questions.map((q, qi) => {
                                const studentIdx =
                                  typeof studentAnswers[qi] === "number"
                                    ? studentAnswers[qi]
                                    : null;

                                return (
                                  <div
                                    key={qi}
                                    className="p-2 bg-white border rounded"
                                  >
                                    <div className="font-semibold">
                                      Q{qi + 1}. {q.text}
                                    </div>

                                    {Array.isArray(q.options) &&
                                      q.options.length > 0 && (
                                        <ul className="mt-1 ml-4 space-y-0.5 list-disc">
                                          {q.options.map((opt, oi) => {
                                            const isCorrect =
                                              typeof q.correctIndex ===
                                                "number" &&
                                              q.correctIndex === oi;
                                            const isChosen =
                                              typeof studentIdx === "number" &&
                                              studentIdx === oi;

                                            return (
                                              <li key={oi}>
                                                <span
                                                  className={
                                                    (isCorrect
                                                      ? "font-semibold text-emerald-700 "
                                                      : "") +
                                                    (isChosen
                                                      ? "underline "
                                                      : "")
                                                  }
                                                >
                                                  {String.fromCharCode(
                                                    65 + oi
                                                  )}
                                                  . {opt}
                                                </span>
                                                {isCorrect && (
                                                  <span className="ml-1 text-[10px] text-emerald-700">
                                                    (correct)
                                                  </span>
                                                )}
                                                {isChosen && (
                                                  <span className="ml-1 text-[10px] text-indigo-700">
                                                    (student answer)
                                                  </span>
                                                )}
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                        {a.aiFeedback && (
                          <p className="mt-2 text-xs text-gray-600">
                            <span className="font-semibold">Feedback:</span>{" "}
                            {a.aiFeedback}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* FOOTER – same as tutor dashboard */}
      <footer
        className="footer"
        style={{
          background: "#232637",
          padding: "18px 0",
          textAlign: "center",
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#B2B2B2",
            fontSize: "14px",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          © {new Date().getFullYear()} EduRA — All Rights Reserved
        </p>

        <div style={{ marginTop: "6px" }}>
          <a
            href="#"
            style={{ color: "#fff", margin: "0 8px", fontSize: "14px" }}
          >
            <i className="fa fa-facebook" />
          </a>
          <a
            href="#"
            style={{ color: "#fff", margin: "0 8px", fontSize: "14px" }}
          >
            <i className="fa fa-twitter" />
          </a>
          <a
            href="#"
            style={{ color: "#fff", margin: "0 8px", fontSize: "14px" }}
          >
            <i className="fa fa-linkedin" />
          </a>
        </div>
      </footer>
    </>
  );
}
