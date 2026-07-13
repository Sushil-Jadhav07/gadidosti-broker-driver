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

// document_key used for the upload endpoint, and the field this url gets merged
// into on submit — kept separate from the number fields (pan_number etc.) so a
// photo url never overwrites the number, or vice versa.
const PHOTO_FIELDS = {
  pan_number: { documentKey: "pan_photo", urlField: "pan_photo_url", label: "PAN Card" },
  aadhaar_number: { documentKey: "aadhaar_photo", urlField: "aadhaar_photo_url", label: "Aadhaar Card" },
};

export default function KYCStatus() {
  const { user, updateUser } = useAuth();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [docFiles, setDocFiles] = useState({ pan_number: null, aadhaar_number: null });
  const [docUrls, setDocUrls] = useState({ pan_number: null, aadhaar_number: null });
  const [uploadingKey, setUploadingKey] = useState(null);
  const [uploadError, setUploadError] = useState("");

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
        const docs = data.data.submission?.documents || {};
        setDocUrls({
          pan_number: docs[PHOTO_FIELDS.pan_number.urlField] || null,
          aadhaar_number: docs[PHOTO_FIELDS.aadhaar_number.urlField] || null,
        });
      }
    } catch {}
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchKyc(); }, [fetchKyc]);

  const handleFileChange = async (key, file) => {
    setDocFiles((f) => ({ ...f, [key]: file }));
    setUploadError("");
    setUploadingKey(key);
    try {
      const { documentKey } = PHOTO_FIELDS[key];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_key", documentKey);
      const result = await api.upload("/api/kyc/documents/upload", formData, token);
      if (!result.success) throw new Error(result.message || "Upload failed");
      setDocUrls((u) => ({ ...u, [key]: result.data.document.url }));
    } catch (err) {
      setUploadError(err.message || "Failed to upload document");
      setDocFiles((f) => ({ ...f, [key]: null }));
    } finally {
      setUploadingKey(null);
    }
  };

  const handleFileRemove = (key) => {
    setDocFiles((f) => ({ ...f, [key]: null }));
    setDocUrls((u) => ({ ...u, [key]: null }));
  };

  const handleSubmit = async (documents) => {
    setSubmitting(true);
    try {
      const withPhotos = { ...documents };
      Object.entries(PHOTO_FIELDS).forEach(([key, { urlField }]) => {
        if (docUrls[key]) withPhotos[urlField] = docUrls[key];
      });
      const result = await api.post("/api/kyc/broker", { documents: withPhotos }, token);
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
                existingUrl={docUrls.pan_number}
                uploading={uploadingKey === "pan_number"}
                onChange={(file) => handleFileChange("pan_number", file)}
                onRemove={() => handleFileRemove("pan_number")}
              />
              <KycDocumentUpload
                label="Aadhaar Card"
                icon={Fingerprint}
                file={docFiles.aadhaar_number}
                existingUrl={docUrls.aadhaar_number}
                uploading={uploadingKey === "aadhaar_number"}
                onChange={(file) => handleFileChange("aadhaar_number", file)}
                onRemove={() => handleFileRemove("aadhaar_number")}
              />
            </div>

            {uploadError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mt-5 text-xs text-red-600">
                <Info size={14} className="flex-shrink-0 mt-0.5" />
                {uploadError}
              </div>
            )}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
            {Object.entries(PHOTO_FIELDS).map(([key, { label }]) => (
              <div key={key}>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5 block">
                  {label} Photo
                </label>
                {docUrls[key] ? (
                  <a href={docUrls[key]} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                    View file
                  </a>
                ) : (
                  <p className="text-sm text-slate-400">Not uploaded</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
