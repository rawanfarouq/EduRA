// src/pages/BrowseCourses.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { getJSON } from "../lib/api";
import Swal from "sweetalert2";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function BrowseCourses() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);

  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [bookedCourseIds, setBookedCourseIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // 🔍 search + filter state
  const [searchText, setSearchText] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setErr("");
      try {
        // always load courses (public)
        const coursesRes = await getJSON("/api/courses?detailed=1&all=1");
        setCourses(coursesRes.courses || []);

        // only load bookings if user is logged in
        if (user) {
          const bookingsRes = await getJSON("/api/bookings/mine");

          const bookedIdsArr = (bookingsRes.bookings || [])
            .filter(
              (b) => b.status !== "declined" && b.status !== "canceled"
            )
            .map((b) => {
              if (!b.courseId) return null;
              return typeof b.courseId === "string"
                ? b.courseId
                : b.courseId._id;
            })
            .filter(Boolean);

          setBookedCourseIds(new Set(bookedIdsArr));
        } else {
          setBookedCourseIds(new Set());
        }
      } catch (e) {
        setErr(e.message || "Failed to load courses");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  async function handleBookCourse(course) {
    if (!course._id) return;

    // extra safety: if somehow button visible without user
    if (!user) {
      navigate("/login");
      return;
    }

    if (!course.instructorId) {
Swal.fire({
  title: "No Instructor Assigned",
  text: "This course has no instructor assigned yet.",
  icon: "warning",
  confirmButtonText: "OK",
  confirmButtonColor: "#f6c23e",
});      return;
    }

    const ok = window.confirm(
      `Send a booking request for "${course.title}"?`
    );
    if (!ok) return;

    try {
      const res = await fetch(`${API}/api/bookings`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          courseId: course._id,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to create booking");
      }

Swal.fire({
  title: "Request Sent",
  text: "Your booking request has been sent to the admin.",
  icon: "success",
  confirmButtonText: "OK",
  confirmButtonColor: "#3085d6",
});
      // optimistically mark as booked in UI
      setBookedCourseIds((prev) => {
        const next = new Set(prev);
        next.add(course._id);
        return next;
      });
    } catch (e) {
Swal.fire({
    title: "Error",
    text: e.message || "Failed to create booking",
    icon: "error",
    confirmButtonText: "OK",
    confirmButtonColor: "#d33",
  });    }
  }

  // 🧾 collect unique categories for the dropdown
  const categoryOptions = useMemo(() => {
    const map = new Map();
    for (const c of courses) {
      const cat = c.categoryId;
      if (cat && cat._id && !map.has(cat._id)) {
        map.set(cat._id, cat.name || "Unnamed category");
      }
    }
    return Array.from(map.entries()); // [ [id, name], ... ]
  }, [courses]);

  // 🔍 filter + sort courses (tutors first) + counts
  const visibleCourses = useMemo(() => {
    const text = searchText.trim().toLowerCase();

    const filtered = courses.filter((c) => {
      if (selectedCategoryId) {
        const catId = c.categoryId?._id;
        if (!catId || String(catId) !== String(selectedCategoryId)) {
          return false;
        }
      }

      if (text) {
        const title = (c.title || "").toLowerCase();
        if (!title.includes(text)) return false;
      }

      return true;
    });

    const withTutor = [];
    const withoutTutor = [];

    for (const c of filtered) {
      if (c.instructorId) withTutor.push(c);
      else withoutTutor.push(c);
    }

    withTutor.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    withoutTutor.sort((a, b) => (a.title || "").localeCompare(b.title || ""));

    const all = [...withTutor, ...withoutTutor];
    // attach counts to the array (simple way to reuse existing code)
    all.withTutorCount = withTutor.length;
    all.withoutTutorCount = withoutTutor.length;

    return all;
  }, [courses, searchText, selectedCategoryId]);

  const withTutorCount = visibleCourses.withTutorCount || 0;
  const withoutTutorCount = visibleCourses.withoutTutorCount || 0;

  // 🔴 Logout click handler
  function handleLogout() {
    logout();
    navigate("/"); // back to home
  }

  return (
    <>
      {/* HEADER */}
      <header>
        <div className="header-area ">
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
                        {!user ? (
                          <>
                            <Link to="/login">
                              <i className="ti-user" /> Login
                            </Link>
                            <Link to="/register" className="ml-3">
                              Register
                            </Link>
                          </>
                        ) : (
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

          <div id="sticky-header" className="main-header-area">
            <div className="container-fluid">
              <div className="row">
                <div className="col-lg-12">
                  <div className="header_wrap d-flex justify-content-between align-items-center">
                    <div className="header_left">
                      <div className="logo">
                        <Link to="/">
                          <img src="/img/logo.png" alt="EduProject" style={{ width: "90px", height: "auto" }} />
                        </Link>
                      </div>
                    </div>
                    <div className="header_right d-flex align-items-center">
                      <div className="main-menu d-none d-lg-block">
                        <nav>
                          <ul id="navigation">
                            <li>
                              <Link to="/">Home</Link>
                            </li>
                            <li>
                              <Link to="/student/courses">Courses</Link>
                            </li>
                            <li>
                              <a href="#contact">Contact</a>
                            </li>
                          </ul>
                        </nav>
                      </div>

                      {!user && (
                        <div className="Appointment">
                          <div className="book_btn d-none d-lg-block">
                            <a data-scroll-nav="1" href="#apply">
                              Apply Now
                            </a>
                          </div>
                        </div>
                      )}
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

      {/* bradcam_area_start */}
      <div className="bradcam_area breadcam_bg">
        <div className="container">
          <div className="row">
            <div className="col-xl-12">
              <div className="bradcam_text">
                <h3>Our Courses</h3>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* bradcam_area_end */}

      {/* Back to dashboard row */}
      {user && (
        <div className="py-3 bg-white">
          <div className="container d-flex justify-content-end">
            <button
              onClick={() => navigate("/student/dashboard")}
              className="btn btn-primary"
            >
              ⬅ Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* MAIN COURSES AREA */}
      <div className="pt-0 popular_program_area section__padding program__page">
        <div className="container">
          {/* Title */}
          <div className="row">
            <div className="col-lg-12">
              <div className="text-center section_title">
                <h3>Popular Program</h3>
                <p>Browse all available courses below.</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-3 row">
            <div className="col-md-6">
              <label className="mb-1 text-muted small">
                Search by course name
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Organic, Biology…"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <div className="mt-3 col-md-4 mt-md-0">
              <label className="mb-1 text-muted small">
                Filter by category
              </label>
              <select
                className="form-control"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
              >
                <option value="">All categories</option>
                {categoryOptions.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 col-md-2 mt-md-0 d-flex align-items-end justify-content-md-end">
              {loading && (
                <span className="text-muted small">Loading courses…</span>
              )}
            </div>
          </div>

          {/* Small stats row to organize info */}
          {!loading && !err && (
            <div className="mb-4 row">
              <div className="col-12">
                <div className="flex-wrap p-2 border rounded bg-light d-flex justify-content-between small">
                  <span>
                    <strong>Total:</strong> {visibleCourses.length} courses
                  </span>
                  <span>
                    <strong>With tutor:</strong> {withTutorCount}
                  </span>
                  <span>
                    <strong>Without tutor:</strong> {withoutTutorCount}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {err && (
            <div className="mb-3 row">
              <div className="col-12">
                <div className="alert alert-danger" role="alert">
                  {err}
                </div>
              </div>
            </div>
          )}

          {/* Courses grid */}
          {!loading && !visibleCourses.length && !err ? (
            <div className="row">
              <div className="col-12">
                <p className="text-muted">
                  No courses match your search/filter.
                </p>
              </div>
            </div>
          ) : (
            <div className="row">
              {visibleCourses.map((c, idx) => {
                const category = c.categoryId || {};
                const instructorName =
                  c.instructorId?.userId?.name || "To be announced";
                const alreadyBooked = bookedCourseIds.has(c._id);
                const hasTutor = !!c.instructorId;

                // reuse template images
                const imgIndex = (idx % 3) + 1;
                const imgSrc = `/img/program/${imgIndex}.png`;

                return (
                  <div className="col-lg-4 col-md-6" key={c._id}>
                    <div className="single__program">
                      <div className="program_thumb">
                        <img src={imgSrc} alt={c.title} />
                      </div>
                      <div className="program__content">
                        {/* Top line: category + "With tutor" badge */}
                        <div className="mb-1 d-flex justify-content-between align-items-center">
                          <span>{category.name || "General"}</span>
                          {hasTutor ? (
                            <span className="badge badge-success">
                              With tutor
                            </span>
                          ) : (
                            <span className="badge badge-secondary">
                              No tutor yet
                            </span>
                          )}
                        </div>

                        <h4>{c.title}</h4>

                        {c.description && (
                          <p>
                            {c.description.length > 140
                              ? c.description.slice(0, 137) + "..."
                              : c.description}
                          </p>
                        )}

                        <p className="mb-1">
                          <strong>Instructor:</strong> {instructorName}
                        </p>
                        <p className="mb-2">
                          <strong>Level:</strong>{" "}
                          <span className="text-capitalize">
                            {c.level || "beginner"}
                          </span>{" "}
                          |{" "}
                          <strong>Price:</strong>{" "}
                          {typeof c.price === "number" ||
                          (typeof c.price === "string" &&
                            !isNaN(Number(c.price)))
                            ? `$${Number(c.price)}`
                            : "Free"}
                        </p>

                        {/* Booking controls */}
                        {user ? (
                          hasTutor ? (
                            alreadyBooked ? (
                              <p className="mt-2 text-success small font-weight-bold">
                                ✅ Already booked
                              </p>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleBookCourse(c)}
                                className="boxed-btn5"
                              >
                                Book this course
                              </button>
                            )
                          ) : (
                            <p className="mt-2 text-muted small">
                              Booking not available yet (no instructor
                              assigned).
                            </p>
                          )
                        ) : (
                          <p className="mt-2 text-muted small">
                            Log in to book this course.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

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
