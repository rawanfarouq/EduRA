
// src/pages/ResetPassword.jsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { postJSON } from "../lib/api";
import { useAuthStore } from "../store/useAuthStore";
import Swal from "sweetalert2";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Prefill email if passed from ForgotPassword
  useEffect(() => {
    const stateEmail = location.state?.email;
    if (stateEmail) setEmail(stateEmail);
  }, [location.state]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!email) {
      setErr("Email is required");
      return;
    }

    if (password !== confirm) {
      setErr("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      await postJSON("/api/auth/reset-password-simple", {
        email,
        password,
      });
    Swal.fire({
    title: "Password Reset",
    text: "Your password has been reset successfully.",
    icon: "success",
    confirmButtonText: "OK",
    confirmButtonColor: "#3085d6",
  }).then(() => {
    // Navigate AFTER popup closes
    navigate("/login");
  });      navigate("/login");
    } catch (e) {
      setErr(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <>
      {/* HEADER – consistent with ForgotPassword */}
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
              <div className="font-semibold">Reset your password</div>
              <div className="text-xs text-slate-300">
                Choose a new password for your EduRA account.
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
      <main className="min-h-[calc(100vh-120px)] bg-slate-50 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-2xl shadow-sm shadow-slate-100 transform transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="mb-4 text-center">
            <h2 className="text-2xl font-semibold text-slate-900">
              Reset Password
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter your email and choose a new password.
            </p>
          </div>

          {err && (
            <div className="px-3 py-2 mb-3 text-sm text-red-700 border border-red-200 rounded-md bg-red-50">
              {err}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-2 space-y-4">
            <div>
              <label className="block mb-1 text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                type="email"
                className="w-full px-3 py-2 text-sm border rounded-md border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-slate-700">
                New password
              </label>
              <input
                type="password"
                className="w-full px-3 py-2 text-sm border rounded-md border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-slate-700">
                Confirm new password
              </label>
              <input
                type="password"
                className="w-full px-3 py-2 text-sm border rounded-md border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Re-enter new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {loading ? "Saving..." : "Reset password"}
            </button>
          </form>

          <div className="mt-4 text-sm text-center text-slate-600">
            Changed your mind?{" "}
            <Link
              to="/login"
              className="font-semibold text-indigo-600 hover:underline"
            >
              Back to Login
            </Link>
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
