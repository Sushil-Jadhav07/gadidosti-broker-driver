import { useState, useRef, useEffect, useCallback } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";

function timeAgo(dateStr) {
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropRef = useRef(null);

  const token = user?.tokens?.access_token;

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.get("/api/users/notifications?limit=10", token);
      if (data.success) {
        setNotifications(data.data.notifications);
        setUnreadCount(data.data.unread_count);
      }
    } catch {}
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markRead = async (id) => {
    setNotifications((list) => list.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try { await api.patch(`/api/users/notifications/${id}/read`, {}, token); } catch {}
  };

  const markAllRead = async () => {
    setNotifications((list) => list.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try { await api.patch("/api/users/notifications/read-all", {}, token); } catch {}
  };

  return (
    <div className="relative" ref={dropRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-bold text-slate-800">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {loading ? (
              <div className="py-8 flex justify-center">
                <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No notifications yet</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex gap-2 ${!n.is_read ? "bg-primary/5" : ""}`}
                >
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${!n.is_read ? "bg-primary" : "bg-transparent"}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[11px] text-slate-300 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
