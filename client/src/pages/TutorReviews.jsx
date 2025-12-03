// src/pages/TutorReviews.jsx
import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { fetchMyReviewsAsTutor } from "../lib/api";
import { Link, useNavigate } from "react-router-dom";

export default function TutorReviews() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  function handleLogout() {
    logout();
    navigate("/");
  }

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErr("");
        const data = await fetchMyReviewsAsTutor();
        setReviews(data.reviews || []);
      } catch (e) {
        setErr(e.message || "Failed to load reviews");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <>
      {/* HEADER – same style as tutor dashboard / bookings */}
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
              <div className="font-semibold">Student Reviews</div>
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
        <div className="max-w-3xl px-4 py-8 mx-auto">
          {/* Page header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Student Reviews
              </h1>

              {user && (
                <p className="mt-1 text-sm text-slate-600">
                  Tutor:{" "}
                  <span className="font-semibold text-slate-900">
                    {user.name}
                  </span>
                </p>
              )}
            </div>

            <button
              onClick={() => navigate("/tutor/bookings")}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-md shadow-sm hover:bg-gray-800"
            >
              ← Back to Bookings
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <p className="mt-4 text-sm text-slate-500 animate-pulse">
              Loading reviews…
            </p>
          ) : err ? (
            <p className="mt-4 text-sm text-red-600">{err}</p>
          ) : !reviews.length ? (
            <div className="p-4 mt-6 text-sm bg-white border border-dashed text-slate-600 rounded-xl">
              You don&apos;t have any reviews yet. Once students start rating
              your sessions, they will appear here.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {reviews.map((r) => (
                <div
                  key={r._id}
                  className="p-4 text-sm bg-white border border-slate-200 rounded-2xl shadow-sm transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-indigo-700">
                        {r.reviewerId?.name || "Student"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {r.reviewerId?.email}
                      </div>

                      {/* Course name */}
                      {r.courseId?.title && (
                        <div className="mt-1 text-xs text-indigo-600">
                          Course:{" "}
                          <span className="font-semibold">
                            {r.courseId.title}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-sm font-semibold text-yellow-600">
                      <span>⭐</span>
                      <span>
                        {r.rating} / 5
                      </span>
                    </div>
                  </div>

                  {r.comment && (
                    <p className="mt-3 text-slate-800">{r.comment}</p>
                  )}

                  <div className="mt-2 text-[11px] text-slate-400">
                    {r.createdAt
                      ? new Date(r.createdAt).toLocaleString()
                      : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* FOOTER – same as other tutor pages */}
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
