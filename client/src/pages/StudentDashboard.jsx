// src/pages/StudentDashboard.jsx
import { useAuthStore } from "../store/useAuthStore";
import { useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";

export default function StudentDashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <>
      {/* HEADER */}
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
                            {/* ⛔ No Home / Courses here on purpose */}
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
      <div className="bradcam_area breadcam_bg">
        <div className="container">
          <div className="row">
            <div className="col-xl-12">
              <div className="bradcam_text">
                <h3>Student Dashboard</h3>
                <p>Manage your enrolled courses, bookings, and learning path</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN DASHBOARD CONTENT – smaller space, nicer quick actions */}
      <main className="py-4 bg-gray-50">
        <div className="container">
          <div className="row justify-content-center">
            <div
              className="col-lg-8 col-md-10 wow fadeInUp"
              data-wow-duration="1s"
              data-wow-delay=".2s"
            >
              <div className="p-4 bg-white shadow rounded-2xl p-md-5">
                {/* Header text */}
                <div className="mb-4 text-center">
                  <h2 className="mb-2">
                    🎓 Welcome, {user?.name || "Student"}!
                  </h2>
                  <p className="mb-0 text-muted">
                    Signed in as <strong>{user?.email}</strong>
                  </p>
                </div>

               

                {/* Quick Actions – nicer tiles */}
                <div className="mb-4">
                  <h4 className="mb-3">Quick Actions</h4>
                  <div className="row">
                    <div className="mb-3 col-md-4">
                      <button
                        type="button"
                        onClick={() => navigate("/student/enrollments")}
                        className="p-3 text-left transition border rounded w-100 hover:shadow-sm"
                      >
                        <div className="mb-1 text-xl">📘</div>
                        <div className="text-sm font-semibold">
                          Enrolled Courses
                        </div>
                        <small className="text-muted">
                          View your current classes
                        </small>
                      </button>
                    </div>

                    <div className="mb-3 col-md-4">
                      <button
                        type="button"
                        onClick={() => navigate("/student/courses")}
                        className="p-3 text-left transition border rounded w-100 hover:shadow-sm"
                      >
                        <div className="mb-1 text-xl">🧭</div>
                        <div className="text-sm font-semibold">
                          Browse Courses
                        </div>
                        <small className="text-muted">
                          Discover new subjects
                        </small>
                      </button>
                    </div>

                    <div className="mb-3 col-md-4">
                      <button
                        type="button"
                        onClick={() => navigate("/student/bookings")}
                        className="p-3 text-left transition border rounded w-100 hover:shadow-sm"
                      >
                        <div className="mb-1 text-xl">📅</div>
                        <div className="text-sm font-semibold">
                          My Bookings
                        </div>
                        <small className="text-muted">
                          Track your requests
                        </small>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Logout area */}
                <div className="pt-3 mt-3 text-center border-top">
                  <p className="mb-2 text-muted">Need a break?</p>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700"
                  >
                    🚪 Logout
                  </button>
                </div>
              </div>
            </div>
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
