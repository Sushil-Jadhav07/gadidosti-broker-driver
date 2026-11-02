import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import SplashLoader from "../components/SplashLoader";
import { sendFirebaseOtp, resetRecaptcha } from "../lib/firebaseAuth";
import {
  Truck, User, Eye, EyeOff, AlertCircle, Mail, Lock, Phone, KeyRound,
  ShieldCheck, IndianRupee, BarChart3, ArrowRight, CheckCircle,
} from "lucide-react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const FEATURES = [
  { icon: Truck, label: "Real-time Fleet Management", sub: "Track all your trucks live on one dashboard" },
  { icon: ShieldCheck, label: "Verified & Compliant", sub: "KYC-secured accounts for all users" },
  { icon: IndianRupee, label: "Fast Bi-monthly Settlements", sub: "Guaranteed payouts, zero delays" },
  { icon: BarChart3, label: "Earnings Analytics", sub: "Deep revenue insights at a glance" },
];

const STATS = ["500+ Brokers", "2,000+ Drivers", "Rs 50Cr+ Transactions"];

const CREDS = {
  broker: { email: "broker@ssklogistics.in", password: "Admin@123456" },
  driver: { email: "driver.test1@gmail.com", password: "Test@123456" },
};

// One loop of loaderGif.gif before handing off to the dashboard (see goToDashboard) — was
// referenced but never actually defined anywhere in this file, so every successful login threw
// a ReferenceError right after authenticating (session still persisted to localStorage, so a
// manual refresh would recover, but the transition itself crashed every time).
const SPLASH_MIN_MS = 1200;

export default function Login() {
  const [role, setRole] = useState("broker");
  // "password" (default, unchanged) or "otp" — independent of the Broker/Driver role toggle
  // above; either role can use either method.
  const [method, setMethod] = useState("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const googleBtnRef = useRef(null);

  // OTP method's own state — "phone" stage (enter number, request a code) -> "code" stage.
  const [otpStage, setOtpStage] = useState("phone");
  const [otpPhone, setOtpPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState("");
  const otpCodeInputRef = useRef(null);

  const { loginBroker, loginDriver, googleLogin, firebaseLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Set by useAuth.jsx's global 401 handler when an existing session dies (force-logout, or a
  // naturally expired access token) — shown once, then cleared from history state so it doesn't
  // reappear if the driver later navigates back to this page normally.
  const [sessionMessage, setSessionMessage] = useState(location.state?.sessionMessage || "");
  useEffect(() => {
    if (location.state?.sessionMessage) {
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const autofill = () => {
    setEmail(CREDS[role].email);
    setPassword(CREDS[role].password);
    setError("");
  };

  const handleRoleSwitch = (r) => {
    setRole(r);
    setError("");
    setEmail("");
    setPassword("");
    setOtpStage("phone");
    setOtpPhone("");
    setOtpCode("");
    setOtpError("");
    resetRecaptcha();
  };

  const switchMethod = (next) => {
    setMethod(next);
    setError("");
    setOtpStage("phone");
    setOtpCode("");
    setOtpError("");
    resetRecaptcha();
  };

  // Stable ref so GSI callback always has the latest role/state
  const credentialHandlerRef = useRef(null);
  credentialHandlerRef.current = async ({ credential }) => {
    setError("");
    setGoogleLoading(true);
    try {
      const { user, needs_phone } = await googleLogin(credential, role);
      if (needs_phone) {
        // Phone is optional for Google users — they can add it in profile settings
        console.info("User signed in via Google without a phone number.");
      }
      goToDashboard(user.role === "broker" ? "/broker" : "/driver");
    } catch (err) {
      setError(err.message || "Google Sign-In failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    const clientId = GOOGLE_CLIENT_ID;
    if (!clientId || clientId.startsWith("your-") || !googleBtnRef.current) return;

    const renderButton = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (res) => credentialHandlerRef.current?.(res),
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "rectangular",
        width: googleBtnRef.current.clientWidth || 360,
      });
    };

    if (window.google?.accounts?.id) { renderButton(); return; }

    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", renderButton);
      return () => existing.removeEventListener("load", renderButton);
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = renderButton;
    document.head.appendChild(script);
  }, []);

  const showGoogleBtn = GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.startsWith("your-");

  // Shows the same full-screen loader as the app's boot splash for one full loop of
  // loaderGif.gif before handing off to the dashboard, instead of jumping there instantly.
  const goToDashboard = (path) => {
    setTransitioning(true);
    setTimeout(() => navigate(path), SPLASH_MIN_MS);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (role === "broker") {
        await loginBroker(email, password);
        goToDashboard("/broker");
      } else {
        await loginDriver(email, password);
        goToDashboard("/driver");
      }
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
      setLoading(false);
    }
  };

  // Firebase's own error codes aren't written for end users — translated to plain messages
  // here rather than shown as-is (e.g. "Firebase: Error (auth/invalid-phone-number).").
  const firebaseOtpErrorMessage = (err) => {
    switch (err?.code) {
      case "auth/invalid-phone-number": return "Enter a valid 10-digit phone number.";
      case "auth/too-many-requests": return "Too many attempts — please wait a while before trying again.";
      case "auth/invalid-verification-code": return "That code isn't right. Please check and try again.";
      case "auth/code-expired": return "This code has expired — request a new one.";
      default: return err?.message || "Something went wrong. Please try again.";
    }
  };

  // Holds Firebase's confirmationResult between send and verify — an SDK object, not state.
  const firebaseConfirmationRef = useRef(null);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setOtpError("");
    setOtpSending(true);
    try {
      firebaseConfirmationRef.current = await sendFirebaseOtp(otpPhone);
      setOtpStage("code");
      setTimeout(() => otpCodeInputRef.current?.focus(), 50);
    } catch (err) {
      resetRecaptcha();
      setOtpError(firebaseOtpErrorMessage(err));
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setOtpError("");
    setOtpVerifying(true);
    try {
      if (!firebaseConfirmationRef.current) throw new Error("Please request a new OTP.");
      const result = await firebaseConfirmationRef.current.confirm(otpCode);
      const idToken = await result.user.getIdToken();
      await firebaseLogin(idToken, role);
      goToDashboard(role === "broker" ? "/broker" : "/driver");
    } catch (err) {
      setOtpError(firebaseOtpErrorMessage(err));
      setOtpVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpError("");
    setOtpSending(true);
    try {
      resetRecaptcha();
      firebaseConfirmationRef.current = await sendFirebaseOtp(otpPhone);
    } catch (err) {
      setOtpError(firebaseOtpErrorMessage(err));
    } finally {
      setOtpSending(false);
    }
  };

  if (transitioning) return <SplashLoader />;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Left Panel (desktop only) — solid green gradient, same treatment as the
          client portal's login/register screens, so all three GadiDost apps match. ── */}
      <div
        className="hidden lg:flex w-[52%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #14532D 0%, #166534 55%, #16A34A 100%)" }}
      >
        {/* Light highlight, not green-on-green — a colored glow would barely show against a
            background that's already this same green. */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 75% 15%, rgba(255,255,255,0.16) 0%, transparent 55%)" }} />

        {/* Logo — a white chip keeps the real logo colors intact instead of forcing it all
            white via a filter. */}
        <div className="relative z-10">
          <div className="bg-white rounded-lg px-3 py-2 inline-block">
            <img src="/gadidost-logo.png" alt="GadiDost" className="h-10 w-auto" />
          </div>
          <p className="text-white/70 text-sm mt-2 font-inter">Logistics Management Platform</p>
        </div>

        {/* Hero text + features */}
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white font-poppins leading-tight mb-4">
            India&apos;s Smartest<br />Logistics Platform
          </h1>
          <p className="text-white/70 font-inter text-[15px] mb-10 leading-relaxed">
            Connect brokers and drivers seamlessly. Manage fleets, track jobs,<br />and grow your business — all in one place.
          </p>
          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon size={17} className="text-white" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold font-poppins">{label}</p>
                  <p className="text-white/60 text-xs font-inter mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats strip */}
        <div className="relative z-10 flex items-center gap-3 flex-wrap">
          {STATS.map((s) => (
            <div key={s} className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1.5">
              <CheckCircle size={11} className="text-white flex-shrink-0" />
              <span className="text-white text-[11px] font-inter font-medium">{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Panel (form) ── */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-slate-50 min-h-screen lg:min-h-0">
        <div className="w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-5">
            <img src="/gadidost-logo.png" alt="GadiDost" className="h-10 mx-auto mb-2" />
            <p className="text-slate-400 text-sm font-inter">Logistics Management Platform</p>
          </div>

          <div className="">
            {/* Heading */}
            <div className="mb-5 text-center">
              <h2 className="text-2xl font-bold text-slate-900 font-poppins">Welcome back</h2>
              <p className="text-slate-500 text-sm font-inter mt-1">Sign in to your {role} account</p>
            </div>

            {/* Role Toggle */}
            <div className="flex rounded-xl bg-slate-100 p-1 mb-5 gap-1">
              {[
                { id: "broker", label: "Broker", icon: Truck },
                { id: "driver", label: "Driver", icon: User },
              ].map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => handleRoleSwitch(id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    role === id
                      ? "bg-white shadow text-primary"
                      : "text-slate-500 hover:text-slate-700"
                  }`}>
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>

            {/* Method Toggle — Password vs OTP, independent of the Broker/Driver toggle above */}
            <div className="flex rounded-xl bg-slate-100 p-1 mb-5 gap-1">
              {[
                { id: "password", label: "Password" },
                { id: "otp", label: "OTP" },
              ].map(({ id, label }) => (
                <button key={id} type="button" onClick={() => switchMethod(id)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    method === id
                      ? "bg-white shadow text-primary"
                      : "text-slate-500 hover:text-slate-700"
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Firebase Phone Auth's required reCAPTCHA host — invisible, never shown to the
                user, but the element has to exist in the DOM before sendFirebaseOtp's first
                call. */}
            <div id="recaptcha-container" />

            {sessionMessage && !error && (
              <div className="flex items-center gap-2 bg-amber-50 text-amber-700 rounded-lg px-3 py-2.5 text-sm mb-3.5">
                <AlertCircle size={15} className="flex-shrink-0" />
                {sessionMessage}
              </div>
            )}

            {/* Form */}
            {method === "password" ? (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-2">Email Address</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="input-field pl-9 pr-3 py-2.5"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-2">Password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="input-field pl-9 pr-10 py-2.5"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-lg px-3 py-2.5 text-sm">
                    <AlertCircle size={15} className="flex-shrink-0" />
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2 mt-1 rounded-xl">
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>Sign In <ArrowRight size={15} /></>
                  )}
                </button>
              </form>
            ) : otpStage === "phone" ? (
              <form onSubmit={handleSendOtp} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-2">Phone Number</label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={otpPhone}
                      onChange={(e) => setOtpPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="Enter your registered phone number"
                      className="input-field pl-9 pr-3 py-2.5"
                      required
                    />
                  </div>
                </div>

                {otpError && (
                  <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-lg px-3 py-2.5 text-sm">
                    <AlertCircle size={15} className="flex-shrink-0" />
                    {otpError}
                  </div>
                )}

                <button type="submit" disabled={otpSending || otpPhone.length !== 10}
                  className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2 mt-1 rounded-xl">
                  {otpSending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>Send OTP <ArrowRight size={15} /></>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">Enter OTP</label>
                    <button type="button" onClick={() => setOtpStage("phone")} className="text-xs font-semibold text-primary hover:underline">
                      Change number
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mb-2 font-inter">We sent a code to {otpPhone}.</p>
                  <div className="relative">
                    <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      ref={otpCodeInputRef}
                      type="text"
                      inputMode="numeric"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="6-digit code"
                      className="input-field pl-9 pr-3 py-2.5 tracking-widest"
                      required
                    />
                  </div>
                </div>

                {otpError && (
                  <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-lg px-3 py-2.5 text-sm">
                    <AlertCircle size={15} className="flex-shrink-0" />
                    {otpError}
                  </div>
                )}

                <button type="submit" disabled={otpVerifying || otpCode.length !== 6}
                  className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2 mt-1 rounded-xl">
                  {otpVerifying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>Verify &amp; Sign In <ArrowRight size={15} /></>
                  )}
                </button>

                <button type="button" onClick={handleResendOtp} disabled={otpSending}
                  className="w-full text-center text-xs font-semibold text-primary hover:underline disabled:opacity-50">
                  {otpSending ? "Resending..." : "Resend OTP"}
                </button>
              </form>
            )}

            {showGoogleBtn && (
              <>
                <div className="relative mt-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-100" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-xs text-slate-400 font-inter">or continue with</span>
                  </div>
                </div>

                <div ref={googleBtnRef} className="mt-4 w-full flex justify-center" style={{ minHeight: 44 }} />

                {googleLoading && (
                  <p className="text-xs text-slate-400 text-center mt-2 font-inter flex items-center justify-center gap-1.5">
                    <span className="w-3 h-3 border border-slate-300 border-t-primary rounded-full animate-spin" />
                    Signing in with Google...
                  </p>
                )}
              </>
            )}

            {/* Demo credentials — same centered, plain look and position (below Google
                sign-in) as the client portal's login; still tappable to auto-fill above. */}
            {/* <button type="button" onClick={autofill}
              className="w-full mt-4 bg-primary-50 hover:bg-primary-100 active:bg-primary/20 border border-primary-100 rounded-xl p-3 transition-all text-center">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Demo Credentials</p>
              <p className="text-xs font-mono text-primary">
                {CREDS[role].email} <span className="text-primary/40 mx-1.5">|</span> {CREDS[role].password}
              </p>
            </button> */}

            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-500 font-inter">
                Don&apos;t have an account?{" "}
                <Link to="/register" className="text-primary font-semibold hover:underline">
                  Register here
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-4 font-inter">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
