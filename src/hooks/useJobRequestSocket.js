import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { getToken } from "../services/api";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Live push for the broker-broadcast negotiation flow — the backend emits
// 'job-request-updated' straight to the acting user's own socket room (see
// gadidosti-backend's job.controller.js emitJobRequestUpdate) on every decline/counter/
// client-accept/client-reject/client-counter/accept. Same connect/auth/cleanup shape as
// useDriverRequestSocket.js.
// onCreate (optional) fires for the distinct 'job-request-created' event instead — exactly
// once, the instant a brand-new row lands for this broker, never on any later
// counter/decline/accept to a request they already know about (see FcmBridge.jsx's popup).
export function useJobRequestSocket(onUpdate, onCreate) {
  const onUpdateRef = useRef(onUpdate);
  const onCreateRef = useRef(onCreate);
  onUpdateRef.current = onUpdate;
  onCreateRef.current = onCreate;

  useEffect(() => {
    const token = getToken();
    if (!token) return undefined;

    const socket = io(BASE, { auth: { token }, transports: ["websocket", "polling"] });
    socket.on("job-request-updated", (request) => onUpdateRef.current?.(request));
    socket.on("job-request-created", (request) => onCreateRef.current?.(request));

    return () => socket.disconnect();
  }, []);
}
