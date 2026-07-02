import { ShieldCheck, Clock, XCircle, ShieldAlert } from "lucide-react";

const CONFIG = {
  verified: {
    icon: ShieldCheck,
    bg: "bg-emerald-50 border-emerald-200",
    iconColor: "text-emerald-500",
    titleColor: "text-emerald-800",
    textColor: "text-emerald-600",
    title: "KYC Verified",
    text: "Your documents have been verified. You have full access to the platform.",
  },
  submitted: {
    icon: Clock,
    bg: "bg-amber-50 border-amber-200",
    iconColor: "text-amber-500",
    titleColor: "text-amber-800",
    textColor: "text-amber-600",
    title: "Under Review",
    text: "Your documents have been submitted and are awaiting admin review. This usually takes 24-48 hours.",
  },
  rejected: {
    icon: XCircle,
    bg: "bg-red-50 border-red-200",
    iconColor: "text-red-500",
    titleColor: "text-red-800",
    textColor: "text-red-600",
    title: "KYC Rejected",
    text: "Your submission was rejected. Please review the reason below and resubmit.",
  },
  pending: {
    icon: ShieldAlert,
    bg: "bg-slate-50 border-slate-200",
    iconColor: "text-slate-400",
    titleColor: "text-slate-700",
    textColor: "text-slate-500",
    title: "Action Required",
    text: "You haven't submitted your KYC documents yet. Complete this to start accepting jobs on the platform.",
  },
};

export default function KycStatusCard({ status, rejectionReason }) {
  const cfg = CONFIG[status] || CONFIG.pending;
  const Icon = cfg.icon;

  return (
    <div className={`rounded-xl p-5 border ${cfg.bg}`}>
      <div className="flex items-start gap-4">
        <Icon size={28} className={`${cfg.iconColor} flex-shrink-0`} />
        <div>
          <h3 className={`font-bold text-[15px] ${cfg.titleColor}`}>{cfg.title}</h3>
          <p className={`text-sm mt-0.5 ${cfg.textColor}`}>{cfg.text}</p>
          {status === "rejected" && rejectionReason && (
            <p className="text-sm mt-2 bg-white/60 border border-red-200 rounded-lg px-3 py-2 text-red-700">
              <span className="font-semibold">Reason: </span>{rejectionReason}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
