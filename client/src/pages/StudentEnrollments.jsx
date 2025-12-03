// src/pages/StudentEnrollments.jsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import {
  getJSON,
  sendOfficeHourQuestion,
  fetchMyOfficeHourMessagesStudent,
  fetchTutorResources,
  updateEnrollmentProgress,
} from "../lib/api";
import Swal from "sweetalert2";


const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  const dayName = DAY_NAMES[d.getDay()];
  return `${dayName} ${dd}/${mm}/${yy}`;
}

function formatHM(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, "0");
  const m = String(mins % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function CourseQuestionBox({ courseId, tutorId, onQuestionSent }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  if (!tutorId) {
    return (
      <p className="mt-2 text-xs text-gray-500">
        No tutor has been assigned yet for this course.
      </p>
    );
  }

  async function handleSend() {
    if (!text.trim()) return;
    try {
      setSending(true);
      setErr("");
      setOkMsg("");
      await sendOfficeHourQuestion(tutorId, {
        message: text.trim(),
        courseId,
      });
      setOkMsg("Question sent ✅");
      setText("");
      if (onQuestionSent) onQuestionSent();
    } catch (e) {
      setErr(e.message || "Failed to send question");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-3 mt-3 border rounded-lg bg-indigo-50/60">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-indigo-800">
          Ask your tutor a question
        </span>
        <span className="text-[10px] text-gray-500">
          (Only works during tutor office hours)
        </span>
      </div>

      <textarea
        className="w-full px-2 py-1 mt-1 text-xs border rounded"
        rows={2}
        placeholder="Type your question related to this course…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={sending}
      />

      {err && (
        <p className="mt-1 text-[11px] text-red-600">
          {err}
        </p>
      )}
      {okMsg && (
        <p className="mt-1 text-[11px] text-green-600">
          {okMsg}
        </p>
      )}

      <div className="flex justify-end mt-2">
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send Question"}
        </button>
      </div>
    </div>
  );
}

export default function StudentEnrollments() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // all office-hour messages for this student
  const [officeMessages, setOfficeMessages] = useState([]);
  const [officeLoading, setOfficeLoading] = useState(true);
  const [officeErr, setOfficeErr] = useState("");

  // resources per tutor+course { "tutorId__courseId": TutorResource[] }
  const [tutorResourcesMap, setTutorResourcesMap] = useState({});

  // which enrollment is expanded (accordion)
  const [expandedId, setExpandedId] = useState(null);

  function handleLogout() {
    logout();
    navigate("/");
  }

  async function loadEnrollments() {
    setLoading(true);
    setErr("");
    try {
      const data = await getJSON("/api/enrollments/me");
      setEnrollments(data.enrollments || []);
    } catch (e) {
      setErr(e.message || "Failed to load enrollments");
    } finally {
      setLoading(false);
    }
  }

  async function loadOfficeMessages() {
    setOfficeLoading(true);
    setOfficeErr("");
    try {
      const data = await fetchMyOfficeHourMessagesStudent();
      setOfficeMessages(data.messages || []);
    } catch (e) {
      setOfficeErr(e.message || "Failed to load messages");
    } finally {
      setOfficeLoading(false);
    }
  }

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    loadEnrollments();
    loadOfficeMessages();
  }, [user, navigate]);

  // load tutor resources for each enrollment
  useEffect(() => {
    async function loadResourcesForTutorCourses() {
      const newMap = {};

      for (const e of enrollments) {
        const course = e.courseId || {};
        const instructor = course.instructorId || null;
        if (!course._id || !instructor) continue;

        const tutorId =
          typeof instructor === "object" ? instructor._id : instructor;
        if (!tutorId) continue;

        const key = `${tutorId}__${course._id}`;

        try {
          const data = await fetchTutorResources(tutorId, course._id);
          newMap[key] = data.resources || [];
        } catch (err) {
          console.error("Failed to load resources for tutor/course", key, err);
          newMap[key] = [];
        }
      }

      setTutorResourcesMap(newMap);
    }

    if (enrollments.length) {
      loadResourcesForTutorCourses();
    } else {
      setTutorResourcesMap({});
    }
  }, [enrollments]);

  return (
    <>
      {/* HEADER – no Login/Register here, only Logout if logged in */}
      <header>
        <div className="header-area">
          <div className="header-top_area">
            <div className="container-fluid">
              <div className="row">
                <div className="col-lg-12">
                  <div className="header_top_wrap d-flex justify-content-between align-items-center">
                    <div className="text_wrap">
                      <p>
                        <span>eduteam.app@gmail.com</span>
                      </p>
                    </div>

                    <div className="text_wrap">
                      <p>
                        {user && (
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="btn btn-sm btn-danger"
                          >
                            Logout
                          </button>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN HEADER */}
          <div id="sticky-header" className="main-header-area">
            <div className="container-fluid">
              <div className="row">
                <div className="col-lg-12">
                  <div className="header_wrap d-flex justify-content-between align-items-center">
                    <div className="header_left">
                      <div className="logo">
                        <Link to="/">
                          <img
                            src="/img/logo.png"
                            alt="EduRA"
                            style={{ width: "90px", height: "auto" }}
                          />
                        </Link>
                      </div>
                    </div>

                    <div className="header_right d-flex align-items-center">
                      <div className="main-menu d-none d-lg-block">
                        <nav>
                          <ul id="navigation">
                            <li>
                              <a href="#contact">Contact</a>
                            </li>
                          </ul>
                        </nav>
                      </div>
                      {/* no Apply Now for logged-in student */}
                    </div>
                  </div>
                </div>

                <div className="col-12">
                  <div className="mobile_menu d-block d-lg-none" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* HERO / BRADCAM AREA (can combine with bradcam_sm if you added it) */}
      <div className="bradcam_area breadcam_bg">
        <div className="container">
          <div className="row">
            <div className="col-xl-12">
              <div className="bradcam_text">
                <h3>My Enrolled Courses</h3>
                <p>Track your learning, tutor resources and office hours</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT – accordion style, cleaner layout */}
      <main className="py-4 bg-gray-50">
        <div className="container">
          <div
            className="wow fadeInUp"
            data-wow-duration="1s"
            data-wow-delay=".2s"
          >
            {/* Top bar with back button */}
            <div className="mb-4 d-flex justify-content-between align-items-center">
              <div>
                <h4 className="mb-1">Enrolled Courses Overview</h4>
                <p className="mb-0 text-muted">
                  Open a course card to view tutor details, resources and chat.
                </p>
              </div>
              <button
                onClick={() => navigate("/student/dashboard")}
                className="boxed-btn3"
              >
                ⬅ Back to Dashboard
              </button>
            </div>

            {/* Error */}
            {err && (
              <div className="mb-3 alert alert-danger" role="alert">
                {err}
              </div>
            )}

            {/* Loading / empty / list */}
            {loading ? (
              <p className="text-sm text-gray-500">Loading enrollments…</p>
            ) : !enrollments.length ? (
              <p className="text-sm text-gray-500">
                You have no enrolled courses yet. Book a course then wait for
                admin approval.
              </p>
            ) : (
              <div className="row">
                {enrollments.map((e) => {
                  const course = e.courseId || {};
                  const category = course.categoryId || {};
                  const status = e.status || "pending";
                  const assignmentId = e.assignmentId;

                  const instructor = course.instructorId || null;
                  const tutorId =
                    instructor && typeof instructor === "object"
                      ? instructor._id
                      : instructor || null;

                  const tutorName =
                    instructor && typeof instructor === "object"
                      ? instructor.name ||
                        (instructor.userId &&
                          typeof instructor.userId === "object" &&
                          (instructor.userId.name ||
                            instructor.userId.fullName)) ||
                        "Tutor"
                      : "Tutor";

                  const tutorAvailability =
                    instructor && typeof instructor === "object"
                      ? instructor.availability || []
                      : [];

                  const tutorResources =
                    tutorId && course._id
                      ? tutorResourcesMap[`${tutorId}__${course._id}`] || []
                      : [];

                  const messagesForThisCourse = officeMessages.filter((m) => {
                    const msgCourseId =
                      typeof m.courseId === "object"
                        ? m.courseId?._id
                        : m.courseId;
                    if (
                      !course._id ||
                      String(msgCourseId) !== String(course._id)
                    ) {
                      return false;
                    }

                    if (!tutorId) return true;
                    const msgTutorId =
                      m.tutorId && typeof m.tutorId === "object"
                        ? m.tutorId._id
                        : m.tutorId;
                    return String(msgTutorId) === String(tutorId);
                  });

                  const isOpen = expandedId === e._id;

                  return (
                    <div key={e._id} className="mb-3 col-12">
                      <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-xl">
                        {/* Accordion header – clickable */}
                        <button
                          type="button"
                          className="p-3 text-left w-100 d-flex justify-content-between align-items-center bg-light"
                          onClick={() =>
                            setExpandedId(isOpen ? null : e._id)
                          }
                        >
                          <div>
                            <h5 className="mb-1">
                              {course.title || "Untitled course"}
                            </h5>
                            <div className="flex-wrap gap-2 d-flex align-items-center">
                              {category?.name && (
                                <span className="mb-1 mr-2 badge badge-primary">
                                  {category.name}
                                </span>
                              )}
                              <span className="mb-1 mr-3 text-xs text-gray-600">
                                Progress: <strong>{e.progress ?? 0}%</strong>
                              </span>
                              <span className="mb-1 text-xs text-gray-600">
                                Status:{" "}
                                <strong className="text-capitalize">
                                  {status}
                                </strong>
                              </span>
                            </div>
                            {course.description && (
                              <p className="mt-1 mb-0 text-sm text-gray-700">
                                {course.description.length > 120
                                  ? course.description.slice(0, 117) + "..."
                                  : course.description}
                              </p>
                            )}
                          </div>

                          <span className="ml-3 text-xl">
                            {isOpen ? "▾" : "▸"}
                          </span>
                        </button>

                        {/* Accordion body – only visible when open */}
                        {isOpen && (
                          <div className="p-3">
                            {/* Top row: Tutor & Office Hours + Resources */}
                            <div className="row">
                              <div className="mb-3 col-md-6">
                                <div className="p-3 border rounded h-100">
                                  <div className="mb-1 text-xs font-semibold text-indigo-700">
                                    👨‍🏫 Tutor & Office Hours
                                  </div>
                                  <p className="mb-1 text-xs text-gray-700">
                                    Tutor: <strong>{tutorName}</strong>
                                  </p>

                                  {!tutorId ? (
                                    <p className="mt-1 text-[11px] text-gray-500">
                                      No tutor has been assigned yet for this
                                      course.
                                    </p>
                                  ) : tutorAvailability.length === 0 ? (
                                    <p className="mt-1 text-[11px] text-gray-500">
                                      The tutor has not added office hours yet.
                                    </p>
                                  ) : (
                                    <div className="mt-1 space-y-1 text-[11px]">
                                      {tutorAvailability.map((slot) => {
                                        const dateStr = formatDate(slot.date);
                                        const start = formatHM(slot.startMin);
                                        const end = formatHM(slot.endMin);
                                        return (
                                          <div
                                            key={slot._id}
                                            className="px-2 py-1 text-xs text-gray-700 bg-gray-100 rounded-md d-flex align-items-center"
                                          >
                                            <span className="font-semibold text-indigo-700">
                                              {dateStr}
                                            </span>
                                            <span className="mx-2 text-gray-500">
                                              —
                                            </span>
                                            <span>
                                              {start} to {end}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="mb-3 col-md-6">
                                <div className="p-3 border rounded h-100">
                                  <div className="mb-1 text-xs font-semibold text-indigo-700">
                                    📚 Resources from your tutor
                                  </div>
                                  {tutorResources.length === 0 ? (
                                    <p className="mt-1 text-[11px] text-gray-500">
                                      No resources have been shared yet.
                                    </p>
                                  ) : (
                                    <ul className="mt-1 space-y-1">
                                      {tutorResources.map((r) => {
                                        const resId = r._id || r.url;
                                        if (!resId) return null;

                                        const completedList =
                                          e.completedResourceIds || [];
                                        const isDone = completedList.some(
                                          (id) => String(id) === String(resId)
                                        );

                                        return (
                                          <li
                                            key={resId}
                                            className="d-flex justify-content-between align-items-center px-2 py-1 text-[11px] bg-gray-100 rounded"
                                          >
                                            <label className="gap-2 d-flex align-items-center">
                                              <input
                                                type="checkbox"
                                                checked={isDone}
                                                onChange={async (ev) => {
                                                  const next =
                                                    ev.target.checked;

                                                  let updated =
                                                    completedList.filter(
                                                      (id) =>
                                                        String(id) !==
                                                        String(resId)
                                                    );
                                                  if (next) updated.push(resId);

                                                  try {
                                                    await updateEnrollmentProgress(
                                                      e._id,
                                                      {
                                                        completedResourceIds:
                                                          updated,
                                                        assignmentCompleted:
                                                          e.assignmentCompleted ??
                                                          false,
                                                      }
                                                    );

                                                    setEnrollments((prev) =>
                                                      prev.map((en) =>
                                                        en._id === e._id
                                                          ? {
                                                              ...en,
                                                              completedResourceIds:
                                                                updated,
                                                            }
                                                          : en
                                                      )
                                                    );
                                                  } catch (err) {
                                                    Swal.fire({
  title: "Error",
  text: err.message || "Failed to update progress",
  icon: "error",
  confirmButtonText: "OK",
  confirmButtonColor: "#d33",
});

                                                  }
                                                }}
                                              />
                                              <span className="text-gray-800">
                                                {r.title || "Resource"}
                                              </span>
                                            </label>

                                            {r.url && (
                                              <a
                                                href={r.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="font-semibold text-indigo-600 hover:underline"
                                              >
                                                Open
                                              </a>
                                            )}
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Middle row: Conversation + Ask question */}
                            <div className="row">
                              <div className="mb-3 col-md-6">
                                <div className="p-3 text-xs border rounded h-100">
                                  <div className="font-semibold text-indigo-700">
                                    💬 Conversation with {tutorName}
                                  </div>

                                  {officeLoading ? (
                                    <p className="mt-1 text-[11px] text-gray-500">
                                      Loading messages…
                                    </p>
                                  ) : officeErr ? (
                                    <p className="mt-1 text-[11px] text-red-600">
                                      {officeErr}
                                    </p>
                                  ) : !messagesForThisCourse.length ? (
                                    <p className="mt-1 text-[11px] text-gray-500">
                                      No questions yet. Start by sending one
                                      from the box on the right.
                                    </p>
                                  ) : (
                                    <div className="mt-1 space-y-1 overflow-y-auto max-h-40">
                                      {messagesForThisCourse.map((m) => (
                                        <div
                                          key={m._id}
                                          className="p-2 border border-gray-200 rounded bg-gray-50"
                                        >
                                          <div className="text-[10px] text-gray-400">
                                            {m.createdAt
                                              ? new Date(
                                                  m.createdAt
                                                ).toLocaleString()
                                              : ""}
                                          </div>

                                          <div className="mt-1">
                                            <span className="font-semibold text-indigo-700">
                                              You:{" "}
                                            </span>
                                            <span>{m.message}</span>
                                          </div>

                                          {m.reply && (
                                            <div className="mt-1">
                                              <span className="font-semibold text-emerald-700">
                                                {tutorName}:{" "}
                                              </span>
                                              <span>{m.reply}</span>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="mb-3 col-md-6">
                                <CourseQuestionBox
                                  courseId={course._id}
                                  tutorId={tutorId}
                                  onQuestionSent={loadOfficeMessages}
                                />
                              </div>
                            </div>

                            {/* Bottom row: assignment + review */}
                            <div className="flex-wrap gap-2 pt-2 mt-2 border-top d-flex justify-content-between align-items-center">
                              <div>
                                {assignmentId ? (
                                  <button
                                    onClick={() =>
                                      navigate(
                                        `/student/assignments/${assignmentId}`
                                      )
                                    }
                                    className="px-3 py-2 text-sm font-medium text-white rounded bg-emerald-600 hover:bg-emerald-700"
                                  >
                                    📄 Open assignment
                                  </button>
                                ) : (
                                  <p className="mb-0 text-xs text-gray-500">
                                    No assignment has been assigned yet for this
                                    course.
                                  </p>
                                )}
                              </div>

                              <div>
                                {e.progress === 100 && tutorId && (
                                  <button
                                    onClick={() =>
                                      navigate(
                                        `/student/review/${tutorId}/${course._id}`
                                      )
                                    }
                                    className="px-3 py-2 text-sm font-medium text-white bg-yellow-600 rounded hover:bg-yellow-700"
                                  >
                                    ⭐ Review Tutor
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

       {/* FOOTER */}
         <footer
            className="footer"
            style={{ background: "#232637", padding: "18px 0", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.1)", }} >
          <p
            style={{ margin: 0, color: "#B2B2B2", fontSize: "14px", fontFamily: "Poppins, sans-serif",}}
              >
                © {new Date().getFullYear()} EduRA — All Rights Reserved
              </p>

                <div style={{ marginTop: "6px" }}>
                  <a href="#" style={{ color: "#fff", margin: "0 8px", fontSize: "14px" }}>
                    <i className="fa fa-facebook"></i>
                  </a>
                  <a href="#" style={{ color: "#fff", margin: "0 8px", fontSize: "14px" }}>
                    <i className="fa fa-twitter"></i>
                  </a>
                  <a href="#" style={{ color: "#fff", margin: "0 8px", fontSize: "14px" }}>
                    <i className="fa fa-linkedin"></i>
                  </a>
                </div>
              </footer>

    </>
  );
}
