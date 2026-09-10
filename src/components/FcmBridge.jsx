import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { registerFcmToken, subscribeToForegroundMessages } from "../lib/fcm";
import { routeForNotification } from "../lib/notificationRoutes";
import { adaptDriverRequest, adaptJobRequest } from "../utils";
import { useDriverRequestSocket } from "../hooks/useDriverRequestSocket";
import { useJobRequestSocket } from "../hooks/useJobRequestSocket";
import NewRequestPopup from "./driver/NewRequestPopup";
import NewJobRequestPopup from "./broker/NewJobRequestPopup";

// Mounted once near the root (inside the router, auth, and toast providers — see App.jsx) so
// this works regardless of which page is currently showing. Renders nothing itself but the two
// popups below; this is pure side-effect wiring for:
//   1. FCM token registration on every login (and app load while already logged in).
//   2. Foreground push -> toast + bell-refresh, for every notification EXCEPT a brand-new
//      request (see below).
//   3. Background/killed-app push taps -> deep-link navigation.
//   4. A brand-new driver_requests/job_requests row -> a proper modal popup instead of a toast.
//      Driven by a socket event ('driver-request-created'/'job-request-created'), not the FCM
//      push above — a push depends on the user having granted notification permission (which
//      may never have been asked, or may have been denied), while the socket connection these
//      pages already use for live negotiation updates has no such dependency and fires
//      instantly regardless. The FCM push for the same event still arrives and would otherwise
//      also show a plain toast; dedupe via seenRequestIdsRef stops it from double-showing once
//      the socket has already popped up the modal for that same request id.
export default function FcmBridge() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const registeredForUserRef = useRef(null);
  const seenRequestIdsRef = useRef(new Set());

  const [newDriverRequest, setNewDriverRequest] = useState(null);
  const [newJobRequest, setNewJobRequest] = useState(null);

  useEffect(() => {
    const accessToken = user?.tokens?.access_token;
    if (!accessToken || !["broker", "driver"].includes(user.role)) return;
    if (registeredForUserRef.current === user.id) return;
    registeredForUserRef.current = user.id;
    registerFcmToken(accessToken, "web");
  }, [user]);

  // Sockets are always connected here regardless of role (both hooks are cheap, auth-scoped
  // connections) — but only the callback matching the signed-in user's actual role ever does
  // anything, since the backend only ever emits driver-request-created to a driver_id and
  // job-request-created to a broker_id, never the other way round.
  useDriverRequestSocket(undefined, (request) => {
    if (user?.role !== "driver" || !request?.id) return;
    if (seenRequestIdsRef.current.has(request.id)) return;
    seenRequestIdsRef.current.add(request.id);
    setNewDriverRequest(adaptDriverRequest(request));
  });
  useJobRequestSocket(undefined, (request) => {
    if (user?.role !== "broker" || !request?.id) return;
    if (seenRequestIdsRef.current.has(request.id)) return;
    seenRequestIdsRef.current.add(request.id);
    setNewJobRequest(adaptJobRequest(request));
  });

  useEffect(() => {
    if (!user) return;
    let unsubscribe = () => {};
    // Foreground pushes surface as a toast + refresh the bell's unread count — the user is
    // already looking at the app, so nothing is force-navigated (unlike a background tap,
    // which only happens because they deliberately clicked the tray notification). A brand-new
    // request's push is suppressed here once the socket above has already shown the modal for
    // it (see seenRequestIdsRef) — otherwise both would fire for the same event.
    subscribeToForegroundMessages((payload) => {
      const { notification, data } = payload || {};
      const alreadyShownAsPopup = (data?.driver_request_id && seenRequestIdsRef.current.has(data.driver_request_id))
        || (data?.job_request_id && seenRequestIdsRef.current.has(data.job_request_id));

      if (notification?.title && !alreadyShownAsPopup) {
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
    <>
      <NewRequestPopup
        request={newDriverRequest}
        onClose={() => setNewDriverRequest(null)}
        onReview={() => { setNewDriverRequest(null); navigate("/driver/requests"); }}
      />
      <NewJobRequestPopup
        request={newJobRequest}
        onClose={() => setNewJobRequest(null)}
        onReview={() => { setNewJobRequest(null); navigate("/job-requests"); }}
      />
    </>
  );
}
