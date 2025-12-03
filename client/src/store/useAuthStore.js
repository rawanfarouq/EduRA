import { create } from "zustand";
import { setAccessToken } from "../lib/auth";      // tiny in-memory var
import { postJSON, withAuthFetch } from "../lib/api"; // fetch helpers (API base + auth refresh)

const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

export const useAuthStore = create((set, get) => ({
  user: null,            // { id, name, email, role }
  token: null,           // access token (in-memory)
  loading: true,         // bootstrap loading
  hasBootstrapped: false,   // 🔹 NEW


  // keep module var (lib/auth) and Zustand in sync
  setToken: (t) => { set({ token: t || null }); setAccessToken(t || null); },
  setUser:  (u) => set({ user: u || null }),

  // Called at app startup: tries to use refresh cookie -> access token
  bootstrap: async () => {
  // 🔹 Prevent multiple runs (React StrictMode, re-renders, etc.)
  if (get().hasBootstrapped) return;
  set({ hasBootstrapped: true, loading: true });

  try {
    const pathname =
      typeof window !== "undefined" ? window.location.pathname : "/";

    // Skip on login page
    if (pathname === "/login") {
      set({ loading: false });
      return;
    }

    // If we already have an access token, no need to refresh
    if (get().token) {
      set({ loading: false });
      return;
    }

    // 🔹 NEW: only try refresh if user had a session before
    if (typeof window !== "undefined") {
      const hadSession = window.localStorage.getItem("hadSession");
      if (!hadSession) {
        // first time visitor / after logout -> don't even call /refresh
        set({ loading: false });
        return;
      }
    }

    // Attempt a refresh using the HttpOnly cookie
    const res = await fetch(`${API}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (res.ok) {
      const { accessToken } = await res.json();
      if (accessToken) get().setToken(accessToken);

      try {
        const meRes = await fetch(`${API}/api/auth/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: "include",
        });
        const me = await meRes.json();
        if (me?.user) get().setUser(me.user);
      } catch {
        // ignore /me failure
      }
    } else {
      get().setToken(null);
      get().setUser(null);
    }
  } catch {
    get().setToken(null);
    get().setUser(null);
  } finally {
    set({ loading: false });
  }
},


  // Login (server also sets refresh cookie)
  login: async (email, password) => {
    const { user, accessToken } = await postJSON("/api/auth/login", { email, password });
    get().setUser(user);
    get().setToken(accessToken);

    // 🔹 Mark that this browser has had a session
  if (typeof window !== "undefined") {
    window.localStorage.setItem("hadSession", "true");
  }

    // redirect based on role
    if (user.role === "student") window.location.href = "/student/dashboard";
    else if (user.role === "tutor") window.location.href = "/tutor/dashboard";
    else if (user.role === "admin") window.location.href = "/admin/dashboard";
    else window.location.href = "/";
  },

  // Register (supports JSON or FormData; server also sets refresh cookie)
  register: async (payload) => {
    let data;

    if (payload instanceof FormData) {
      // Tutor path (CV upload)
      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        body: payload,              // FormData -> browser sets multipart boundary
        credentials: "include",     // send refresh cookie
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "Registration failed");
        throw new Error(text || "Registration failed");
      }
      data = await res.json();
    } else {
      // Student/Admin path (JSON)
      data = await postJSON("/api/auth/register", payload);
    }

    const { user, accessToken } = data || {};
    if (!user || !accessToken) throw new Error("Malformed server response");

    get().setUser(user);
    get().setToken(accessToken);

    // 🔹 Mark that this browser has had a session
  if (typeof window !== "undefined") {
    window.localStorage.setItem("hadSession", "true");
  }

    // redirect based on role
    if (user.role === "student") window.location.href = "/student/dashboard";
    else if (user.role === "tutor") window.location.href = "/tutor/dashboard";
    else if (user.role === "admin") window.location.href = "/admin/dashboard";
    else window.location.href = "/";
  },

  // Logout (server clears refresh cookie and bumps tokenVersion)
  logout: async () => {
    try {
      await withAuthFetch("/api/auth/logout", { method: "POST" }); // uses API base + cookies
    } catch {
      // ignore network/auth errors on logout to avoid trapping user
    } finally {
      // ✅ Clear local state and prevent any post-logout bootstrap flashes
      get().setUser(null);
      get().setToken(null);
      set({ loading: false });

      // 🔹 Mark that this browser has had a session
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("hadSession");
      }

      // ✅ Send the user to the login page (where AppBoot skips refresh)
      if (typeof window !== "undefined") {
        window.location.assign("/");
      }
    }
  },
}));
