import { useEffect } from "react";
import { useAuthStore } from "./store/useAuthStore";
import { useLocation } from "react-router-dom";


export default function AppBoot({ children }) {
  const loading = useAuthStore((s) => s.loading);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const { pathname } = useLocation();

  useEffect(() => {
    // Skip auto-restore on auth pages to avoid refresh 401s when logged out
    if (pathname === "/login") return;
    bootstrap();
  }, [bootstrap, pathname]);

  // On /login, render immediately (no loading gate)
  if (pathname !== "/login" && loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="text-gray-600">Loading session…</div>
      </div>
    );
  }
  return children;
}
