import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { api } from "../services/api";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Not every deploy has Firebase configured yet (local dev, or before the .env values are
// filled in) — every export below no-ops rather than throwing when that's the case, so the
// rest of the app never has to know whether push is actually wired up.
const isConfigured = () => !!(firebaseConfig.apiKey && VAPID_KEY);

// Remembers the token we last successfully POSTed to the backend, so logging in again on an
// already-registered device doesn't re-call the API every time, and logout knows what to
// send to DELETE /api/users/device-token.
const STORAGE_KEY = "ssk_fcm_token";
export const getStoredFcmToken = () => localStorage.getItem(STORAGE_KEY);

let messagingPromise = null;
const getMessagingInstance = async () => {
  if (!isConfigured() || !(await isSupported())) return null;
  if (!messagingPromise) {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    messagingPromise = Promise.resolve(getMessaging(app));
  }
  return messagingPromise;
};

// Call once right after login, and again on every app load while logged in — FCM tokens can
// rotate, and POST /api/users/device-token upserts, so calling it unconditionally is safe.
// Only actually prompts for notification permission if the user hasn't already answered.
export const registerFcmToken = async (accessToken, platform = "web") => {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging || !accessToken) return null;

    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return null;
    }
    if (Notification.permission !== "granted") return null;

    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    if (!token) return null;

    if (token !== getStoredFcmToken()) {
      await api.post("/api/users/device-token", { token, platform }, accessToken);
      localStorage.setItem(STORAGE_KEY, token);
    }
    return token;
  } catch {
    // Best-effort — push is a bonus delivery channel, never block login/app usage on it
    // (e.g. permission blocked at the OS level, browser without SW support, etc.).
    return null;
  }
};

// Call on logout so a signed-out device stops receiving this user's pushes.
export const unregisterFcmToken = async (accessToken) => {
  const token = getStoredFcmToken();
  if (!token) return;
  localStorage.removeItem(STORAGE_KEY);
  try {
    await api.delete("/api/users/device-token", { token }, accessToken);
  } catch {
    // Best-effort — nothing useful to do if this fails; the token still gets pruned
    // server-side the next time a push to it comes back invalid.
  }
};

// Foreground push only — background/killed-app notifications are handled entirely by
// public/firebase-messaging-sw.js's onBackgroundMessage, which the OS shows via the
// notification tray without this callback ever running.
export const subscribeToForegroundMessages = async (callback) => {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
};
