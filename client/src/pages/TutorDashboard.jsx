// src/pages/TutorDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import {
  getJSON,
  fetchNotifications,
  markNotificationRead,
  withAuthFetch,
  fetchMyOfficeHourMessages,
  addTutorResourceLink,
  replyOfficeHourMessage,
} from "../lib/api";
import { useNavigate, Link } from "react-router-dom";
import Swal from "sweetalert2";


const API = import.meta.env.VITE_API_URL || "http://localhost:8080";
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTimeFromMin(mins = 0) {
  const h = String(Math.floor(mins / 60)).padStart(2, "0");
  const m = String(mins % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function formatDateShort(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const dayName = DAY[d.getDay()] || "";
  return `${dayName} ${dd}/${mm}/${yy}`;
}

function isNowWithinAvailabilityClient(availability = []) {
  if (!Array.isArray(availability) || !availability.length) return false;

  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);
  const minutesNow = now.getHours() * 60 + now.getMinutes();

  return availability.some((slot) => {
    if (!slot.date || slot.startMin == null || slot.endMin == null) return false;
    const slotDateISO = new Date(slot.date).toISOString().slice(0, 10);
    if (slotDateISO !== todayISO) return false;
    return minutesNow >= slot.startMin && minutesNow <= slot.endMin;
  });
}

function AvailabilityList({ slots = [], onEdit, onDelete }) {
  if (!slots.length) {
    return <p className="text-sm text-gray-500">No availability set yet.</p>;
  }
  return (
    <ul className="space-y-2">
      {slots.map((s) => (
        <li
          key={s._id || `${s.day}-${s.startMin}-${s.endMin}`}
          className="flex items-center justify-between text-sm text-gray-700"
        >
          <div>
            <div>
              {s.date ? formatDateShort(s.date) : DAY[s.day] || "—"} —{" "}
              {formatTimeFromMin(s.startMin)} → {formatTimeFromMin(s.endMin)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit && onEdit(s)}
              className="text-xs text-blue-600 hover:underline"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete && onDelete(s._id)}
              className="text-xs text-red-600 hover:underline"
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function TutorDashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
    // Tab state for vertical sidebar
  const [tab, setTab] = useState("overview");


  // 🔔 Notifications
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifErr, setNotifErr] = useState("");
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifActionLoading, setNotifActionLoading] = useState(false);

  // Availability modal
  const [isAvailOpen, setIsAvailOpen] = useState(false);
  const [availErr, setAvailErr] = useState("");
  const [savingAvail, setSavingAvail] = useState(false);
  const [newSlot, setNewSlot] = useState({
    day: "",
    start: "09:00",
    end: "10:00",
  });
  const [editingSlotId, setEditingSlotId] = useState(null);

  // AI Courses modal
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [aiCourses, setAiCourses] = useState([]);
  const [aiCoursesLoading, setAiCoursesLoading] = useState(false);
  const [aiCoursesErr, setAiCoursesErr] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");

  // Office hours (raw messages)
  const [officeMessages, setOfficeMessages] = useState([]);
  const [officeLoading, setOfficeLoading] = useState(false);
  const [officeErr, setOfficeErr] = useState("");
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [resourceForm, setResourceForm] = useState({ title: "", url: "" });
  const [savingResource, setSavingResource] = useState(false);

  // 💬 tutor replies
  const [replyText, setReplyText] = useState({}); // { [messageKey]: "..." }
  const [replySendingKey, setReplySendingKey] = useState(null);
  

  function handleLogout() {
    logout();
    navigate("/");
  }

  async function loadProfile() {
    setLoading(true);
    setErr("");
    try {
      const data = await getJSON("/api/tutor/me");
      setProfile(data?.tutor || null);
    } catch (e) {
      setErr(e.message || "Failed to load tutor profile");
    } finally {
      setLoading(false);
    }
  }

  async function loadNotifications() {
    setNotifLoading(true);
    setNotifErr("");
    try {
      const data = await fetchNotifications();
      setNotifications(data.notifications || []);
    } catch (e) {
      setNotifErr(e.message || "Failed to load notifications");
    } finally {
      setNotifLoading(false);
    }
  }

  async function loadOfficeMessages() {
    try {
      setOfficeLoading(true);
      setOfficeErr("");
      const data = await fetchMyOfficeHourMessages();
      setOfficeMessages(data.messages || []);
    } catch (e) {
      setOfficeErr(e.message || "Failed to load office hour messages");
    } finally {
      setOfficeLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
    loadNotifications();
    loadOfficeMessages();
  }, []);

  const currentlyInOfficeHours = useMemo(() => {
    if (!profile) return false;
    return isNowWithinAvailabilityClient(profile.availability || []);
  }, [profile]);

  // const subjectsText = useMemo(() => {
  //   const arr = profile?.subjects || [];
  //   if (!arr.length) return "";
  //   return arr.map((s) => s.name || s).join(", ");
  // }, [profile]);

  // group messages into conversations (student + course)
  const officeConversations = useMemo(() => {
    if (!officeMessages || !officeMessages.length) return [];

    const map = new Map();

    officeMessages.forEach((m) => {
      const stuId =
        m.studentId && typeof m.studentId === "object"
          ? m.studentId._id
          : m.studentId;
      const courseId =
        m.courseId && typeof m.courseId === "object"
          ? m.courseId._id
          : m.courseId;

      const key = `${stuId || "noStu"}__${courseId || "noCourse"}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          student: m.studentId,
          course: m.courseId,
          messages: [],
        });
      }
      map.get(key).messages.push(m);
    });

    return Array.from(map.values()).map((conv) => ({
      ...conv,
      messages: conv.messages
        .slice()
        .sort(
          (a, b) =>
            new Date(a.createdAt || 0).getTime() -
            new Date(b.createdAt || 0).getTime()
        ),
    }));
  }, [officeMessages]);

  // send reply to last message in a conversation
  async function handleSendReplyForConversation(conv) {
    const key = conv.key;
    const text = (replyText[key] || "").trim();
    if (!text) return;

    const lastMessage =
      conv.messages && conv.messages.length
        ? conv.messages[conv.messages.length - 1]
        : null;

    if (!lastMessage || !lastMessage._id) return;

    try {
      setReplySendingKey(key);
      await replyOfficeHourMessage(lastMessage._id, { reply: text });

      await loadOfficeMessages();
      setReplyText((prev) => ({ ...prev, [key]: "" }));
    } catch (e) {
      Swal.fire({
    title: "Error",
    text: e.message || "Failed to send reply",
    icon: "error",
    confirmButtonText: "OK",
    confirmButtonColor: "#d33",
  });
    } finally {
      setReplySendingKey(null);
    }
  }

  // Availability modal helpers
  function openAvailModal(slot = null) {
    setIsAvailOpen(true);
    setAvailErr("");

    if (slot) {
      const dateISO = slot.date
        ? new Date(slot.date).toISOString().slice(0, 10)
        : "";
      setNewSlot({
        date: dateISO,
        start: formatTimeFromMin(slot.startMin),
        end: formatTimeFromMin(slot.endMin),
      });
      setEditingSlotId(slot._id || null);
    } else {
      setNewSlot({ date: "", start: "09:00", end: "10:00" });
      setEditingSlotId(null);
    }
  }

  async function saveAvailability() {
    setAvailErr("");

    if (!newSlot.date) {
      setAvailErr("Please choose a date.");
      return;
    }

    const payload = {
      date: newSlot.date,
      start: newSlot.start,
      end: newSlot.end,
    };

    const url = editingSlotId
      ? `${API}/api/tutor/availability/${editingSlotId}`
      : `${API}/api/tutor/availability`;

    const method = editingSlotId ? "PUT" : "POST";

    try {
      setSavingAvail(true);
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to save availability");
      }

      const data = await res.json();
      if (data.tutor) setProfile(data.tutor);
      else await loadProfile();

      setIsAvailOpen(false);
      setEditingSlotId(null);
    } catch (e) {
      setAvailErr(e.message || "Failed to save availability");
    } finally {
      setSavingAvail(false);
    }
  }

  async function handleDeleteSlot(slotOrId) {
    const slotId = typeof slotOrId === "string" ? slotOrId : slotOrId?._id;
    if (!slotId) return;

    const ok = window.confirm("Delete this availability slot?");
    if (!ok) return;

    try {
      const res = await fetch(`${API}/api/tutor/availability/${slotId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to delete slot");
      }

      const data = await res.json();
      setProfile((prev) =>
        prev ? { ...prev, availability: data.availability || [] } : prev
      );
    } catch (e) {
Swal.fire({
    title: "Error",
    text: e.message || "Failed to delete slot",
    icon: "error",
    confirmButtonText: "OK",
    confirmButtonColor: "#d33",
  });    }
  }

  // Notifications helpers
  async function handleMarkNotificationRead(id) {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (e) {
      console.error("Failed to mark notification as read", e);
    }
  }

  async function handleOpenNotification(n) {
    setSelectedNotif(n);
    setIsNotifOpen(true);

    if (!n.isRead) {
      await handleMarkNotificationRead(n._id);
    }
  }

  async function handleApplyCourseMatch(notif) {
    if (!notif?._id) return;
    try {
      setNotifActionLoading(true);

      await withAuthFetch(`/api/notifications/${notif._id}/apply-from-course`, {
        method: "POST",
      });

      await loadNotifications();

      setIsNotifOpen(false);
      setSelectedNotif(null);

       Swal.fire({
      title: "Application Submitted",
      text: `You applied to teach "${
        notif.data?.courseTitle || "this course"
      }". Please wait for the admin's approval.`,
      icon: "success",
      confirmButtonText: "OK",
      confirmButtonColor: "#3085d6",
    });
    } catch (e) {
      console.error("Failed to apply from notification", e);
Swal.fire({
      title: "Error",
      text: e.message || "Failed to apply for this course.",
      icon: "error",
      confirmButtonText: "OK",
      confirmButtonColor: "#d33",
    });    } finally {
      setNotifActionLoading(false);
    }
  }

  async function handleRejectCourseMatch(notif) {
    if (!notif?._id) return;
      const result = await Swal.fire({
    title: "Not Interested?",
    text: "Are you sure you are not interested in this course?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, reject",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
  });

  if (!result.isConfirmed) return;

    try {
      await withAuthFetch(`/api/notifications/${notif._id}/dismiss`, {
        method: "POST",
      });

      setIsNotifOpen(false);
      setSelectedNotif(null);

      await loadNotifications();
      Swal.fire({
      title: "Course Rejected",
      text: "You have dismissed this course match.",
      icon: "success",
      confirmButtonText: "OK",
      confirmButtonColor: "#3085d6",
    });
    } catch (e) {
      console.error("Failed to dismiss notification", e);
Swal.fire({
      title: "Error",
      text: e.message || "Failed to dismiss this notification.",
      icon: "error",
      confirmButtonText: "OK",
      confirmButtonColor: "#d33",
    });    }
  }

  // AI course suggestions (CV)
  async function openAddCourseFromCV() {
    setIsAddCourseOpen(true);
    setAiCoursesErr("");
    setSelectedCourseId("");
    setAiCourses([]);
    setAiCoursesLoading(true);
    try {
      const data = await getJSON("/api/ai/tutor-courses");
      const matches = Array.isArray(data.matches) ? data.matches : [];

      const existingIds = new Set(
        (profile?.courses || []).map((c) => String(c._id || c.id || c))
      );

      const filtered = matches.filter(
        (m) => !existingIds.has(String(m.id))
      );

      setAiCourses(filtered);
    } catch (e) {
      setAiCoursesErr(e.message || "Failed to load AI courses from CV");
    } finally {
      setAiCoursesLoading(false);
    }
  }

  async function attachCourseFromCV() {
    if (!selectedCourseId) return;
    try {
      const res = await fetch(`${API}/api/tutor/courses/add`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ courseId: selectedCourseId }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to add course");
      }

      const data = await res.json();
      setProfile(data.tutor);
      setIsAddCourseOpen(false);
    } catch (e) {
Swal.fire({
    title: "Error",
    text: e.message || "Failed to add course",
    icon: "error",
    confirmButtonText: "OK",
    confirmButtonColor: "#d33",
  });    }
  }

  // Remove course from tutor
  async function handleRemoveCourse(courseId) {
    if (!courseId) return;

    const ok = window.confirm("Are you sure you want to remove this course?");
    if (!ok) return;

    try {
      const res = await fetch(`${API}/api/tutor/courses/${courseId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to remove course");
      }

      const data = await res.json();
      setProfile(data.tutor);
    } catch (e) {
Swal.fire({
    title: "Error",
    text: e.message || "Failed to remove course",
    icon: "error",
    confirmButtonText: "OK",
    confirmButtonColor: "#d33",
  });    }
  }

  function openResourceModalForCourse(courseId) {
    setResourceForm({
      courseId: courseId || "",
      title: "",
      url: "",
    });
    setIsResourceModalOpen(true);
  }

  return (
    <>
      {/* HEADER – Wiser style, no Login/Register here */}
            {/* HEADER – same style as Admin dashboard */}
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
              <div className="font-semibold">Tutor Dashboard</div>
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

      {/* MAIN CONTENT – Wiser container + fade-in */}
            {/* MAIN CONTENT – Sidebar + Tabbed layout */}
      <main className="py-4 bg-gray-50">
        <div className="container">
          <div
            className="wow fadeInUp"
            data-wow-duration="1s"
            data-wow-delay=".2s"
          >
            {/* Small top intro row */}
            <div className="mb-4 d-flex justify-content-between align-items-center">
              <div>
                <h4 className="mb-1">
                  Welcome, {user?.name || "Tutor"} 👋
                </h4>
                <p className="mb-0 text-muted">
                  Manage your availability, courses, office hours and more from one place.
                </p>
              </div>
            </div>

            {/* Error banner */}
            {err && (
              <div className="px-4 py-2 mb-4 text-sm text-yellow-800 border border-yellow-300 rounded-md bg-yellow-50">
                {err} — Showing basic info only.
              </div>
            )}

            {/* LAYOUT: SIDEBAR + MAIN CONTENT */}
            <div className="flex flex-col gap-4 md:flex-row">
              {/* Sidebar (vertical navbar) */}
              <aside className="w-full md:w-60 md:flex-shrink-0">
                <div className="mb-3">
                  <p className="text-xs font-semibold tracking-wide uppercase text-slate-500">
                    Tutor menu
                  </p>
                </div>

                <nav className="space-y-1 text-sm">
                  {[
                    { id: "overview", label: "Overview", icon: "🏠" },
                    { id: "courses", label: "Courses", icon: "📚" },
                    { id: "office", label: "Office hours", icon: "🕒" },
                    { id: "notifications", label: "Notifications", icon: "🔔" },
                    { id: "profile", label: "Profile & CV", icon: "📄" },
                    { id: "bookings", label: "Bookings", icon: "📅" },
                  ].map((item) => {
                    const active = tab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTab(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition ${
                          active
                            ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold"
                            : "bg-white border-transparent text-slate-600 hover:bg-slate-50 hover:border-slate-200"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-base">{item.icon}</span>
                          {item.label}
                        </span>
                        {active && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        )}
                      </button>
                    );
                  })}
                </nav>
              </aside>

              {/* Main tab content */}
              <section className="flex-1 space-y-4">
                {/* ============= OVERVIEW ============= */}
                {tab === "overview" && (
                  <section className="space-y-6">
                    {/* Top status / summary bar */}
                    <div className="flex flex-col justify-between gap-3 p-4 text-sm bg-white border shadow-sm rounded-xl md:flex-row border-slate-200">
                      <div>
                        <p className="text-xs font-semibold tracking-wide uppercase text-slate-500">
                          Tutor overview
                        </p>
                        <p className="mt-1 text-slate-700">
                          Quick snapshot of your profile, availability, and teaching readiness.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-indigo-700 border border-indigo-100 rounded-full bg-indigo-50">
                          <span className="mr-1.5 text-base">👤</span>
                          {profile?.experienceYears != null
                            ? `${profile.experienceYears} yrs experience`
                            : "Experience not set"}
                        </span>

                        <span className="inline-flex items-center px-3 py-1 text-xs font-medium border rounded-full bg-slate-50 text-slate-700 border-slate-100">
                          <span className="mr-1.5 text-base">🌍</span>
                          {profile?.timezone || "Timezone not set"}
                        </span>

                        <span
                          className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border transition ${
                            currentlyInOfficeHours
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          <span className="mr-1.5 text-base">
                            {currentlyInOfficeHours ? "🟢" : "🕒"}
                          </span>
                          {currentlyInOfficeHours
                            ? "You are currently in office hours"
                            : "You are currently outside office hours"}
                        </span>
                      </div>
                    </div>

                    {/* Quick stats: hourly rate, experience, timezone */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      {/* Hourly rate */}
                      <div className="p-4 bg-gradient-to-br from-indigo-50 to-slate-50 border border-slate-100 rounded-xl shadow-sm transition hover:shadow-md hover:-translate-y-[1px]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold tracking-wide uppercase text-slate-500">
                            Hourly Rate
                          </span>
                          <span className="text-lg">💸</span>
                        </div>
                        <div className="text-2xl font-semibold text-slate-900">
                          {profile?.hourlyRate != null ? `$${profile.hourlyRate}` : "—"}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Set a clear rate so students know what to expect.
                        </p>
                      </div>

                      {/* Experience */}
                      <div className="p-4 bg-gradient-to-br from-emerald-50 to-slate-50 border border-slate-100 rounded-xl shadow-sm transition hover:shadow-md hover:-translate-y-[1px]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold tracking-wide uppercase text-slate-500">
                            Experience
                          </span>
                          <span className="text-lg">🎓</span>
                        </div>
                        <div className="text-2xl font-semibold text-slate-900">
                          {profile?.experienceYears != null
                            ? `${profile.experienceYears} yrs`
                            : "—"}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Highlight your teaching or professional background.
                        </p>
                      </div>

                      {/* Timezone */}
                      <div className="p-4 bg-gradient-to-br from-sky-50 to-slate-50 border border-slate-100 rounded-xl shadow-sm transition hover:shadow-md hover:-translate-y-[1px]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold tracking-wide uppercase text-slate-500">
                            Timezone
                          </span>
                          <span className="text-lg">🕒</span>
                        </div>
                        <div className="text-2xl font-semibold truncate text-slate-900">
                          {profile?.timezone || "—"}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Students will see your availability in this timezone.
                        </p>
                      </div>
                    </div>

                    {/* Bio + Languages/Achievements + Availability */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      {/* Left side: Bio + Languages/Achievements */}
                      <div className="space-y-4">
                        {/* Bio */}
                        <div className="p-4 bg-white border shadow-sm rounded-xl border-slate-100">
                          <div className="flex items-center justify-between mb-2">
                            <h2 className="text-lg font-semibold text-slate-900">Bio</h2>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
                              Shown on your public profile
                            </span>
                          </div>

                          {loading ? (
                            <p className="text-sm text-gray-500 animate-pulse">Loading…</p>
                          ) : (
                            <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                              {profile?.bio || "No bio yet. Add a short introduction about yourself."}
                            </p>
                          )}
                        </div>

                        {/* Languages & Achievements */}
                        <div className="p-4 bg-white border shadow-sm rounded-xl border-slate-100">
                          <h2 className="mb-3 text-lg font-semibold text-slate-900">
                            Languages & Achievements
                          </h2>

                          {loading ? (
                            <p className="text-sm text-gray-500 animate-pulse">Loading…</p>
                          ) : (
                            <>
                              {/* Languages */}
                              <div className="mb-3">
                                <div className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                  Languages
                                </div>
                                <div className="mt-1 text-sm text-gray-700">
                                  {(profile?.languages || []).length ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {profile.languages.map((lang, idx) => (
                                        <span
                                          key={idx}
                                          className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700"
                                        >
                                          {lang}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    "—"
                                  )}
                                </div>
                              </div>

                              {/* Achievements */}
                              <div>
                                <div className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                  Achievements
                                </div>
                                <ul className="mt-1 text-sm text-gray-700 list-disc list-inside space-y-0.5">
                                  {(profile?.achievements || []).length ? (
                                    profile.achievements.map((a, i) => <li key={i}>{a}</li>)
                                  ) : (
                                    <li>—</li>
                                  )}
                                </ul>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right side: Availability + button */}
                      <div className="p-4 bg-white border shadow-sm rounded-xl border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h2 className="text-lg font-semibold text-slate-900">
                              Availability
                            </h2>
                            <p className="text-xs text-slate-500">
                              Students can contact you only during your available time slots.
                            </p>
                          </div>

                          <button
                            onClick={() => openAvailModal()}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white transition rounded-md bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                          >
                            <span className="mr-1 text-sm">＋</span>
                            Add slot
                          </button>
                        </div>

                        <div className="mt-2">
                          {loading ? (
                            <p className="text-sm text-gray-500 animate-pulse">Loading…</p>
                          ) : (
                            <AvailabilityList
                              slots={profile?.availability || []}
                              onEdit={(slot) => openAvailModal(slot)}
                              onDelete={handleDeleteSlot}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                )}


                {/* ============= COURSES ============= */}
                {tab === "courses" && (
                  <section className="space-y-6">
                    {/* Header row */}
                    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <h2 className="text-2xl font-semibold text-slate-900">Courses</h2>
                        <p className="text-sm text-slate-500">
                          Manage the subjects and courses you teach.
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center px-3 py-1 text-xs font-medium border rounded-full bg-slate-100 text-slate-700 border-slate-200">
                          <span className="mr-1.5 text-sm">📘</span>
                          {(profile?.courses || []).length}{" "}
                          {(profile?.courses || []).length === 1 ? "active course" : "active courses"}
                        </span>

                        <button
                          onClick={openAddCourseFromCV}
                          className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white transition bg-purple-600 rounded-lg shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-purple-500/80"
                        >
                          <span className="mr-1 text-base leading-none">✨</span>
                          Add Course from CV (AI)
                        </button>
                      </div>
                    </div>

                    {/* Main card */}
                    <div className="p-5 bg-white border shadow-sm rounded-2xl border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">
                            Subjects & Courses
                          </h3>
                          <p className="text-xs text-slate-500">
                            These are the courses currently linked to your tutor profile.
                          </p>
                        </div>
                      </div>

                      {loading ? (
                        <p className="text-sm text-gray-500 animate-pulse">Loading…</p>
                      ) : (
                        <>
                          {(profile?.courses || []).length ? (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {(profile?.courses || []).map((c, idx) => {
                                const courseId = c._id || c.id || c._id?._id;

                                return (
                                  <div
                                    key={courseId || idx}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm rounded-full bg-gradient-to-r from-indigo-50 to-slate-50 border border-indigo-100 text-slate-800 shadow-sm hover:shadow-md transition-transform hover:-translate-y-[1px]"
                                  >
                                    <span className="text-sm">📚</span>
                                    <span className="max-w-[150px] sm:max-w-[220px] truncate">
                                      {c.title || c.name || String(c)}
                                    </span>

                                    {courseId && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => openResourceModalForCourse(courseId)}
                                          className="text-[11px] font-semibold text-purple-600 hover:text-purple-700 hover:underline"
                                        >
                                          + Resource
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => handleRemoveCourse(courseId)}
                                          className="text-[12px] font-bold text-red-500 hover:text-red-700"
                                          aria-label={`Remove ${c.title || c.name || "course"}`}
                                        >
                                          ✕
                                        </button>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-4 mt-2 text-sm border border-dashed rounded-xl border-slate-200 bg-slate-50/60">
                              <p className="font-medium text-slate-800">
                                No courses attached to your profile yet.
                              </p>
                              <p className="mt-1 text-xs text-slate-600">
                                Use <span className="font-semibold">“Add Course from CV (AI)”</span> to
                                let the system suggest courses that match your expertise, then
                                attach them to your profile.
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </section>
                )}


                {/* ============= OFFICE HOURS ============= */}
               {tab === "office" && (
                  <section className="space-y-6">
                    {/* Header row */}
                    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <h2 className="text-2xl font-semibold text-slate-900">
                          Office Hours & Student Chats
                        </h2>
                        <p className="text-sm text-slate-500">
                          See when you’re available and reply to students’ questions in one place.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center px-3 py-1 text-xs font-medium border rounded-full bg-slate-100 text-slate-700 border-slate-200">
                          <span className="mr-1.5 text-sm">💬</span>
                          {officeConversations.length}{" "}
                          {officeConversations.length === 1 ? "conversation" : "conversations"}
                        </span>
                      </div>
                    </div>

                    {/* Main card */}
                    <div className="p-5 bg-white border shadow-sm rounded-2xl border-slate-100">
                      {/* Status banner + resource button */}
                      {!profile ? (
                        <p className="text-sm text-gray-500">Loading profile…</p>
                      ) : (
                        <>
                          <div
                            className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 p-3 rounded-xl border transition ${
                              currentlyInOfficeHours
                                ? "bg-green-50 border-green-200"
                                : "bg-slate-50 border-slate-200"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <div className="mt-0.5 text-lg">
                                {currentlyInOfficeHours ? "🟢" : "⚪"}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900">
                                  {currentlyInOfficeHours
                                    ? "You are currently in office hours."
                                    : "You are not in office hours right now."}
                                </p>
                                <p className="text-xs text-slate-600">
                                  Students can{" "}
                                  {currentlyInOfficeHours
                                    ? "contact you now based on your availability slots."
                                    : "only send messages during the times you set in your availability."}
                                </p>
                              </div>
                            </div>

                            {currentlyInOfficeHours && (
                              <button
                                onClick={() => openResourceModalForCourse("")}
                                className="inline-flex items-center self-start px-3 py-1.5 text-xs font-semibold text-white transition rounded-lg shadow-sm bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-purple-500/80"
                              >
                                <span className="mr-1 text-sm">➕</span>
                                Add Resource (link)
                              </button>
                            )}
                          </div>

                          {/* Conversations list */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="text-sm font-semibold text-slate-900">
                                Student Conversations
                              </h3>
                              <p className="text-[11px] text-slate-500">
                                Reply directly here to keep everything in one thread.
                              </p>
                            </div>

                            {officeLoading ? (
                              <p className="text-xs text-gray-500 animate-pulse">
                                Loading student messages…
                              </p>
                            ) : officeErr ? (
                              <p className="text-xs text-red-600">{officeErr}</p>
                            ) : !officeConversations.length ? (
                              <div className="p-4 text-xs border border-dashed text-slate-500 rounded-xl bg-slate-50/60">
                                No questions yet. Once students message you during office hours,
                                you’ll see their conversations here.
                              </div>
                            ) : (
                              <ul className="pr-1 space-y-3 overflow-y-auto max-h-96">
                                {officeConversations.map((conv) => {
                                  const studentName =
                                    conv.student && typeof conv.student === "object"
                                      ? conv.student.name || "Student"
                                      : "Student";

                                  const courseTitle =
                                    conv.course && typeof conv.course === "object"
                                      ? conv.course.title ||
                                        conv.course.name ||
                                        "Course"
                                      : "Course";

                                  const key = conv.key;

                                  return (
                                    <li
                                      key={key}
                                      className="p-3 transition border rounded-xl bg-slate-50 hover:bg-slate-100/80 hover:-translate-y-[1px] hover:shadow-sm"
                                    >
                                      {/* Conversation header */}
                                      <div className="flex items-center justify-between mb-2">
                                        <div>
                                          <div className="text-[12px] font-semibold text-slate-900 flex items-center gap-1.5">
                                            <span className="text-xs">👤</span>
                                            <span>{studentName}</span>
                                          </div>
                                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                            <span className="text-xs">📘</span>
                                            <span>{courseTitle}</span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Message history */}
                                      <div className="mt-1 space-y-1 overflow-y-auto max-h-36">
                                        {conv.messages.map((m) => {
                                          const existingReply =
                                            m.reply?.text ||
                                            m.reply ||
                                            m.answer ||
                                            m.tutorReply ||
                                            "";

                                          return (
                                            <div
                                              key={m._id}
                                              className="p-2 mt-1 bg-white border rounded-lg border-slate-200"
                                            >
                                              <div className="flex justify-between gap-2">
                                                <div className="text-[12px] text-slate-800">
                                                  {m.message}
                                                </div>
                                                <div className="text-[9px] text-slate-400 whitespace-nowrap">
                                                  {m.createdAt
                                                    ? new Date(
                                                        m.createdAt
                                                      ).toLocaleString()
                                                    : ""}
                                                </div>
                                              </div>

                                              {existingReply && (
                                                <div className="px-2 py-1 mt-2 text-[11px] text-green-800 bg-green-50 border border-green-100 rounded-md">
                                                  <span className="font-semibold">
                                                    Your reply:
                                                  </span>{" "}
                                                  <span>{existingReply}</span>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>

                                      {/* Reply box */}
                                      <div className="mt-3">
                                        <textarea
                                          className="w-full px-2 py-1 text-xs border rounded-md border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                                          rows={2}
                                          placeholder="Write a reply to this student…"
                                          value={replyText[key] || ""}
                                          onChange={(e) =>
                                            setReplyText((prev) => ({
                                              ...prev,
                                              [key]: e.target.value,
                                            }))
                                          }
                                        />
                                        <div className="flex justify-end mt-1">
                                          <button
                                            onClick={() =>
                                              handleSendReplyForConversation(conv)
                                            }
                                            disabled={
                                              replySendingKey === key ||
                                              !(replyText[key] || "").trim()
                                            }
                                            className={`inline-flex items-center px-3 py-1 text-[11px] font-semibold text-white rounded-md transition ${
                                              replySendingKey === key
                                                ? "bg-slate-400 cursor-not-allowed"
                                                : "bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/80"
                                            }`}
                                          >
                                            {replySendingKey === key ? (
                                              <>
                                                <span className="mr-1 text-xs">⏳</span>
                                                Sending…
                                              </>
                                            ) : (
                                              <>
                                                <span className="mr-1 text-xs">📨</span>
                                                Send reply
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </section>
                )}


                {/* ============= NOTIFICATIONS ============= */}
                {tab === "notifications" && (
                  <section className="space-y-6">
                    {/* Header row */}
                    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <h2 className="text-2xl font-semibold text-slate-900">
                          Notifications
                        </h2>
                        <p className="text-sm text-slate-500">
                          Stay up to date with course matches, applications, and updates.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-3 py-1 text-xs font-medium border rounded-full bg-slate-100 text-slate-700 border-slate-200">
                          <span className="mr-1.5 text-sm">🔔</span>
                          {notifications.length}{" "}
                          {notifications.length === 1 ? "notification" : "notifications"}
                        </span>

                        {notifications.some((n) => !n.isRead) && (
                          <span className="inline-flex items-center px-3 py-1 text-xs font-semibold text-white bg-red-500 rounded-full shadow-sm">
                            <span className="mr-1 text-sm">●</span>
                            {notifications.filter((n) => !n.isRead).length} new
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card */}
                    <div className="p-5 bg-white border shadow-sm rounded-2xl border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            Inbox
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Click a notification to see full details in the popup.
                          </p>
                        </div>
                      </div>

                      {notifLoading ? (
                        <p className="text-sm text-gray-500 animate-pulse">
                          Loading notifications…
                        </p>
                      ) : notifErr ? (
                        <p className="text-sm text-red-600">{notifErr}</p>
                      ) : !notifications.length ? (
                        <div className="p-4 text-sm border border-dashed text-slate-500 rounded-xl bg-slate-50/70">
                          You don’t have any notifications yet. Course matches and application
                          updates will appear here.
                        </div>
                      ) : (
                        <ul className="pr-1 space-y-2 overflow-y-auto max-h-96">
                          {notifications.map((n) => {
                            const isAccepted = n.type === "course_accepted";
                            const isRejected = n.type === "course_rejected";
                            const isAssignedElsewhere = n.type === "course_assigned_elsewhere";

                            const mainLabel =
                              n.type === "course_match"
                                ? `New matching course: ${n.data?.courseTitle || ""}`
                                : n.type === "tutor_applied"
                                ? `Applied to: ${n.data?.courseTitle || ""}`
                                : n.type === "course_accepted"
                                ? `Application accepted: ${n.data?.courseTitle || ""}`
                                : n.type === "course_rejected"
                                ? `Application update: ${n.data?.courseTitle || ""}`
                                : n.type === "course_assigned_elsewhere"
                                ? `Course assigned to another tutor: ${
                                    n.data?.courseTitle || ""
                                  }`
                                : n.title || "Notification";

                            const icon =
                              n.type === "course_match"
                                ? "✨"
                                : n.type === "course_accepted"
                                ? "✅"
                                : n.type === "course_rejected"
                                ? "❌"
                                : n.type === "course_assigned_elsewhere"
                                ? "📌"
                                : "🔔";

                            return (
                              <li
                                key={n._id}
                                onClick={() => handleOpenNotification(n)}
                                className={`flex items-start justify-between gap-3 px-3 py-2 text-sm transition border rounded-xl cursor-pointer ${
                                  n.isRead
                                    ? "bg-white border-slate-100 hover:bg-slate-50"
                                    : "bg-blue-50/80 border-blue-100 hover:bg-blue-100/70"
                                } hover:-translate-y-[1px] hover:shadow-sm`}
                              >
                                <div className="flex items-start gap-2">
                                  <div className="mt-0.5 text-base">{icon}</div>

                                  <div>
                                    <div className="font-medium text-slate-900">
                                      {mainLabel}
                                    </div>

                                    {n.data?.categoryName && (
                                      <div className="text-xs text-slate-500">
                                        Category: {n.data.categoryName}
                                      </div>
                                    )}

                                    <div className="mt-1 text-[11px] text-slate-400">
                                      {n.createdAt
                                        ? new Date(n.createdAt).toLocaleString()
                                        : ""}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-1">
                                  {isAccepted && (
                                    <span className="px-2 py-0.5 text-[11px] font-semibold text-green-700 bg-green-100 rounded-full">
                                      Accepted
                                    </span>
                                  )}
                                  {isRejected && (
                                    <span className="px-2 py-0.5 text-[11px] font-semibold text-red-700 bg-red-100 rounded-full">
                                      Rejected
                                    </span>
                                  )}
                                  {isAssignedElsewhere && (
                                    <span className="px-2 py-0.5 text-[11px] font-semibold text-slate-700 bg-slate-100 rounded-full">
                                      Course filled
                                    </span>
                                  )}

                                  {n.actionStatus === "applied" && (
                                    <span className="text-[11px] font-semibold text-green-600">
                                      Applied
                                    </span>
                                  )}
                                  {n.actionStatus === "dismissed" && (
                                    <span className="text-[11px] font-semibold text-slate-500">
                                      Dismissed
                                    </span>
                                  )}

                                  {!n.isRead && (
                                    <span className="mt-1 text-[9px] font-semibold text-blue-600">
                                      New
                                    </span>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </section>
                )}


                {/* ============= PROFILE & CV ============= */}
                {tab === "profile" && (
                    <section className="space-y-6">
                      <div>
                        <h2 className="text-2xl font-semibold text-slate-900">Profile & CV</h2>
                        <p className="text-sm text-slate-500">
                          Manage your professional details and curriculum vitae.
                        </p>
                      </div>

                      {/* CV CARD */}
                      <div className="p-6 bg-white border shadow-sm rounded-2xl border-slate-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">📄</span>
                            <h3 className="text-lg font-semibold text-slate-900">
                              Curriculum Vitae
                            </h3>
                          </div>

                          {/* Status Badge */}
                          {profile?.cvUrl ? (
                            <span className="px-3 py-1 text-xs font-semibold text-green-700 bg-green-100 border border-green-200 rounded-full">
                              Uploaded
                            </span>
                          ) : (
                            <span className="px-3 py-1 text-xs font-semibold border rounded-full text-slate-600 bg-slate-100 border-slate-200">
                              Not Uploaded
                            </span>
                          )}
                        </div>

                        {loading ? (
                          <p className="text-sm text-slate-500 animate-pulse">Loading…</p>
                        ) : profile?.cvUrl ? (
                          <div className="space-y-3">
                            <p className="text-sm text-slate-600">
                              Your latest uploaded CV is available below.
                            </p>

                            <a
                    href={`${API}${
                      profile.cvUrl.startsWith("/") ? profile.cvUrl : `/${profile.cvUrl}`
                    }`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      backgroundColor: "#4f46e5",   // indigo
                      color: "#fff",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.5rem 1rem",
                      borderRadius: "9999px",
                      boxShadow: "0 4px 10px rgba(79,70,229,0.25)",
                      textDecoration: "none",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                    }}
                  >
                    <span>Open CV</span>
                    <span style={{ fontSize: "1rem" }}>↗</span>
                  </a>

                          </div>
                        ) : (
                          <div className="p-4 text-sm border border-dashed text-slate-500 rounded-xl bg-slate-50/70">
                            You have not uploaded a CV yet. Upload your CV from the Account
                            Settings page to enable better course matching.
                          </div>
                        )}
                      </div>
                    </section>
                  )}


                {/* ============= BOOKINGS ============= */}
                {tab === "bookings" && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-semibold text-slate-900">
                      Bookings
                    </h2>
                    <div className="p-4 bg-white shadow rounded-xl">
                      <p className="mb-3 text-sm text-slate-600">
                        View and manage your bookings on the dedicated bookings page.
                      </p>
                      <button
                        onClick={() => navigate("/tutor/bookings")}
                        className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded hover:bg-green-700"
                      >
                        Go to Bookings
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </main>


      {/* MINIMAL FOOTER */}
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
            <i className="fa fa-facebook"></i>
          </a>
          <a
            href="#"
            style={{ color: "#fff", margin: "0 8px", fontSize: "14px" }}
          >
            <i className="fa fa-twitter"></i>
          </a>
          <a
            href="#"
            style={{ color: "#fff", margin: "0 8px", fontSize: "14px" }}
          >
            <i className="fa fa-linkedin"></i>
          </a>
        </div>
      </footer>

      {/* MODALS (unchanged, just moved under main JSX) */}

      {/* Notification Modal */}
      {isNotifOpen && selectedNotif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md p-5 bg-white shadow-lg rounded-xl">
            <div className="mb-3">
              <h3 className="text-lg font-semibold">Notification</h3>
            </div>

            <div className="mb-4 space-y-2 text-sm text-gray-800">
              {selectedNotif.type === "course_match" && (
                <>
                  <p>
                    <span className="font-semibold">New course created:</span>{" "}
                    {selectedNotif.data?.courseTitle || "Untitled course"}
                  </p>
                  {selectedNotif.data?.categoryName && (
                    <p>
                      <span className="font-semibold">Category:</span>{" "}
                      {selectedNotif.data.categoryName}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-gray-600">
                    A new course matching your profile has been created. You can
                    apply to teach it or mark that you are not interested
                    directly from this notification.
                  </p>
                </>
              )}

              {selectedNotif.type === "tutor_applied" && (
                <>
                  <p className="font-semibold">
                    {selectedNotif.title || "Course application submitted"}
                  </p>
                  <p className="mt-2 text-sm text-gray-600">
                    {selectedNotif.message ||
                      `You have applied to teach "${
                        selectedNotif.data?.courseTitle || "this course"
                      }". Please wait for the admin's approval.`}
                  </p>
                </>
              )}

              {selectedNotif.type === "course_accepted" && (
                <>
                  <p className="font-semibold text-green-700">
                    🎉 Application Approved
                  </p>
                  <p className="mt-2 text-sm text-gray-600">
                    {selectedNotif.message ||
                      `Congratulations! You have been accepted to teach "${
                        selectedNotif.data?.courseTitle || "this course"
                      }".`}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    You should also receive a confirmation email with more
                    details.
                  </p>
                </>
              )}

              {selectedNotif.type === "course_rejected" && (
                <>
                  <p className="font-semibold text-red-700">
                    Application Update
                  </p>
                  <p className="mt-2 text-sm text-gray-600">
                    {selectedNotif.message ||
                      `Unfortunately, your application for "${
                        selectedNotif.data?.courseTitle || "this course"
                      }" was not accepted this time.`}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    We encourage you to apply again for other courses that match
                    your expertise.
                  </p>
                </>
              )}

              {selectedNotif.type === "course_assigned_elsewhere" && (
                <>
                  <p className="font-semibold text-gray-800">
                    Course assigned to another tutor
                  </p>
                  <p className="mt-2 text-sm text-gray-600">
                    The course{" "}
                    <span className="font-semibold">
                      &quot;
                      {selectedNotif.data?.courseTitle || "this course"}
                      &quot;
                    </span>{" "}
                    has been assigned to another instructor.
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    You can still apply to other courses that match your
                    profile.
                  </p>
                </>
              )}

              {![
                "course_match",
                "tutor_applied",
                "course_accepted",
                "course_rejected",
                "course_assigned_elsewhere",
              ].includes(selectedNotif.type) && (
                <>
                  <p className="font-semibold">
                    {selectedNotif.title || "Notification"}
                  </p>
                  <p className="mt-2 text-sm text-gray-600">
                    {selectedNotif.message || "Notification details."}
                  </p>
                </>
              )}

              <p className="mt-2 text-xs text-gray-500">
                Received at:{" "}
                {selectedNotif.createdAt
                  ? new Date(selectedNotif.createdAt).toLocaleString()
                  : ""}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2">
              {selectedNotif.type === "course_match" && (
                <>
                  <button
                    onClick={() => handleRejectCourseMatch(selectedNotif)}
                    disabled={notifActionLoading}
                    className={`px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 ${
                      notifActionLoading ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  >
                    Not interested
                  </button>
                  <button
                    onClick={() => handleApplyCourseMatch(selectedNotif)}
                    disabled={notifActionLoading}
                    className={`px-4 py-2 text-white bg-indigo-600 rounded hover:bg-indigo-700 ${
                      notifActionLoading ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  >
                    {notifActionLoading ? "Applying…" : "Apply for this course"}
                  </button>
                </>
              )}

              <button
                onClick={() => setIsNotifOpen(false)}
                disabled={notifActionLoading}
                className={`px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 ${
                  notifActionLoading ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Availability Modal */}
      {isAvailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md p-5 bg-white shadow-lg rounded-xl">
            <div className="mb-3">
              <h3 className="text-lg font-semibold">
                {editingSlotId
                  ? "Edit Availability Slot"
                  : "Add Availability Slot"}
              </h3>
              <p className="text-sm text-gray-600">
                Choose a date and time range when you are available to teach.
              </p>
            </div>

            {availErr && (
              <div className="px-3 py-2 mb-3 text-sm text-red-700 border border-red-200 rounded bg-red-50">
                {availErr}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block mb-1 text-xs text-gray-500 uppercase">
                  Date
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-md"
                  value={newSlot.date}
                  onChange={(e) =>
                    setNewSlot((prev) => ({ ...prev, date: e.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-xs text-gray-500 uppercase">
                    Start
                  </label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 border rounded-md"
                    value={newSlot.start}
                    onChange={(e) =>
                      setNewSlot({ ...newSlot, start: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs text-gray-500 uppercase">
                    End
                  </label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 border rounded-md"
                    value={newSlot.end}
                    onChange={(e) =>
                      setNewSlot({ ...newSlot, end: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={saveAvailability}
                  disabled={savingAvail}
                  className="px-4 py-2 text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-60"
                >
                  {savingAvail
                    ? "Saving…"
                    : editingSlotId
                    ? "Save Changes"
                    : "Save Slot"}
                </button>
                <button
                  onClick={() => {
                    setIsAvailOpen(false);
                    setEditingSlotId(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Course Modal */}
      {isAddCourseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="relative w-full max-w-md p-5 bg-white shadow-lg rounded-xl">
            <button
              className="absolute text-xl text-gray-500 top-2 right-2 hover:text-black"
              onClick={() => setIsAddCourseOpen(false)}
            >
              ×
            </button>

            <div className="mb-3">
              <h3 className="text-lg font-semibold">Add Course from CV</h3>
              <p className="text-sm text-gray-600">
                These courses are suggested by AI based on your CV. Choose one
                to add.
              </p>
            </div>

            {aiCoursesErr && (
              <div className="px-3 py-2 mb-3 text-sm text-red-700 border border-red-200 rounded bg-red-50">
                {aiCoursesErr}
              </div>
            )}

            {aiCoursesLoading ? (
              <p className="text-sm text-gray-500">
                Analyzing your CV and loading courses…
              </p>
            ) : !aiCourses || !aiCourses.length ? (
              <p className="text-sm text-gray-500">
                No suitable courses found from your CV yet.
              </p>
            ) : (
              <div className="space-y-3">
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                >
                  <option value="">— Select a course —</option>
                  {aiCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} {c.category ? `(${c.category})` : ""}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <button
                    onClick={attachCourseFromCV}
                    disabled={!selectedCourseId}
                    className="px-4 py-2 text-white bg-purple-600 rounded hover:bg-purple-700 disabled:opacity-60"
                  >
                    Add Selected Course
                  </button>
                  <button
                    onClick={() => setIsAddCourseOpen(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Resource Modal */}
      {isResourceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md p-5 bg-white shadow-lg rounded-xl">
            <div className="mb-3">
              <h3 className="text-lg font-semibold">Add Resource (Link)</h3>
              <p className="text-sm text-gray-600">
                Add a helpful resource (PDF, doc, or video link) for one of your
                courses.
              </p>
            </div>

            <div className="space-y-3">
              {/* Select course */}
              <div>
                <label className="block mb-1 text-xs text-gray-500 uppercase">
                  Course
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={resourceForm.courseId || ""}
                  onChange={(e) =>
                    setResourceForm((prev) => ({
                      ...prev,
                      courseId: e.target.value,
                    }))
                  }
                >
                  <option value="">— Select a course —</option>
                  {(profile?.courses || []).map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.title || "Untitled course"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 text-xs text-gray-500 uppercase">
                  Title
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  value={resourceForm.title}
                  onChange={(e) =>
                    setResourceForm((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  placeholder="e.g. Week 1 PDF"
                />
              </div>

              <div>
                <label className="block mb-1 text-xs text-gray-500 uppercase">
                  URL (Google Drive, YouTube, etc.)
                </label>
                <input
                  type="url"
                  className="w-full px-3 py-2 border rounded-md"
                  value={resourceForm.url}
                  onChange={(e) =>
                    setResourceForm((prev) => ({
                      ...prev,
                      url: e.target.value,
                    }))
                  }
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (
                      !resourceForm.courseId ||
                      !resourceForm.title.trim() ||
                      !resourceForm.url.trim()
                    ) {
Swal.fire({
        title: "Missing Information",
        text: "Please select a course and fill in both the title and URL.",
        icon: "warning",
        confirmButtonText: "OK",
        confirmButtonColor: "#f6c23e",
      });                      return;
                    }
                    try {
                      setSavingResource(true);
                      await addTutorResourceLink({
                        courseId: resourceForm.courseId,
                        title: resourceForm.title.trim(),
                        url: resourceForm.url.trim(),
                      });

Swal.fire({
        title: "Resource Added",
        text: "Your resource link has been added successfully.",
        icon: "success",
        confirmButtonText: "OK",
        confirmButtonColor: "#3085d6",
      });                      setResourceForm({ title: "", url: "", courseId: "" });
                      setIsResourceModalOpen(false);
                    } catch (e) {
Swal.fire({
        title: "Error",
        text: e.message || "Failed to add resource.",
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#d33",
      });                    } finally {
                      setSavingResource(false);
                    }
                  }}
                  disabled={savingResource}
                  className="px-4 py-2 text-white bg-purple-600 rounded hover:bg-purple-700 disabled:opacity-60"
                >
                  {savingResource ? "Saving…" : "Save Resource"}
                </button>
                <button
                  onClick={() => setIsResourceModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
