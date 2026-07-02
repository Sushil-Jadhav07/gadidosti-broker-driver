import { useNavigate } from "react-router-dom";
import { ShieldAlert, Clock, XCircle, ArrowRight } from "lucide-react";

const CONFIG = {
  submitted: {
    icon: Clock,
    color: "text-amber-500",
    bg: "bg-amber-50",
    title: "KYC Under Review",
    text: "Your documents are being reviewed by our team. You'll be able to accept jobs once verified — usually within 24-48 hours.",
  },
  rejected: {
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-50",
    title: "KYC Rejected",
    text: "Your last submission was rejected. Please review the reason and resubmit your documents to continue.",
  },
  pending: {
    icon: ShieldAlert,
    color: "text-primary",
    bg: "bg-primary/10",
    title: "Complete Your KYC First",
    text: "You need to submit your KYC documents and get verified before you can accept jobs on the platform.",
  },
};

// Full-page block used on trip/job-taking screens until kyc_status === 'verified'
export default function KycGate({ status, kycPath }) {
  const navigate = useNavigate();
  const cfg = CONFIG[status] || CONFIG.pending;
  const Icon = cfg.icon;

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-card p-10 text-center max-w-md mx-auto">
      <div className={`w-16 h-16 rounded-2xl ${cfg.bg} flex items-center justify-center mx-auto mb-4`}>
        <Icon size={28} className={cfg.color} />
      </div>
      <h3 className="font-bold text-slate-900 text-lg">{cfg.title}</h3>
      <p className="text-sm text-slate-500 mt-2 leading-relaxed">{cfg.text}</p>
      <button
        onClick={() => navigate(kycPath)}
        className="btn-primary mt-6 px-5 py-2.5 text-sm inline-flex items-center gap-2"
      >
        {status === "rejected" ? "Resubmit KYC" : status === "submitted" ? "View KYC Status" : "Complete KYC"}
        <ArrowRight size={14} />
      </button>
    </div>
  );
}
