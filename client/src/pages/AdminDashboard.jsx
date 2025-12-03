// src/pages/AdminDashboard.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getJSON,
  del,
  fetchNotifications,
  markNotificationRead,
  withAuthFetch,
  postAuthJSON,
} from "../lib/api";
import { useAuthStore } from "../store/useAuthStore";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";


export default function AdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [showCreateCourse, setShowCreateCourse] = useState(false);


  // Shared lists
  const [categories, setCategories] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Course form
  const [form, setForm] = useState({
    title: "",
    categoryId: "",
    instructorId: "",
    description: "",
    price: "",
    level: "beginner",
    maxStudents: "",
    prerequisites: [],
    isPublished: false,
  });

  // Category form
  const [catForm, setCatForm] = useState({ name: "", description: "" });
  const [catBusy, setCatBusy] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);


  // Edit state for categories
  const [catEditId, setCatEditId] = useState(null);
  const [catEditForm, setCatEditForm] = useState({ name: "", description: "" });

  // Users tab data
  const [students, setStudents] = useState([]);
  const [tutorsUsers, setTutorsUsers] = useState([]);
  const [usersView, setUsersView] = useState("students"); // "students" | "tutors"
  const [tab, setTab] = useState("dashboard");  // was "courses"



  // Bookings tab data
  const [bookings, setBookings] = useState([]);

  // 🔔 Admin notifications (includes tutor applications)
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifErr, setNotifErr] = useState("");

  // ⏳ Loading state for a specific tutor application (accept/reject)
  const [processingApplication, setProcessingApplication] = useState({
    id: null, // notification _id
    action: null, // "accept" | "reject"
  });

  // Course details modal
  const [detailsId, setDetailsId] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    price: 0,
    level: "",
    maxStudents: 0,
    categoryId: "",
    instructorId: "",
    isPublished: false,
  });


  // Initial load
  useEffect(() => {
    let ignore = false;

    async function loadAll() {
      try {
        setLoading(true);
        setErr("");

        const [catsRes, tutorsRes, coursesRes] = await Promise.all([
          getJSON("/api/categories"),
          getJSON("/api/admin/tutors"),
          getJSON("/api/admin/courses"),
        ]);

        if (!ignore) {
          setCategories(catsRes?.categories || []);
          setTutors(tutorsRes?.tutors || []);
          setCourses(coursesRes?.courses || []);
        }
      } catch (e) {
        if (!ignore) setErr(e.message || "Failed to load data");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadAll();
    loadNotifications();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (details) {
      setEditForm((prev) => ({
        ...prev,
        title: details.title || "",
        description: details.description || "",
        level: details.level || "beginner",
        price: details.price || 0,
        maxStudents: details.maxStudents || 0,
        isPublished: details.isPublished || false,
      }));
    }
  }, [details]);

   useEffect(() => {
    if (!user) return;
    loadUsers();
    loadBookings();
  }, [user]);

  // Helpers to (re)load
  async function reloadCategories() {
    const res = await getJSON("/api/categories");
    setCategories(res?.categories || []);
  }

  async function reloadCourses() {
    const res = await getJSON("/api/admin/courses");
    setCourses(res?.courses || []);
  }

  // Users tab loader
  async function loadUsers() {
    try {
      setErr("");
      const res = await getJSON("/api/admin/users");
      setStudents(res?.students || []);
      setTutorsUsers(res?.tutors || []);
    } catch (e) {
      setErr(e.message || "Failed to load users");
    }
  }

  // 📅 Bookings tab loader (ADMIN)
  async function loadBookings() {
    try {
      setErr("");
      const res = await getJSON("/api/bookings/admin");
      setBookings(res?.bookings || []);
    } catch (e) {
      setErr(e.message || "Failed to load bookings");
    }
  }

  // Notifications
  async function loadNotifications() {
    try {
      setNotifLoading(true);
      setNotifErr("");
      const data = await fetchNotifications();
      setNotifications(data.notifications || []);
    } catch (e) {
      setNotifErr(e.message || "Failed to load notifications");
    } finally {
      setNotifLoading(false);
    }
  }

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

  // ✅ Admin: accept tutor for a course
  async function handleAcceptTutorApplication(notif) {
    if (!notif?.data?.courseId || !notif?.data?.tutorId) {
      Swal.fire({
      title: "Missing information",
      text: "Missing course or tutor info in this notification.",
      icon: "warning",
      confirmButtonText: "OK",
      });
      return;
    }

    setProcessingApplication({ id: notif._id, action: "accept" });

    try {
      await withAuthFetch(
        `/api/admin/course/accept/${notif.data.courseId}/${notif.data.tutorId}`,
        { method: "POST" }
      );

      setNotifications((prev) => prev.filter((n) => n._id !== notif._id));

      await reloadCourses();

      Swal.fire({
      title: "Tutor Assigned",
      text: `Tutor ${
        notif.data?.tutorName || ""
      } has been assigned to "${notif.data?.courseTitle || "this course"}".`,
      icon: "success",
      confirmButtonText: "OK",
      });
      
    } catch (e) {
      console.error("Accept tutor application failed", e);
      
      Swal.fire({
        title: "Error",
        text: e.message || "Failed to accept tutor for this course.",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setProcessingApplication({ id: null, action: null });
    }
  }

  // ✅ Admin: reject tutor for a course
  async function handleRejectTutorApplication(notif) {
    if (!notif?.data?.courseId || !notif?.data?.tutorId) {
      Swal.fire({
        title: "Missing information",
        text: "Missing course or tutor info in this notification.",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    const result = await Swal.fire({
    title: "Confirm Rejection",
    text: `Reject ${notif.data?.tutorName || "this tutor"} for "${
      notif.data?.courseTitle || "this course"
    }"?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, reject",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#d33",
  });

  // If admin clicked "Cancel"
  if (!result.isConfirmed) return;

    setProcessingApplication({ id: notif._id, action: "reject" });

    try {
      await withAuthFetch(
        `/api/admin/course/reject/${notif.data.courseId}/${notif.data.tutorId}`,
        { method: "POST" }
      );

      setNotifications((prev) => prev.filter((n) => n._id !== notif._id));

      // Success popup
      Swal.fire({
        title: "Tutor Rejected",
        text: `You rejected ${
          notif.data?.tutorName || "this tutor"
        } for "${notif.data?.courseTitle || "this course"}".`,
        icon: "success",
        confirmButtonText: "OK",
      });
    } catch (e) {
      console.error("Reject tutor application failed", e);
      Swal.fire({
        title: "Error",
        text: e.message || "Failed to reject tutor for this course.",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setProcessingApplication({ id: null, action: null });
    }
  }

  // Only tutor_application notifications
  const tutorApplications = useMemo(
    () =>
      notifications.filter(
        (n) =>
          n.type === "tutor_application" &&
          (n.actionStatus === "none" || !n.actionStatus)
      ),
    [notifications]
  );

  // Course actions
  function togglePrereq(id) {
    setForm((prev) => ({
      ...prev,
      prerequisites: prev.prerequisites.includes(id)
        ? prev.prerequisites.filter((x) => x !== id)
        : [...prev.prerequisites, id],
    }));
  }

  async function createCourse(e) {
    e.preventDefault();
    try {
      setErr("");
      const payload = {
        title: form.title.trim(),
        categoryId: form.categoryId || null,
        instructorId: form.instructorId || null,
        description: form.description.trim(),
        price: Number(form.price) || 0,
        level: form.level,
        maxStudents: Number(form.maxStudents) || 0,
        isPublished: form.instructorId ? !!form.isPublished : false,
        prerequisites: form.prerequisites,
      };
      await postAuthJSON("/api/courses", payload);
      await reloadCourses();
      setForm({
        title: "",
        categoryId: "",
        instructorId: "",
        description: "",
        price: "",
        level: "beginner",
        maxStudents: "",
        prerequisites: [],
        isPublished: false,
      });
      Swal.fire({
        title: "Course Created",
        text: "Your course has been created successfully!",
        icon: "success",
        confirmButtonText: "OK",
        confirmButtonColor: "#3085d6",
      });
      } catch (e) {
        setErr(e.message || "Failed to create course");
        // ❌ ERROR POPUP
        Swal.fire({
          title: "Error",
          text: e.message || "Failed to create course",
          icon: "error",
          confirmButtonText: "OK",
          confirmButtonColor: "#d33",
        });
    }
  }

  async function deleteCourse(id) {

    // Replace confirm() with SweetAlert2 confirmation
    const result = await Swal.fire({
      title: "Delete Course?",
      text: "Are you sure you want to delete this course? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
    });

    // User clicked cancel
    if (!result.isConfirmed) return;

    try {
      await del(`/api/admin/courses/${id}`);

      setCourses((prev) => prev.filter((c) => c._id !== id));

      // Optional: show success popup
      Swal.fire({
        title: "Deleted",
        text: "The course has been deleted successfully.",
        icon: "success",
        confirmButtonText: "OK",
        confirmButtonColor: "#3085d6",
      });

    } catch (e) {
      Swal.fire({
        title: "Error",
        text: e.message || "Failed to delete course.",
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#d33",
      });
    }
  }


  async function saveEdits() {
    try {
      const payload = {
        ...editForm,
        instructorId: editForm.instructorId || null,
        categoryId: editForm.categoryId || null,
        price: Number(editForm.price) || 0,
        maxStudents: Number(editForm.maxStudents) || 0,
      };

      if (!details.instructor && payload.instructorId) {
        payload.isPublished = true;
      }

      if (!payload.instructorId) {
        payload.isPublished = false;
      }

      await withAuthFetch(`/api/admin/courses/${detailsId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      await reloadCourses();
      Swal.fire({
      title: "Course Updated",
      text: "The course details have been successfully updated.",
      icon: "success",
      confirmButtonText: "OK",
      confirmButtonColor: "#3085d6",
    });

      setEditMode(false);
      openDetails(detailsId);
    } catch (e) {
      Swal.fire({
      title: "Error",
      text: e.message || "Failed to update course",
      icon: "error",
      confirmButtonText: "OK",
      confirmButtonColor: "#d33",
    });
    }
  }

  async function openDetails(id) {
    try {
      setDetailsId(id);
      setDetails(null);
      setDetailsLoading(true);
      const data = await getJSON(`/api/admin/courses/${id}`);
      const c = data?.course;
      setDetails(c || null);

      if (c) {
        setEditForm({
          title: c.title || "",
          description: c.description || "",
          price: c.price || 0,
          level: c.level || "beginner",
          maxStudents: c.maxStudents || 0,
          categoryId: c.category?._id || "",
          instructorId: c.instructor?._id || "",
          isPublished: c.isPublished || false,
        });
      }
    } catch (e) {
      setErr(e.message || "Failed to load details");
      setDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  }

  // Category actions
  async function createCategory(e) {
    e.preventDefault();
    if (!catForm.name.trim()) return;
    try {
      setCatBusy(true);
      setErr("");
      await postAuthJSON("/api/categories", {
        name: catForm.name.trim(),
        description: catForm.description.trim(),
      });
      setCatForm({ name: "", description: "" });
      await reloadCategories();
Swal.fire({
      title: "Category Created",
      text: "The category has been added successfully.",
      icon: "success",
      confirmButtonText: "OK",
      confirmButtonColor: "#3085d6",
    });    } catch (e) {
      setErr(e.message || "Failed to create category");
      // ❌ ERROR POPUP
    Swal.fire({
      title: "Error",
      text: e.message || "Failed to create category.",
      icon: "error",
      confirmButtonText: "OK",
      confirmButtonColor: "#d33",
    });
    } finally {
      setCatBusy(false);
    }
  }

async function deleteCategory(id) {

  // 🔄 Replace confirm() with SweetAlert2 confirmation
  const result = await Swal.fire({
    title: "Delete Category?",
    text: "Are you sure you want to delete this category?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, delete it",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
  });

  // If user pressed cancel
  if (!result.isConfirmed) return;

  try {
    await del(`/api/categories/${id}`);

    setCategories((prev) => prev.filter((c) => c._id !== id));

    // 🎉 Optional success message
    Swal.fire({
      title: "Deleted",
      text: "The category has been deleted successfully.",
      icon: "success",
      confirmButtonText: "OK",
      confirmButtonColor: "#3085d6",
    });

  } catch (e) {
    // ❌ SweetAlert2 error popup
    Swal.fire({
      title: "Error",
      text: e.message || "Failed to delete category.",
      icon: "error",
      confirmButtonText: "OK",
      confirmButtonColor: "#d33",
    });
  }
}


  function startCatEdit(cat) {
    setCatEditId(cat._id);
    setCatEditForm({
      name: cat.name || "",
      description: cat.description || "",
    });
  }

  function cancelCatEdit() {
    setCatEditId(null);
    setCatEditForm({ name: "", description: "" });
  }

  async function saveCategoryEdit(id) {
    if (!catEditForm.name.trim()) {
      Swal.fire({
      title: "Missing Name",
      text: "Category name is required.",
      icon: "warning",
      confirmButtonText: "OK",
      confirmButtonColor: "#3085d6",
    });
      return;
    }
    try {
      setCatBusy(true);
      setErr("");

      const payload = {
        name: catEditForm.name.trim(),
        description: catEditForm.description.trim(),
      };

      await withAuthFetch(`/api/categories/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      await reloadCategories();
      cancelCatEdit();
      Swal.fire({
      title: "Category Updated",
      text: "The category has been updated successfully.",
      icon: "success",
      confirmButtonText: "OK",
      confirmButtonColor: "#3085d6",
    });
    } catch (e) {
      setErr(e.message || "Failed to update category");
      Swal.fire({
      title: "Error",
      text: e.message || "Failed to update category.",
      icon: "error",
      confirmButtonText: "OK",
      confirmButtonColor: "#d33",
    });
    } finally {
      setCatBusy(false);
    }
  }

  // Maps
  const categoriesMap = useMemo(() => {
    const m = new Map();
    categories.forEach((c) => m.set(c._id, c.name));
    return m;
  }, [categories]);

  const tutorsMap = useMemo(() => {
    const m = new Map();
    tutors.forEach((t) => m.set(t._id, t.user?.name || t.name || "Tutor"));
    return m;
  }, [tutors]);

  function handleTabChange(nextTab) {
    setTab(nextTab);

    if (nextTab === "users" || nextTab === "dashboard") loadUsers();
    if (nextTab === "bookings" || nextTab === "dashboard") loadBookings();
    if (nextTab === "categories" || nextTab === "dashboard") reloadCategories();
    // courses data is loaded on mount & after mutations
}
  // ------- DASHBOARD METRICS -------
  const totalStudents = students.length;
  const totalTutors = tutorsUsers.length;
  const totalUsers = totalStudents + totalTutors;

  const totalCourses = courses.length;
  const totalBookings = bookings.length;

  // Map of courseId -> price (from admin courses list)
    const coursePriceMap = useMemo(() => {
      const map = new Map();
      courses.forEach((c) => {
        if (c && c._id) map.set(String(c._id), Number(c.price) || 0);
      });
      return map;
    }, [courses]);


      // Helper to get price from a booking (from courseId / course)
    const getBookingPrice = useCallback(
      (b) => {
        let direct = undefined;

        if (b.courseId && typeof b.courseId === "object") {
          direct = Number(b.courseId.price);
        }
        if (!direct && b.course && typeof b.course === "object") {
          direct = Number(b.course.price);
        }
        if (!Number.isNaN(direct) && direct) return direct;

        let courseIdStr = null;
        if (typeof b.courseId === "string") courseIdStr = b.courseId;
        else if (b.courseId?._id) courseIdStr = String(b.courseId._id);
        else if (b.course?._id) courseIdStr = String(b.course._id);

        if (!courseIdStr) return 0;

        return coursePriceMap.get(courseIdStr) || 0;
      },
      [coursePriceMap] // required dependency
    );



      // 💰 Total revenue from confirmed bookings
      const totalRevenue = bookings
        .filter((b) => b.status === "confirmed")
        .reduce((sum, b) => sum + getBookingPrice(b), 0);

    // ---- Revenue per year (fixed 5-year window, includes zero years) ----
      const revenueByYearPoints = useMemo(() => {
        // 1) aggregate confirmed bookings by year
        const revenueMap = new Map(); // year (number) -> total revenue

        bookings
          .filter((b) => b.status === "confirmed")
          .forEach((b) => {
            if (!b.start) return;

            const d = new Date(b.start);
            if (Number.isNaN(d.getTime())) return;

            const year = d.getFullYear();
            const price = getBookingPrice(b);
            if (!price) return;

            revenueMap.set(year, (revenueMap.get(year) || 0) + price);
          });

        // 2) build last 5 years range (not hard-coded)
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - 4; // e.g. 2021–2025 if currentYear = 2025

        const points = [];
        for (let y = startYear; y <= currentYear; y++) {
          const value = revenueMap.get(y) || 0;
          points.push({ year: String(y), value });
        }

        return points;
      }, [bookings, getBookingPrice]);

      // max revenue for scaling bar height
      const maxYearRevenue =
        revenueByYearPoints.length > 0
          ? Math.max(...revenueByYearPoints.map((p) => p.value), 1)
          : 1;


      // percentages for user pie chart
      const studentPct = totalUsers
        ? Math.round((totalStudents / totalUsers) * 100)
        : 0;
      const tutorPct = totalUsers
        ? Math.round((totalTutors / totalUsers) * 100)
        : 0;

      // bookings status stats (bar chart)
      const confirmedBookings = bookings.filter(
        (b) => b.status === "confirmed"
      ).length;
      const pendingBookings = bookings.filter(
        (b) => b.status === "requested" || b.status === "awaiting_payment"
      ).length;
      const declinedBookings = bookings.filter(
        (b) => b.status === "declined" || b.status === "canceled"
      ).length;

      const maxBookingCount = Math.max(
        confirmedBookings,
        pendingBookings,
        declinedBookings,
        1
      );



  return (
    <>
      {/* TOP HEADER */}
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
              <div className="font-semibold">Admin Dashboard</div>
              <div className="text-xs text-slate-300">
                Hello {user?.name || "Admin"} 👋
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
                onClick={logout}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </header>

      {/* LAYOUT: SIDEBAR + MAIN */}
      <div className="flex min-h-screen bg-slate-50">
        {/* SIDEBAR (vertical navbar) */}
        <aside className="hidden w-64 bg-white border-r border-slate-200 md:flex md:flex-col">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-xs font-semibold tracking-wide uppercase text-slate-500">
              Admin menu
            </p>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 text-sm">
            {[
              { id: "dashboard", label: "Dashboard", icon: "📊" },
              { id: "courses", label: "Courses", icon: "📚" },
              { id: "categories", label: "Categories", icon: "🗂️" },
              { id: "users", label: "Users", icon: "👥" },
              { id: "bookings", label: "Bookings", icon: "📅" },
            ].map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
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

          <div className="px-4 py-3 border-t border-slate-100 text-[11px] text-slate-400">
            © {new Date().getFullYear()} EduRA
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1">
          <div className="px-4 py-6 mx-auto max-w-7xl">
            {/* MOBILE TABS (when sidebar hidden) */}
            <div className="flex flex-wrap gap-2 mb-4 md:hidden">
              {["dashboard","courses", "categories", "users", "bookings"].map((t) => (
                <button
                  key={t}
                  onClick={() => handleTabChange(t)}
                  className={`px-3 py-1.5 text-xs rounded-full border ${
                    tab === t
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  {t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            <div
              id="overview"
              className="wow fadeInUp"
              data-wow-duration="1s"
              data-wow-delay=".2s"
            >
              {/* Page title */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {tab === "dashboard" && "Dashboard"}
                    {tab === "courses" && "Courses"}
                    {tab === "categories" && "Categories"}
                    {tab === "users" && "Users"}
                    {tab === "bookings" && "Bookings"}
                  </h1>
                  <p className="text-gray-600">
                    Hello <strong>{user?.name}</strong> 👋
                  </p>
                </div>
              </div>

              {/* Error banner */}
              {err && (
                <div className="px-4 py-2 mb-4 text-sm text-yellow-800 border border-yellow-300 rounded-md bg-yellow-50">
                  {err}
                </div>
              )}

              {/* 🔔 Tutor Course Applications */}
              <div className="mb-4">
                <div className="p-4 bg-white border shadow-sm rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-semibold text-gray-800">
                      Tutor Course Applications
                    </h2>
                    {tutorApplications.some((n) => !n.isRead) && (
                      <span className="px-2 py-0.5 text-xs font-semibold text-white bg-red-500 rounded-full">
                        {tutorApplications.filter((n) => !n.isRead).length} new
                      </span>
                    )}
                  </div>

                  {notifLoading ? (
                    <p className="text-xs text-gray-500">
                      Loading notifications…
                    </p>
                  ) : notifErr ? (
                    <p className="text-xs text-red-600">{notifErr}</p>
                  ) : !tutorApplications.length ? (
                    <p className="text-xs text-gray-500">
                      No tutor applications yet.
                    </p>
                  ) : (
                    <ul className="space-y-2 overflow-y-auto text-xs max-h-48">
                      {tutorApplications.map((n) => (
                        <li
                          key={n._id}
                          className={`border rounded px-3 py-2 ${
                            n.isRead ? "bg-white" : "bg-yellow-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-medium text-gray-800">
                                Tutor{" "}
                                <strong>
                                  {n.data?.tutorName || "Unknown"}
                                </strong>{" "}
                                has applied to teach{" "}
                                <strong>
                                  {n.data?.courseTitle || "a course"}
                                </strong>
                                .
                              </div>
                              {n.data?.categoryName && (
                                <div className="mt-0.5 text-[11px] text-gray-500">
                                  Category: {n.data.categoryName}
                                </div>
                              )}
                              <div className="mt-1 text-[11px] text-blue-700">
                                You can review and decide here. Check your email
                                if you want to see the full CV.
                              </div>

                              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                                {(() => {
                                  const isProcessing =
                                    processingApplication.id === n._id;
                                  const isAccepting =
                                    isProcessing &&
                                    processingApplication.action === "accept";
                                  const isRejecting =
                                    isProcessing &&
                                    processingApplication.action === "reject";

                                  return (
                                    <>
                                      <button
                                        onClick={() =>
                                          handleAcceptTutorApplication(n)
                                        }
                                        disabled={isProcessing}
                                        className={`px-2 py-1 text-xs font-semibold text-white rounded ${
                                          isAccepting
                                            ? "bg-green-400 cursor-wait"
                                            : "bg-green-600 hover:bg-green-700"
                                        } disabled:opacity-60`}
                                      >
                                        {isAccepting ? "Accepting…" : "Accept"}
                                      </button>

                                      <button
                                        onClick={() =>
                                          handleRejectTutorApplication(n)
                                        }
                                        disabled={isProcessing}
                                        className={`px-2 py-1 text-xs font-semibold text-white rounded ${
                                          isRejecting
                                            ? "bg-red-400 cursor-wait"
                                            : "bg-red-600 hover:bg-red-700"
                                        } disabled:opacity-60`}
                                      >
                                        {isRejecting ? "Rejecting…" : "Reject"}
                                      </button>

                                      {!isProcessing && (
                                        <span className="text-gray-500">
                                          You can still open the email to review
                                          the full CV and details.
                                        </span>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>

                              <div className="mt-0.5 text-[10px] text-gray-400">
                                {n.createdAt
                                  ? new Date(n.createdAt).toLocaleString()
                                  : ""}
                              </div>
                            </div>

                            {!n.isRead && (
                              <button
                                onClick={() =>
                                  handleMarkNotificationRead(n._id)
                                }
                                className="text-[11px] text-blue-600 hover:underline whitespace-nowrap"
                              >
                                Mark as read
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* MAIN TAB CONTENT */}
              {loading ? (
                <p className="text-gray-600">Loading…</p>
              ) : (
                <>

                  {/* DASHBOARD */}
                    {tab === "dashboard" && (
              <div className="space-y-6">
                  {/* Top stats cards */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* Total users */}
                    <div className="relative overflow-hidden p-5 bg-white/90 backdrop-blur border border-slate-200 shadow-sm rounded-2xl transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg group">
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400" />
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-500">
                            Total users
                          </p>
                          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                            {totalUsers}
                          </p>
                          <p className="mt-2 text-xs text-slate-500">
                            <span className="font-semibold text-indigo-600">
                              {totalStudents}
                            </span>{" "}
                            students ·{" "}
                            <span className="font-semibold text-emerald-600">
                              {totalTutors}
                            </span>{" "}
                            tutors
                          </p>
                        </div>

                        <div className="flex items-center justify-center w-10 h-10 text-lg text-indigo-600 transition-transform rounded-full bg-indigo-50 group-hover:scale-110">
                          👤
                        </div>
                      </div>
                    </div>

                    {/* Courses */}
                    <div className="relative overflow-hidden p-5 bg-white/90 backdrop-blur border border-slate-200 shadow-sm rounded-2xl transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg group">
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 to-indigo-500" />
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-500">
                            Courses
                          </p>
                          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                            {totalCourses}
                          </p>
                          <p className="mt-2 text-xs text-slate-500">
                            Active learning opportunities on the platform.
                          </p>
                        </div>

                        <div className="flex items-center justify-center w-10 h-10 text-lg transition-transform rounded-full text-sky-600 bg-sky-50 group-hover:scale-110">
                          📚
                        </div>
                      </div>
                    </div>

                    {/* Bookings */}
                    <div className="relative overflow-hidden p-5 bg-white/90 backdrop-blur border border-slate-200 shadow-sm rounded-2xl transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg group">
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 to-rose-400" />
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-500">
                            Bookings
                          </p>
                          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                            {totalBookings}
                          </p>
                          <p className="mt-2 text-xs text-slate-500">
                            <span className="font-semibold text-amber-500">
                              {pendingBookings} pending
                            </span>

                            <p>
                            <span className="font-semibold text-emerald-600">
                              {confirmedBookings} confirmed
                            </span>
                            </p>
                          </p>
                        </div>

                        <div className="flex items-center justify-center w-10 h-10 text-lg transition-transform rounded-full text-amber-500 bg-amber-50 group-hover:scale-110">
                          📅
                        </div>
                      </div>
                    </div>

                    {/* Revenue (confirmed) */}
                    <div className="relative overflow-hidden p-5 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 border border-emerald-100 shadow-sm rounded-2xl transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg group">
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-emerald-700">
                            Revenue (confirmed)
                          </p>
                          <p className="mt-3 text-3xl font-extrabold tracking-tight text-emerald-600">
                            ${totalRevenue.toFixed(2)}
                          </p>
                          <p className="mt-2 text-xs text-emerald-700/80">
                            Based on confirmed bookings &amp; current course prices.
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-1 text-[10px] text-emerald-700">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 font-semibold">
                            USD
                          </span>
                         
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Middle row: PIE (users) + BAR (bookings) */}
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* Users breakdown – PIE chart */}
                    <div className="p-5 bg-white border shadow-sm rounded-2xl border-slate-200">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            Users breakdown
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Share of students vs tutors.
                          </p>
                        </div>
                        <span className="px-2 py-1 text-[11px] rounded-full bg-indigo-50 text-indigo-700">
                          Pie chart
                        </span>
                      </div>

                      {totalUsers === 0 ? (
                        <p className="text-xs text-slate-500">No users yet.</p>
                      ) : (
                        <div className="flex items-center gap-6">
                          {/* Simple pie using conic-gradient */}
                          <div className="relative flex items-center justify-center">
                            <div
                              className="transition-transform duration-200 border rounded-full shadow-md w-28 h-28 border-slate-200 hover:scale-105"
                              style={{
                                backgroundImage: `conic-gradient(#4f46e5 0 ${
                                  studentPct * 3.6
                                }deg, #34d399 0 360deg)`,
                              }}
                            />
                            <div className="absolute text-xs font-semibold text-slate-700">
                              {studentPct}% / {tutorPct}%
                            </div>
                          </div>

                          {/* Legend */}
                          <div className="space-y-3 text-xs">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <span className="inline-block w-2.5 h-2.5 bg-indigo-500 rounded-full" />
                                <span className="text-slate-600">
                                  Students{" "}
                                  <span className="font-semibold">
                                    {totalStudents} ({studentPct}%)
                                  </span>
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400" />
                                <span className="text-slate-600">
                                  Tutors{" "}
                                  <span className="font-semibold">
                                    {totalTutors} ({tutorPct}%)
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bookings status "graph" */}
                    <div className="p-5 bg-white border shadow-sm rounded-2xl border-slate-200">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            Bookings status
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Requested · confirmed · declined
                          </p>
                        </div>
                        <span className="px-2 py-1 text-[11px] rounded-full bg-slate-100 text-slate-600">
                          Bar chart
                        </span>
                      </div>

                      {totalBookings === 0 ? (
                        <p className="text-xs text-slate-500">No bookings yet.</p>
                      ) : (
                        <div className="space-y-3">
                          <span className="sr-only">Bar chart</span>

                          {[
                            {
                              label: "Pending",
                              value: pendingBookings,
                              color: "bg-amber-400",
                            },
                            {
                              label: "Confirmed",
                              value: confirmedBookings,
                              color: "bg-emerald-500",
                            },
                            {
                              label: "Declined / canceled",
                              value: declinedBookings,
                              color: "bg-rose-500",
                            },
                          ].map((row) => {
                            const rawPercent =
                              maxBookingCount === 0
                                ? 0
                                : (row.value / maxBookingCount) * 100;

                            const widthPercent =
                              row.value === 0 ? 0 : Math.max(rawPercent, 12); // at least 12%

                            return (
                              <div key={row.label}>
                                <div className="flex items-center justify-between mb-1 text-xs">
                                  <span className="text-slate-600">{row.label}</span>
                                  <span className="font-semibold text-slate-900">
                                    {row.value}
                                  </span>
                                </div>

                                <div className="w-full h-3 overflow-hidden rounded-full md:h-4 bg-slate-100">
                                  <div
                                    className={`h-3 md:h-4 ${row.color} transition-all duration-500 ease-out`}
                                    style={{ width: `${widthPercent}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
              )}
            </div>

                </div>

        {/* Revenue by year – clean vertical histogram */}
        <div className="grid grid-cols-1">
          <div className="p-6 bg-white border shadow-sm rounded-2xl border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-slate-900">
                Revenue by year
              </h3>
              <span className="px-2 py-1 text-[11px] rounded-full bg-indigo-50 text-indigo-700">
                Histogram
              </span>
            </div>

            {/* Subtitle */}
            <p className="mb-4 text-sm text-slate-600">
              Confirmed bookings ·{" "}
              <span className="font-semibold">
                ${totalRevenue.toFixed(2)}
              </span>
            </p>

            {/* Content */}
            {!revenueByYearPoints.length ? (
              <p className="text-xs text-slate-500">
                No revenue data yet. Confirmed bookings will appear here.
              </p>
            ) : (
              <div className="flex items-end justify-center gap-6 px-4 pt-4 pb-6 h-52 md:h-64 bg-slate-50/60 rounded-xl">
          {revenueByYearPoints.map((p) => {
            const isZero = p.value === 0;

            const rawPct =
              maxYearRevenue === 0 ? 0 : (p.value / maxYearRevenue) * 100;

            // non-zero years get a tall bar; zero years get a small black stub
            const heightPct = isZero ? 8 : Math.max(rawPct, 18); // % of column height

            return (
              <div
                key={p.year}
                className="flex flex-col items-center justify-end h-full gap-1"
              >
                {/* value */}
                <span className="text-[11px] font-semibold text-slate-700">
                  ${p.value.toFixed(0)}
                </span>

                {/* bar */}
                <div className="flex items-end h-full overflow-hidden w-7 md:w-10 rounded-2xl bg-slate-200/80">
                  <div
                    className={
                      "w-full rounded-2xl " +
                      (isZero
                        ? "bg-slate-900" // 🔥 black bar for 0$
                        : "bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-sm")
                    }
                    style={{ height: `${heightPct}%` }}
                  />
                </div>

                {/* year */}
                <span className="mt-1 text-[11px] font-medium text-slate-500">
                  {p.year}
                </span>
              </div>
            );
          })}
        </div>

    )}
  </div>
</div>


  </div>
)}


                  {/* COURSES */}
                      {tab === "courses" && (
                        <div className="relative">
                          {/* Header row inside Courses tab */}
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h2 className="text-2xl font-semibold text-slate-900">Courses</h2>
                              <p className="text-sm text-slate-500">
                                Manage all courses in one place. Use the actions to edit or remove them.
                              </p>
                            </div>

                            <button
                              onClick={() => setShowCreateCourse(true)}
                              className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              <span className="mr-2 text-lg leading-none">+</span>
                              New Course
                            </button>
                          </div>

                          {/* Courses table card */}
                          <div className="bg-white border shadow-sm border-slate-100 rounded-2xl">
                            <div className="flex items-center justify-between p-4 border-b border-slate-100">
                              <span className="text-sm font-medium text-slate-800">
                                All Courses
                              </span>
                              <span className="px-3 py-1 text-xs font-medium text-indigo-700 rounded-full bg-indigo-50">
                                {courses.length} {courses.length === 1 ? "course" : "courses"}
                              </span>
                            </div>

                            <div className="overflow-x-auto max-h-[calc(100vh-260px)]">
                              <table className="w-full text-sm text-left border-collapse">
                                <thead className="text-xs font-semibold tracking-wide uppercase border-b bg-slate-50 text-slate-600 border-slate-100">
                                  <tr>
                                    <th className="px-3 py-3 text-left">Title</th>
                                    <th className="px-3 py-3 text-left">Category</th>
                                    <th className="px-3 py-3 text-left">Instructor</th>
                                    <th className="px-3 py-3 text-center">Max</th>
                                    <th className="px-3 py-3 text-center">Published</th>
                                    <th className="px-3 py-3 text-right">Actions</th>
                                  </tr>
                                </thead>

                                <tbody>
                                  {courses.map((c) => {
                                    const publishedBadge = c.isPublished ? (
                                      <span className="inline-flex px-2 py-1 text-xs font-semibold text-green-700 border border-green-200 rounded-full bg-green-50">
                                        Yes
                                      </span>
                                    ) : (
                                      <span className="inline-flex px-2 py-1 text-xs font-semibold text-red-700 border border-red-200 rounded-full bg-red-50">
                                        No
                                      </span>
                                    );

                                    return (
                                      <tr
                                        key={c._id}
                                        className="transition-colors border-b border-slate-100 odd:bg-white even:bg-slate-50/40 hover:bg-slate-100/60"
                                      >
                                        <td className="px-3 py-3 align-top">
                                          <div className="font-medium text-slate-900">
                                            {c.title}
                                          </div>
                                        </td>
                                        <td className="px-3 py-3 align-top text-slate-700">
                                          {categoriesMap.get(c.categoryId) || "—"}
                                        </td>
                                        <td className="px-3 py-3 align-top text-slate-700">
                                          {tutorsMap.get(c.instructorId) || "—"}
                                        </td>
                                        <td className="px-3 py-3 text-center align-top text-slate-700">
                                          {c.maxStudents ?? "—"}
                                        </td>
                                        <td className="px-3 py-3 text-center align-top">
                                          {publishedBadge}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-3 align-top w-[140px]">
                                          <div className="flex flex-col items-end gap-2">
                                            <button
                                              onClick={() => openDetails(c._id)}
                                              className="w-[100px] px-3 py-1.5 text-xs font-semibold text-white rounded-md shadow-sm bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400/70"
                                            >
                                              Details
                                            </button>
                                            <button
                                              onClick={() => deleteCourse(c._id)}
                                              className="w-[100px] px-3 py-1.5 text-xs font-semibold text-white rounded-md shadow-sm bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400/70"
                                            >
                                              Delete
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}

                                  {courses.length === 0 && (
                                    <tr>
                                      <td
                                        colSpan="6"
                                        className="py-6 text-sm text-center text-slate-500"
                                      >
                                        No courses yet.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* =========================
                              CREATE COURSE MODAL
                              ========================= */}
                          {showCreateCourse && (
                            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
                              <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-6 relative">
                                {/* Close button */}
                                <button
                                  type="button"
                                  onClick={() => setShowCreateCourse(false)}
                                  className="absolute text-slate-400 hover:text-slate-600 top-3 right-3"
                                >
                                  ✕
                                </button>

                                <div className="pr-6 mb-4">
                                  <h2 className="text-lg font-semibold text-slate-900">
                                    Create Course
                                  </h2>
                                  <p className="text-xs text-slate-500">
                                    Fill in the fields and click &quot;Create course&quot; to add it.
                                  </p>
                                </div>

                                <form onSubmit={createCourse} className="pr-2 space-y-3">
                                  {/* Title */}
                                  <div>
                                    <label className="block mb-1 text-xs font-medium text-slate-700">
                                      Title
                                    </label>
                                    <input
                                      className="w-full px-3 py-2 text-sm border rounded-md border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                                      placeholder="e.g. Organic Chemistry I"
                                      value={form.title}
                                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                                      required
                                    />
                                  </div>

                                  {/* Category */}
                                  <div>
                                    <label className="block mb-1 text-xs font-medium text-slate-700">
                                      Category
                                    </label>
                                    <select
                                      className="w-full px-3 py-2 text-sm border rounded-md border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                                      value={form.categoryId}
                                      onChange={(e) =>
                                        setForm({ ...form, categoryId: e.target.value })
                                      }
                                    >
                                      <option value="">Select category</option>
                                      {categories.map((c) => (
                                        <option key={c._id} value={c._id}>
                                          {c.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Instructor */}
                                  <div>
                                    <label className="block mb-1 text-xs font-medium text-slate-700">
                                      Instructor
                                    </label>
                                    <select
                                      className="w-full px-3 py-2 text-sm border rounded-md border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                                      value={form.instructorId}
                                      onChange={(e) =>
                                        setForm({ ...form, instructorId: e.target.value })
                                      }
                                    >
                                      <option value="">No instructor</option>
                                      {tutors.map((t) => (
                                        <option key={t._id} value={t._id}>
                                          {t.user?.name || t.name || "Tutor"}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Description */}
                                  <div>
                                    <label className="block mb-1 text-xs font-medium text-slate-700">
                                      Description
                                    </label>
                                    <textarea
                                      className="w-full px-3 py-2 text-sm border rounded-md border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                                      placeholder="Short summary of the course"
                                      rows={3}
                                      value={form.description}
                                      onChange={(e) =>
                                        setForm({ ...form, description: e.target.value })
                                      }
                                    />
                                  </div>

                                  {/* Price + Level */}
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="block mb-1 text-xs font-medium text-slate-700">
                                        Price (USD)
                                      </label>
                                      <input
                                        className="w-full px-3 py-2 text-sm border rounded-md border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                                        type="number"
                                        min={0}
                                        placeholder="0"
                                        value={form.price}
                                        onChange={(e) =>
                                          setForm({ ...form, price: e.target.value })
                                        }
                                      />
                                    </div>

                                    <div>
                                      <label className="block mb-1 text-xs font-medium text-slate-700">
                                        Level
                                      </label>
                                      <select
                                        className="w-full px-3 py-2 text-sm border rounded-md border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                                        value={form.level}
                                        onChange={(e) =>
                                          setForm({ ...form, level: e.target.value })
                                        }
                                      >
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="advanced">Advanced</option>
                                      </select>
                                    </div>
                                  </div>

                                  {/* Max students */}
                                  <div>
                                    <label className="block mb-1 text-xs font-medium text-slate-700">
                                      Max students
                                    </label>
                                    <input
                                      className="w-full px-3 py-2 text-sm border rounded-md border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                                      type="number"
                                      min={0}
                                      placeholder="e.g. 30"
                                      value={form.maxStudents}
                                      onChange={(e) =>
                                        setForm({ ...form, maxStudents: e.target.value })
                                      }
                                    />
                                  </div>

                                  {/* Prerequisites */}
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-medium text-slate-700">
                                        Prerequisites
                                      </span>
                                      <span className="text-[10px] text-slate-400">
                                        Optional – select existing courses
                                      </span>
                                    </div>
                                    <div className="p-2 overflow-auto border rounded-md max-h-32 border-slate-200">
                                      {courses.length === 0 && (
                                        <div className="text-xs text-slate-500">No courses yet.</div>
                                      )}
                                      {courses.map((c) => (
                                        <label
                                          key={c._id}
                                          className="flex items-center mb-1 text-xs last:mb-0"
                                        >
                                          <input
                                            type="checkbox"
                                            className="mr-2 rounded"
                                            checked={form.prerequisites.includes(c._id)}
                                            onChange={() => togglePrereq(c._id)}
                                          />
                                          <span className="truncate">{c.title}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Publish */}
                                  <label className="inline-flex items-center gap-2 mt-1 text-xs text-slate-700">
                                    <input
                                      type="checkbox"
                                      className="rounded"
                                      checked={!!form.instructorId && form.isPublished}
                                      disabled={!form.instructorId}
                                      onChange={(e) =>
                                        setForm({ ...form, isPublished: e.target.checked })
                                      }
                                      title={
                                        !form.instructorId
                                          ? "Assign an instructor to enable publishing"
                                          : ""
                                      }
                                    />
                                    <span>
                                      Publish immediately
                                      {!form.instructorId && (
                                        <span className="ml-1 text-[10px] text-slate-400">
                                          (requires instructor)
                                        </span>
                                      )}
                                    </span>
                                  </label>

                                  <div className="flex justify-end gap-2 pt-3">
                                    <button
                                      type="button"
                                      onClick={() => setShowCreateCourse(false)}
                                      className="px-4 py-2 text-xs font-medium rounded-md text-slate-600 bg-slate-100 hover:bg-slate-200"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="submit"
                                      className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                                    >
                                      Create course
                                    </button>
                                  </div>
                                </form>
                              </div>
                            </div>
                          )}

                          {/* =========================
                              COURSE DETAILS MODAL
                              ========================= */}
                          {detailsId && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                              <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-6 relative">
                                {/* Close + Edit/Save buttons */}
                                <div className="absolute flex flex-col gap-2 top-3 right-3">
                                  <button
                                    onClick={() => {
                                      setDetailsId(null);
                                      setDetails(null);
                                      setEditMode(false);
                                    }}
                                    className="px-3 py-1 text-[12px] font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md shadow-sm"
                                  >
                                    Close
                                  </button>

                                  {!editMode ? (
                                    <button
                                      onClick={() => setEditMode(true)}
                                      className="px-3 py-1 text-[12px] font-semibold text-white bg-green-500 hover:bg-green-600 rounded-md shadow-sm"
                                    >
                                      Edit
                                    </button>
                                  ) : (
                                    <button
                                      onClick={saveEdits}
                                      className="px-3 py-1 text-[12px] font-semibold text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm"
                                    >
                                      Save
                                    </button>
                                  )}
                                </div>

                                <h3 className="pr-24 mb-4 text-lg font-semibold text-slate-900">
                                  Course Details
                                </h3>

                                      {detailsLoading ? (
                                          <p className="text-sm text-slate-500">Loading…</p>
                                        ) : !details ? (
                                          <p className="text-sm text-slate-500">No details.</p>
                                        ) : editMode ? (
                                          // 🔧 EDIT MODE – form
                                          <div className="grid gap-3 mt-1 text-sm md:grid-cols-2">
                                            {/* Title */}
                                            <div className="md:col-span-2">
                                              <label className="block mb-1 text-xs font-medium text-slate-700">
                                                Title
                                              </label>
                                              <input
                                                className="w-full px-3 py-2 text-sm border rounded-md border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                                                value={editForm.title}
                                                onChange={(e) =>
                                                  setEditForm({
                                                    ...editForm,
                                                    title: e.target.value,
                                                  })
                                                }
                                              />
                                            </div>

                                            {/* Description */}
                                            <div className="md:col-span-2">
                                              <label className="block mb-1 text-xs font-medium text-slate-700">
                                                Description
                                              </label>
                                              <textarea
                                                className="w-full px-3 py-2 text-sm border rounded-md border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                                                rows={3}
                                                value={editForm.description}
                                                onChange={(e) =>
                                                  setEditForm({
                                                    ...editForm,
                                                    description: e.target.value,
                                                  })
                                                }
                                              />
                                            </div>

                                            {/* Level */}
                                            <div>
                                              <label className="block mb-1 text-xs font-medium text-slate-700">
                                                Level
                                              </label>
                                              <select
                                                className="w-full px-3 py-2 text-sm border rounded-md border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                                                value={editForm.level}
                                                onChange={(e) =>
                                                  setEditForm({
                                                    ...editForm,
                                                    level: e.target.value,
                                                  })
                                                }
                                              >
                                                <option value="beginner">Beginner</option>
                                                <option value="intermediate">Intermediate</option>
                                                <option value="advanced">Advanced</option>
                                              </select>
                                            </div>

                                            {/* Price */}
                                            <div>
                                              <label className="block mb-1 text-xs font-medium text-slate-700">
                                                Price (USD)
                                              </label>
                                              <input
                                                type="number"
                                                className="w-full px-3 py-2 text-sm border rounded-md border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                                                value={editForm.price}
                                                onChange={(e) =>
                                                  setEditForm({
                                                    ...editForm,
                                                    price: e.target.value,
                                                  })
                                                }
                                              />
                                            </div>

                                            {/* Max students */}
                                            <div>
                                              <label className="block mb-1 text-xs font-medium text-slate-700">
                                                Max students
                                              </label>
                                              <input
                                                type="number"
                                                className="w-full px-3 py-2 text-sm border rounded-md border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                                                value={editForm.maxStudents}
                                                onChange={(e) =>
                                                  setEditForm({
                                                    ...editForm,
                                                    maxStudents: e.target.value,
                                                  })
                                                }
                                              />
                                            </div>

                                            {/* Category */}
                                            <div>
                                              <label className="block mb-1 text-xs font-medium text-slate-700">
                                                Category
                                              </label>
                                              <select
                                                className="w-full px-3 py-2 text-sm border rounded-md border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                                                value={editForm.categoryId}
                                                onChange={(e) =>
                                                  setEditForm({
                                                    ...editForm,
                                                    categoryId: e.target.value,
                                                  })
                                                }
                                              >
                                                <option value="">No category</option>
                                                {categories.map((c) => (
                                                  <option key={c._id} value={c._id}>
                                                    {c.name}
                                                  </option>
                                                ))}
                                              </select>
                                            </div>

                                            {/* Instructor */}
                                            <div>
                                              <label className="block mb-1 text-xs font-medium text-slate-700">
                                                Instructor
                                              </label>
                                              <select
                                                className="w-full px-3 py-2 text-sm border rounded-md border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                                                value={editForm.instructorId}
                                                onChange={(e) =>
                                                  setEditForm((prev) => ({
                                                    ...prev,
                                                    instructorId: e.target.value,
                                                    // auto-publish if previously no instructor and we assign one
                                                    isPublished:
                                                      !details.instructor && e.target.value
                                                        ? true
                                                        : prev.isPublished,
                                                  }))
                                                }
                                              >
                                                <option value="">No instructor (draft)</option>
                                                {tutors.map((t) => (
                                                  <option key={t._id} value={t._id}>
                                                    {t.user?.name || t.name || "Tutor"}
                                                  </option>
                                                ))}
                                              </select>
                                            </div>

                                            {/* Published checkbox */}
                                            <div className="mt-1 md:col-span-2">
                                              <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                                                <input
                                                  type="checkbox"
                                                  className="rounded"
                                                  checked={editForm.isPublished}
                                                  onChange={(e) =>
                                                    setEditForm({
                                                      ...editForm,
                                                      isPublished: e.target.checked,
                                                    })
                                                  }
                                                />
                                                <span>Published</span>
                                              </label>
                                            </div>
                                          </div>
                                        ) : (
                                          // 👀 VIEW MODE – pretty details layout
                                          <dl className="grid grid-cols-1 gap-3 mt-1 text-sm md:grid-cols-2">
                                            <div>
                                              <dt className="font-semibold text-slate-700">Title</dt>
                                              <dd className="text-slate-800">{details.title}</dd>
                                            </div>
                                            <div>
                                              <dt className="font-semibold text-slate-700">Description</dt>
                                              <dd className="text-slate-800">
                                                {details.description || "—"}
                                              </dd>
                                            </div>
                                            <div>
                                              <dt className="font-semibold text-slate-700">Level</dt>
                                              <dd className="text-slate-800">{details.level}</dd>
                                            </div>
                                            <div>
                                              <dt className="font-semibold text-slate-700">Price</dt>
                                              <dd className="text-slate-800">${details.price}</dd>
                                            </div>
                                            <div>
                                              <dt className="font-semibold text-slate-700">Max Students</dt>
                                              <dd className="text-slate-800">
                                                {details.maxStudents ?? "—"}
                                              </dd>
                                            </div>
                                            <div>
                                              <dt className="font-semibold text-slate-700">Category</dt>
                                              <dd className="text-slate-800">
                                                {details.category?.name || "—"}
                                              </dd>
                                            </div>
                                            <div>
                                              <dt className="font-semibold text-slate-700">Instructor</dt>
                                              <dd className="text-slate-800">
                                                {details.instructor?.name || "—"}
                                              </dd>
                                            </div>
                                            <div>
                                              <dt className="font-semibold text-slate-700">Published</dt>
                                              <dd className="text-slate-800">
                                                {details.isPublished ? "Yes" : "No"}
                                              </dd>
                                            </div>
                                            <div className="md:col-span-2">
                                              <dt className="font-semibold text-slate-700">
                                                Prerequisites
                                              </dt>
                                              <dd className="text-slate-800">
                                                {(details.prerequisites || [])
                                                  .map((p) => p.title)
                                                  .join(", ") || "—"}
                                              </dd>
                                            </div>
                                          </dl>
                                        )}

                              </div>
                            </div>
                          )}
                        </div>
                      )}


                  {/* CATEGORIES */}
                    {tab === "categories" && (
                      <div className="relative">
                        {/* Header row */}
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h2 className="text-2xl font-semibold text-slate-900">Categories</h2>
                            <p className="text-sm text-slate-500">
                              Organize your courses into clear, searchable groups.
                            </p>
                          </div>

                          <button
                            onClick={() => setShowCreateCategory(true)}
                            className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            <span className="mr-2 text-lg leading-none">+</span>
                            New Category
                          </button>
                        </div>

                        {/* Categories list card */}
                        <div className="bg-white border shadow-sm rounded-2xl border-slate-200">
                          <header className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <h3 className="text-sm font-medium text-slate-800">All Categories</h3>
                            <span className="px-3 py-1 text-xs font-medium text-indigo-700 rounded-full bg-indigo-50">
                              {categories.length} {categories.length === 1 ? "category" : "categories"}
                            </span>
                          </header>

                          <div className="p-5">
                            <div className="overflow-x-auto max-h-[calc(100vh-260px)]">
                              <table className="w-full text-sm table-auto">
                                <thead className="text-xs font-semibold tracking-wide uppercase text-slate-500 bg-slate-50">
                                  <tr>
                                    <th className="px-4 py-3 text-left">Name</th>
                                    <th className="px-4 py-3 text-left">Description</th>
                                    <th className="px-4 py-3 text-right"></th>
                                  </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100 text-slate-800">
                                  {categories.length === 0 ? (
                                    <tr>
                                      <td
                                        colSpan="3"
                                        className="py-6 text-center text-slate-500"
                                      >
                                        No categories yet.
                                      </td>
                                    </tr>
                                  ) : (
                                    categories.map((c) => {
                                      const editing = catEditId === c._id;

                                      return (
                                        <tr
                                          key={c._id}
                                          className="transition-colors hover:bg-slate-50"
                                        >
                                          {/* Name */}
                                          <td className="px-4 py-3 w-[220px] align-top">
                                            {editing ? (
                                              <input
                                                className="w-full px-2 py-1 border rounded border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                                                value={catEditForm.name}
                                                onChange={(e) =>
                                                  setCatEditForm((prev) => ({
                                                    ...prev,
                                                    name: e.target.value,
                                                  }))
                                                }
                                              />
                                            ) : (
                                              <span className="font-semibold text-slate-900">
                                                {c.name}
                                              </span>
                                            )}
                                          </td>

                                          {/* Description */}
                                          <td className="px-4 py-3 align-top">
                                            {editing ? (
                                              <textarea
                                                className="w-full px-2 py-1 border rounded border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                                                rows={2}
                                                value={catEditForm.description}
                                                onChange={(e) =>
                                                  setCatEditForm((prev) => ({
                                                    ...prev,
                                                    description: e.target.value,
                                                  }))
                                                }
                                              />
                                            ) : (
                                              <p className="text-sm leading-relaxed whitespace-normal text-slate-700">
                                                {c.description || "—"}
                                              </p>
                                            )}
                                          </td>

                                          {/* Actions */}
                                          <td className="px-4 py-3 align-top w-[110px]">
                                            {editing ? (
                                              <div className="flex flex-col items-end gap-1">
                                                <button
                                                  disabled={catBusy}
                                                  onClick={() => saveCategoryEdit(c._id)}
                                                  className="w-[80px] h-[28px] text-xs font-semibold text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-60"
                                                >
                                                  Save
                                                </button>
                                                <button
                                                  onClick={cancelCatEdit}
                                                  className="w-[80px] h-[28px] text-xs font-semibold border rounded hover:bg-slate-100"
                                                >
                                                  Cancel
                                                </button>
                                              </div>
                                            ) : (
                                              <div className="flex flex-col items-end gap-1">
                                                <button
                                                  onClick={() => startCatEdit(c)}
                                                  className="w-[80px] h-[28px] text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded"
                                                >
                                                  Edit
                                                </button>
                                                <button
                                                  onClick={() => deleteCategory(c._id)}
                                                  className="w-[80px] h-[28px] text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded"
                                                >
                                                  Delete
                                                </button>
                                              </div>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>

                        {/* =========================
                            CREATE CATEGORY MODAL
                            ========================= */}
                        {showCreateCategory && (
                          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
                            <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-6 relative">
                              {/* Close button */}
                              <button
                                type="button"
                                onClick={() => setShowCreateCategory(false)}
                                className="absolute text-slate-400 hover:text-slate-600 top-3 right-3"
                              >
                                ✕
                              </button>

                              <div className="pr-6 mb-4">
                                <h2 className="text-lg font-semibold text-slate-900">
                                  Create Category
                                </h2>
                                <p className="text-xs text-slate-500">
                                  Add a new category to group related courses together.
                                </p>
                              </div>

                              <div className="pr-2">
                                <form
                                  onSubmit={createCategory}
                                  className="flex flex-col gap-4"
                                >
                                  <div>
                                    <label className="block mb-1 text-xs font-medium text-slate-700">
                                      Name
                                    </label>
                                    <input
                                      className="w-full px-3 py-2 text-sm border rounded-md border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                                      placeholder="Category name"
                                      value={catForm.name}
                                      onChange={(e) =>
                                        setCatForm((prev) => ({
                                          ...prev,
                                          name: e.target.value,
                                        }))
                                      }
                                      required
                                    />
                                  </div>

                                  <div>
                                    <label className="block mb-1 text-xs font-medium text-slate-700">
                                      Description
                                    </label>
                                    <input
                                      className="w-full px-3 py-2 text-sm border rounded-md border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                                      placeholder="Short description (optional)"
                                      value={catForm.description}
                                      onChange={(e) =>
                                        setCatForm((prev) => ({
                                          ...prev,
                                          description: e.target.value,
                                        }))
                                      }
                                    />
                                  </div>

                                  <div className="flex justify-end gap-2 pt-2">
                                    <button
                                      type="button"
                                      onClick={() => setShowCreateCategory(false)}
                                      className="px-4 py-2 text-xs font-medium rounded-md text-slate-600 bg-slate-100 hover:bg-slate-200"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="submit"
                                      disabled={catBusy}
                                      className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-60"
                                    >
                                      {catBusy ? "Saving…" : "Add category"}
                                    </button>
                                  </div>
                                </form>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}


                  {/* USERS */}
{tab === "users" && (
  <div className="space-y-4">
    {/* Header row */}
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Users</h2>
        <p className="text-sm text-slate-500">
          Overview of all students and tutors on the platform.
        </p>
      </div>

      {/* Small stats pills */}
      <div className="flex items-center gap-2">
        <span className="px-3 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
          Students: <span className="font-semibold">{students.length}</span>
        </span>
        <span className="px-3 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
          Tutors: <span className="font-semibold">{tutorsUsers.length}</span>
        </span>
      </div>
    </div>

    {/* Sub-tabs: Students / Tutors */}
    <div className="inline-flex p-1 text-xs rounded-full bg-slate-100">
      <button
        type="button"
        onClick={() => setUsersView("students")}
        className={`px-4 py-1.5 rounded-full font-semibold transition ${
          usersView === "students"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500 hover:text-slate-900"
        }`}
      >
        Students
      </button>
      <button
        type="button"
        onClick={() => setUsersView("tutors")}
        className={`px-4 py-1.5 rounded-full font-semibold transition ${
          usersView === "tutors"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500 hover:text-slate-900"
        }`}
      >
        Tutors
      </button>
    </div>

    {/* Card with table */}
    <div className="bg-white border shadow-sm rounded-2xl border-slate-200">
      <header className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-medium text-slate-800">
          {usersView === "students" ? "Students" : "Tutors"} list
        </h3>
        <span className="text-xs text-slate-400">
          {usersView === "students"
            ? `${students.length} student${students.length === 1 ? "" : "s"}`
            : `${tutorsUsers.length} tutor${
                tutorsUsers.length === 1 ? "" : "s"
              }`}
        </span>
      </header>

      <div className="p-3">
        <div className="overflow-x-auto max-h-[calc(100vh-260px)]">
          {/* ========== STUDENTS TABLE ========== */}
          {usersView === "students" && (
            <table className="w-full text-sm table-auto">
              <thead className="text-xs font-semibold tracking-wide uppercase text-slate-500 bg-slate-50">
                <tr>
                  <th className="px-3 py-3 text-left">Name</th>
                  <th className="px-3 py-3 text-left">Email</th>
                  <th className="px-3 py-3 text-left">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-800 divide-slate-100">
                {students.length === 0 ? (
                  <tr>
                    <td
                      colSpan="3"
                      className="px-3 py-6 text-sm text-center text-slate-500"
                    >
                      No students yet.
                    </td>
                  </tr>
                ) : (
                  students.map((s) => (
                    <tr
                      key={s._id}
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td className="px-3 py-3">{s.name}</td>
                      <td className="px-3 py-3">{s.email}</td>
                      <td className="px-3 py-3">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* ========== TUTORS TABLE ========== */}
          {usersView === "tutors" && (
            <table className="w-full text-sm table-auto">
              <thead className="text-xs font-semibold tracking-wide uppercase text-slate-500 bg-slate-50">
                <tr>
                  <th className="px-3 py-3 text-left">Name</th>
                  <th className="px-3 py-3 text-left">Email</th>
                  <th className="px-3 py-3 text-left">Courses</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-800 divide-slate-100">
                {tutorsUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan="3"
                      className="px-3 py-6 text-sm text-center text-slate-500"
                    >
                      No tutors yet.
                    </td>
                  </tr>
                ) : (
                  tutorsUsers.map((t) => (
                    <tr
                      key={t._id}
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td className="px-3 py-3">{t.name}</td>
                      <td className="px-3 py-3">{t.email}</td>
                      <td className="px-3 py-3">
                        {(t.courses || []).join(", ") || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  </div>
)}


                  {/* BOOKINGS */}
                  {tab === "bookings" && (
                    <div className="bg-white border rounded-sm shadow-lg border-slate-200">
                      <header className="px-5 py-4 border-b border-slate-100">
                        <h2 className="font-semibold text-slate-800">
                          Bookings
                        </h2>
                      </header>

                      <div className="p-3">
                        <div className="overflow-x-auto max-h-[450px]">
                          <table className="w-full text-sm table-auto">
                            <thead className="text-xs font-semibold tracking-wide uppercase text-slate-500 bg-slate-50">
                              <tr>
                                <th className="px-2 py-3 text-left">Student</th>
                                <th className="px-2 py-3 text-left">Tutor</th>
                                <th className="px-2 py-3 text-left">Course</th>
                                <th className="px-2 py-3 text-left">When</th>
                                <th className="px-2 py-3 text-left">Status</th>
                                <th className="px-2 py-3 text-left"></th>
                              </tr>
                            </thead>

                            <tbody className="divide-y text-slate-800 divide-slate-100">
                              {bookings.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan="6"
                                    className="px-2 py-6 text-center text-slate-500"
                                  >
                                    No bookings yet.
                                  </td>
                                </tr>
                              ) : (
                                bookings.map((b) => {
                                  const statusLabel =
                                    b.status === "requested"
                                      ? "Requested"
                                      : b.status === "awaiting_payment"
                                      ? "Waiting for Payment"
                                      : b.status === "confirmed"
                                      ? "Confirmed (Paid)"
                                      : b.status === "declined"
                                      ? "Declined"
                                      : b.status === "canceled"
                                      ? "Canceled"
                                      : b.status;

                                  const statusColor =
                                    b.status === "confirmed"
                                      ? "bg-green-100 text-green-700 border-green-300"
                                      : b.status === "requested" ||
                                        b.status === "awaiting_payment"
                                      ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                                      : "bg-red-100 text-red-700 border-red-300";

                                  const canAct = b.status === "requested";

                                  return (
                                    <tr
                                      key={b._id}
                                      className="transition hover:bg-slate-50"
                                    >
                                      <td className="px-2 py-3">
                                        {b.studentId?.name || "—"}
                                      </td>
                                      <td className="px-2 py-3">
                                        {b.tutorId?.userId?.name ||
                                          b.tutorId?.name ||
                                          "—"}
                                      </td>
                                      <td className="px-2 py-3">
                                        {b.courseId?.title || "—"}
                                      </td>
                                      <td className="px-2 py-3">
                                        {b.start
                                          ? new Date(
                                              b.start
                                            ).toLocaleString()
                                          : "—"}
                                      </td>

                                      <td className="px-2 py-3">
                                        <span
                                          className={`px-2 py-1 text-xs font-semibold rounded-full border ${statusColor}`}
                                        >
                                          {statusLabel}
                                        </span>
                                      </td>

                                      <td className="px-2 py-3 space-x-2">
                                        {canAct && (
                                          <>
                                            <button
                                              onClick={async () => {
                                                try {
                                                  await withAuthFetch(
                                                    `/api/bookings/${b._id}/status`,
                                                    {
                                                      method: "PATCH",
                                                      body: JSON.stringify({
                                                        status:
                                                          "awaiting_payment",
                                                      }),
                                                    }
                                                  );
                                                  await loadBookings();
                                                  Swal.fire({
                                                    title: "Booking Accepted",
                                                    text: "Booking accepted — waiting for student payment.",
                                                    icon: "success",
                                                    confirmButtonText: "OK",
                                                    confirmButtonColor: "#3085d6",
                                                  });
                                                } catch (e) {
                                                  Swal.fire({
                                                    title: "Error",
                                                    text: e.message || "Failed to accept booking",
                                                    icon: "error",
                                                    confirmButtonText: "OK",
                                                    confirmButtonColor: "#d33",
                                                  });
                                                }
                                              }}
                                              className="px-3 py-1 text-xs font-semibold text-white bg-green-600 rounded hover:bg-green-700"
                                            >
                                              Accept
                                            </button>

                                            <button
                                              onClick={async () => {
                                                try {
                                                  await withAuthFetch(
                                                    `/api/bookings/${b._id}/status`,
                                                    {
                                                      method: "PATCH",
                                                      body: JSON.stringify({
                                                        status: "declined",
                                                      }),
                                                    }
                                                  );
                                                  await loadBookings();
                                                  Swal.fire({
                                                    title: "Booking Declined",
                                                    text: "The booking has been declined.",
                                                    icon: "success",
                                                    confirmButtonText: "OK",
                                                    confirmButtonColor: "#3085d6",
                                                  });
                                                } catch (e) {
                                                  Swal.fire({
                                                    title: "Error",
                                                    text: e.message || "Failed to decline booking",
                                                    icon: "error",
                                                    confirmButtonText: "OK",
                                                    confirmButtonColor: "#d33",
                                                  });
                                                }
                                              }}
                                              className="px-3 py-1 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700"
                                            >
                                              Reject
                                            </button>
                                          </>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* FOOTER */}
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
