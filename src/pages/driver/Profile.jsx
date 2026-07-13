import { useEffect, useState } from "react";
import {
  User, Mail, Phone, Lock, Save, ShieldCheck, Truck, FileCheck,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { api, getToken } from "../../services/api";
import { formatDate, formatKycStatus } from "../../utils";

const SectionHeader = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-50">
    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
      <Icon size={15} className="text-primary" />
    </div>
    <h3 className="font-bold text-slate-900 text-[15px]">{title}</h3>
  </div>
);

const Field = ({ label, value, onChange, type = "text", disabled = false }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 mb-1.5">{label}</label>
    <input
      type={type}
      value={value || ""}
      onChange={onChange}
      disabled={disabled}
      className="input-field px-3 py-2 w-full disabled:bg-slate-50 disabled:text-slate-400"
    />
  </div>
);

const KYC_BADGE = {
  Verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Submitted: "bg-amber-50 text-amber-700 border-amber-200",
  Rejected: "bg-red-50 text-red-600 border-red-200",
};

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();
  const [profile, setProfile] = useState(user || {});
  const [kyc, setKyc] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ name: "", email: "" });
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "" });
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = getToken();
        const [profileRes, kycRes, activeRes, upcomingRes] = await Promise.all([
          api.get("/api/users/profile", token),
          api.get("/api/kyc/status", token),
          api.get("/api/trips/active", token),
          api.get("/api/trips/upcoming", token),
        ]);
        const data = profileRes.data?.user || profileRes.data || user || {};
        setProfile(data);
        setForm({ name: data.name || "", email: data.email || "" });
        setKyc(kycRes.data || null);
        const trip = activeRes.data?.trip || upcomingRes.data?.trip || null;
        setVehicle(trip ? { registration: trip.truckReg || trip.truck_reg } : null);
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
    setSaving(true);
    try {
      const res = await api.patch("/api/users/profile", { name: form.name, email: form.email }, getToken());
      if (!res.success) throw new Error(res.message || "Failed to update profile");
      const updated = res.data?.user || res.data || {};
      setProfile((p) => ({ ...p, ...updated }));
      updateUser(updated);
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

  if (loading) {
    return <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-slate-400">Loading profile...</div>;
  }
  if (error) {
    return <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-red-500">{error}</div>;
  }

  const kycStatus = formatKycStatus(profile.kyc_status);
  const isVerified = kycStatus === "Verified";

  return (
    <div className="space-y-5">
      {/* Gradient hero */}
      <div
        className="rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1565C0 0%, #1976FF 100%)" }}
      >
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center flex-shrink-0 text-2xl font-bold">
            {(profile.name || "D")[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">{profile.name || "Driver"}</h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {isVerified && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur text-[11px] font-semibold">
                  <ShieldCheck size={12} /> Verified
                </span>
              )}
              <span className="text-xs text-white/80">Since {formatDate(profile.createdAt || profile.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating info tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 -mt-8 relative z-10 px-1">
        <div className="bg-white rounded-xl border border-slate-100 shadow-modal p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Phone size={16} className="text-primary" /></div>
          <div><p className="text-[11px] text-slate-400 font-semibold uppercase">Phone</p><p className="text-sm font-semibold text-slate-800">{profile.phone || "-"}</p></div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-modal p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Truck size={16} className="text-primary" /></div>
          <div><p className="text-[11px] text-slate-400 font-semibold uppercase">Vehicle</p><p className="text-sm font-semibold text-slate-800">{vehicle?.registration || "Not Assigned"}</p></div>
        </div>
      </div>

      {/* 2-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Left */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-100 shadow-card">
            <SectionHeader icon={User} title="Account Details" />
            <div className="p-5 space-y-3">
              <Field label="Full Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <Field label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              <Field label="Phone" value={profile.phone} disabled />
              <button onClick={handleSaveProfile} disabled={saving} className="btn-primary px-4 py-2.5 text-sm flex items-center gap-2 disabled:opacity-60">
                <Save size={14} /> {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-card">
            <SectionHeader icon={Lock} title="Change Password" />
            <div className="p-5 space-y-3">
              <Field label="Current Password" type="password" value={passwordForm.current} onChange={(e) => setPasswordForm((f) => ({ ...f, current: e.target.value }))} />
              <Field label="New Password" type="password" value={passwordForm.next} onChange={(e) => setPasswordForm((f) => ({ ...f, next: e.target.value }))} />
              <button onClick={handleChangePassword} disabled={changingPw} className="btn-primary px-4 py-2.5 text-sm flex items-center gap-2 disabled:opacity-60">
                <ShieldCheck size={14} /> {changingPw ? "Updating..." : "Change Password"}
              </button>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-100 shadow-card">
            <SectionHeader icon={Truck} title="My Vehicle" />
            <div className="p-5">
              {vehicle?.registration ? (
                <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Truck size={18} className="text-primary" /></div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-semibold uppercase">Registration</p>
                    <p className="text-sm font-bold text-slate-800 font-mono">{vehicle.registration}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No vehicle currently assigned — vehicle details appear here once you have an active or upcoming trip.</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-card">
            <SectionHeader icon={FileCheck} title="KYC Documents" />
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Status</span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${KYC_BADGE[kycStatus] || KYC_BADGE.Pending}`}>{kycStatus}</span>
              </div>
              {kyc?.submission?.documents && Object.keys(kyc.submission.documents).length > 0 ? (
                <div className="grid grid-cols-1 gap-2 pt-2 border-t border-slate-50">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
