import { useState, useEffect, useCallback } from "react";
import { CreditCard, Fingerprint, Truck, ShieldCheck, UploadCloud, Info, Edit2 } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../services/api";
import KycStatusCard from "../../components/kyc/KycStatusCard";
import KycSubmitForm from "../../components/kyc/KycSubmitForm";
import KycDocumentUpload from "../../components/kyc/KycDocumentUpload";

const FIELDS = [
  { key: "license_number", label: "Driving License Number", placeholder: "MH-2020123456789", icon: CreditCard },
  { key: "aadhaar_number", label: "Aadhaar Number", placeholder: "XXXX-XXXX-1234", icon: Fingerprint },
  { key: "vehicle_registration_number", label: "Vehicle Registration Number", placeholder: "MH-12-CD-5678", icon: Truck },
  { key: "vehicle_insurance_number", label: "Vehicle Insurance Number", placeholder: "INS-2024-567890", icon: ShieldCheck },
];

// documentKey must equal urlField — POST /api/kyc/documents/upload immediately merges
// the uploaded url into kyc_submissions.documents under document_key, before the user
// ever clicks Submit. Using the same key here means that merge already lands under the
// field fetchKyc reads back, so an uploaded-but-not-yet-submitted photo survives a
// refresh/tab-switch instead of only "really" saving once Submit is clicked.
const PHOTO_FIELDS = {
  license_number: { documentKey: "license_photo_url", urlField: "license_photo_url", label: "Driving License" },
  aadhaar_number: { documentKey: "aadhaar_photo_url", urlField: "aadhaar_photo_url", label: "Aadhaar Card" },
};

export default function DriverKYC() {
  const { user, updateUser } = useAuth();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [docFiles, setDocFiles] = useState({ license_number: null, aadhaar_number: null });
  const [docUrls, setDocUrls] = useState({ license_number: null, aadhaar_number: null });
  const [uploadingKey, setUploadingKey] = useState(null);
  const [uploadError, setUploadError] = useState("");

  const token = user?.tokens?.access_token;
  const kycStatus = user?.kyc_status || "pending";

  const fetchKyc = useCallback(async () => {
    if (!token) return;
    const requestUserId = user?.id;
    setLoading(true);
    try {
      const data = await api.get("/api/kyc/status", token);
      if (data.success) {
        setSubmission(data.data.submission);
        // Skip if the logged-in account has changed since this request was issued — otherwise
        // a slow response from a since-logged-out account could overwrite whoever's logged in now.
        if (data.data.kyc_status) updateUser({ kyc_status: data.data.kyc_status }, requestUserId);
        const docs = data.data.submission?.documents || {};
        setDocUrls({
          license_number: docs[PHOTO_FIELDS.license_number.urlField] || null,
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
    const requestUserId = user?.id;
    setSubmitting(true);
    try {
      const withPhotos = { ...documents };
      Object.entries(PHOTO_FIELDS).forEach(([key, { urlField }]) => {
        if (docUrls[key]) withPhotos[urlField] = docUrls[key];
      });
      const result = await api.post("/api/kyc/driver", { documents: withPhotos }, token);
      if (!result.success) throw new Error(result.message || "Submission failed");
      setSubmission(result.data.submission);
      updateUser({ kyc_status: "submitted" }, requestUserId);
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
                label="Driving License"
                icon={CreditCard}
                file={docFiles.license_number}
                existingUrl={docUrls.license_number}
                uploading={uploadingKey === "license_number"}
                onChange={(file) => handleFileChange("license_number", file)}
                onRemove={() => handleFileRemove("license_number")}
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
            {Object.entries(PHOTO_FIELDS).map(([key, { urlField, label }]) => (
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
