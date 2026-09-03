import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Mail, Phone, Building2, MapPin, Landmark, Lock,
  Save, ShieldCheck, ArrowRight, CalendarDays,
  ChevronDown, LogOut,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { api, getToken } from "../../services/api";
import { formatDate, formatCurrency } from "../../utils";

// Icon-prefixed, softly-bordered field — same shape as the client app's edit-profile inputs.
const Field = ({ label, icon: Icon, value, onChange, type = "text", disabled = false, placeholder }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 mb-1.5">{label}</label>
    <div className={`flex items-center gap-2.5 bg-slate-50 border-2 rounded-xl px-3.5 py-2.5 transition-colors ${disabled ? "border-slate-100" : "border-slate-100 focus-within:border-primary"}`}>
      {Icon && <Icon size={15} className="text-slate-300 flex-shrink-0" />}
      <input
        type={type}
        value={value || ""}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent text-sm text-slate-800 outline-none disabled:text-slate-400 placeholder:text-slate-300"
      />
    </div>
  </div>
);

// One collapsible row — only one open at a time (accordion), driven by the parent's
// openSection state so opening one closes the others, same feel as the client app's
// menu-row-per-setting list but expandable in place instead of navigating away.
const AccordionRow = ({ id, icon: Icon, title, isOpen, onToggle, children }) => (
  <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
    <button onClick={() => onToggle(id)} className="w-full flex items-center gap-3 px-4 h-14 text-left hover:bg-slate-50 transition-colors">
      <Icon size={18} className="text-slate-400 flex-shrink-0" strokeWidth={1.8} />
      <span className="flex-1 text-sm font-medium text-slate-700">{title}</span>
      <ChevronDown size={16} className={`text-slate-300 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
    </button>
    {isOpen && <div className="px-4 pb-5 pt-1 border-t border-slate-50">{children}</div>}
  </div>
);

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(user || {});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ trucks: 0, drivers: 0, earnings: 0 });
  const [openSection, setOpenSection] = useState(null);

  // Backend-modeled fields
  const [form, setForm] = useState({ name: "", email: "", address: "", company_name: "" });
  // Local-only fields (not backend-modeled yet) — GST and bank details are NOT here since
  // those are already modeled, under gst_number/bank_account_number, in the KYC submission
  // (see kycDocs below) — showing a second, unsaved copy of the same data was the bug.
  const [extra, setExtra] = useState({ city: "", state: "", pincode: "" });
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "" });
  const [changingPw, setChangingPw] = useState(false);

  // Read-only source of truth for GST / bank account — the canonical field names/location
  // per the KYC schema (kyc.validation.js). Edited via the KYC page, not here.
  const [kycDocs, setKycDocs] = useState(null);

  const toggleSection = (id) => setOpenSection((current) => (current === id ? null : id));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [profileRes, kycRes, truckRes, driverRes, analyticsRes] = await Promise.all([
          api.get("/api/users/profile", getToken()),
          api.get("/api/kyc/status", getToken()),
          api.get("/api/vehicles/trucks?limit=100", getToken()),
          api.get("/api/vehicles/drivers?limit=100", getToken()),
          api.get("/api/analytics/broker", getToken()),
        ]);
        const data = profileRes.data?.user || profileRes.data || user || {};
        setProfile(data);
        setForm({
          name: data.name || "",
          email: data.email || "",
          address: data.address || "",
          company_name: data.company_name || "",
        });
        if (kycRes.success) setKycDocs(kycRes.data?.submission?.documents || null);
        const history = analyticsRes.data?.tripHistory || [];
        setStats({
          trucks: (truckRes.data?.trucks || []).length,
          drivers: (driverRes.data?.drivers || []).length,
          earnings: history.reduce((sum, trip) => sum + Number(trip.earnings || 0), 0),
        });
      } catch {
        setError("Failed to load profile. Please try again.");
        setProfile(user || {});
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const handleSaveProfile = async () => {
    const requestUserId = user?.id;
    setSaving(true);
    try {
      const res = await api.patch("/api/users/profile", {
        name: form.name,
        email: form.email,
        address: form.address,
        company_name: form.company_name,
      }, getToken());
      if (!res.success) throw new Error(res.message || "Failed to update profile");
      const updated = res.data?.user || res.data || {};
      setProfile((p) => ({ ...p, ...updated }));
      updateUser(updated, requestUserId);
      addToast("Profile updated.", "success");
    } catch (err) {
      addToast(err.message || "Failed to update profile.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current || !passwordForm.next) {
      addToast("Enter both current and new password.", "error");
      return;
    }
    setChangingPw(true);
    try {
      const res = await api.patch("/api/users/change-password", {
        current_password: passwordForm.current,
        new_password: passwordForm.next,
      }, getToken());
      if (!res.success) throw new Error(res.message || "Failed to change password");
      addToast("Password changed successfully.", "success");
      setPasswordForm({ current: "", next: "" });
    } catch (err) {
      addToast(err.message || "Failed to change password.", "error");
    } finally {
      setChangingPw(false);
    }
  };

  const handleSaveExtra = () => {
    addToast("Saved locally — address details aren't stored on the server yet.", "warning");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (loading) {
    return <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-slate-400">Loading profile...</div>;
  }
  if (error) {
    return <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
      {/* Left — profile card, same dark-navy treatment as the client app */}
      <div className="lg:col-span-1 space-y-5">
        <div className="bg-secondary rounded-2xl overflow-hidden relative">
          <div
            className="absolute top-0 right-0 w-48 h-48 pointer-events-none opacity-15"
            style={{ background: "radial-gradient(circle, rgba(25,118,255,0.5) 0%, transparent 70%)" }}
          />
          <div className="relative z-10 p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/25 border-[3px] border-primary/40 flex items-center justify-center shadow-lg shadow-primary/30 mx-auto mb-4">
              <span className="font-bold text-2xl text-white">{(profile.company_name || profile.name || "B")[0]}</span>
            </div>
            <h2 className="font-semibold text-xl text-white mb-1 truncate">{profile.company_name || "Your Business"}</h2>
            <p className="text-sm text-white/60 mb-1 truncate">{profile.name}</p>
            <div className="flex items-center justify-center gap-1.5 mb-4">
              <Phone className="w-3 h-3 text-white/50" />
              <span className="text-xs text-white/50">{profile.phone || "Not provided"}</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-white">
              {profile.subscription_plan || "Standard Plan"}
            </span>
          </div>

          <div className="relative z-10 border-t border-white/10 px-4 py-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="font-bold text-lg text-white">{stats.trucks}</p>
                <p className="text-[10px] text-white/40 mt-0.5">Trucks</p>
              </div>
              <div className="border-x border-white/10">
                <p className="font-bold text-lg text-white">{stats.drivers}</p>
                <p className="text-[10px] text-white/40 mt-0.5">Drivers</p>
              </div>
              <div>
                <p className="font-bold text-lg text-white">{formatCurrency(stats.earnings)}</p>
                <p className="text-[10px] text-white/40 mt-0.5">Earned</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-card p-5">
          <h4 className="font-semibold text-sm text-slate-700 mb-4">Account Info</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CalendarDays className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Member Since</p>
                <p className="text-sm font-semibold text-slate-700">{formatDate(profile.createdAt || profile.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400">GST Number</p>
                <p className="text-sm font-semibold text-slate-700">{kycDocs?.gst_number || "Not provided"}</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-300">GadiDost Broker Portal v1.0.0</p>
      </div>

      {/* Right — accordion settings, grouped the same way as the client app's menu sections */}
      <div className="lg:col-span-2 space-y-5">
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2 px-1">Account</p>
          <div className="space-y-2">
            <AccordionRow id="account" icon={User} title="Personal Information" isOpen={openSection === "account"} onToggle={toggleSection}>
              <div className="space-y-3 pt-3">
                <Field label="Full Name" icon={User} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                <Field label="Email" icon={Mail} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                <Field label="Phone" icon={Phone} value={profile.phone} disabled />
                <Field label="Business Name" icon={Building2} value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} />
                <button onClick={handleSaveProfile} disabled={saving} className="btn-primary px-4 py-2.5 text-sm flex items-center gap-2 disabled:opacity-60">
                  <Save size={14} /> {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </AccordionRow>

            <AccordionRow id="password" icon={Lock} title="Change Password" isOpen={openSection === "password"} onToggle={toggleSection}>
              <div className="space-y-3 pt-3">
                <Field label="Current Password" icon={Lock} type="password" value={passwordForm.current} onChange={(e) => setPasswordForm((f) => ({ ...f, current: e.target.value }))} />
                <Field label="New Password" icon={Lock} type="password" value={passwordForm.next} onChange={(e) => setPasswordForm((f) => ({ ...f, next: e.target.value }))} />
                <button onClick={handleChangePassword} disabled={changingPw} className="btn-primary px-4 py-2.5 text-sm flex items-center gap-2 disabled:opacity-60">
                  <ShieldCheck size={14} /> {changingPw ? "Updating..." : "Change Password"}
                </button>
              </div>
            </AccordionRow>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2 px-1">Business</p>
          <div className="space-y-2">
            <AccordionRow id="address" icon={MapPin} title="Address" isOpen={openSection === "address"} onToggle={toggleSection}>
              <div className="space-y-3 pt-3">
                <Field label="Address" icon={MapPin} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="City" value={extra.city} onChange={(e) => setExtra((x) => ({ ...x, city: e.target.value }))} />
                  <Field label="State" value={extra.state} onChange={(e) => setExtra((x) => ({ ...x, state: e.target.value }))} />
                </div>
                <Field label="Pincode" value={extra.pincode} onChange={(e) => setExtra((x) => ({ ...x, pincode: e.target.value }))} />
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                  City/state/pincode aren't backend-modeled yet — saved locally only.
                </div>
                <button onClick={handleSaveExtra} className="btn-ghost px-4 py-2.5 text-sm border border-slate-200">Save</button>
              </div>
            </AccordionRow>

            <AccordionRow id="gst" icon={Landmark} title="GST & Bank Details" isOpen={openSection === "gst"} onToggle={toggleSection}>
              <div className="space-y-3 pt-3">
                {/* Read-only — sourced from the KYC submission, the single source of truth for
                    these fields. Edited via the KYC page, not duplicated here. */}
                <Field label="GST Number" icon={Landmark} value={kycDocs?.gst_number || "Not provided"} disabled />
                <Field label="Bank Account Number" icon={Landmark} value={kycDocs?.bank_account_number || "Not provided"} disabled />
                <button
                  onClick={() => navigate("/kyc")}
                  className="btn-ghost px-4 py-2.5 text-sm border border-slate-200 flex items-center gap-1.5"
                >
                  Edit in KYC <ArrowRight size={14} />
                </button>
              </div>
            </AccordionRow>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-white border border-slate-100 rounded-xl h-14 text-sm font-semibold text-danger hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-[18px] h-[18px]" strokeWidth={1.8} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
