import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Mail, Phone, Building2, MapPin, Landmark, Lock,
  Save, ShieldCheck, ArrowRight,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { api, getToken } from "../../services/api";
import { formatDate } from "../../utils";

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

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(user || {});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [profileRes, kycRes] = await Promise.all([
          api.get("/api/users/profile", getToken()),
          api.get("/api/kyc/status", getToken()),
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

  if (loading) {
    return <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-slate-400">Loading profile...</div>;
  }
  if (error) {
    return <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-5">
      {/* Gradient hero */}
      <div
        className="rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1565C0 0%, #1976FF 100%)" }}
      >
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center flex-shrink-0 text-2xl font-bold">
            {(profile.company_name || profile.name || "B")[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">{profile.company_name || "Your Business"}</h1>
            <p className="text-sm text-white/80 mt-0.5">{profile.name}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur text-xs font-semibold self-start">
            {profile.subscription_plan || "Standard Plan"}
          </span>
        </div>
      </div>

      {/* Floating info tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 -mt-8 relative z-10 px-1">
        <div className="bg-white rounded-xl border border-slate-100 shadow-modal p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Phone size={16} className="text-primary" /></div>
          <div><p className="text-[11px] text-slate-400 font-semibold uppercase">Phone</p><p className="text-sm font-semibold text-slate-800">{profile.phone || "-"}</p></div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-modal p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Building2 size={16} className="text-primary" /></div>
          <div><p className="text-[11px] text-slate-400 font-semibold uppercase">GST</p><p className="text-sm font-semibold text-slate-800">{kycDocs?.gst_number || "Not provided"}</p></div>
        </div>
      </div>

      {/* 2-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Left */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-100 shadow-card">
            <SectionHeader icon={User} title="Personal Information" />
            <div className="p-5 space-y-3">
              <Field label="Full Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <Field label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              <Field label="Phone" value={profile.phone} disabled />
              <Field label="Business Name" value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} />
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
            <SectionHeader icon={MapPin} title="Address" />
            <div className="p-5 space-y-3">
              <Field label="Address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
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
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-card">
            <SectionHeader icon={Landmark} title="GST & Bank Details" />
            <div className="p-5 space-y-3">
              {/* Read-only — sourced from the KYC submission, the single source of truth for
                  these fields. Edited via the KYC page, not duplicated here. */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">GST Number</label>
                <p className="input-field px-3 py-2 w-full bg-slate-50 text-slate-600 font-mono text-sm">
                  {kycDocs?.gst_number || "Not provided"}
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Bank Account Number</label>
                <p className="input-field px-3 py-2 w-full bg-slate-50 text-slate-600 font-mono text-sm">
                  {kycDocs?.bank_account_number || "Not provided"}
                </p>
              </div>
              <button
                onClick={() => navigate("/kyc")}
                className="btn-ghost px-4 py-2.5 text-sm border border-slate-200 flex items-center gap-1.5"
              >
                Edit in KYC <ArrowRight size={14} />
              </button>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 text-xs text-slate-400">
            Member since {formatDate(profile.createdAt || profile.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
}
