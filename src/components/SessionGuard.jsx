import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../hooks/useAuth";
import Modal from "./broker/Modal";
import { ShieldAlert } from "lucide-react";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Mounted once near the root (inside auth/router providers — see App.jsx), same placement
// pattern as FcmBridge. Driver and broker accounts only allow one active session at a time
// (see gadidosti-backend's auth.controller.js rejectIfActiveSession) — a second login attempt
// with the same account is BLOCKED server-side (this session is completely unaffected, nothing
// is revoked), and this session gets a real-time 'login-attempt-alert' push so the legitimate
// user finds out someone tried. Purely informational — single acknowledgment, no forced
// logout, no second choice to make, this session just keeps working normally afterward.
export default function SessionGuard() {
  const { user } = useAuth();
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const accessToken = user?.tokens?.access_token;
    if (!accessToken || !["broker", "driver"].includes(user.role)) return undefined;

    const socket = io(BASE, { auth: { token: accessToken }, transports: ["websocket", "polling"] });
    socket.on("login-attempt-alert", (payload) => setAlert(payload?.message || "Someone just tried to log in to your account from another device."));

    return () => socket.disconnect();
  }, [user?.id, user?.role, user?.tokens?.access_token]);

  return (
    <Modal isOpen={!!alert} onClose={() => setAlert(null)} title="Login attempt blocked">
      <div className="flex flex-col items-center text-center gap-3 py-2">
        <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
          <ShieldAlert size={22} className="text-amber-500" />
        </div>
        <p className="text-sm text-slate-600">{alert}</p>
        <button
          onClick={() => setAlert(null)}
          className="mt-2 w-full py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          OK
        </button>
      </div>
    </Modal>
  );
}
