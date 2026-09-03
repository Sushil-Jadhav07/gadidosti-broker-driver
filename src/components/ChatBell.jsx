import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";

const POLL_INTERVAL_MS = 20000;

// Lives in the sidebar (see DriverSidebar/BrokerSidebar) as a full nav-style row, styled the
// same as every other sidebar item, rather than a standalone icon button in the top bar.
// Clicking goes to the standalone chat list (ChatList.jsx) rather than a specific trip/job page.
export default function ChatBell({ onNavigate }) {
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

  // ChatNotifications.jsx fires this on every 'chat-message'/'chat-escalated' toast, so the
  // badge updates immediately instead of waiting for the next poll tick.
  useEffect(() => {
    if (!token) return;
    const handler = async () => {
      try {
        const res = await api.get("/api/chat/unread-count", token);
        if (res?.success) setUnreadCount(res.data?.unreadCount || 0);
      } catch { /* next poll retries */ }
    };
    window.addEventListener("chats:refresh", handler);
    return () => window.removeEventListener("chats:refresh", handler);
  }, [token]);

  return (
    <button
      onClick={() => { navigate(user?.role === "driver" ? "/driver/chats" : "/chats"); onNavigate?.(); }}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 text-white/50 hover:bg-white/10 hover:text-white"
    >
      <MessageCircle size={18} strokeWidth={1.8} className="flex-shrink-0" />
      <span className="text-sm font-medium flex-1">Chat</span>
      {unreadCount > 0 && (
        <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-amber-400 text-white text-[11px] font-bold rounded-full flex-shrink-0">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
