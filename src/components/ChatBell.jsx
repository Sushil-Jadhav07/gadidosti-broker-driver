import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";

const POLL_INTERVAL_MS = 20000;

// Unread chat badge for the header — same visual pattern as NotificationBell. Clicking it
// goes to the role's "in progress" list (Active Jobs for a broker, My Trip for a driver)
// since chat is per-booking/trip and there's no standalone inbox screen.
export default function ChatBell() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const token = user?.tokens?.access_token;

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const fetchUnread = async () => {
      try {
        const res = await api.get("/api/chat/unread-count", token);
        if (!cancelled && res?.success) setUnreadCount(res.data?.unreadCount || 0);
      } catch { /* silent — next poll retries */ }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [token]);

  return (
    <button
      onClick={() => navigate(user?.role === "driver" ? "/driver/my-trip" : "/active-jobs")}
      className="relative w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
      title="Chat"
    >
      <MessageCircle size={18} />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
