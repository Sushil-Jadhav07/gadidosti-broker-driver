import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Mounted once near the root (see App.jsx, alongside FcmBridge/SessionGuard) so chat toasts
// fire no matter which page is open — a single socket connection here rather than one per open
// ChatWindow. 'chat-message' and 'chat-escalated' land on this user's own always-joined
// user:{userId} room with no explicit join needed (unlike 'new-message', which is per-thread
// and only reaches an actually-open ChatWindow).
export default function ChatNotifications() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const socketRef = useRef(null);

  useEffect(() => {
    const token = user?.tokens?.access_token;
    if (!token || !["broker", "driver"].includes(user.role)) return undefined;

    const socket = io(BASE, { auth: { token }, transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("chat-message", (msg) => {
      addToast(`New message from ${msg.senderName || "a client"}${msg.bookingNumber ? ` — Booking #${msg.bookingNumber}` : ""}`, "info");
      window.dispatchEvent(new CustomEvent("chats:refresh"));
    });

    // The one specific to this app — a client just asked to talk to a person (or free-typed
    // past the bot menu), so this broker/driver is the one now expected to answer.
    socket.on("chat-escalated", (payload) => {
      addToast(`New chat request from ${payload?.byName || "a client"}${payload?.bookingNumber ? ` — Booking #${payload.bookingNumber}` : ""}`, "info");
      window.dispatchEvent(new CustomEvent("chats:refresh"));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, addToast]);

  return null;
}
