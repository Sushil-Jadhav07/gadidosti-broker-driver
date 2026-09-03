import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { api, getToken } from "../services/api";
import { bookingRef } from "../utils";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return "Yesterday";
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

// Shared by both roles — registered at /chats (broker) and /driver/chats (driver), same
// component either way (mirrors NotificationsPage.jsx's split). "The other party" is always
// the client from a driver/broker's perspective, so clientName is what every row shows even
// though the thread itself is keyed by booking, not by counterpart.
export default function ChatList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDriver = user?.role === "driver";
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(false);
    try {
      const res = await api.get("/api/chat/threads", getToken());
      if (!res?.success) throw new Error(res?.message);
      setThreads(res.data?.threads || []);
    } catch {
      if (!silent) setError(true);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A 'chat-escalated' (or any 'chat-message') toast from ChatNotifications.jsx fires this so
  // the just-escalated/just-messaged thread jumps to the top immediately instead of waiting
  // for the next time this page happens to remount.
  useEffect(() => {
    const handler = () => load({ silent: true });
    window.addEventListener("chats:refresh", handler);
    return () => window.removeEventListener("chats:refresh", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Chats</h1>
        <p className="text-sm text-slate-400 mt-0.5">Message clients on your active and past trips.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-xl" />)}
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
          <p className="text-sm text-slate-400 mb-3">Couldn't load your chats</p>
          <button onClick={() => load()} className="text-sm font-semibold text-primary hover:underline">Retry</button>
        </div>
      ) : threads.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
          <MessageCircle className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No chats yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((t) => (
            <button
              key={t.threadId}
              onClick={() => navigate(`${isDriver ? "/driver/chats" : "/chats"}/${t.bookingId}`)}
              className="w-full bg-white rounded-xl border border-slate-100 shadow-card p-4 flex items-center gap-3 text-left hover:border-primary/30 transition-colors"
            >
              <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                {initials(t.clientName)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-slate-900 truncate">{t.clientName || "Client"}</p>
                  <span className="text-[11px] font-mono text-slate-400 flex-shrink-0">{bookingRef(t)}</span>
                  {t.isLocked && (
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">Closed</span>
                  )}
                  {t.stage === "bot" && (
                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex-shrink-0">Not yet connected</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5">{t.lastMessage || "No messages yet"}</p>
              </div>

              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span className="text-[11px] text-slate-300 whitespace-nowrap">{timeAgo(t.lastMessageAt)}</span>
                {t.unreadCount > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-primary text-white text-[11px] font-bold rounded-full">
                    {t.unreadCount > 9 ? "9+" : t.unreadCount}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
