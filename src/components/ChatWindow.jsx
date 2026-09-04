import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { Send, MessageCircle, Bot, Lock, CheckCheck } from "lucide-react";
import { api, getToken } from "../services/api";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Live chat for a single booking — shared by the broker and driver sides of this app. REST
// loads history + does the initial mark-as-read; the socket connection (auth'd with the same
// access token as every REST call) delivers new messages/typing/read-receipts in real time.
// className overrides the thread's own height — defaults to the size used inline on
// MyTrip/ActiveJobs, but ChatLauncher passes "h-full" to fill its own panel instead.
export default function ChatWindow({ bookingId, currentUserId, className = "h-[60vh] md:h-[480px]" }) {
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  // Once the trip is delivered/completed the backend locks the thread — history stays viewable
  // but nobody can send. Comes straight off the thread payload rather than a separate flag, so
  // it can't drift from what the server actually enforces on POST/send-message.
  const isLocked = !!thread?.isLocked;
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;
    const token = getToken();

    const init = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const threadRes = await api.get(`/api/chat/bookings/${bookingId}/thread`, token);
        if (!threadRes?.success) throw new Error(threadRes?.message);
        const t = threadRes.data.thread;
        if (cancelled) return;
        setThread(t);

        const messagesRes = await api.get(`/api/chat/threads/${t.id}/messages?limit=50`, token);
        if (!cancelled) setMessages(messagesRes.data?.messages || []);

        api.patch(`/api/chat/threads/${t.id}/read`, {}, token).catch(() => {});

        const socket = io(BASE, { auth: { token }, transports: ["websocket", "polling"] });
        socketRef.current = socket;

        socket.emit("join-thread", { threadId: t.id });

        socket.on("new-message", (msg) => {
          if (msg.threadId !== t.id) return;
          setMessages((current) => (current.some((m) => m.id === msg.id) ? current : [...current, msg]));
          if (msg.senderId !== currentUserId) socket.emit("read", { threadId: t.id });
        });

        socket.on("typing", ({ userId, isTyping }) => {
          if (userId === currentUserId) return;
          setTypingUsers((current) => ({ ...current, [userId]: isTyping }));
        });

        socket.on("read-receipt", ({ userId }) => {
          if (userId === currentUserId) return;
          setMessages((current) => current.map((m) => (
            m.senderId === currentUserId && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m
          )));
        });
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [bookingId, currentUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || !thread || !socketRef.current) return;
    setSending(true);
    socketRef.current.emit("send-message", { threadId: thread.id, message: text }, (ack) => {
      setSending(false);
      if (ack?.success) setInput("");
    });
  };

  const handleTyping = (value) => {
    setInput(value);
    if (!socketRef.current || !thread) return;
    socketRef.current.emit("typing", { threadId: thread.id, isTyping: true });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("typing", { threadId: thread.id, isTyping: false });
    }, 1500);
  };

  const someoneTyping = Object.values(typingUsers).some(Boolean);

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex-1 overflow-y-auto space-y-2.5 p-1">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <span className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : loadError ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <MessageCircle className="w-8 h-8 text-slate-200 mb-2" />
            <p className="text-sm text-slate-400">Couldn't load this chat.</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <MessageCircle className="w-8 h-8 text-slate-200 mb-2" />
            <p className="text-sm text-slate-400">No messages yet — say hello!</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMine = m.senderId === currentUserId;
            // Bot messages only ever show up as PAST history here (the client's earlier bot
            // conversation, before this driver/broker was pulled in) — never sent by, or
            // addressed to, this user, so they're never "mine" and never get quick-reply pills,
            // just a visually distinct bubble marking them as automated.
            const isBot = m.senderRole === "bot";
            return (
              <div key={m.id} className={`flex ${isBot ? "justify-start" : isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                  isBot ? "bg-violet-50 text-violet-900 border border-violet-100 rounded-bl-sm" :
                  isMine ? "bg-primary text-white rounded-br-sm" : "bg-slate-100 text-slate-800 rounded-bl-sm"
                }`}>
                  {isBot ? (
                    <p className="flex items-center gap-1 text-[10px] font-semibold text-violet-500 mb-0.5">
                      <Bot className="w-3 h-3" /> Gadidosti Assistant
                    </p>
                  ) : !isMine && (
                    <p className="text-[10px] font-semibold opacity-70 mb-0.5">{m.senderName}</p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{m.message}</p>
                  <p className={`text-[10px] mt-0.5 flex items-center justify-end gap-0.5 ${isBot ? "text-violet-400" : isMine ? "text-white/70" : "text-slate-400"}`}>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {isMine && !isBot && (
                      <CheckCheck className={`w-3.5 h-3.5 flex-shrink-0 ${m.readAt ? "text-primary-50" : "text-white/50"}`} />
                    )}
                  </p>
                </div>
              </div>
            );
          })
        )}
        {someoneTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-3.5 py-3 flex items-center gap-1">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-typing-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {isLocked ? (
        <div className="flex items-center justify-center gap-2 pt-3 border-t border-slate-100 mt-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400 text-center py-2.5">
            <Lock className="w-3.5 h-3.5 flex-shrink-0" />
            This trip is complete — the chat has closed.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100 mt-2">
          <input
            value={input}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSend(); } }}
            placeholder="Type a message..."
            disabled={loading || !thread}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors disabled:opacity-50 min-w-0"
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim() || !thread}
            className="w-10 h-10 flex-shrink-0 rounded-full bg-primary text-white flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
