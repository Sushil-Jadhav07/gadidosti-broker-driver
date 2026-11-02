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
// requirement.
let recaptchaVerifier = null;

// Tears down both Firebase's reference AND the actual rendered widget markup. .clear() alone
// isn't reliable enough on its own across browsers — a leftover rendered widget in the
// container is exactly what makes the NEXT `new RecaptchaVerifier(...)` throw "reCAPTCHA has
// already been rendered in this element" on a retry after a failed send (e.g. the SMS region
// policy error), which is what was happening before this explicit DOM reset was added.
export const resetRecaptcha = () => {
  if (recaptchaVerifier) {
    try { recaptchaVerifier.clear(); } catch { /* already torn down */ }
    recaptchaVerifier = null;
  }
  const container = document.getElementById("recaptcha-container");
  if (container) container.innerHTML = "";
};

// phone10Digit: plain 10-digit Indian number (no +91), same format used everywhere else in
// this app. Returns a confirmationResult; call .confirm(code) on it to verify and sign in
// (see Login.jsx's handleVerifyOtp), which also returns the Firebase user/ID token.
export const sendFirebaseOtp = async (phone10Digit, containerId = "recaptcha-container") => {
  const auth = getAuthInstance();
  if (!auth) throw new Error("Phone verification is not configured in this environment");
  // Always start from a clean slate rather than reusing a verifier across requests — an
  // already-solved/expired invisible challenge can't be reused for a retry anyway, and this is
  // what actually prevents the "already rendered" error instead of just reacting to it after
  // the fact.
  resetRecaptcha();
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, { size: "invisible" });
  return signInWithPhoneNumber(auth, `+91${phone10Digit}`, recaptchaVerifier);
};
