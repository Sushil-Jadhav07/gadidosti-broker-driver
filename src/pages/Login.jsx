import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  Truck, User, Eye, EyeOff, AlertCircle,
  Zap, ShieldCheck, IndianRupee, BarChart3, ArrowRight, CheckCircle,
} from "lucide-react";

const FEATURES = [
  { icon: Truck, label: "Real-time Fleet Management", sub: "Track all your trucks live on one dashboard" },
  { icon: ShieldCheck, label: "Verified & Compliant", sub: "KYC-secured accounts for all users" },
  { icon: IndianRupee, label: "Fast Bi-monthly Settlements", sub: "Guaranteed payouts, zero delays" },
  { icon: BarChart3, label: "Earnings Analytics", sub: "Deep revenue insights at a glance" },
];

const STATS = ["500+ Brokers", "2,000+ Drivers", "Rs 50Cr+ Transactions"];

const CREDS = {
  broker: { phone: "9000000003", password: "Broker@123" },
  driver: { phone: "9000000004", password: "Driver@123" },
};

export default function Login() {
  const [role, setRole] = useState("broker");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { loginBroker, loginDriver } = useAuth();
  const navigate = useNavigate();

  const autofill = () => {
    setPhone(CREDS[role].phone);
    setPassword(CREDS[role].password);
    setError("");
  };

  const handleRoleSwitch = (r) => {
    setRole(r);
    setError("");
    setPhone("");
    setPassword("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = role === "broker" ? loginBroker(phone, password) : loginDriver(phone, password);
    setTimeout(() => {
      setLoading(false);
      if (result.success) navigate(role === "broker" ? "/broker" : "/driver");
      else setError(result.error);
    }, 800);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Left Panel (desktop only) ── */}
      <div className="hidden lg:flex w-[52%] bg-secondary flex-col justify-between p-12 relative overflow-hidden">
        {/* Glow blobs */}
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #1976FF 0%, transparent 70%)", transform: "translate(-30%,-30%)" }} />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #17D86B 0%, transparent 70%)", transform: "translate(30%,30%)" }} />

        {/* Logo */}
        <div className="relative z-10">
          <img src="/gadidost-logo.png" alt="GadiDost" className="h-10"
            style={{ filter: "brightness(0) invert(1)" }} />
          <p className="text-blue-400 text-sm mt-2 font-inter">Logistics Management Platform</p>
        </div>

        {/* Hero text + features */}
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white font-poppins leading-tight mb-4">
            India&apos;s Smartest<br />Logistics Platform
          </h1>
          <p className="text-slate-400 font-inter text-[15px] mb-10 leading-relaxed">
            Connect brokers and drivers seamlessly. Manage fleets, track jobs,<br />and grow your business — all in one place.
          </p>
          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Icon size={17} className="text-primary" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold font-poppins">{label}</p>
                  <p className="text-slate-400 text-xs font-inter mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats strip */}
        <div className="relative z-10 flex items-center gap-3 flex-wrap">
          {STATS.map((s) => (
            <div key={s} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
              <CheckCircle size={11} className="text-emerald-400 flex-shrink-0" />
              <span className="text-white text-[11px] font-inter font-medium">{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Panel (form) ── */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-slate-50 min-h-screen lg:min-h-0">
        <div className="w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <img src="/gadidost-logo.png" alt="GadiDost" className="h-10 mx-auto mb-2" />
            <p className="text-slate-400 text-sm font-inter">Logistics Management Platform</p>
          </div>

          <div className="bg-white rounded-2xl shadow-modal p-6 sm:p-8">
            {/* Heading */}
            <div className="mb-6">
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

            {/* Auto-fill card */}
            <button type="button" onClick={autofill}
              className="w-full mb-5 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 border border-blue-200 rounded-xl p-3.5 transition-all group text-left">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Zap size={12} className="text-blue-500" />
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Demo Account — Click to Auto Fill</span>
                  </div>
                  <p className="text-xs text-blue-600 font-mono leading-relaxed">
                    Phone: {CREDS[role].phone}<br />
                    Password: {CREDS[role].password}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-blue-600 group-hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors flex-shrink-0 ml-3">
                  Auto Fill
                  <ArrowRight size={12} />
                </div>
              </div>
            </button>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone Number</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-inter select-none">+91</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter mobile number"
                    className="input-field pl-11 pr-3 py-2.5"
                    required
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="input-field px-3 py-2.5 pr-10"
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

            <div className="mt-5 pt-5 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-500 font-inter">
                Don&apos;t have an account?{" "}
                <Link to="/register" className="text-primary font-semibold hover:underline">
                  Register here
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-5 font-inter">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
