import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { getToken } from "../services/api";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Live push for the driver-request negotiation flow (direct client-pick + broker-assign
// origins) — the backend emits 'driver-request-updated' straight to the acting user's own
// socket room (see gadidosti-backend's realtime/socket.js auto-join +
// driverRequest.controller.js's emitDriverRequestUpdate) on every accept/decline/counter/
// timeout, and to the driver when a broker first assigns them (job.controller.js's
// assignDriver). Callers still poll as a fallback in case the socket connection drops — this
// just makes updates arrive immediately instead of waiting for the next poll tick. Same
// connect/auth/cleanup shape as ChatWindow.jsx's inline socket, pulled out here since more
// than one screen needs it.
// onCreate (optional) fires for the distinct 'driver-request-created' event instead —
// exactly once, the instant a brand-new row lands for this driver (single direct-pick, or one
// row of a "Find Truck" radius broadcast), never on any later accept/counter/decline/timeout to
// a request they already know about (those still go through onUpdate above). See
// FcmBridge.jsx's popup, the reason this second event/callback exists at all.
export function useDriverRequestSocket(onUpdate, onCreate) {
  const onUpdateRef = useRef(onUpdate);
  const onCreateRef = useRef(onCreate);
  onUpdateRef.current = onUpdate;
  onCreateRef.current = onCreate;

  useEffect(() => {
    const token = getToken();
    if (!token) return undefined;

    const socket = io(BASE, { auth: { token }, transports: ["websocket", "polling"] });
    socket.on("driver-request-updated", (request) => onUpdateRef.current?.(request));
    socket.on("driver-request-created", (request) => onCreateRef.current?.(request));

    return () => socket.disconnect();
  }, []);
}
