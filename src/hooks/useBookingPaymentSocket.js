import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { getToken } from "../services/api";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Live push for "the client paid via the app" — backend emits 'booking-payment-updated' to the
// assigned driver's and broker's own socket room the moment BookingModel marks a booking paid
// (see gadidosti-backend's booking.controller.js payBooking). Same connect/auth/cleanup shape
// as useDriverRequestSocket.js.
export function useBookingPaymentSocket(onUpdate) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const token = getToken();
    if (!token) return undefined;

    const socket = io(BASE, { auth: { token }, transports: ["websocket", "polling"] });
    socket.on("booking-payment-updated", (payload) => onUpdateRef.current?.(payload));

    return () => socket.disconnect();
  }, []);
}
