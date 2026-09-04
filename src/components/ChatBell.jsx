import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useUnreadChatCount } from "../hooks/useUnreadChatCount";

// Lives in the sidebar (see DriverSidebar/BrokerSidebar) as a full nav-style row, styled the
// same as every other sidebar item, rather than a standalone icon button in the top bar.
// Clicking goes to the standalone chat list (ChatList.jsx) rather than a specific trip/job page.
// Unread count comes from UnreadChatProvider (App.jsx) — ChatLauncher.jsx reads the same
// context, so there's one poller behind both instead of each running its own.
export default function ChatBell({ onNavigate }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const unreadCount = useUnreadChatCount();

  return (
    <button
      onClick={() => { navigate(user?.role === "driver" ? "/driver/chats" : "/chats"); onNavigate?.(); }}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 text-white/85 hover:bg-white hover:text-primary"
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
