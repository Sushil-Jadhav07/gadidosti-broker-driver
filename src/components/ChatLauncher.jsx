import { useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, X, ArrowLeft } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useChatThreads } from "../hooks/useChatThreads";
import { useUnreadChatCount } from "../hooks/useUnreadChatCount";
import ChatThreadList from "./ChatThreadList";
import ChatWindow from "./ChatWindow";
import { initials } from "../utils";

// Pages that already have their own direct, single-trip chat button (MyTrip's map overlay icon,
// TripDetail's and JobDetail's header icon) — the generic multi-thread launcher would just be a
// second, more confusing way to reach the exact same chat on these, so it's hidden there entirely.
const HIDE_ON = [/^\/driver\/my-trip$/, /^\/driver\/history\//, /^\/job-history\//];

// Persistent floating launcher — mounted once in App.jsx (alongside ChatNotifications) so it
// floats over every driver/broker page. Purely additive: /chats, /driver/chats and their
// :bookingId detail routes keep working exactly as before, this is just a second, quicker way
// in. Sits above BottomNav (driver-only, mobile-only, see App.jsx) via the isDriver offsets
// below — that's the only other bottom-fixed element in this app.
export default function ChatLauncher() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [activeThread, setActiveThread] = useState(null);
  const unreadCount = useUnreadChatCount();
  const { threads, loading, error, reload } = useChatThreads();

  const isDriver = user?.role === "driver";

  if (!user || !["broker", "driver"].includes(user.role)) return null;
  if (HIDE_ON.some((re) => re.test(pathname))) return null;

  const close = () => {
    setOpen(false);
    setActiveThread(null);
  };

  const fabBottom = isDriver ? "bottom-20 lg:bottom-6" : "bottom-6";
  const panelBottom = isDriver ? "bottom-[152px] lg:bottom-24" : "bottom-24";

  return (
    <>
      {open && (
        <div
          className={`fixed z-[90] right-4 left-4 top-16 sm:left-auto sm:top-auto sm:w-[380px] sm:h-[560px] ${panelBottom}
            bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col overflow-hidden`}
        >
          {activeThread ? (
            <>
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 flex-shrink-0">
                <button onClick={() => setActiveThread(null)} className="text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {initials(activeThread.clientName)}
                </div>
                <p className="text-sm font-bold text-slate-900 truncate flex-1">{activeThread.clientName || "Client"}</p>
                <button onClick={close} className="text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-h-0 p-3">
                <ChatWindow bookingId={activeThread.bookingId} currentUserId={user?.id} className="h-full" />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
                <p className="text-sm font-bold text-slate-900">Chats</p>
                <button onClick={close} className="text-slate-400 hover:text-slate-700 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <ChatThreadList threads={threads} loading={loading} error={error} onRetry={reload} onSelect={setActiveThread} />
              </div>
            </>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed z-[90] right-4 ${fabBottom} w-14 h-14 rounded-full bg-primary text-white shadow-xl flex items-center justify-center hover:opacity-90 transition-opacity`}
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {!open && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-amber-400 text-white text-[11px] font-bold rounded-full border-2 border-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    </>
  );
}
