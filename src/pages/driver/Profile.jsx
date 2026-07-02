import { useState, useCallback } from "react";
import { Phone, MapPin, Calendar, Shield, CreditCard, FileText, Truck, Edit2, Save, X, Lock, Eye, EyeOff, Mail } from "lucide-react";
import Badge from "../../components/driver/Badge";
import { vehicleData, kycDocuments } from "../../data/driverMockData";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../services/api";

const iconMap = {
  "credit-card": CreditCard,
  "id-card": Shield,
  "file-text": FileText,
  truck: Truck,
  shield: Shield,
};

export default function DriverProfile() {
  const { user } = useAuth();

  const name    = user?.name  || "Driver";
  const phone   = user?.phone ? `+91 ${user.phone}` : "-";
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const joined  = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
    : "N/A";

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null); // { text, type }
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    address: user?.address || "",
  });

  const [showPwSection, setShowPwSection] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  const getToken = useCallback(() => user?.tokens?.access_token, [user]);

  const handleSave = async () => {
    setSaveMsg(null);
    setSaving(true);
    const token = getToken();
    try {
      if (token) {
        const result = await api.patch("/api/users/profile", {
          name: form.name,
          email: form.email,
          address: form.address,
        }, token);
        if (!result.success) {
          setSaveMsg({ text: result.message || "Failed to save profile", type: "error" });
          setSaving(false);
          return;
        }
      }
    } catch {
      setSaveMsg({ text: "Network error. Please try again.", type: "error" });
      setSaving(false);
      return;
    }
    setSaving(false);
    setEditing(false);
    setSaveMsg({ text: "Profile updated successfully.", type: "success" });
  };

  const handleCancel = () => {
    setForm({ name: user?.name || "", email: user?.email || "", address: user?.address || "" });
    setEditing(false);
    setSaveMsg(null);
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
      const result = await api.patch("/api/users/change-password", {
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

  return (
    <div className="space-y-5">
      {/* Driver card */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-6">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 bg-secondary rounded-xl flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
            {initials}
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-slate-900">{name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge status="Verified" />
              <span className="text-xs text-slate-400">Since {joined}</span>
            </div>
          </div>
        </div>
        <div className="space-y-0">
          {[
            { icon: Phone,    label: "Phone",    value: phone },
            { icon: MapPin,   label: "Location", value: vehicleData.broker || "India" },
            { icon: Calendar, label: "Member Since", value: joined },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
              <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{label}</p>
                <p className="text-sm font-semibold text-slate-800">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Account Details */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-bold text-slate-700">Account Details</h3>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn-ghost px-3 py-1.5 text-xs flex items-center gap-1.5 border border-slate-200">
              <Edit2 size={12} /> Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={handleCancel} className="btn-ghost px-3 py-1.5 text-xs border border-slate-200 flex items-center gap-1"><X size={12} /> Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1">
                {saving ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</> : <><Save size={12} /> Save</>}
              </button>
            </div>
          )}
        </div>

        {saveMsg && (
          <p className={`text-sm mb-3 ${saveMsg.type === "success" ? "text-emerald-600" : "text-red-500"}`}>{saveMsg.text}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Full Name</label>
            {editing ? (
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input-field px-3 py-2 text-sm" />
            ) : (
              <p className="text-sm font-medium text-slate-800 py-2">{form.name || "-"}</p>
            )}
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Email</label>
            {editing ? (
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="input-field pl-9 pr-3 py-2 text-sm" />
              </div>
            ) : (
              <p className="text-sm font-medium text-slate-800 py-2">{form.email || "-"}</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Address</label>
            {editing ? (
              <input type="text" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Street, city, state, pincode" className="input-field px-3 py-2 text-sm" />
            ) : (
              <p className="text-sm font-medium text-slate-800 py-2">{form.address || "-"}</p>
            )}
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

      {/* Vehicle */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Truck className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-slate-900 text-[15px]">My Vehicle</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Registration",    value: vehicleData.registration },
            { label: "Type",            value: vehicleData.type },
            { label: "Capacity",        value: vehicleData.capacity },
            { label: "Broker",          value: vehicleData.broker },
            { label: "Insurance Valid", value: vehicleData.insuranceValidTill },
            { label: "Fitness Valid",   value: vehicleData.fitnessValidTill },
            { label: "Permit Type",     value: vehicleData.permitType },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-50 rounded-lg p-3">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{label}</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KYC Documents */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-slate-900 text-[15px]">KYC Documents</h3>
          <Badge status="Verified" className="ml-auto" />
        </div>
        <div className="space-y-2">
          {kycDocuments.map((doc) => {
            const Icon = iconMap[doc.icon] || FileText;
            return (
              <div key={doc.name} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{doc.name}</p>
                  <p className="text-xs text-slate-500 font-mono">{doc.number}</p>
                  <p className="text-[10px] text-slate-400">Expires: {doc.expiryDate}</p>
                </div>
                <Badge status={doc.status} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
