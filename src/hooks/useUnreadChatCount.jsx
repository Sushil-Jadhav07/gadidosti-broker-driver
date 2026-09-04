import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { api } from "../services/api";

const UnreadChatContext = createContext(0);
const POLL_INTERVAL_MS = 20000;

// Single poller for /api/chat/unread-count, mounted once in App.jsx. ChatBell.jsx (sidebar)
// and ChatLauncher.jsx (floating FAB) are both alive for the whole logged-in session, so
// without this context each would run its own interval and double the request rate for the
// same number.
export function UnreadChatProvider({ children }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const token = user?.tokens?.access_token;

  useEffect(() => {
    if (!token) { setUnreadCount(0); return undefined; }
    let cancelled = false;
    const fetchUnread = async () => {
      try {
        const res = await api.get("/api/chat/unread-count", token);
        if (!cancelled && res?.success) setUnreadCount(res.data?.unreadCount || 0);
      } catch { /* silent — next poll retries */ }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, POLL_INTERVAL_MS);
    // ChatNotifications.jsx fires this on every 'chat-message'/'chat-escalated' toast, so the
    // badge updates immediately instead of waiting for the next poll tick.
    window.addEventListener("chats:refresh", fetchUnread);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("chats:refresh", fetchUnread);
    };
  }, [token]);

  return <UnreadChatContext.Provider value={unreadCount}>{children}</UnreadChatContext.Provider>;
}

export function useUnreadChatCount() {
  return useContext(UnreadChatContext);
}
