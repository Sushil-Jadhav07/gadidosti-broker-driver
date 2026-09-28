import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Truck, ShieldCheck, CreditCard, Fingerprint, Building2, FileText,
  Calendar, CheckCircle2, ArrowRight, Loader2, ShieldAlert,
  Clock, PartyPopper, RefreshCw, AlertCircle, LayoutDashboard,
  Landmark, UserCheck, HelpCircle,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import KycDocumentUpload from "../components/kyc/KycDocumentUpload";

// Typed-but-unsubmitted field values, stashed across the round trip to DigiLocker (see
// startDigilocker / the prefill effect) — a full-page redirect would otherwise wipe them.
const ONBOARDING_VALUES_KEY = "ssk_onboarding_values";

// Same keys as the backend's verification_results (see kyc.controller.js).
const REQUIRED = {
  driver: ["aadhaar", "pan", "drivingLicense"],
  broker: ["aadhaar", "pan"],
};
const DOC_LABEL = { aadhaar: "Aadhaar", pan: "PAN", drivingLicense: "Driving License" };
const DOC_ICON = { aadhaar: Fingerprint, pan: Landmark, drivingLicense: CreditCard };

function Badge({ status, message }) {
  if (status === "loading") return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400"><Loader2 size={13} className="animate-spin" /> Checking...</span>;
  if (status === "verified") return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600"><CheckCircle2 size={13} /> Verified</span>;
  if (status === "missing") return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600"><ShieldAlert size={13} /> {message || "Not found in your DigiLocker"}</span>;
  if (status === "failed") return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600"><ShieldAlert size={13} /> {message || "Didn't match — check the details and try again"}</span>;
  if (status === "error") return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600"><ShieldAlert size={13} /> {message || "Couldn't reach verification, try again"}</span>;
  return <span className="text-xs text-slate-400">Not verified yet</span>;
}

const inputCls = "input-field pl-9 pr-3 py-2.5 text-sm font-mono w-full";

// What actually happens on this page — no invented stats or certifications, just the real
// checks and the real fallback (manual review), so the copy stays true for whoever reads it.
const TRUST_POINTS = {
  broker: [
    { icon: Fingerprint, text: "You confirm through DigiLocker, the government's own document service — you sign in there, we never see your login." },
    { icon: Landmark, text: "Your Aadhaar and PAN come straight from those government records, so there's nothing to type or photograph." },
    { icon: ShieldCheck, text: "Documents are used only to verify your identity and business — never shared beyond what's needed for compliance." },
  ],
  driver: [
    { icon: Fingerprint, text: "You confirm through DigiLocker, the government's own document service — you sign in there, we never see your login." },
    { icon: Landmark, text: "Your Aadhaar, PAN and driving license come straight from those government records, so there's nothing to type or photograph." },
    { icon: CreditCard, text: "Your driving license is verified before you can accept jobs." },
  ],
};

export default function Onboarding() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const token = user?.tokens?.access_token;
  const role = user?.role === "driver" ? "driver" : "broker";
  const required = REQUIRED[role];

  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState("");
  const [values, setValues] = useState({});
  const [docFiles, setDocFiles] = useState({});
  const [docUrls, setDocUrls] = useState({});
  const [uploadingKey, setUploadingKey] = useState(null);

  // Per-document result: { status: verified | missing | failed | error | loading, message }
  const [docs, setDocs] = useState({});
  const setDoc = (key, patch) => setDocs((d) => ({ ...d, [key]: { ...d[key], ...patch } }));
  // The DigiLocker session as a whole: idle | loading | error, plus its id so a still-pending
  // one can be re-checked by hand.
  const [dg, setDg] = useState({ status: "idle", message: null, id: null });

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { autoVerified: bool } once submitted
  const [submitError, setSubmitError] = useState("");

  // Prefill from whatever's already on file — a rejected resubmission, or a session they left
  // and came back to — and, if they've just come back from DigiLocker, resolve that too.
  useEffect(() => {
    if (!token) return;
    api.get("/api/kyc/status", token).then((data) => {
      if (data.success) {
        const submission = data.data.submission;
        const saved = submission?.documents || {};
        setValues(saved);
        setDocUrls({
          pan_photo_url: saved.pan_photo_url || null,
          aadhaar_photo_url: saved.aadhaar_photo_url || null,
          license_photo_url: saved.license_photo_url || null,
        });
        setRejectionReason(submission?.rejection_reason || "");
        const vr = submission?.verification_results || {};
        const known = {};
        for (const key of required) if (vr[key]?.status) known[key] = { status: vr[key].status };
        setDocs(known);

        const returnedId = new URLSearchParams(window.location.search).get("verification_id");
        if (returnedId) {
          try {
            const stored = JSON.parse(sessionStorage.getItem(ONBOARDING_VALUES_KEY) || "null");
            if (stored) setValues({ ...saved, ...stored });
          } catch { /* ignore a corrupt/blocked stash */ }
          window.history.replaceState({}, "", window.location.pathname);
          checkDigilocker(returnedId);
        }
      }
      setLoading(false);
    }).catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const setField = (key, val) => setValues((v) => ({ ...v, [key]: val }));

  const handleFileChange = async (key, documentKey, file) => {
    setDocFiles((f) => ({ ...f, [key]: file }));
    setUploadingKey(key);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_key", documentKey);
      const res = await api.upload("/api/kyc/documents/upload", formData, token);
      if (!res.success) throw new Error(res.message);
      setDocUrls((u) => ({ ...u, [documentKey]: res.data.document.url }));
    } catch {
      setDocFiles((f) => ({ ...f, [key]: null }));
    } finally {
      setUploadingKey(null);
    }
  };

  const clearDoc = (key, documentKey) => {
    setDocFiles((f) => ({ ...f, [key]: null }));
    setDocUrls((u) => ({ ...u, [documentKey]: null }));
  };

  // One DigiLocker sign-in covers every document this role needs (a redirect, not inline entry):
  // start → the user leaves for DigiLocker → they land back on /onboarding?verification_id=… →
  // checkDigilocker resolves it. The typed fallback fields would be wiped by that full-page round
  // trip, so they're stashed in sessionStorage first and restored on return (see the prefill effect).
  const startDigilocker = async () => {
    setDg({ status: "loading", message: null, id: null });
    try {
      try { sessionStorage.setItem(ONBOARDING_VALUES_KEY, JSON.stringify(values)); } catch { /* storage unavailable — worst case the user re-types */ }
      const res = await api.post("/api/kyc/verify/digilocker/start", { redirect_url: `${window.location.origin}/onboarding` }, token);
      if (!res.success) throw new Error(res.message);
      window.location.href = res.data.url;
    } catch (err) {
      setDg({ status: "error", message: err.message, id: null });
    }
  };

  // 'pending' means they haven't finished in DigiLocker yet (or Cashfree is still processing) —
  // poll briefly, then hand the retry to a manual button rather than spinning forever.
  const checkDigilocker = async (verificationId, attempt = 0) => {
    setDg({ status: "loading", message: null, id: verificationId });
    try {
      const res = await api.get(`/api/kyc/verify/digilocker/status?verification_id=${encodeURIComponent(verificationId)}`, token);
      if (!res.success) throw new Error(res.message);
      const { status, message, documents } = res.data;
      if (status === "pending") {
        if (attempt < 4) {
          setTimeout(() => checkDigilocker(verificationId, attempt + 1), 3000);
          return;
        }
        setDg({ status: "error", message: "DigiLocker hasn't confirmed yet. If you finished there, tap Check status; otherwise start again.", id: verificationId });
        return;
      }
      if (status === "failed") {
        setDg({ status: "error", message: message || "DigiLocker didn't complete — please start again.", id: null });
        return;
      }
      // done: verified documents are settled; missing ones fall back to entering the number.
      const next = {};
      for (const key of required) {
        const d = documents?.[key];
        if (d?.status === "verified") next[key] = { status: "verified" };
        else if (d?.status === "missing") next[key] = { status: "missing", message: d.details?.message };
      }
      setDocs((current) => ({ ...current, ...next }));
      setDg({ status: "idle", message: null, id: null });
    } catch (err) {
      setDg({ status: "error", message: err.message, id: verificationId });
    }
  };

  // Fallbacks for a document that isn't in the user's DigiLocker — verify just that one by number.
  const verifyPan = async () => {
    if (!values.pan_number) return;
    setDoc("pan", { status: "loading", message: null });
    try {
      const res = await api.post("/api/kyc/verify/pan", { pan: values.pan_number, name: user?.name }, token);
      if (!res.success) throw new Error(res.message);
      setDoc("pan", { status: res.data.status, message: res.data.details?.message });
    } catch (err) {
      setDoc("pan", { status: "error", message: err.message });
    }
  };

  const verifyDl = async () => {
    if (!values.license_number || !values.date_of_birth) return;
    setDoc("drivingLicense", { status: "loading", message: null });
    try {
      const res = await api.post("/api/kyc/verify/driving-license", { dl_number: values.license_number, dob: values.date_of_birth }, token);
      if (!res.success) throw new Error(res.message);
      setDoc("drivingLicense", { status: res.data.status, message: res.data.details?.message });
    } catch (err) {
      setDoc("drivingLicense", { status: "error", message: err.message });
    }
  };

  const submitOnboarding = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      const documents = { ...values, ...docUrls };
      const path = role === "driver" ? "/api/kyc/driver" : "/api/kyc/broker";
      const res = await api.post(path, { documents }, token);
      if (!res.success) throw new Error(res.message || "Submission failed");
      const autoVerified = res.data.kyc_status === "verified";
      updateUser({ kyc_status: res.data.kyc_status }, user.id);
      try { sessionStorage.removeItem(ONBOARDING_VALUES_KEY); } catch { /* ignore */ }
      setResult({ autoVerified });
    } catch (err) {
      setSubmitError(err.message || "Something went wrong — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  const recheckStatus = async () => {
    setSubmitting(true);
    try {
      const data = await api.get("/api/kyc/status", token);
      if (data.success && data.data.kyc_status === "verified") {
        updateUser({ kyc_status: "verified" }, user.id);
        setResult({ autoVerified: false, wasReviewed: true });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const goToDashboard = () => navigate(role === "driver" ? "/driver" : "/broker", { replace: true });

  const allVerified = required.every((key) => docs[key]?.status === "verified");
  // A document shows its number-entry fallback once DigiLocker couldn't supply it (or a number
  // check on it just failed) — never up front, so the normal path has nothing to type at all.
  // ("loading" is only ever set by these fallback checks themselves, so keeping the fields
  // visible through it stops them vanishing mid-check.)
  const needsFallback = (key) => ["missing", "failed", "error", "loading"].includes(docs[key]?.status);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-100 shadow-card p-10 text-center">
          {result.autoVerified || result.wasReviewed ? (
            <>
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-5">
                <PartyPopper size={28} className="text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">You're all set!</h2>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Your details have been verified. You now have full access to the platform.
              </p>
              <button onClick={goToDashboard} className="btn-primary mt-7 px-6 py-3 text-sm inline-flex items-center gap-2 w-full justify-center">
                Go to Dashboard <ArrowRight size={15} />
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
                <Clock size={28} className="text-amber-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Almost there</h2>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                A couple of your details need a closer look from our team before we can unlock your account — usually within 24-48 hours.
              </p>
              <button onClick={recheckStatus} disabled={submitting} className="btn-ghost mt-7 px-6 py-3 text-sm border border-slate-200 inline-flex items-center gap-2 w-full justify-center disabled:opacity-50">
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Check Status
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img src="/gadidost-logo.png" alt="GadiDost" className="h-7 w-auto" />
            <div className="hidden sm:block h-6 w-px bg-slate-200" />
            <p className="hidden sm:block text-xs font-semibold text-slate-500">{role === "driver" ? "Driver Verification" : "Broker Verification"}</p>
          </div>
          <button
            onClick={goToDashboard}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary transition-colors"
          >
            <LayoutDashboard size={14} /> Back to Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-card p-7 order-2 lg:order-1 space-y-7">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <ShieldCheck size={22} className="text-primary" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Let's get you verified, {user?.name?.split(" ")[0] || ""}</h2>
            <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
              {role === "driver"
                ? "Sign in once with DigiLocker and we'll confirm your Aadhaar, PAN and driving license together. Nothing to type or photograph."
                : "Sign in once with DigiLocker and we'll confirm your Aadhaar and PAN together. Nothing to type or photograph."}
            </p>
          </div>

          {rejectionReason && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-600">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span><span className="font-semibold">Previously rejected: </span>{rejectionReason}</span>
            </div>
          )}

          <div className="space-y-3">
            {required.map((key) => {
              const Icon = DOC_ICON[key];
              const d = docs[key] || { status: "idle" };
              return (
                <div key={key} className="bg-slate-50 rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Icon size={15} className="text-slate-400" /> {DOC_LABEL[key]}</span>
                    <Badge status={d.status} message={d.message} />
                  </div>

                  {needsFallback(key) && (
                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
                      {key === "aadhaar" && (
                        <>
                          <p className="text-[11px] text-slate-400">Couldn't confirm this through DigiLocker — add the number and our team will review it (usually within 24-48 hours).</p>
                          <div className="relative">
                            <Fingerprint size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" value={values.aadhaar_number || ""} onChange={(e) => setField("aadhaar_number", e.target.value)} placeholder="XXXX-XXXX-1234" className={inputCls} />
                          </div>
                          <KycDocumentUpload
                            label="Aadhaar Card Photo" icon={Fingerprint}
                            file={docFiles.aadhaar_number} existingUrl={docUrls.aadhaar_photo_url}
                            uploading={uploadingKey === "aadhaar_number"}
                            onChange={(file) => handleFileChange("aadhaar_number", "aadhaar_photo_url", file)}
                            onRemove={() => clearDoc("aadhaar_number", "aadhaar_photo_url")}
                          />
                        </>
                      )}
                      {key === "pan" && (
                        <>
                          <div className="relative">
                            <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" value={values.pan_number || ""} onChange={(e) => setField("pan_number", e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} className={inputCls} />
                          </div>
                          <KycDocumentUpload
                            label="PAN Card Photo" icon={FileText}
                            file={docFiles.pan_number} existingUrl={docUrls.pan_photo_url}
                            uploading={uploadingKey === "pan_number"}
                            onChange={(file) => handleFileChange("pan_number", "pan_photo_url", file)}
                            onRemove={() => clearDoc("pan_number", "pan_photo_url")}
                          />
                          <button type="button" onClick={verifyPan} disabled={!values.pan_number} className="btn-primary px-4 py-2 text-xs disabled:opacity-40">Verify PAN</button>
                        </>
                      )}
                      {key === "drivingLicense" && (
                        <>
                          <div className="relative">
                            <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" value={values.license_number || ""} onChange={(e) => setField("license_number", e.target.value)} placeholder="MH-2020123456789" className={inputCls} />
                          </div>
                          <div className="relative">
                            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                            <input type="date" value={values.date_of_birth || ""} onChange={(e) => setField("date_of_birth", e.target.value)} max={new Date().toISOString().slice(0, 10)} className={inputCls} />
                          </div>
                          <KycDocumentUpload
                            label="Driving License Photo" icon={CreditCard}
                            file={docFiles.license_number} existingUrl={docUrls.license_photo_url}
                            uploading={uploadingKey === "license_number"}
                            onChange={(file) => handleFileChange("license_number", "license_photo_url", file)}
                            onRemove={() => clearDoc("license_number", "license_photo_url")}
                          />
                          <button type="button" onClick={verifyDl} disabled={!values.license_number || !values.date_of_birth} className="btn-primary px-4 py-2 text-xs disabled:opacity-40">Verify License</button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!allVerified && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={startDigilocker}
                disabled={dg.status === "loading"}
                className="btn-primary w-full py-3 text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {dg.status === "loading" ? <><Loader2 size={15} className="animate-spin" /> Working...</> : <>Verify with DigiLocker <ArrowRight size={15} /></>}
              </button>
              {dg.status === "error" && (
                <div className="flex items-center justify-between gap-3 text-xs text-amber-600 font-semibold">
                  <span className="inline-flex items-center gap-1.5"><ShieldAlert size={13} /> {dg.message}</span>
                  {dg.id && (
                    <button type="button" onClick={() => checkDigilocker(dg.id)} className="text-primary hover:underline flex-shrink-0">Check status</button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-bold text-slate-900">{role === "driver" ? "Vehicle details" : "Business details"}</h3>
            <p className="text-xs text-slate-400 mt-0.5 mb-4">Optional — you can add or update these later from your profile too.</p>
            <div className="space-y-3">
              {role === "driver" ? (
                <>
                  <div className="relative">
                    <Truck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={values.vehicle_registration_number || ""} onChange={(e) => setField("vehicle_registration_number", e.target.value)} placeholder="Vehicle Registration Number" className={inputCls} />
                  </div>
                  <div className="relative">
                    <ShieldCheck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={values.vehicle_insurance_number || ""} onChange={(e) => setField("vehicle_insurance_number", e.target.value)} placeholder="Vehicle Insurance Number" className={inputCls} />
                  </div>
                </>
              ) : (
                <>
                  <div className="relative">
                    <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={values.gst_number || ""} onChange={(e) => setField("gst_number", e.target.value.toUpperCase())} placeholder="GST Number" className={inputCls} />
                  </div>
                  <div className="relative">
                    <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={values.bank_account_number || ""} onChange={(e) => setField("bank_account_number", e.target.value)} placeholder="Bank Account Number" className={inputCls} />
                  </div>
                  <div className="relative">
                    <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={values.business_registration_number || ""} onChange={(e) => setField("business_registration_number", e.target.value)} placeholder="Business Registration Number" className={inputCls} />
                  </div>
                </>
              )}
            </div>
          </div>

          {submitError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-4 py-2.5">
              <AlertCircle size={14} className="flex-shrink-0" /> {submitError}
            </div>
          )}

          <button onClick={submitOnboarding} disabled={submitting} className={`w-full py-3 text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60 ${allVerified ? "btn-primary" : "btn-ghost border border-slate-200"}`}>
            {submitting ? <><Loader2 size={15} className="animate-spin" /> Submitting...</> : allVerified ? <>Finish <ArrowRight size={15} /></> : <>Submit for review</>}
          </button>
          {!allVerified && (
            <p className="text-[11px] text-slate-400 -mt-4 text-center">Anything not verified above is checked manually by our team, usually within 24-48 hours.</p>
          )}
        </div>

        <div className="lg:col-span-1 space-y-4 order-1 lg:order-2">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <ShieldCheck size={18} className="text-primary" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Why we verify this</h3>
            <ul className="mt-3 space-y-3">
              {TRUST_POINTS[role].map((point, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <point.icon size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-500 leading-relaxed">{point.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
              <HelpCircle size={18} className="text-amber-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">If a document isn't in DigiLocker</h3>
            <p className="text-xs text-slate-500 leading-relaxed mt-2">
              DigiLocker only returns documents that are in your account. If one is missing you'll be asked
              to enter its details instead — or you can link it inside DigiLocker and try again. Anything
              still unverified is reviewed by our team, usually within 24-48 hours.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400 px-1">
            <UserCheck size={13} className="flex-shrink-0" />
            Signed in as {user?.name || (role === "driver" ? "Driver" : "Broker")}
          </div>
        </div>
      </div>
    </div>
  );
}
