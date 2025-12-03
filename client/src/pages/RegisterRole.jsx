// src/pages/RegisterRole.jsx
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

export default function RegisterRole() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <>
      {/* HEADER – consistent with other pages */}
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
              <div className="font-semibold">Create your account</div>
              <div className="text-xs text-slate-300">
                Choose how you’d like to use EduRA.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-slate-300 md:inline">
              eduteam.app@gmail.com
            </span>
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="min-h-screen bg-slate-50">
        <div className="flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-xl p-8 bg-white border border-slate-200 rounded-2xl shadow-sm shadow-slate-100 transform transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-lg">
            <h1 className="mb-2 text-2xl font-semibold text-slate-900">
              Create your account
            </h1>
            <p className="mb-8 text-sm text-slate-500">
              Select the option that best describes you.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Student card */}
              <button
                onClick={() => navigate("/register/student")}
                className="p-6 text-left transition-all border border-slate-200 rounded-xl hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white"
              >
                <div className="flex items-center justify-between">
                  <div className="text-lg font-medium text-slate-900">
                    I’m a Student
                  </div>
                  <span className="text-xl">🎓</span>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Enroll in courses, book sessions and track your progress.
                </p>
              </button>

              {/* Tutor card */}
              <button
                onClick={() => navigate("/register/tutor")}
                className="p-6 text-left transition-all border border-slate-200 rounded-xl hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white"
              >
                <div className="flex items-center justify-between">
                  <div className="text-lg font-medium text-slate-900">
                    I’m a Tutor
                  </div>
                  <span className="text-xl">👩‍🏫</span>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Teach subjects, set availability and manage students.
                </p>
              </button>
            </div>

            <div className="mt-6 text-sm text-left text-slate-600">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-indigo-600 hover:underline"
              >
                Log in
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER – same style as other pages */}
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
