// src/pages/StudentBookings.jsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { getJSON, withAuthFetch } from "../lib/api";
import Swal from "sweetalert2";

export default function StudentBookings() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  function handleLogout() {
    logout();
    navigate("/");
  }

  // shared loader so we can reuse it after cancel
  async function reloadBookings() {
    setLoading(true);
    setErr("");
    try {
      const data = await getJSON("/api/bookings/mine");
      setBookings(data.bookings || []);
    } catch (e) {
      setErr(e.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    reloadBookings();
  }, [user, navigate]);

  async function handleCancel(bookingId) {
    if (!bookingId) return;
    const ok = window.confirm("Are you sure you want to cancel this booking?");
    if (!ok) return;

    try {
      setErr("");

      await withAuthFetch(`/api/bookings/${bookingId}/cancel`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });

Swal.fire({
    title: "Booking Canceled",
    text: "Your booking has been successfully canceled.",
    icon: "success",
    confirmButtonText: "OK",
    confirmButtonColor: "#3085d6",
  });
  await reloadBookings();
    } catch (e) {
      setErr(e.message || "Failed to cancel booking");
      Swal.fire({
    title: "Error",
    text: e.message || "Failed to cancel booking.",
    icon: "error",
    confirmButtonText: "OK",
    confirmButtonColor: "#d33",
  });
    }
  }

  return (
    <>
      {/* HEADER – same EduRA header, only Logout here */}
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
                            {/* Student view: keep minimal */}
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

      {/* HERO / BRADCAM AREA */}
      <div className="bradcam_area breadcam_bg bradcam_area--small">
        <div className="container">
          <div className="row">
            <div className="col-xl-12">
              <div className="bradcam_text">
                <h3>My Bookings</h3>
                <p>Track the status of your course bookings</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT – Wiser-style layout with fade-in */}
      <main className="py-4 bg-gray-50">
        <div className="container">
          <div
            className="wow fadeInUp"
            data-wow-duration="1s"
            data-wow-delay=".2s"
          >
            {/* Top bar */}
            <div className="mb-4 d-flex justify-content-between align-items-center">
              <div>
                <h4 className="mb-1">Booking Overview</h4>
                <p className="mb-0 text-muted">
                  See which courses are requested, awaiting payment or confirmed.
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

            {/* Content */}
            {loading ? (
              <p className="text-sm text-gray-500">Loading bookings…</p>
            ) : !bookings.length ? (
              <p className="text-sm text-gray-500">
                You have no bookings yet. Go to{" "}
                <button
                  type="button"
                  onClick={() => navigate("/student/courses")}
                  className="p-0 text-indigo-600 btn btn-link"
                >
                  Browse Courses
                </button>{" "}
                to request one.
              </p>
            ) : (
              <div className="row">
                {bookings.map((b) => {
                  const course = b.courseId || {};
                  const tutor = b.tutorId || {};
                  const start = b.start
                    ? new Date(b.start).toLocaleString()
                    : "—";

                  const statusLabel =
                    b.status === "requested"
                      ? "Requested (waiting for admin)"
                      : b.status === "awaiting_payment"
                      ? "Awaiting payment"
                      : b.status === "confirmed"
                      ? "Confirmed"
                      : b.status === "declined"
                      ? "Declined"
                      : b.status === "canceled"
                      ? "Canceled"
                      : b.status;

                  const canPay = b.status === "awaiting_payment";
                  const canCancel =
                    b.status === "requested" || b.status === "awaiting_payment";

                  // small status badge color
                  let statusClass = "badge-secondary";
                  if (b.status === "confirmed") statusClass = "badge-success";
                  else if (b.status === "awaiting_payment")
                    statusClass = "badge-warning";
                  else if (b.status === "requested")
                    statusClass = "badge-info";
                  else if (b.status === "declined")
                    statusClass = "badge-danger";
                  else if (b.status === "canceled")
                    statusClass = "badge-light";

                  return (
                    <div key={b._id} className="mb-3 col-lg-6">
                      <div className="p-3 bg-white border border-gray-100 shadow-sm rounded-xl h-100 d-flex flex-column justify-content-between">
                        {/* Course info */}
                        <div>
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <h5 className="mb-1 text-gray-900">
                                {course.title || "Untitled course"}
                              </h5>
                              <p className="mb-1 text-xs text-gray-500">
                                👨‍🏫 Tutor:{" "}
                                {tutor.userId?.name ||
                                  tutor.name ||
                                  "To be announced"}
                              </p>
                              <p className="mb-1 text-xs text-gray-500">
                                📅 When: {start}
                              </p>
                            </div>
                            <span
                              className={`badge ${statusClass} text-capitalize`}
                            >
                              {statusLabel}
                            </span>
                          </div>

                          {/* Optional: small course meta */}
                          {course.level && (
                            <p className="mt-2 mb-0 text-xs text-gray-500">
                              Level:{" "}
                              <span className="text-capitalize">
                                {course.level}
                              </span>
                              {course.categoryId?.name && (
                                <>
                                  {" "}
                                  · Category: {course.categoryId.name}
                                </>
                              )}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="gap-2 mt-3 d-flex justify-content-end">
                          {canPay && (
                            <button
                              onClick={() =>
                                navigate(`/student/pay/${b._id}`)
                              }
                              className="px-3 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700"
                            >
                              💳 Pay now
                            </button>
                          )}

                          {canCancel && (
                            <button
                              onClick={() => handleCancel(b._id)}
                              className="px-3 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50"
                            >
                              Cancel booking
                            </button>
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
