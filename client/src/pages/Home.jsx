// src/pages/Home.jsx
import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Link, useNavigate } from "react-router-dom";

export default function Home() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  // 🔹 Contact form state (for mailto)
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    message: "",
  });

  function handleContactSubmit(e) {
      e.preventDefault();

      const subject = encodeURIComponent(
        contactForm.name
          ? `New message from ${contactForm.name} via EduRA`
          : "New message via EduRA"
      );

      const body = encodeURIComponent(
        `Name: ${contactForm.name || "-"}\nEmail: ${
          contactForm.email || "-"
        }\n\nMessage:\n${contactForm.message || "-"}`
      );

      window.location.href = `mailto:eduteam.app@gmail.com?subject=${subject}&body=${body}`;

      // 🔹 Clear the form after opening the mail client
      setContactForm({
        name: "",
        email: "",
        message: "",
      });
}


  return (
    <>
      {/* HEADER */}
      <header>
        <div className="header-area">
          {/* Top bar */}
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
                        {user ? (
                          <>
                            {user.role === "tutor" && (
                              <Link to="/tutor/dashboard" className="ml-3">
                                <i className="ti-dashboard" /> Tutor Dashboard
                              </Link>
                            )}

                            {user.role === "student" && (
                              <Link to="/student/dashboard" className="ml-3">
                                <i className="ti-dashboard" /> Student Dashboard
                              </Link>
                            )}
                          </>
                        ) : (
                          <>
                            <Link to="/login">
                              <i className="ti-user" /> Login
                             </Link>
                            <Link to="/register" className="ml-3">
                              Register
                            </Link>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main header */}
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
                              <a href="#how-it-works">How it works</a>
                            </li>
                            <li>
                              <a href="#contact">Contact</a>
                            </li>
                          </ul>
                        </nav>
                      </div>
                      <div className="Appointment">
                        <div className="book_btn d-none d-lg-block">
                          {/* 🔹 Go to role selection */}
                          <Link to="/register">Apply Now</Link>
                        </div>
                      </div>
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

      {/* HERO / SLIDER AREA */}
      <div className="slider_area">
        <div className="slider_active">
          <div className="single_slider d-flex align-items-center slider_bg_1">
            <div className="container">
              <div className="row">
                <div className="col-xl-12">
                  <div className="slider_text">
                    <h3>
                      One platform for <br />
                      students & tutors to <br />
                      learn, teach, and grow.
                    </h3>
                    <p style={{ maxWidth: "520px" }}>
                      EduRA helps students find trusted tutors, book sessions,
                      and track progress — while tutors manage availability,
                      courses, and AI-powered assignments.
                    </p>
                    <div className="mt-3">
                      <Link to="/student/courses" className="boxed-btn3">
                        Find a Tutor
                      </Link>
                      <Link
                        to="/register/tutor"
                        className="ml-4 boxed-btn3"
                      >
                        Become a Tutor
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SERVICE AREA – what EduRA offers */}
      <div className="service_area gray_bg">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-4 col-md-6">
              <div className="single_service d-flex align-items-center">
                <div className="icon">
                  <i className="flaticon-school" />
                </div>
                <div className="service_info">
                  <h4>1:1 & Group Sessions</h4>
                  <p>Book personalized sessions with tutors you trust.</p>
                </div>
              </div>
            </div>

            <div className="col-lg-4 col-md-6">
              <div className="single_service d-flex align-items-center">
                <div className="icon">
                  <i className="flaticon-book" />
                </div>
                <div className="service_info">
                  <h4>Course Matching</h4>
                  <p>
                    AI-assisted matching between tutor expertise & course needs.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-lg-4 col-md-6">
              <div className="single_service d-flex align-items-center">
                <div className="icon">
                  <i className="flaticon-error" />
                </div>
                <div className="service_info">
                  <h4>Progress & Feedback</h4>
                  <p>Assignments, reviews, and structured learning journeys.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* POPULAR PROGRAM AREA – adapt to “Popular Subjects” */}
      <div
        className="popular_program_area section__padding"
        id="popular-programs"
      >
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="text-center section_title">
                <h3>Popular Subjects</h3>
                <p>
                  Explore subjects students book most frequently on EduRA.
                </p>
              </div>
            </div>
          </div>

          {/* Tabs – you can later connect to real data */}
          <div className="row">
            <div className="col-lg-12">
              <nav className="text-center custom_tabs">
                <div className="nav" id="nav-tab" role="tablist">
                  <a
                    className="nav-item nav-link active"
                    id="nav-highschool-tab"
                    data-toggle="tab"
                    href="#nav-highschool"
                    role="tab"
                    aria-controls="nav-highschool"
                    aria-selected="true"
                  >
                    School Support
                  </a>
                  <a
                    className="nav-item nav-link"
                    id="nav-university-tab"
                    data-toggle="tab"
                    href="#nav-university"
                    role="tab"
                    aria-controls="nav-university"
                    aria-selected="false"
                  >
                    University Courses
                  </a>
                  <a
                    className="nav-item nav-link"
                    id="nav-exams-tab"
                    data-toggle="tab"
                    href="#nav-exams"
                    role="tab"
                    aria-controls="nav-exams"
                    aria-selected="false"
                  >
                    Exam Preparation
                  </a>
                  <a
                    className="nav-item nav-link"
                    id="nav-skills-tab"
                    data-toggle="tab"
                    href="#nav-skills"
                    role="tab"
                    aria-controls="nav-skills"
                    aria-selected="false"
                  >
                    Skills & Languages
                  </a>
                </div>
              </nav>
            </div>
          </div>

          <div className="tab-content" id="nav-tabContent">
            {/* School Support */}
            <div
              className="tab-pane fade show active"
              id="nav-highschool"
              role="tabpanel"
              aria-labelledby="nav-highschool-tab"
            >
              <div className="row">
                <div className="col-lg-4 col-md-6">
                  <div className="single__program">
                    <div className="program_thumb">
                      <img src="/img/program/1.png" alt="" />
                    </div>
                    <div className="program__content">
                      <span>Mathematics</span>
                      <h4>Algebra & Calculus</h4>
                      <p>
                        Get step-by-step help with homework, exams, and core
                        concepts.
                      </p>
                      <Link to="/student/courses" className="boxed-btn5">
                        Browse tutors
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="col-lg-4 col-md-6">
                  <div className="single__program">
                    <div className="program_thumb">
                      <img src="/img/program/2.png" alt="" />
                    </div>
                    <div className="program__content">
                      <span>Sciences</span>
                      <h4>Physics & Chemistry</h4>
                      <p>
                        Understand theory, solve problems, and prepare for
                        school exams.
                      </p>
                      <Link to="/student/courses" className="boxed-btn5">
                        Browse tutors
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="col-lg-4 col-md-6">
                  <div className="single__program">
                    <div className="program_thumb">
                      <img src="/img/program/3.png" alt="" />
                    </div>
                    <div className="program__content">
                      <span>Languages</span>
                      <h4>English & More</h4>
                      <p>
                        Improve speaking, writing, and exam performance with
                        practice.
                      </p>
                      <Link to="/student/courses" className="boxed-btn5">
                        Browse tutors
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* University */}
            <div
              className="tab-pane fade"
              id="nav-university"
              role="tabpanel"
              aria-labelledby="nav-university-tab"
            >
              <div className="row">
                <div className="col-lg-4 col-md-6">
                  <div className="single__program">
                    <div className="program_thumb">
                      <img src="/img/program/1.png" alt="" />
                    </div>
                    <div className="program__content">
                      <span>Computer Science</span>
                      <h4>Programming & Algorithms</h4>
                      <p>Master coding assignments and exam preparation.</p>
                      <Link to="/student/courses" className="boxed-btn5">
                        Browse tutors
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="col-lg-4 col-md-6">
                  <div className="single__program">
                    <div className="program_thumb">
                      <img src="/img/program/3.png" alt="" />
                    </div>
                    <div className="program__content">
                      <span>Engineering</span>
                      <h4>Core University Courses</h4>
                      <p>Get help with difficult technical and math-heavy topics.</p>
                      <Link to="/student/courses" className="boxed-btn5">
                        Browse tutors
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="col-lg-4 col-md-6">
                  <div className="single__program">
                    <div className="program_thumb">
                      <img src="/img/program/2.png" alt="" />
                    </div>
                    <div className="program__content">
                      <span>Medical & Health</span>
                      <h4>Medical Subjects</h4>
                      <p>Study with tutors experienced in medical education.</p>
                      <Link to="/student/courses" className="boxed-btn5">
                        Browse tutors
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Exams */}
            <div
              className="tab-pane fade"
              id="nav-exams"
              role="tabpanel"
              aria-labelledby="nav-exams-tab"
            >
              <div className="row">
                <div className="col-lg-4 col-md-6">
                  <div className="single__program">
                    <div className="program_thumb">
                      <img src="/img/program/3.png" alt="" />
                    </div>
                    <div className="program__content">
                      <span>School Exams</span>
                      <h4>Midterms & Finals</h4>
                      <p>Targeted help before important school exams.</p>
                      <Link to="/student/courses" className="boxed-btn5">
                        Browse tutors
                      </Link>
                    </div>
                  </div>
                </div>
                {/* You can add more cards here if you want */}
              </div>
            </div>

            {/* Skills & Languages */}
            <div
              className="tab-pane fade"
              id="nav-skills"
              role="tabpanel"
              aria-labelledby="nav-skills-tab"
            >
              <div className="row">
                <div className="col-lg-4 col-md-6">
                  <div className="single__program">
                    <div className="program_thumb">
                      <img src="/img/program/2.png" alt="" />
                    </div>
                    <div className="program__content">
                      <span>Languages</span>
                      <h4>IELTS / TOEFL</h4>
                      <p>Prepare with tutors who know the exam format well.</p>
                      <Link to="/student/courses" className="boxed-btn5">
                        Browse tutors
                      </Link>
                    </div>
                  </div>
                </div>
                {/* Add more if you like */}
              </div>
            </div>
          </div>

          {/* View all courses */}
          <div className="row">
            <div className="col-lg-12">
              <div className="text-center course_all_btn">
                <Link to="/student/courses" className="boxed-btn4">
                  View All Courses
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS (reuse “recent_event_area”) */}
      <div
        className="recent_event_area section__padding"
        id="how-it-works"
      >
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8 col-md-10">
              <div className="text-center section_title mb-70">
                <h3 className="mb-45">How EduRA Works</h3>
                <p>
                  A simple flow to connect students with the right tutors and
                  keep learning structured and effective.
                </p>
              </div>
            </div>
          </div>

          <div className="row justify-content-center">
            <div className="col-lg-10">
              <div className="single_event d-flex align-items-center">
                <div className="text-center date">
                  <span>1</span>
                  <p>Tell us what you need</p>
                </div>
                <div className="event_info">
                  <h4>Browse courses & subjects</h4>
                  <p>
                    Choose your subject, level, and what you’re struggling with.
                    Review tutor profiles and student ratings.
                  </p>
                </div>
              </div>

              <div className="single_event d-flex align-items-center">
                <div className="text-center date">
                  <span>2</span>
                  <p>Book & learn</p>
                </div>
                <div className="event_info">
                  <h4>Book a session with a tutor</h4>
                  <p>
                    Select a time that fits your schedule, meet online, and work
                    through assignments or exam prep.
                  </p>
                </div>
              </div>

              <div className="single_event d-flex align-items-center">
                <div className="text-center date">
                  <span>3</span>
                  <p>Track progress</p>
                </div>
                <div className="event_info">
                  <h4>Assignments, reviews & follow-up</h4>
                  <p>
                    Tutors can create AI-generated quizzes, give feedback, and
                    help you improve over time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* APPLY AREA – redirect to register role */}
      <div data-scroll-index="1" className="admission_area" id="apply">
        <div className="admission_inner">
          <div className="container">
            <div className="row justify-content-end">
              <div className="col-lg-7">
                <div className="admission_form">
                  <h3>Start with EduRA</h3>
                  <p style={{ marginBottom: "18px" }}>
                    Whether you&apos;re a student looking for help or a tutor
                    ready to teach, you can create your account in a few clicks.
                  </p>

                  {/* Instead of a real form, just guide users to RegisterRole */}
                  <div className="row">
                    <div className="col-md-12">
                      <div className="apply_btn">
                        <button
                          type="button"
                          className="boxed-btn3"
                          onClick={() => navigate("/register")}
                        >
                          Apply Now
                        </button>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-white-50">
                    You will first choose whether you are a student or a tutor,
                    then complete your profile.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTACT AREA – send message to eduteam.app@gmail.com */}
      <div className="recent_news_area section__padding" id="contact">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8 col-md-10">
              <div className="text-center section_title mb-70">
                <h3 className="mb-45">Contact Us</h3>
                <p>
                  Have questions, feedback, or partnership ideas? Send us a
                  message and we&apos;ll reply as soon as we can.
                </p>
              </div>
            </div>
          </div>

          <div className="row justify-content-center">
            <div className="col-md-8">
              <div className="p-4 single__news" style={{ borderRadius: 12 }}>
                <div className="news_info">
                  <h4>Send us a message</h4>
                  <p className="mb-3">
                    Email:{" "}
                    <a href="mailto:eduteam.app@gmail.com">
                      eduteam.app@gmail.com
                    </a>
                  </p>

                  <form onSubmit={handleContactSubmit} className="space-y-3">
                    <div className="row">
                      <div className="mb-3 col-md-6">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Your name"
                          value={contactForm.name}
                          onChange={(e) =>
                            setContactForm((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="mb-3 col-md-6">
                        <input
                          type="email"
                          className="form-control"
                          placeholder="Your email"
                          value={contactForm.email}
                          onChange={(e) =>
                            setContactForm((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <textarea
                        className="form-control"
                        rows={4}
                        placeholder="Your message"
                        value={contactForm.message}
                        onChange={(e) =>
                          setContactForm((prev) => ({
                            ...prev,
                            message: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>

                    <button type="submit" className="boxed-btn3">
                      Send Message
                    </button>
                  </form>

                  <p className="mt-3 text-sm text-gray-500">
                    Submitting will open your email app with the message
                    pre-filled to <strong>eduteam.app@gmail.com</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
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
