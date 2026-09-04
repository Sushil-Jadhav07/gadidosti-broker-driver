import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";

// Lives in the sidebar (see DriverSidebar/BrokerSidebar) as a full nav-style row, styled the
// same as every other sidebar item, rather than a standalone icon button in the top bar —
// just an unread-count badge that navigates straight to the full Notifications page (see
// pages/NotificationsPage.jsx); there's no preview dropdown, one place to actually read them.
export default function NotificationBell({ onNavigate }) {
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
      onClick={() => { navigate(user?.role === "driver" ? "/driver/notifications" : "/notifications"); onNavigate?.(); }}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 group text-white/85 hover:bg-white hover:text-primary"
    >
      <Bell size={18} strokeWidth={1.8} className="flex-shrink-0" />
      <span className="text-sm font-medium flex-1">Notifications</span>
      {unreadCount > 0 && (
        <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-white text-primary group-hover:bg-primary group-hover:text-white text-[11px] font-bold rounded-full flex-shrink-0 transition-colors">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
