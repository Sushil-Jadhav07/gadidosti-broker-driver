import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { registerFcmToken, subscribeToForegroundMessages } from "../lib/fcm";
import { routeForNotification } from "../lib/notificationRoutes";
import { api, getToken } from "../services/api";
import { adaptDriverRequest } from "../utils";
import NewRequestPopup from "./driver/NewRequestPopup";

// The exact title gadidosti-backend's booking.controller.js sends for a brand-new
// driver_requests row (both the single direct-pick flow and each row of a "Find Truck" radius
// broadcast use this same literal string) — used below to pick this one push out of every other
// 'booking'-type push a driver can receive (status updates, "driver not responding", etc., none
// of which warrant a popup) without needing a dedicated push type of its own.
const NEW_DRIVER_REQUEST_TITLE = "New Booking Request";

// Mounted once near the root (inside the router, auth, and toast providers — see App.jsx) so
// push notifications work regardless of which page is currently showing. Renders nothing;
// this is pure side-effect wiring for the 3 push-notification cases:
//   1. Registers/refreshes the FCM token with the backend on every login (and app load while
//      already logged in) — see registerFcmToken.
//   2. Foreground pushes (app open, tab focused): Firebase's onMessage fires here directly —
//      shown as an in-app toast since the OS won't show its own tray notification for these.
//   3. Background/killed-app pushes: the OS handles showing the tray notification (see
//      public/firebase-messaging-sw.js), but tapping it needs the app to deep-link — handled
//      below via both the postMessage the service worker sends to an already-open tab, and
//      the ?ntype=... query params it puts on the URL when it has to open a fresh one.
export default function FcmBridge() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const registeredForUserRef = useRef(null);
  // A brand-new driver_requests row — shown as a proper modal (see NewRequestPopup) instead of
  // the generic corner toast below, since this is time-sensitive and easy to miss as a toast.
  const [newRequest, setNewRequest] = useState(null);

  useEffect(() => {
    const accessToken = user?.tokens?.access_token;
    if (!accessToken || !["broker", "driver"].includes(user.role)) return;
    if (registeredForUserRef.current === user.id) return;
    registeredForUserRef.current = user.id;
    registerFcmToken(accessToken, "web");
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let unsubscribe = () => {};
    // Foreground pushes just surface as a toast + refresh the bell's unread count — the user
    // is already looking at the app, so nothing is force-navigated (unlike a background tap,
    // which only happens because they deliberately clicked the tray notification). Exception:
    // a driver's brand-new booking request gets the popup below instead of a toast.
    subscribeToForegroundMessages((payload) => {
      const { notification, data } = payload || {};

      if (user.role === "driver" && notification?.title === NEW_DRIVER_REQUEST_TITLE && data?.driver_request_id) {
        api.get(`/api/driver-requests/${data.driver_request_id}`, getToken())
          .then((res) => {
            if (res?.success && res.data?.request) setNewRequest(adaptDriverRequest(res.data.request));
          })
          .catch(() => {
            // Fall back to the plain toast if the fetch fails (request already actioned/
            // expired, network hiccup, etc.) rather than showing nothing at all.
            addToast(`${notification.title}${notification.body ? ` — ${notification.body}` : ""}`, "info", 6000);
          });
        window.dispatchEvent(new CustomEvent("notifications:refresh"));
        return;
      }

      if (notification?.title) {
        addToast(`${notification.title}${notification.body ? ` — ${notification.body}` : ""}`, "info", 6000);
      }
      window.dispatchEvent(new CustomEvent("notifications:refresh"));
    }).then((unsub) => { unsubscribe = unsub; });
    return () => unsubscribe();
  }, [user, addToast]);

  // Background/killed-app tap where a tab was already open — the service worker's
  // notificationclick handler focuses it and posts the notification's data here.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handler = (event) => {
      if (event.data?.type !== "notification-click" || !user) return;
      const { type, ...meta } = event.data.data || {};
      const target = routeForNotification({ type, meta, role: user.role });
      if (target) navigate(target);
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [user, navigate]);

  // Background/killed-app tap where a fresh tab had to be opened — the service worker put the
  // notification's data on the URL as query params (see firebase-messaging-sw.js) since a
  // brand-new tab has no app state yet to receive a postMessage into.
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const type = params.get("ntype");
    if (!type) return;
    const meta = {
      booking_id: params.get("booking_id"),
      job_request_id: params.get("job_request_id"),
      driver_request_id: params.get("driver_request_id"),
      trip_id: params.get("trip_id"),
    };
    const target = routeForNotification({ type, meta, role: user.role });
    // Always strip the query params, even with no route match, so a refresh doesn't re-trigger this.
    window.history.replaceState({}, "", window.location.pathname);
    if (target) navigate(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <NewRequestPopup
      request={newRequest}
      onClose={() => setNewRequest(null)}
      onReview={() => { setNewRequest(null); navigate("/driver/requests"); }}
    />
  );
}
