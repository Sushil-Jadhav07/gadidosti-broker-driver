import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ChatWindow from "../components/ChatWindow";
import { useAuth } from "../hooks/useAuth";
import { api, getToken } from "../services/api";
import { bookingRef } from "../utils";

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

// Shared by both roles — registered at /chats/:bookingId (broker) and /driver/chats/:bookingId
// (driver), same component either way (mirrors NotificationsPage.jsx's split). Header info
// (client name, stage, isLocked) is read off GET /api/chat/threads rather than adding a new
// thread-by-booking endpoint — that list is small per user, so finding this one booking in it
// is cheap, and it leaves ChatWindow's own /thread call as the single source of truth once the
// window itself mounts.
export default function ChatDetail() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.get("/api/chat/threads", getToken())
      .then((res) => {
        if (cancelled) return;
        setSummary((res?.data?.threads || []).find((t) => t.bookingId === bookingId) || null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [bookingId]);

  return (
    <div className="space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft size={15} /> Back
      </button>

      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-50">
          <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
            {initials(summary?.clientName)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[15px] font-bold text-slate-900 truncate">{summary?.clientName || "Client"}</h1>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              <span className="text-[11px] font-mono text-slate-400">{summary ? bookingRef(summary) : ""}</span>
              {summary?.isLocked && (
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wide">Closed</span>
              )}
              {summary?.stage === "bot" && (
                <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Not yet connected</span>
              )}
            </div>
          </div>
        </div>

        <ChatWindow bookingId={bookingId} currentUserId={user?.id} />
      </div>
    </div>
  );
}
