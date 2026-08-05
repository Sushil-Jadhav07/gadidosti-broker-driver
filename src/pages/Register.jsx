import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  Truck, User, Eye, EyeOff, CheckCircle, ArrowLeft, ArrowRight, Building2, Lock, FileText, AlertCircle, Mail, Gauge, Calendar,
} from "lucide-react";

const TRUCK_TYPES = ["small", "medium", "large", "part"];
const REGISTRATION_REGEX = /^[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{1,4}$/i;
const EMPTY_TRUCK = { registration: "", category: "small", capacity: "", make: "", year: "", insuranceExpiry: "" };

export default function Register() {
  const [role, setRole] = useState("broker");
  const [step, setStep] = useState("account"); // "account" | "truck" | "done"
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", confirm: "",
    businessName: "",
  });
  const [truck, setTruck] = useState(EMPTY_TRUCK);
  const [truckError, setTruckError] = useState("");

  const { registerUser, registerDriver } = useAuth();
  const navigate = useNavigate();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setTruckField = (k) => (e) => setTruck((t) => ({ ...t, [k]: e.target.value }));

  const passwordsMatch = form.password === form.confirm || form.confirm === "";
  const canSubmitAccount = form.name && form.email && form.phone && form.password && form.confirm &&
    form.password === form.confirm &&
    (role === "broker" ? form.businessName : true);

  const doRegister = async () => {
    setError("");
    setLoading(true);
    try {
      if (role === "driver") {
        await registerDriver({
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          confirmPassword: form.confirm,
          registration: truck.registration.trim().toUpperCase(),
          category: truck.category,
          capacity: truck.capacity.trim(),
          make: truck.make.trim() || undefined,
          year: truck.year || undefined,
          insuranceExpiry: truck.insuranceExpiry || undefined,
        });
      } else {
        await registerUser({
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          role,
          business_name: form.businessName,
        });
      }
      setStep("done");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSubmit = (e) => {
    e.preventDefault();
    if (!canSubmitAccount) return;
    setError("");
    if (role === "driver") {
      setStep("truck");
      return;
    }
    doRegister();
  };

  const handleTruckSubmit = (e) => {
    e.preventDefault();
    if (!truck.registration.trim()) {
      setTruckError("Truck registration number is required.");
      return;
    }
    if (!REGISTRATION_REGEX.test(truck.registration.trim())) {
      setTruckError("Registration number looks invalid, e.g. MH-12-AB-1234.");
      return;
    }
    if (!truck.capacity.trim()) {
      setTruckError("Capacity is required.");
      return;
    }
    setTruckError("");
    doRegister();
  };

  if (step === "done") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-modal p-10 text-center max-w-sm w-full animate-fade-up">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 font-poppins">Account Verified!</h2>
          <p className="text-slate-500 text-sm font-inter mt-2">
            Your {role} account is ready.<br />Redirecting to login...
          </p>
          <div className="mt-5 flex justify-center">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <img src="/gadidost-logo.png" alt="GadiDost" className="h-10 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 font-poppins">
            {step === "truck" ? "Add your truck" : "Create your account"}
          </h1>
          <p className="text-slate-500 text-sm font-inter mt-1">
            {step === "truck" ? "This helps brokers find and verify your vehicle." : "Join India's leading logistics platform"}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-modal p-6 sm:p-8">
          {step === "account" && (
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg mb-6">
              {[
                { id: "broker", label: "Broker", icon: Truck },
                { id: "driver", label: "Driver", icon: User },
              ].map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" onClick={() => setRole(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold transition-all ${
                    role === id ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}>
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          )}

          {role === "driver" && (
            <div className="flex items-center gap-2 mb-6">
              {["Account", "Truck"].map((label, i) => {
                const stepIndex = step === "truck" ? 1 : 0;
                const active = i === stepIndex;
                const done = i < stepIndex;
                return (
                  <div key={label} className="flex items-center gap-2 flex-1 last:flex-initial">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-colors ${
                      done ? "bg-primary text-white" : active ? "bg-primary/10 text-primary border-2 border-primary" : "bg-slate-100 text-slate-400"
                    }`}>
                      {done ? <CheckCircle size={12} /> : i + 1}
                    </div>
                    <span className={`text-xs font-semibold whitespace-nowrap ${active || done ? "text-slate-700" : "text-slate-400"}`}>{label}</span>
                    {i === 0 && <div className={`flex-1 h-0.5 rounded-full transition-colors ${done ? "bg-primary" : "bg-slate-200"}`} />}
                  </div>
                );
              })}
            </div>
          )}

          {step === "account" && (
            <>
              <form onSubmit={handleAccountSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      {role === "broker" ? "Owner Name" : "Full Name"}
                    </label>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" value={form.name} onChange={set("name")}
                        className="input-field pl-9 pr-3 py-2.5" placeholder="Full name" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone Number</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">+91</span>
                      <input type="tel" value={form.phone} onChange={set("phone")} inputMode="numeric"
                        className="input-field pl-11 pr-3 py-2.5" placeholder="10-digit number" required />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="email" value={form.email} onChange={set("email")}
                      className="input-field pl-9 pr-3 py-2.5" placeholder="you@example.com" required />
                  </div>
                </div>

                {role === "broker" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Business Name</label>
                    <div className="relative">
                      <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" value={form.businessName} onChange={set("businessName")}
                        className="input-field pl-9 pr-3 py-2.5" placeholder="Your business name" required />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type={showPassword ? "text" : "password"} value={form.password} onChange={set("password")}
                        className="input-field pl-9 pr-10 py-2.5" placeholder="Min 6 characters" required minLength={6} />
                      <button type="button" onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type={showConfirm ? "text" : "password"} value={form.confirm} onChange={set("confirm")}
                        className={`input-field pl-9 pr-10 py-2.5 ${!passwordsMatch ? "border-red-300 focus:border-red-400" : ""}`}
                        placeholder="Repeat password" required />
                      <button type="button" onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {!passwordsMatch && <p className="text-[11px] text-red-500 mt-1">Passwords do not match</p>}
                  </div>
                </div>

                {form.password && (
                  <div className="flex items-center gap-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className={`flex-1 h-1 rounded-full ${
                        form.password.length >= [1, 4, 6, 8][i]
                          ? i < 2 ? "bg-red-400" : i === 2 ? "bg-amber-400" : "bg-emerald-500"
                          : "bg-slate-200"
                      }`} />
                    ))}
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {form.password.length < 4 ? "Weak" : form.password.length < 6 ? "Fair" : form.password.length < 8 ? "Good" : "Strong"}
                    </span>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-lg px-3 py-2.5 text-sm">
                    <AlertCircle size={15} className="flex-shrink-0" />
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading || !canSubmitAccount}
                  className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2 rounded-xl disabled:opacity-50 mt-2">
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating account...</>
                  ) : role === "driver" ? (
                    <>Continue: Add Truck <ArrowRight size={15} /></>
                  ) : (
                    <>Create Account <ArrowRight size={15} /></>
                  )}
                </button>
              </form>

              <div className="mt-5 pt-5 border-t border-slate-100 text-center">
                <p className="text-sm text-slate-500 font-inter">
                  Already have an account?{" "}
                  <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
                </p>
              </div>
            </>
          )}

          {step === "truck" && (
            <form onSubmit={handleTruckSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Truck Registration Number</label>
                <div className="relative">
                  <Truck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={truck.registration}
                    onChange={(e) => setTruck((t) => ({ ...t, registration: e.target.value.toUpperCase() }))}
                    className="input-field pl-9 pr-3 py-2.5 font-mono" placeholder="MH-12-AB-1234" required />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Truck Type</label>
                  <select value={truck.category} onChange={setTruckField("category")} className="input-field px-3 py-2.5 w-full">
                    {TRUCK_TYPES.map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Capacity</label>
                  <div className="relative">
                    <Gauge size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={truck.capacity} onChange={setTruckField("capacity")}
                      className="input-field pl-9 pr-3 py-2.5" placeholder="e.g. 10 Tons" required />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Make / Model</label>
                  <div className="relative">
                    <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={truck.make} onChange={setTruckField("make")}
                      className="input-field pl-9 pr-3 py-2.5" placeholder="e.g. Tata 1109" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Year</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="number" value={truck.year} onChange={setTruckField("year")}
                      className="input-field pl-9 pr-3 py-2.5" placeholder="e.g. 2020" min="1990" max={new Date().getFullYear() + 1} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Insurance Expiry</label>
                <input type="date" value={truck.insuranceExpiry} onChange={setTruckField("insuranceExpiry")}
                  className="input-field px-3 py-2.5 w-full" />
              </div>

              {truckError && (
                <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-lg px-3 py-2.5 text-sm">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  {truckError}
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-lg px-3 py-2.5 text-sm">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setStep("account")}
                  className="flex-1 btn-ghost py-3 text-sm flex items-center justify-center gap-2 rounded-xl border border-slate-200">
                  <ArrowLeft size={15} /> Back
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 btn-primary py-3 text-sm flex items-center justify-center gap-2 rounded-xl disabled:opacity-50">
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating account...</>
                  ) : (
                    <>Create Account <ArrowRight size={15} /></>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-4 font-inter">
          By registering, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
