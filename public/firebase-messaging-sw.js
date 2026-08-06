// Firebase Cloud Messaging service worker — handles push while the app is in the background
// or closed. Runs outside the Vite bundle (plain script, no ES modules, no import.meta.env),
// so the Firebase Web SDK config below has to be hardcoded rather than read from .env. These
// are the same public Web SDK values as VITE_FIREBASE_* in .env (safe to expose client-side)
// — keep the two in sync by hand whenever the Firebase project config changes.
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
});

const messaging = firebase.messaging();

// Foreground pushes are handled by the app itself (see src/lib/fcm.js's onMessage listener) —
// this only fires for background/killed-app pushes, which the OS shows via the notification
// tray automatically. We still hook onBackgroundMessage so the notification body/click target
// can use `data` fields (title/body alone wouldn't carry booking_id etc. through to the click).
messaging.onBackgroundMessage((payload) => {
  const { notification, data } = payload;
  self.registration.showNotification(notification?.title || "GadiDost", {
    body: notification?.body || "",
    icon: "/gadidost-logo.png",
    badge: "/gadidost-logo.png",
    data: data || {},
  });
});

// Tapping the tray notification focuses an already-open tab if there is one, otherwise opens
// a new one — either way landing on "/" with the notification's type/meta as query params.
// The app reads those on load (see src/lib/notificationRoutes.js + the FcmBridge mount effect
// in App.jsx) and deep-links from there, since only the app knows whether the signed-in user
// is a broker or driver and which route each notification type maps to for that role.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const params = new URLSearchParams();
  if (data.type) params.set("ntype", data.type);
  if (data.notification_id) params.set("nid", data.notification_id);
  if (data.booking_id) params.set("booking_id", data.booking_id);
  if (data.job_request_id) params.set("job_request_id", data.job_request_id);
  if (data.driver_request_id) params.set("driver_request_id", data.driver_request_id);
  if (data.trip_id) params.set("trip_id", data.trip_id);
  const targetUrl = `/?${params.toString()}`;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.postMessage({ type: "notification-click", data });
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
