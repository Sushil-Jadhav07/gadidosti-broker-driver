import { useState, useEffect } from "react";
import { AlertCircle, FileText } from "lucide-react";

export default function KycSubmitForm({ fields, initialValues = {}, onSubmit, submitting, buttonLabel = "Submit for Review", onCancel, children }) {
  const [values, setValues] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    const seeded = {};
    fields.forEach(({ key }) => { seeded[key] = initialValues[key] || ""; });
    setValues(seeded);
  }, [fields, initialValues]);

  const canSubmit = fields.every(({ key, optional }) => optional || (values[key] || "").trim().length > 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!canSubmit) {
      setError("Please fill in all required document fields");
      return;
    }
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err.message || "Failed to submit KYC documents");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6">
        <div className="flex items-center gap-2 mb-1">
          <FileText size={16} className="text-primary" />
          <h3 className="font-bold text-slate-900 text-[15px]">Document Numbers</h3>
        </div>
        <p className="text-xs text-slate-400 mb-5">Enter the ID/number printed on each document</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {fields.map(({ key, label, placeholder, icon: Icon, optional }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                {label} {optional && <span className="text-slate-300 font-normal">(optional)</span>}
              </label>
              <div className="relative">
                {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />}
                <input
                  type="text"
                  value={values[key] || ""}
                  onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className={`input-field ${Icon ? "pl-9" : "pl-3"} pr-3 py-2.5 text-sm font-mono`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {children}

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-2.5">
          <AlertCircle size={15} className="flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={submitting || !canSubmit} className="btn-primary px-6 py-3 text-sm flex items-center gap-2 disabled:opacity-50">
          {submitting ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Submitting...</>
          ) : buttonLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={submitting} className="btn-ghost px-6 py-3 text-sm border border-slate-200 disabled:opacity-50">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
