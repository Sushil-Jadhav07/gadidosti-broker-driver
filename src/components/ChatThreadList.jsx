import { MessageCircle } from "lucide-react";
import { bookingRef, initials } from "../utils";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return "Yesterday";
  return `${Math.floor(diffSec / 86400)}d ago`;
}

// Row markup shared by ChatList.jsx (full page) and ChatLauncher.jsx (floating panel) — only
// what happens on tap differs, so that's the one thing left to the caller via onSelect.
export default function ChatThreadList({ threads, loading, error, onRetry, onSelect, skeletonCount = 4 }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(skeletonCount)].map((_, i) => <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-xl" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
        <p className="text-sm text-slate-400 mb-3">Couldn't load your chats</p>
        <button onClick={onRetry} className="text-sm font-semibold text-primary hover:underline">Retry</button>
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
        <MessageCircle className="w-8 h-8 text-slate-200 mx-auto mb-2" />
        <p className="text-sm text-slate-400">No chats yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {threads.map((t) => (
        <button
          key={t.threadId}
          onClick={() => onSelect(t)}
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
  );
}
