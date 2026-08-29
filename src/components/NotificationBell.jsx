import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";

// Just an unread-count badge that navigates straight to the full Notifications page (see
// pages/NotificationsPage.jsx) — this used to also open its own preview-list dropdown, but
// keeping both a live preview AND the full page was redundant, and navigating away from the
// dropdown without it fully unmounting first could briefly show both stacked on top of each
// other. One place to actually read notifications now, this button just points at it.
export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  const token = user?.tokens?.access_token;

  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.get("/api/users/notifications?limit=1", token);
      if (data.success) setUnreadCount(data.data.unread_count);
    } catch {}
  }, [token]);

  useEffect(() => { fetchUnreadCount(); }, [fetchUnreadCount]);

  // A foreground push (see FcmBridge) fires this once it's shown as a toast, so the badge
  // updates without waiting for the next time this component happens to re-render.
  useEffect(() => {
    window.addEventListener("notifications:refresh", fetchUnreadCount);
    return () => window.removeEventListener("notifications:refresh", fetchUnreadCount);
  }, [fetchUnreadCount]);

  return (
    <button
      onClick={() => navigate(user?.role === "driver" ? "/driver/notifications" : "/notifications")}
      className="relative w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
    >
      <Bell size={18} />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
