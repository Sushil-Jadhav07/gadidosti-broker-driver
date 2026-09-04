import { useEffect, useState } from "react";
import { api, getToken } from "../services/api";

// Shared by ChatList.jsx (full-page) and ChatLauncher.jsx (floating panel) so both read off
// the same GET /api/chat/threads call and the same 'chats:refresh' listener instead of each
// running its own copy of this fetch/refresh wiring.
export function useChatThreads() {
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
  // for the next time a consumer of this hook happens to remount.
  useEffect(() => {
    const handler = () => load({ silent: true });
    window.addEventListener("chats:refresh", handler);
    return () => window.removeEventListener("chats:refresh", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { threads, loading, error, reload: load };
}
