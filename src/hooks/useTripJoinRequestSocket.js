import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { getToken } from "../services/api";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Live push for part-load join requests — same shape as useDriverRequestSocket, just listening
// for the 'trip-join-request-created'/'trip-join-request-updated' events instead (see
// gadidosti-backend's tripJoinRequest.controller.js). Separate hook rather than extending the
// driver-request one since these are genuinely different events on a different table — a
// consumer that only cares about one shouldn't have to filter out the other.
export function useTripJoinRequestSocket(onUpdate, onCreate) {
  const onUpdateRef = useRef(onUpdate);
  const onCreateRef = useRef(onCreate);
  onUpdateRef.current = onUpdate;
  onCreateRef.current = onCreate;

  useEffect(() => {
    const token = getToken();
    if (!token) return undefined;

    const socket = io(BASE, { auth: { token }, transports: ["websocket", "polling"] });
    socket.on("trip-join-request-updated", (request) => onUpdateRef.current?.(request));
    socket.on("trip-join-request-created", (request) => onCreateRef.current?.(request));

    return () => socket.disconnect();
  }, []);
}
