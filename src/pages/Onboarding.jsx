import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Truck, ShieldCheck, CreditCard, Fingerprint, Building2, FileText,
  Calendar, CheckCircle2, ArrowRight, ArrowLeft, Loader2, ShieldAlert,
  Clock, PartyPopper, RefreshCw, AlertCircle,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import KycDocumentUpload from "../components/kyc/KycDocumentUpload";

// Step lists per role — 'welcome' and 'review' bookend a role-specific run of verification
// steps. Broker has no driving license, driver has no GST/bank/business fields.
const STEPS = {
  driver: ["welcome", "pan", "aadhaar", "license", "vehicle", "review"],
  broker: ["welcome", "pan", "aadhaar", "business", "review"],
};

const STEP_LABEL = {
  welcome: "Start", pan: "PAN", aadhaar: "Aadhaar", license: "License",
  vehicle: "Vehicle", business: "Business", review: "Review",
};

function ProgressBar({ steps, currentIndex }) {
  return (
    <div className="flex items-center gap-1.5 mb-8">
      {steps.map((s, i) => (
        <div key={s} className="flex-1">
          <div className={`h-1.5 rounded-full transition-colors ${i <= currentIndex ? "bg-primary" : "bg-slate-200"}`} />
        </div>
      ))}
    </div>
  );
}

function StepShell({ icon: Icon, title, subtitle, children }) {
  return (
    <div>
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Icon size={22} className="text-primary" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      {subtitle && <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Badge({ status, message }) {
  if (status === "loading") return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400"><Loader2 size={13} className="animate-spin" /> Checking...</span>;
  if (status === "verified") return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600"><CheckCircle2 size={13} /> Verified</span>;
  if (status === "failed") return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600"><ShieldAlert size={13} /> Didn't match — check the details and try again</span>;
  if (status === "error") return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600"><ShieldAlert size={13} /> {message || "Couldn't reach verification, try again"}</span>;
  return null;
}

const inputCls = "input-field pl-9 pr-3 py-2.5 text-sm font-mono w-full";

export default function Onboarding() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const token = user?.tokens?.access_token;
  const role = user?.role === "driver" ? "driver" : "broker";
  const steps = STEPS[role];

  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState("");
  const [values, setValues] = useState({});
  const [docFiles, setDocFiles] = useState({});
  const [docUrls, setDocUrls] = useState({});
  const [uploadingKey, setUploadingKey] = useState(null);

  const [pan, setPan] = useState({ status: "idle" });
  const [dl, setDl] = useState({ status: "idle" });
  const [aadhaar, setAadhaar] = useState({ status: "idle", otpSent: false, refId: null, otp: "" });
  const [skipped, setSkipped] = useState({});
  const [resendCooldown, setResendCooldown] = useState(0);

  // Blocks rapid repeat Send/Resend clicks — Cashfree can issue a fresh OTP+ref_id on every
  // request, so clicking Resend before the SMS for the previous one even arrives risks the code
  // that shows up on the phone belonging to a different ref_id than the one this page ends up
  // holding, and Cashfree fails it as invalid even though it matches a screen the user can see.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { autoVerified: bool } once submitted
  const [submitError, setSubmitError] = useState("");

  // Prefill from whatever's already on file — a rejected resubmission, or a session they left
  // mid-onboarding and came back to.
  useEffect(() => {
    if (!token) return;
    api.get("/api/kyc/status", token).then((data) => {
      if (data.success) {
        const submission = data.data.submission;
        const docs = submission?.documents || {};
        setValues(docs);
        setDocUrls({
          pan_photo_url: docs.pan_photo_url || null,
          aadhaar_photo_url: docs.aadhaar_photo_url || null,
          license_photo_url: docs.license_photo_url || null,
        });
        setRejectionReason(submission?.rejection_reason || "");
        const vr = submission?.verification_results || {};
        if (vr.pan?.status) setPan({ status: vr.pan.status });
        if (vr.drivingLicense?.status) setDl({ status: vr.drivingLicense.status });
        if (vr.aadhaar?.status) setAadhaar((a) => ({ ...a, status: vr.aadhaar.status }));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
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

  const verifyPan = async () => {
    if (!values.pan_number) return;
    setPan({ status: "loading" });
    try {
      const res = await api.post("/api/kyc/verify/pan", { pan: values.pan_number, name: user?.name }, token);
      if (!res.success) throw new Error(res.message);
      setPan({ status: res.data.status });
    } catch (err) {
      setPan({ status: "error", message: err.message });
    }
  };

  const verifyDl = async () => {
    if (!values.license_number || !values.date_of_birth) return;
    setDl({ status: "loading" });
    try {
      const res = await api.post("/api/kyc/verify/driving-license", { dl_number: values.license_number, dob: values.date_of_birth }, token);
      if (!res.success) throw new Error(res.message);
      setDl({ status: res.data.status });
    } catch (err) {
      setDl({ status: "error", message: err.message });
    }
  };

  const sendAadhaarOtp = async () => {
    const cleaned = (values.aadhaar_number || "").replace(/-/g, "");
    if (!cleaned || resendCooldown > 0) return;
    setAadhaar((a) => ({ ...a, status: "loading" }));
    try {
      const res = await api.post("/api/kyc/verify/aadhaar/send-otp", { aadhaar_number: cleaned }, token);
      if (!res.success) throw new Error(res.message);
      // A fresh OTP was just sent — clear whatever was typed from a previous one, so there's no
      // chance of submitting a stale code against this new ref_id.
      setAadhaar((a) => ({ ...a, status: "idle", otpSent: true, refId: res.data.refId, otp: "", message: null }));
      setResendCooldown(30);
    } catch (err) {
      setAadhaar((a) => ({ ...a, status: "error", message: err.message }));
      setResendCooldown(30);
    }
  };

  const verifyAadhaarOtp = async () => {
    if (!aadhaar.refId || !aadhaar.otp) return;
    setAadhaar((a) => ({ ...a, status: "loading" }));
    try {
      const res = await api.post("/api/kyc/verify/aadhaar/verify-otp", { ref_id: aadhaar.refId, otp: aadhaar.otp }, token);
      if (!res.success) throw new Error(res.message);
      setAadhaar((a) => ({ ...a, status: res.data.status }));
    } catch (err) {
      setAadhaar((a) => ({ ...a, status: "error", message: err.message }));
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

  const currentStep = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  const canAdvance = () => {
    if (currentStep === "pan") return pan.status === "verified" || skipped.pan;
    if (currentStep === "aadhaar") return aadhaar.status === "verified" || skipped.aadhaar;
    if (currentStep === "license") return dl.status === "verified" || skipped.license;
    return true;
  };

  const next = () => setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  const back = () => setStepIndex((i) => Math.max(i - 1, 0));
  const skipThisStep = () => { setSkipped((s) => ({ ...s, [currentStep]: true })); next(); };

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
    <div className="min-h-screen bg-slate-50 px-4 py-10 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Truck size={18} className="text-white" />
          </div>
          <span className="font-bold text-slate-900">SSK Logistics</span>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-card p-7">
          <ProgressBar steps={steps} currentIndex={stepIndex} />

          {rejectionReason && stepIndex === 0 && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-xs text-red-600">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span><span className="font-semibold">Previously rejected: </span>{rejectionReason}</span>
            </div>
          )}

          {currentStep === "welcome" && (
            <StepShell
              icon={ShieldCheck}
              title={`Let's get you verified, ${user?.name?.split(" ")[0] || ""}`}
              subtitle={
                role === "driver"
                  ? "Before you can accept jobs, we need to confirm your PAN, Aadhaar, and driving license. It only takes a couple of minutes — most checks happen instantly."
                  : "Before you can list trucks and accept jobs, we need to confirm your PAN and Aadhaar. It only takes a couple of minutes — most checks happen instantly."
              }
            >
              <button onClick={next} className="btn-primary w-full py-3 text-sm inline-flex items-center justify-center gap-2">
                Get Started <ArrowRight size={15} />
              </button>
            </StepShell>
          )}

          {currentStep === "pan" && (
            <StepShell icon={CreditCard} title="Verify your PAN" subtitle="Enter your PAN exactly as printed on the card.">
              <div className="space-y-4">
                <div className="relative">
                  <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={values.pan_number || ""} onChange={(e) => setField("pan_number", e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F" maxLength={10} className={inputCls} />
                </div>
                <KycDocumentUpload
                  label="PAN Card Photo" icon={FileText}
                  file={docFiles.pan_number} existingUrl={docUrls.pan_photo_url}
                  uploading={uploadingKey === "pan_number"}
                  onChange={(file) => handleFileChange("pan_number", "pan_photo_url", file)}
                  onRemove={() => { setDocFiles((f) => ({ ...f, pan_number: null })); setDocUrls((u) => ({ ...u, pan_photo_url: null })); }}
                />
                <div className="flex items-center justify-between gap-3">
                  <Badge status={pan.status} message={pan.message} />
                  <button type="button" onClick={verifyPan} disabled={!values.pan_number || pan.status === "loading"}
                    className="btn-primary px-4 py-2 text-xs disabled:opacity-40 flex-shrink-0">
                    Verify PAN
                  </button>
                </div>
              </div>
            </StepShell>
          )}

          {currentStep === "aadhaar" && (
            <StepShell icon={Fingerprint} title="Verify your Aadhaar" subtitle="We'll send a one-time password to the mobile number linked to this Aadhaar.">
              <div className="space-y-4">
                <div className="relative">
                  <Fingerprint size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={values.aadhaar_number || ""} onChange={(e) => setField("aadhaar_number", e.target.value)}
                    placeholder="XXXX-XXXX-1234" disabled={aadhaar.otpSent} className={`${inputCls} disabled:opacity-60`} />
                </div>
                <KycDocumentUpload
                  label="Aadhaar Card Photo" icon={Fingerprint}
                  file={docFiles.aadhaar_number} existingUrl={docUrls.aadhaar_photo_url}
                  uploading={uploadingKey === "aadhaar_number"}
                  onChange={(file) => handleFileChange("aadhaar_number", "aadhaar_photo_url", file)}
                  onRemove={() => { setDocFiles((f) => ({ ...f, aadhaar_number: null })); setDocUrls((u) => ({ ...u, aadhaar_photo_url: null })); }}
                />
                {!aadhaar.otpSent ? (
                  <div className="flex items-center justify-between gap-3">
                    <Badge status={aadhaar.status} message={aadhaar.message} />
                    <button type="button" onClick={sendAadhaarOtp} disabled={!values.aadhaar_number || aadhaar.status === "loading" || resendCooldown > 0}
                      className="btn-primary px-4 py-2 text-xs disabled:opacity-40 flex-shrink-0">
                      Send OTP
                    </button>
                  </div>
                ) : aadhaar.status !== "verified" ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="text" inputMode="numeric" value={aadhaar.otp} onChange={(e) => setAadhaar((a) => ({ ...a, otp: e.target.value }))}
                        placeholder="Enter OTP" className="input-field flex-1 py-2.5 text-sm font-mono" />
                      <button type="button" onClick={verifyAadhaarOtp} disabled={!aadhaar.otp || aadhaar.status === "loading"}
                        className="btn-primary px-4 py-2.5 text-xs disabled:opacity-40 flex-shrink-0">
                        Verify
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge status={aadhaar.status} message={aadhaar.message} />
                      <button type="button" onClick={sendAadhaarOtp} disabled={aadhaar.status === "loading" || resendCooldown > 0} className="text-xs text-primary font-semibold hover:underline disabled:opacity-40 disabled:no-underline">
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                      </button>
                    </div>
                    {aadhaar.status === "failed" && (
                      <p className="text-[11px] text-slate-400">
                        Make sure you're entering the code from the most recent SMS — if you tapped Resend more than once, only the latest one is valid.
                      </p>
                    )}
                  </div>
                ) : (
                  <Badge status={aadhaar.status} message={aadhaar.message} />
                )}
              </div>
            </StepShell>
          )}

          {currentStep === "license" && (
            <StepShell icon={ShieldCheck} title="Verify your Driving License" subtitle="Enter your license number and date of birth exactly as on the license.">
              <div className="space-y-4">
                <div className="relative">
                  <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={values.license_number || ""} onChange={(e) => setField("license_number", e.target.value)}
                    placeholder="MH-2020123456789" className={inputCls} />
                </div>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                  <input type="date" value={values.date_of_birth || ""} onChange={(e) => setField("date_of_birth", e.target.value)}
                    max={new Date().toISOString().slice(0, 10)} className={inputCls} />
                </div>
                <KycDocumentUpload
                  label="Driving License Photo" icon={CreditCard}
                  file={docFiles.license_number} existingUrl={docUrls.license_photo_url}
                  uploading={uploadingKey === "license_number"}
                  onChange={(file) => handleFileChange("license_number", "license_photo_url", file)}
                  onRemove={() => { setDocFiles((f) => ({ ...f, license_number: null })); setDocUrls((u) => ({ ...u, license_photo_url: null })); }}
                />
                <div className="flex items-center justify-between gap-3">
                  <Badge status={dl.status} message={dl.message} />
                  <button type="button" onClick={verifyDl} disabled={!values.license_number || !values.date_of_birth || dl.status === "loading"}
                    className="btn-primary px-4 py-2 text-xs disabled:opacity-40 flex-shrink-0">
                    Verify License
                  </button>
                </div>
              </div>
            </StepShell>
          )}

          {currentStep === "vehicle" && (
            <StepShell icon={Truck} title="Vehicle details" subtitle="Optional — you can add or update these later from your profile too.">
              <div className="space-y-4">
                <div className="relative">
                  <Truck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={values.vehicle_registration_number || ""} onChange={(e) => setField("vehicle_registration_number", e.target.value)}
                    placeholder="Vehicle Registration Number" className={inputCls} />
                </div>
                <div className="relative">
                  <ShieldCheck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={values.vehicle_insurance_number || ""} onChange={(e) => setField("vehicle_insurance_number", e.target.value)}
                    placeholder="Vehicle Insurance Number" className={inputCls} />
                </div>
              </div>
            </StepShell>
          )}

          {currentStep === "business" && (
            <StepShell icon={Building2} title="Business details" subtitle="Optional — you can add or update these later from your profile too.">
              <div className="space-y-4">
                <div className="relative">
                  <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={values.gst_number || ""} onChange={(e) => setField("gst_number", e.target.value.toUpperCase())}
                    placeholder="GST Number" className={inputCls} />
                </div>
                <div className="relative">
                  <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={values.bank_account_number || ""} onChange={(e) => setField("bank_account_number", e.target.value)}
                    placeholder="Bank Account Number" className={inputCls} />
                </div>
                <div className="relative">
                  <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={values.business_registration_number || ""} onChange={(e) => setField("business_registration_number", e.target.value)}
                    placeholder="Business Registration Number" className={inputCls} />
                </div>
              </div>
            </StepShell>
          )}

          {currentStep === "review" && (
            <StepShell icon={CheckCircle2} title="Review & finish" subtitle="Double-check everything below, then complete your onboarding.">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                  <span className="text-xs font-semibold text-slate-500">PAN</span>
                  <Badge status={pan.status === "verified" ? "verified" : (skipped.pan ? undefined : pan.status)} />
                  {skipped.pan && pan.status !== "verified" && <span className="text-xs text-amber-600 font-semibold">Skipped — needs manual review</span>}
                </div>
                <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                  <span className="text-xs font-semibold text-slate-500">Aadhaar</span>
                  <Badge status={aadhaar.status === "verified" ? "verified" : (skipped.aadhaar ? undefined : aadhaar.status)} />
                  {skipped.aadhaar && aadhaar.status !== "verified" && <span className="text-xs text-amber-600 font-semibold">Skipped — needs manual review</span>}
                </div>
                {role === "driver" && (
                  <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                    <span className="text-xs font-semibold text-slate-500">Driving License</span>
                    <Badge status={dl.status === "verified" ? "verified" : (skipped.license ? undefined : dl.status)} />
                    {skipped.license && dl.status !== "verified" && <span className="text-xs text-amber-600 font-semibold">Skipped — needs manual review</span>}
                  </div>
                )}
              </div>

              {submitError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-4 py-2.5 mt-4">
                  <AlertCircle size={14} className="flex-shrink-0" /> {submitError}
                </div>
              )}

              <button onClick={submitOnboarding} disabled={submitting} className="btn-primary w-full py-3 text-sm inline-flex items-center justify-center gap-2 mt-6 disabled:opacity-60">
                {submitting ? <><Loader2 size={15} className="animate-spin" /> Submitting...</> : <>Complete Onboarding <ArrowRight size={15} /></>}
              </button>
            </StepShell>
          )}

          {currentStep !== "welcome" && currentStep !== "review" && (
            <div className="flex items-center justify-between mt-7">
              <button onClick={back} className="text-xs font-semibold text-slate-400 hover:text-slate-600 inline-flex items-center gap-1">
                <ArrowLeft size={13} /> Back
              </button>
              <div className="flex items-center gap-4">
                {["pan", "aadhaar", "license"].includes(currentStep) && !canAdvance() && (
                  <button onClick={skipThisStep} className="text-xs font-semibold text-slate-400 hover:text-slate-600">
                    Skip for now
                  </button>
                )}
                <button onClick={next} disabled={!canAdvance()} className="btn-primary px-5 py-2.5 text-xs disabled:opacity-40 inline-flex items-center gap-1.5">
                  Continue <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}

          {currentStep === "review" && stepIndex > 0 && (
            <button onClick={back} className="text-xs font-semibold text-slate-400 hover:text-slate-600 inline-flex items-center gap-1 mt-4">
              <ArrowLeft size={13} /> Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
