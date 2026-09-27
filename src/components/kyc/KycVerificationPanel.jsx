import { useState } from "react";
import { ShieldCheck, ShieldAlert, Loader2, ScanLine } from "lucide-react";
import { api } from "../../services/api";

function Badge({ status }) {
  if (status === "loading") return <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400"><Loader2 size={13} className="animate-spin" /> Checking...</span>;
  if (status === "verified") return <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><ShieldCheck size={13} /> Verified</span>;
  if (status === "failed") return <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600"><ShieldAlert size={13} /> Details didn't match</span>;
  if (status === "error") return <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600"><ShieldAlert size={13} /> Couldn't verify, try again</span>;
  return <span className="text-xs text-slate-400">Not verified yet</span>;
}

const verifyBtnCls = "flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

// Optional, assistive checks a driver/broker can run against their own document numbers before
// submitting KYC — results are shown to the human reviewer alongside the documents, they don't
// auto-approve/auto-reject anything. `values` mirrors KycSubmitForm's live (not-yet-submitted)
// field values via its onValuesChange prop.
export default function KycVerificationPanel({ token, userName, values, initialResults = {}, showDrivingLicense = false }) {
  const [pan, setPan] = useState({ status: initialResults.pan?.status || "idle" });
  const [dl, setDl] = useState({ status: initialResults.drivingLicense?.status || "idle" });
  const [aadhaar, setAadhaar] = useState({
    status: initialResults.aadhaar?.status || "idle",
    otpSent: false,
    refId: null,
    otp: "",
  });

  const panNumber = (values?.pan_number || "").trim();
  const dlNumber = (values?.license_number || "").trim();
  const dob = (values?.date_of_birth || "").trim();
  const aadhaarNumber = (values?.aadhaar_number || "").replace(/-/g, "").trim();

  const verifyPan = async () => {
    if (!panNumber) return;
    setPan({ status: "loading" });
    try {
      const res = await api.post("/api/kyc/verify/pan", { pan: panNumber, name: userName || undefined }, token);
      if (!res.success) throw new Error(res.message);
      setPan({ status: res.data.status });
    } catch {
      setPan({ status: "error" });
    }
  };

  const verifyDl = async () => {
    if (!dlNumber || !dob) return;
    setDl({ status: "loading" });
    try {
      const res = await api.post("/api/kyc/verify/driving-license", { dl_number: dlNumber, dob }, token);
      if (!res.success) throw new Error(res.message);
      setDl({ status: res.data.status });
    } catch {
      setDl({ status: "error" });
    }
  };

  const sendAadhaarOtp = async () => {
    if (!aadhaarNumber) return;
    setAadhaar((a) => ({ ...a, status: "loading" }));
    try {
      const res = await api.post("/api/kyc/verify/aadhaar/send-otp", { aadhaar_number: aadhaarNumber }, token);
      if (!res.success) throw new Error(res.message);
      setAadhaar((a) => ({ ...a, status: "idle", otpSent: true, refId: res.data.refId }));
    } catch {
      setAadhaar((a) => ({ ...a, status: "error" }));
    }
  };

  const verifyAadhaarOtp = async () => {
    if (!aadhaar.refId || !aadhaar.otp) return;
    setAadhaar((a) => ({ ...a, status: "loading" }));
    try {
      const res = await api.post("/api/kyc/verify/aadhaar/verify-otp", { ref_id: aadhaar.refId, otp: aadhaar.otp }, token);
      if (!res.success) throw new Error(res.message);
      setAadhaar((a) => ({ ...a, status: res.data.status }));
    } catch {
      setAadhaar((a) => ({ ...a, status: "error" }));
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6">
      <div className="flex items-center gap-2 mb-1">
        <ScanLine size={16} className="text-primary" />
        <h3 className="font-bold text-slate-900 text-[15px]">Automated Verification</h3>
      </div>
      <p className="text-xs text-slate-400 mb-5">Optional — speeds up review, doesn't replace it</p>

      <div className="space-y-3">
        <div className="bg-slate-50 rounded-xl p-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">PAN</p>
            <Badge status={pan.status} />
          </div>
          <button type="button" onClick={verifyPan} disabled={!panNumber || pan.status === "loading"} className={verifyBtnCls}>
            Verify PAN
          </button>
        </div>

        {showDrivingLicense && (
          <div className="bg-slate-50 rounded-xl p-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Driving License</p>
              <Badge status={dl.status} />
              {(!dlNumber || !dob) && <p className="text-[11px] text-slate-400 mt-0.5">Fill in license number and date of birth first</p>}
            </div>
            <button type="button" onClick={verifyDl} disabled={!dlNumber || !dob || dl.status === "loading"} className={verifyBtnCls}>
              Verify DL
            </button>
          </div>
        )}

        <div className="bg-slate-50 rounded-xl p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Aadhaar</p>
              <Badge status={aadhaar.status === "loading" && !aadhaar.otpSent ? "loading" : (aadhaar.otpSent && aadhaar.status === "idle" ? "idle" : aadhaar.status)} />
            </div>
            {!aadhaar.otpSent && (
              <button type="button" onClick={sendAadhaarOtp} disabled={!aadhaarNumber || aadhaar.status === "loading"} className={verifyBtnCls}>
                Send OTP
              </button>
            )}
          </div>
          {aadhaar.otpSent && aadhaar.status !== "verified" && (
            <div className="flex items-center gap-2 mt-3">
              <input
                type="text"
                inputMode="numeric"
                value={aadhaar.otp}
                onChange={(e) => setAadhaar((a) => ({ ...a, otp: e.target.value }))}
                placeholder="Enter OTP"
                className="input-field flex-1 py-2 text-sm font-mono"
              />
              <button type="button" onClick={verifyAadhaarOtp} disabled={!aadhaar.otp || aadhaar.status === "loading"} className={verifyBtnCls}>
                Verify OTP
              </button>
              <button type="button" onClick={sendAadhaarOtp} disabled={aadhaar.status === "loading"} className="text-xs text-primary font-semibold hover:underline flex-shrink-0">
                Resend
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
