import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Truck, User, Eye, EyeOff, CheckCircle, ArrowRight, ArrowLeft, Building2, Phone, Lock, FileText,
} from "lucide-react";

export default function Register() {
  const [role, setRole] = useState("broker");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", email: "", password: "", confirm: "",
    businessName: "", gst: "", vehicleReg: "",
  });
  const navigate = useNavigate();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const passwordsMatch = form.password === form.confirm || form.confirm === "";
  const canSubmit = form.name && form.phone && form.password && form.confirm &&
    form.password === form.confirm && (role === "broker" ? form.businessName : form.vehicleReg);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setDone(true); setTimeout(() => navigate("/login"), 2500); }, 1200);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-modal p-10 text-center max-w-sm w-full animate-fade-up">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 font-poppins">Account Created!</h2>
          <p className="text-slate-500 text-sm font-inter mt-2">
            Your {role} account has been created.<br />Redirecting to login...
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
        {/* Header */}
        <div className="text-center mb-6">
          <img src="/gadidost-logo.png" alt="GadiDost" className="h-10 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 font-poppins">Create your account</h1>
          <p className="text-slate-500 text-sm font-inter mt-1">Join India&apos;s leading logistics platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-modal p-6 sm:p-8">
          {/* Role cards */}
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">I am a...</p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { id: "broker", label: "Broker", sub: "Manage fleet & jobs", icon: Truck },
              { id: "driver", label: "Driver", sub: "Find & track trips", icon: User },
            ].map(({ id, label, sub, icon: Icon }) => (
              <button key={id} onClick={() => setRole(id)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  role === id ? "border-primary bg-primary/5" : "border-slate-200 hover:border-slate-300 bg-slate-50"
                }`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${role === id ? "bg-primary/10" : "bg-white border border-slate-200"}`}>
                  <Icon size={16} className={role === id ? "text-primary" : "text-slate-400"} />
                </div>
                <p className={`text-sm font-bold ${role === id ? "text-primary" : "text-slate-700"}`}>{label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 font-inter">{sub}</p>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name + Phone */}
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
                    className="input-field pl-11 pr-3 py-2.5" placeholder="Mobile number" required />
                </div>
              </div>
            </div>

            {/* Role-specific fields */}
            {role === "broker" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Business Name</label>
                  <div className="relative">
                    <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={form.businessName} onChange={set("businessName")}
                      className="input-field pl-9 pr-3 py-2.5" placeholder="Your business name" required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">GST Number <span className="text-slate-300 font-normal">(optional)</span></label>
                  <div className="relative">
                    <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={form.gst} onChange={set("gst")}
                      className="input-field pl-9 pr-3 py-2.5" placeholder="22ABCDE1234F1Z5" />
                  </div>
                </div>
              </div>
            )}
            {role === "driver" && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Vehicle Registration Number</label>
                <div className="relative">
                  <Truck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={form.vehicleReg} onChange={set("vehicleReg")}
                    className="input-field pl-9 pr-3 py-2.5 font-mono" placeholder="MH-12-AB-1234" required />
                </div>
              </div>
            )}

            {/* Password + Confirm */}
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

            {/* Password strength hint */}
            {form.password && (
              <div className="flex items-center gap-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`flex-1 h-1 rounded-full ${
                    form.password.length >= [1,4,6,8][i]
                      ? i < 2 ? "bg-red-400" : i === 2 ? "bg-amber-400" : "bg-emerald-500"
                      : "bg-slate-200"
                  }`} />
                ))}
                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                  {form.password.length < 4 ? "Weak" : form.password.length < 6 ? "Fair" : form.password.length < 8 ? "Good" : "Strong"}
                </span>
              </div>
            )}

            <button type="submit" disabled={loading || !canSubmit}
              className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2 rounded-xl disabled:opacity-50 mt-2">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating account...</>
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
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-4 font-inter">
          By registering, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
