import { initializeApp, getApps } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

// Same Firebase project as fcm.js (push notifications) — kept in its own file since that's
// this app's existing convention (one file per Firebase feature), not because it needs a
// separate app instance; getApps() below reuses fcm.js's app if that's already initialized.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

let authInstance = null;
const getAuthInstance = () => {
  if (!isConfigured) return null;
  if (!authInstance) {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    authInstance = getAuth(app);
  }
  return authInstance;
};

// reCAPTCHA (invisible) is mandatory for Firebase Phone Auth — Google's own bot-prevention
// requirement. One verifier is reused across send attempts on the same page load;
// resetRecaptcha() below clears it after a failed send, since an already-solved/expired
// challenge can't be reused for a retry.
let recaptchaVerifier = null;
const ensureRecaptcha = (containerId) => {
  const auth = getAuthInstance();
  if (!auth) return null;
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, { size: "invisible" });
  }
  return recaptchaVerifier;
};

export const resetRecaptcha = () => {
  if (recaptchaVerifier) {
    try { recaptchaVerifier.clear(); } catch { /* already torn down */ }
    recaptchaVerifier = null;
  }
};

// phone10Digit: plain 10-digit Indian number (no +91), same format used everywhere else in
// this app. Returns a confirmationResult; call .confirm(code) on it to verify and sign in
// (see Login.jsx's handleVerifyOtp), which also returns the Firebase user/ID token.
export const sendFirebaseOtp = async (phone10Digit, containerId = "recaptcha-container") => {
  const auth = getAuthInstance();
  if (!auth) throw new Error("Phone verification is not configured in this environment");
  const verifier = ensureRecaptcha(containerId);
  return signInWithPhoneNumber(auth, `+91${phone10Digit}`, verifier);
};
