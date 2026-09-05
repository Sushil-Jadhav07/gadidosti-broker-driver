import { useEffect, useState } from "react";
import {
  User, Mail, Phone, Lock, Save, ShieldCheck, Truck, FileCheck,
  CalendarDays, ChevronDown, LogOut, IndianRupee,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { useNavigate } from "react-router-dom";
import { api, getToken } from "../../services/api";
import { formatDate, formatKycStatus, formatCurrency } from "../../utils";

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
const AccordionRow = ({ id, icon: Icon, title, badge, isOpen, onToggle, children }) => (
  <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
    <button onClick={() => onToggle(id)} className="w-full flex items-center gap-3 px-4 h-14 text-left hover:bg-slate-50 transition-colors">
      <Icon size={18} className="text-slate-400 flex-shrink-0" strokeWidth={1.8} />
      <span className="flex-1 text-sm font-medium text-slate-700">{title}</span>
      {badge}
      <ChevronDown size={16} className={`text-slate-300 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
    </button>
    {isOpen && <div className="px-4 pb-5 pt-1 border-t border-slate-50">{children}</div>}
  </div>
);

const KYC_BADGE = {
  Verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Submitted: "bg-amber-50 text-amber-700 border-amber-200",
  Rejected: "bg-red-50 text-red-600 border-red-200",
};

const titleCase = (value) => (value || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(user || {});
  const [kyc, setKyc] = useState(null);
  const [assignedTruck, setAssignedTruck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ trips: 0, distance: 0, earnings: 0 });
  const [openSection, setOpenSection] = useState(null);

  const [form, setForm] = useState({ name: "", email: "" });
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "" });
  const [changingPw, setChangingPw] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [savingUpi, setSavingUpi] = useState(false);

  const toggleSection = (id) => setOpenSection((current) => (current === id ? null : id));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = getToken();
        const [profileRes, kycRes, truckRes, analyticsRes, upiRes] = await Promise.all([
          api.get("/api/users/profile", token),
          api.get("/api/kyc/status", token),
          api.get("/api/vehicles/drivers/me/truck", token),
          api.get("/api/analytics/broker", token),
          api.get("/api/vehicles/drivers/me/upi-id", token),
        ]);
        const data = profileRes.data?.user || profileRes.data || user || {};
        setProfile(data);
        setForm({ name: data.name || "", email: data.email || "" });
        setKyc(kycRes.data || null);
        setAssignedTruck(truckRes.data?.truck || null);
        setUpiId(upiRes.data?.upiId || "");
        const history = analyticsRes.data?.tripHistory || [];
        setStats({
          trips: history.length,
          distance: history.reduce((sum, trip) => sum + Number(trip.distance || 0), 0),
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
      const res = await api.patch("/api/users/profile", { name: form.name, email: form.email }, getToken());
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

  const handleSaveUpi = async () => {
    setSavingUpi(true);
    try {
      const res = await api.patch("/api/vehicles/drivers/me/upi-id", { upi_id: upiId.trim() }, getToken());
      if (!res.success) throw new Error(res.message || "Failed to save UPI ID");
      setUpiId(res.data?.upiId || "");
      addToast("UPI ID saved.", "success");
    } catch (err) {
      addToast(err.message || "Failed to save UPI ID.", "error");
    } finally {
      setSavingUpi(false);
    }
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

  const kycStatus = formatKycStatus(profile.kyc_status);
  const isVerified = kycStatus === "Verified";

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
              <span className="font-bold text-2xl text-white">{(profile.name || "D")[0]}</span>
            </div>
            <h2 className="font-semibold text-xl text-white mb-1 truncate">{profile.name || "Driver"}</h2>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Phone className="w-3 h-3 text-white/50" />
              <span className="text-xs text-white/50">{profile.phone || "Not provided"}</span>
            </div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {isVerified && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] font-semibold text-white">
                  <ShieldCheck size={11} /> Verified
                </span>
              )}
              <span className="text-[11px] text-white/40">Since {formatDate(profile.createdAt || profile.created_at)}</span>
            </div>
          </div>

          <div className="relative z-10 border-t border-white/10 px-4 py-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="font-bold text-lg text-white">{stats.trips}</p>
                <p className="text-[10px] text-white/40 mt-0.5">Trips</p>
              </div>
              <div className="border-x border-white/10">
                <p className="font-bold text-lg text-white">{stats.distance.toLocaleString("en-IN")} km</p>
                <p className="text-[10px] text-white/40 mt-0.5">Distance</p>
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
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <FileCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400">KYC Status</p>
                <p className="text-sm font-semibold text-slate-700">{kycStatus}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Truck className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Vehicle</p>
                <p className="text-sm font-semibold text-slate-700">{assignedTruck?.registration || "Not assigned"}</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-300">GadiDost Driver App v1.0.0</p>
      </div>

      {/* Right — accordion settings, grouped the same way as the client app's menu sections */}
      <div className="lg:col-span-2 space-y-5">
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2 px-1">Account</p>
          <div className="space-y-2">
            <AccordionRow id="account" icon={User} title="Personal Details" isOpen={openSection === "account"} onToggle={toggleSection}>
              <div className="space-y-3 pt-3">
                <Field label="Full Name" icon={User} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                <Field label="Email" icon={Mail} type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                <Field label="Phone" icon={Phone} value={profile.phone} disabled />
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

            <AccordionRow
              id="upi" icon={IndianRupee} title="UPI Payment ID"
              badge={upiId ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border mr-1 bg-emerald-50 text-emerald-700 border-emerald-200">Set</span> : null}
              isOpen={openSection === "upi"} onToggle={toggleSection}
            >
              <div className="space-y-3 pt-3">
                <p className="text-xs text-slate-400">
                  Saved once, then used to generate a fresh UPI QR — with the exact amount already filled in — on every trip's payment collection step.
                </p>
                <Field
                  label="UPI ID"
                  icon={IndianRupee}
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@okhdfcbank"
                />
                <button onClick={handleSaveUpi} disabled={savingUpi || !upiId.trim()} className="btn-primary px-4 py-2.5 text-sm flex items-center gap-2 disabled:opacity-60">
                  <Save size={14} /> {savingUpi ? "Saving..." : "Save UPI ID"}
                </button>
              </div>
            </AccordionRow>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2 px-1">Vehicle &amp; Documents</p>
          <div className="space-y-2">
            <AccordionRow id="vehicle" icon={Truck} title="My Vehicle" isOpen={openSection === "vehicle"} onToggle={toggleSection}>
              <div className="pt-3">
                {assignedTruck ? (
                  <div className="space-y-3">
                    <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Truck size={18} className="text-primary" /></div>
                      <div>
                        <p className="text-[11px] text-slate-400 font-semibold uppercase">Registration</p>
                        <p className="text-sm font-bold text-slate-800 font-mono">{assignedTruck.registration}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        ["Type", titleCase(assignedTruck.category || assignedTruck.type)],
                        ["Capacity", assignedTruck.capacity],
                        ["Make", assignedTruck.make ? `${assignedTruck.make}${assignedTruck.year ? ` (${assignedTruck.year})` : ""}` : null],
                        ["Status", titleCase(assignedTruck.status)],
                      ].map(([label, value]) => (
                        <div key={label} className="bg-slate-50 rounded-xl p-3">
                          <p className="text-[11px] text-slate-400 font-semibold uppercase">{label}</p>
                          <p className="text-sm font-semibold text-slate-800 mt-0.5">{value || "-"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No truck assigned yet — contact your broker.</p>
                )}
              </div>
            </AccordionRow>

            <AccordionRow
              id="kyc" icon={FileCheck} title="KYC Documents" isOpen={openSection === "kyc"} onToggle={toggleSection}
              badge={<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border mr-1 ${KYC_BADGE[kycStatus] || KYC_BADGE.Pending}`}>{kycStatus}</span>}
            >
              <div className="space-y-3 pt-3">
                {kyc?.submission?.documents && Object.keys(kyc.submission.documents).length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(kyc.submission.documents).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 uppercase font-semibold">{key.replace(/_/g, " ")}</span>
                        <span className="font-mono text-slate-700">{value || "-"}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No KYC documents submitted yet.</p>
                )}
                <button onClick={() => navigate("/driver/kyc")} className="btn-ghost px-4 py-2.5 text-sm border border-slate-200">
                  Manage in KYC
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
