import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowRight, X } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const COPY = {
  pending: { text: "Complete your KYC to start accepting jobs — most checks clear instantly.", cta: "Complete KYC" },
  submitted: { text: "Your KYC documents are under review. We'll notify you once verified.", cta: "View Status" },
  rejected: { text: "Your KYC submission was rejected. Please review and resubmit.", cta: "Resubmit KYC" },
};

const dismissKey = (userId, kycStatus) => `kyc_banner_dismissed_${userId}_${kycStatus}`;

// Dashboard nudge toward finishing KYC — never blocks navigation (see App.jsx's PrivateRoute),
// just reminds. Dismiss is remembered per user+status so it stays gone once closed, but comes
// back if the status itself changes (e.g. pending -> rejected has something new to say).
export default function KycReminderBanner() {
  const navigate = useNavigate();
  // Live context, not a one-time localStorage snapshot (what this read before) — the old version
  // read localStorage exactly once on mount and never again, so it never reflected a correction
  // that landed after that (useAuth's own background re-check, or Onboarding.jsx's updateUser
  // call right after a successful verify) without a full remount. One AuthProvider already wraps
  // both the broker and driver layouts (see App.jsx), so this works under either one directly.
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!user) return;
    try {
      setDismissed(localStorage.getItem(dismissKey(user.id, user.kyc_status || "pending")) === "1");
    } catch {
      setDismissed(false);
    }
  }, [user]);

  if (!user || dismissed) return null;
  const copy = COPY[user.kyc_status || "pending"];
  if (!copy) return null;

  const dismiss = (e) => {
    e.stopPropagation();
    try { localStorage.setItem(dismissKey(user.id, user.kyc_status || "pending"), "1"); } catch { /* ignore */ }
    setDismissed(true);
  };

  return (
    <button
      onClick={() => navigate("/onboarding")}
      className="w-full flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5 text-left hover:bg-amber-100 transition-colors"
    >
      <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
      <p className="flex-1 text-sm font-medium text-amber-800">{copy.text}</p>
      <span className="flex items-center gap-1 text-xs font-bold text-amber-700 whitespace-nowrap">
        {copy.cta} <ArrowRight size={13} />
      </span>
      <span onClick={dismiss} className="p-1 -m-1 rounded-full hover:bg-amber-200/60 flex-shrink-0" title="Dismiss">
        <X size={14} className="text-amber-500" />
      </span>
    </button>
  );
}
