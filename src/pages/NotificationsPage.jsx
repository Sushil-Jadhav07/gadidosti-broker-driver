import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCheck, ArrowRight } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import { routeForNotification } from "../lib/notificationRoutes";
import { CATEGORY_TABS, COLOR_CLASSES, categoryFor, metaFor } from "../lib/notificationMeta";

function timeAgo(dateStr) {
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return "Yesterday";
  return `${Math.floor(diffSec / 86400)}d ago`;
}

// Only "operations" types get a jump-to action button (View Trip / View Details / Open Chat) —
// financial/system ones (payment received, KYC status, disputes) are informational after the
// fact, nothing to actually go act on. routeForNotification still has to resolve a real target
// too (e.g. a booking notification with no linked trip/request yet has nowhere useful to go).
const ACTION_LABEL = { booking: "View Details", incident: "View Trip", chat: "Open Chat" };

// Shared by both roles — registered at /notifications (broker) and /driver/notifications
// (driver) in App.jsx, same component either way since routeForNotification is already
// role-aware (mirrors NotificationBell.jsx's dropdown, just as a full page with category tabs).
export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const token = user?.tokens?.access_token;

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState("all");

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(false);
    try {
      const res = await api.get("/api/users/notifications?limit=100", token);
      if (!res?.success) throw new Error(res?.message);
      setNotifications(res.data?.notifications || []);
      setUnreadCount(res.data?.unread_count || 0);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const markRead = async (id) => {
    setNotifications((list) => list.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try { await api.patch(`/api/users/notifications/${id}/read`, {}, token); } catch { /* stays optimistically read either way */ }
  };

  const markAllRead = async () => {
    setNotifications((list) => list.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try { await api.patch("/api/users/notifications/read-all", {}, token); } catch { /* stays optimistically read either way */ }
  };

  const handleAction = (n) => {
    if (!n.is_read) markRead(n.id);
    const target = routeForNotification({ type: n.type, meta: n.meta || {}, role: user?.role });
    if (target) navigate(target);
  };

  const filtered = tab === "all" ? notifications : notifications.filter((n) => categoryFor(n.type) === tab);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-400 mt-0.5">Manage your alerts and system updates.</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex-shrink-0"
          >
            <CheckCheck size={14} /> Mark all as read
          </button>
        )}
      </div>

      <div className="flex items-center gap-5 border-b border-slate-100">
        {CATEGORY_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`pb-2.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === t.id ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-xl" />)}
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
          <p className="text-sm text-slate-400 mb-3">Couldn't load your notifications</p>
          <button onClick={load} className="text-sm font-semibold text-primary hover:underline">Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 p-10 text-center">
          <p className="text-sm text-slate-400">No notifications here yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => {
            const { Icon, color } = metaFor(n.type);
            const cls = COLOR_CLASSES[color] || COLOR_CLASSES.slate;
            const target = routeForNotification({ type: n.type, meta: n.meta || {}, role: user?.role });
            const actionLabel = target ? ACTION_LABEL[n.type] : null;
            return (
              <div
                key={n.id}
                onClick={() => !n.is_read && markRead(n.id)}
                className={`bg-white rounded-xl border-l-4 border border-slate-100 p-4 flex gap-3 ${
                  n.is_read ? "border-l-transparent" : cls.border
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${cls.icon}`}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-bold text-slate-800">{n.title}</p>
                    <span className="text-[11px] text-slate-300 flex-shrink-0 whitespace-nowrap">{timeAgo(n.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">{n.message}</p>
                  {actionLabel && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAction(n); }}
                      className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark transition-colors"
                    >
                      {actionLabel} <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
