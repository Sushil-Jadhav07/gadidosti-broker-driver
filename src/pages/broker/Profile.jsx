import { useState } from "react";
import { Edit2, Save, X } from "lucide-react";
import Badge from "../../components/broker/Badge";
import { brokerProfile } from "../../data/brokerMockData";

export default function Profile() {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(brokerProfile);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleCancel = () => {
    setForm(brokerProfile);
    setEditing(false);
  };

  const Field = ({ label, field, type = "text" }) => (
    <div>
      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">{label}</label>
      {editing ? (
        <input type={type} value={form[field]} onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
          className="input-field px-3 py-2 text-sm" />
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

      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-2xl">{form.ownerName[0]}</span>
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg">{form.businessName}</h2>
              <p className="text-sm text-slate-500">{form.ownerName}</p>
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
              <button onClick={handleSave} className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5"><Save size={14} /> Save</button>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <h3 className="text-[13px] font-bold text-slate-700 mb-4 pb-2 border-b border-slate-100">Business Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Business Name" field="businessName" />
              <Field label="Owner Name" field="ownerName" />
              <Field label="Phone" field="phone" />
              <Field label="Email" field="email" type="email" />
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
    </div>
  );
}
