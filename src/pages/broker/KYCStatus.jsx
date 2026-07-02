import { useState, useEffect, useCallback } from "react";
import { FileText, Fingerprint, Building2, CreditCard, FileCheck, UploadCloud, Info, Edit2 } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../services/api";
import KycStatusCard from "../../components/kyc/KycStatusCard";
import KycSubmitForm from "../../components/kyc/KycSubmitForm";
import KycDocumentUpload from "../../components/kyc/KycDocumentUpload";

const FIELDS = [
  { key: "pan_number", label: "PAN Number", placeholder: "ABCDE1234F", icon: FileText },
  { key: "aadhaar_number", label: "Aadhaar Number", placeholder: "XXXX-XXXX-1234", icon: Fingerprint },
  { key: "gst_number", label: "GST Number", placeholder: "27ABCDE1234F1Z5", icon: Building2 },
  { key: "bank_account_number", label: "Bank Account Number", placeholder: "1234567890123", icon: CreditCard },
  { key: "business_registration_number", label: "Business Registration Number", placeholder: "U12345MH2020PTC123456", icon: FileCheck },
];

export default function KYCStatus() {
  const { user, updateUser } = useAuth();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [docFiles, setDocFiles] = useState({ pan_number: null, aadhaar_number: null });

  const token = user?.tokens?.access_token;
  const kycStatus = user?.kyc_status || "pending";

  const fetchKyc = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.get("/api/kyc/status", token);
      if (data.success) {
        setSubmission(data.data.submission);
        if (data.data.kyc_status) updateUser({ kyc_status: data.data.kyc_status });
      }
    } catch {}
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchKyc(); }, [fetchKyc]);

  const handleSubmit = async (documents) => {
    setSubmitting(true);
    try {
      // Attached files are not sent — document file storage isn't configured yet.
      const result = await api.post("/api/kyc/broker", { documents }, token);
      if (!result.success) throw new Error(result.message || "Submission failed");
      setSubmission(result.data.submission);
      updateUser({ kyc_status: "submitted" });
      setJustSubmitted(true);
      setEditing(false);
    } finally {
      setSubmitting(false);
    }
  };

  const showForm = kycStatus === "pending" || kycStatus === "rejected" || editing;

  return (
    <div className="space-y-5 w-full">
      <KycStatusCard status={kycStatus} rejectionReason={submission?.rejection_reason} />

      {justSubmitted && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700">
          Documents submitted successfully. We'll notify you once they're reviewed.
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-10 flex justify-center">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : showForm ? (
        <KycSubmitForm
          fields={FIELDS}
          initialValues={submission?.documents || {}}
          onSubmit={handleSubmit}
          submitting={submitting}
          buttonLabel={kycStatus === "rejected" || editing ? "Resubmit for Review" : "Submit for Review"}
          onCancel={editing ? () => setEditing(false) : undefined}
        >
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6">
            <div className="flex items-center gap-2 mb-1">
              <UploadCloud size={16} className="text-primary" />
              <h3 className="font-bold text-slate-900 text-[15px]">Upload Documents</h3>
            </div>
            <p className="text-xs text-slate-400 mb-5">Attach a clear photo or PDF of these two documents</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <KycDocumentUpload
                label="PAN Card"
                icon={FileText}
                file={docFiles.pan_number}
                onChange={(file) => setDocFiles((f) => ({ ...f, pan_number: file }))}
                onRemove={() => setDocFiles((f) => ({ ...f, pan_number: null }))}
              />
              <KycDocumentUpload
                label="Aadhaar Card"
                icon={Fingerprint}
                file={docFiles.aadhaar_number}
                onChange={(file) => setDocFiles((f) => ({ ...f, aadhaar_number: file }))}
                onRemove={() => setDocFiles((f) => ({ ...f, aadhaar_number: null }))}
              />
            </div>

            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mt-5 text-xs text-amber-700">
              <Info size={14} className="flex-shrink-0 mt-0.5" />
              Uploaded files aren't saved yet — document storage isn't set up on the server. Only the document numbers above will be submitted for review.
            </div>
          </div>
        </KycSubmitForm>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h3 className="text-[13px] font-bold text-slate-700">Submitted Documents</h3>
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <Edit2 size={12} /> Edit
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FIELDS.map(({ key, label, icon: Icon }) => (
              <div key={key}>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  {Icon && <Icon size={12} />} {label}
                </label>
                <p className="text-sm font-mono font-medium text-slate-800 py-1.5">
                  {submission?.documents?.[key] || "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
