// src/pages/Login.jsx
import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const login = useAuthStore((s) => s.login);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");

    try {
      await login(email, password);
    } catch (e) {
      setErr(e.message || "Login failed");
    }
  }

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
                        {/* 🔻 CHANGED: remove Login/Register, show Logout ONLY if logged in */}
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

      {/* HERO / BRADCAM AREA – smaller height */}
      <div
        className="bradcam_area breadcam_bg"
        style={{ paddingTop: "70px", paddingBottom: "70px" }} // 🔻 smaller white space
      >
        <div className="container">
          <div className="row">
            <div className="col-xl-12">
              <div className="bradcam_text">
                <h3>Login</h3>
                <p>Access your EduRA student or tutor account</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LOGIN SECTION – reduced padding */}
      <div
        className="section__padding"
        style={{ paddingTop: "50px", paddingBottom: "60px" }} // 🔻 smaller white space
      >
        <div className="container">
          <div className="row justify-content-center">
            <div
              className="col-lg-5 col-md-8 wow fadeInUp"
              data-wow-duration="1s"
              data-wow-delay=".2s"
            >
              <div className="p-4 bg-white rounded shadow p-md-5">
                <h3 className="mb-4 text-center">Sign in to EduRA</h3>

                {err && (
                  <div className="text-center alert alert-danger" role="alert">
                    {err}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="loginEmail">Email address</label>
                    <input
                      id="loginEmail"
                      type="email"
                      className="form-control"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="loginPassword">Password</label>
                    <input
                      id="loginPassword"
                      type="password"
                      className="form-control"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3 d-flex justify-content-between align-items-center">
                    <button type="submit" className="boxed-btn3">
                      Login
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate("/forgot-password")}
                      className="p-0 btn btn-link"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <p className="mt-3 mb-0 text-center">
                    Don’t have an account?{" "}
                    <Link to="/register" className="text-primary">
                      Register
                    </Link>
                  </p>
                </form>
              </div>
            </div>
          </div>
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
