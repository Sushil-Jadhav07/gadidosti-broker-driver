import { useState, useEffect, useCallback } from "react";
import { Edit2, Save, X, Lock, Eye, EyeOff, Shield } from "lucide-react";
import Badge from "../../components/broker/Badge";
import { brokerProfile as mockBrokerProfile } from "../../data/brokerMockData";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../services/api";

export default function Profile() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  // Editable fields wired to real API
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    // Non-API fields (kept as mock until backend supports them)
    ...mockBrokerProfile,
  });

  // Password change state
  const [showPwSection, setShowPwSection] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState(null); // { text, type }

  const getToken = useCallback(() => user?.tokens?.access_token, [user]);

  // Populate form with real user data when available
  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        name: user.name || f.name,
        email: user.email || f.email,
        phone: user.phone || f.phone,
        ownerName: user.name || f.ownerName,
      }));
    }
  }, [user]);

  const handleSave = async () => {
    setSaveError("");
    setSaving(true);
    const token = getToken();
    try {
      if (token) {
        const result = await api.put("/api/user/profile", { name: form.name, email: form.email }, token);
        if (!result.success) {
          setSaveError(result.message || "Failed to save profile");
          setSaving(false);
          return;
        }
      }
    } catch {
      setSaveError("Network error. Changes saved locally only.");
    }
    setSaving(false);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleCancel = () => {
    if (user) {
      setForm((f) => ({
        ...f,
        name: user.name || f.name,
        email: user.email || f.email,
        phone: user.phone || f.phone,
        ownerName: user.name || f.ownerName,
      }));
    }
    setEditing(false);
    setSaveError("");
  };

  const handlePasswordChange = async () => {
    if (!passwords.current || !passwords.next || !passwords.confirm) {
      return setPwMsg({ text: "Please fill all password fields", type: "error" });
    }
    if (passwords.next !== passwords.confirm) {
      return setPwMsg({ text: "New passwords do not match", type: "error" });
    }
    if (passwords.next.length < 6) {
      return setPwMsg({ text: "Password must be at least 6 characters", type: "error" });
    }
    const token = getToken();
    if (!token) return;
    setPwSaving(true);
    try {
      const result = await api.put("/api/user/change-password", {
        current_password: passwords.current,
        new_password: passwords.next,
      }, token);
      if (result.success) {
        setPasswords({ current: "", next: "", confirm: "" });
        setPwMsg({ text: "Password updated successfully", type: "success" });
      } else {
        setPwMsg({ text: result.message || "Failed to change password", type: "error" });
      }
    } catch {
      setPwMsg({ text: "Network error. Please try again.", type: "error" });
    } finally {
      setPwSaving(false);
    }
  };

  const Field = ({ label, field, type = "text", readOnly = false }) => (
    <div>
      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">{label}</label>
      {editing && !readOnly ? (
        <input
          type={type}
          value={form[field] || ""}
          onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
          className="input-field px-3 py-2 text-sm"
        />
      ) : (
        <p className="text-sm font-medium text-slate-800 py-2">{form[field] || "-"}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700">
          Profile updated successfully.
        </div>
      )}
      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          {saveError}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-2xl">
                {(form.name || form.ownerName || "B").charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg">{form.businessName}</h2>
              <p className="text-sm text-slate-500">{form.name || form.ownerName}</p>
              <Badge variant="primary" size="sm" className="mt-1">{form.subscription} Plan</Badge>
            </div>
          </div>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn-ghost px-4 py-2 text-sm flex items-center gap-2 border border-slate-200">
              <Edit2 size={14} /> Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={handleCancel} className="btn-ghost px-3 py-2 text-sm border border-slate-200 flex items-center gap-1.5"><X size={14} /> Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5">
                {saving ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</> : <><Save size={14} /> Save</>}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <h3 className="text-[13px] font-bold text-slate-700 mb-4 pb-2 border-b border-slate-100">Personal Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name" field="name" />
              <Field label="Phone" field="phone" readOnly />
              <Field label="Email" field="email" type="email" />
              <Field label="Business Name" field="businessName" />
              <Field label="GST Number" field="gst" />
            </div>
          </div>

          <div>
            <h3 className="text-[13px] font-bold text-slate-700 mb-4 pb-2 border-b border-slate-100">Address</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Street Address" field="address" />
              <Field label="City" field="city" />
              <Field label="State" field="state" />
              <Field label="Pincode" field="pincode" />
            </div>
          </div>

          <div>
            <h3 className="text-[13px] font-bold text-slate-700 mb-4 pb-2 border-b border-slate-100">Bank Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Bank Name" field="bankName" />
              <Field label="Account Number" field="accountNumber" />
              <Field label="IFSC Code" field="ifsc" />
            </div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-bold text-slate-700">Change Password</h3>
          <button
            onClick={() => { setShowPwSection((v) => !v); setPwMsg(null); }}
            className="text-xs text-primary hover:underline"
          >
            {showPwSection ? "Cancel" : "Change"}
          </button>
        </div>

        {showPwSection && (
          <div className="space-y-3">
            {[
              { key: "current", label: "Current Password", placeholder: "Enter current password" },
              { key: "next", label: "New Password", placeholder: "Min 6 characters" },
              { key: "confirm", label: "Confirm New Password", placeholder: "Repeat new password" },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="max-w-sm">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">{label}</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPw[key] ? "text" : "password"}
                    value={passwords[key]}
                    onChange={(e) => setPasswords((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="input-field pl-9 pr-10 py-2.5 text-sm"
                  />
                  <button type="button" onClick={() => setShowPw((p) => ({ ...p, [key]: !p[key] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPw[key] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            ))}

            {pwMsg && (
              <p className={`text-sm ${pwMsg.type === "success" ? "text-emerald-600" : "text-red-500"}`}>
                {pwMsg.text}
              </p>
            )}

            <button onClick={handlePasswordChange} disabled={pwSaving} className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5 mt-1">
              {pwSaving ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</> : <><Shield size={14} /> Update Password</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
