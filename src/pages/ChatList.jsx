import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useChatThreads } from "../hooks/useChatThreads";
import ChatThreadList from "../components/ChatThreadList";

// Shared by both roles — registered at /chats (broker) and /driver/chats (driver), same
// component either way (mirrors NotificationsPage.jsx's split). "The other party" is always
// the client from a driver/broker's perspective, so clientName is what every row shows even
// though the thread itself is keyed by booking, not by counterpart.
export default function ChatList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDriver = user?.role === "driver";
  const { threads, loading, error, reload } = useChatThreads();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Chats</h1>
        <p className="text-sm text-slate-400 mt-0.5">Message clients on your active and past trips.</p>
      </div>

      <ChatThreadList
        threads={threads}
        loading={loading}
        error={error}
        onRetry={reload}
        onSelect={(t) => navigate(`${isDriver ? "/driver/chats" : "/chats"}/${t.bookingId}`)}
      />
    </div>
  );
}
