import { Clock, Phone, XCircle, CheckCircle2, Lock, User, Package, ArrowRight, PackagePlus } from "lucide-react";
import { formatCurrency, formatDate, bookingRef } from "../utils";

const ACCENT = {
  actionable: "bg-amber-400",
  accepted: "bg-emerald-400",
  declined: "bg-red-300",
  neutral: "bg-slate-200",
};

const BANNER_STYLES = {
  locked: "bg-slate-50 text-slate-500",
  accepted: "bg-emerald-50 text-emerald-700",
  declined: "bg-red-50 text-red-600",
};

function StatusBanner({ tone, icon: Icon, children }) {
  return (
    <div className={`w-full rounded-xl py-3 px-4 flex items-center justify-center gap-2 text-xs font-bold ${BANNER_STYLES[tone]}`}>
      <Icon size={14} className="flex-shrink-0" />
      <span>{children}</span>
    </div>
  );
}

// Part-load join request — a second client wants to add their cargo onto a trip this driver
// is already running. Deliberately simpler than DriverRequestCard: v1 has no negotiation (plain
// accept/decline — see tripJoinRequest.model.js), so there's no counter-offer UI, offer history,
// or mutual-confirmation dance to render. Shared by the driver and broker pages, same
// role-gated pattern as DriverRequestCard (role only changes what's shown; the server decides
// who's actually allowed to act via driverTimedOut).
export default function TripJoinRequestCard({ req, role, onAccept, onDecline }) {
  const locked = role === "driver" && req.status === "Requested" && req.driverTimedOut;
  const canAct = req.status === "Requested" && !locked;

  const accent = locked ? "neutral"
    : canAct ? "actionable"
    : req.status === "Accepted" ? "accepted"
    : req.status === "Declined" ? "declined"
    : "neutral";

  const fromName = req.pickup?.split(" - ")[0] || req.pickup;
  const toName = req.drop?.split(" - ")[0] || req.drop;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden flex flex-col hover:shadow-modal transition-shadow">
      <div className={`h-1 w-full ${ACCENT[accent]}`} />
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[11px] font-mono text-slate-400">{bookingRef(req)}</span>
              <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                <PackagePlus size={10} /> Part-Load
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-[15px] truncate flex items-center gap-1.5">
              <span className="truncate">{fromName}</span>
              <ArrowRight size={13} className="text-slate-300 flex-shrink-0" />
              <span className="truncate">{toName}</span>
            </h3>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xl font-extrabold text-slate-900 leading-none">{formatCurrency(req.amount)}</p>
            <div className="flex items-center gap-1 justify-end text-[11px] text-slate-400 mt-1.5">
              <Clock size={11} />{formatDate(req.createdAt)}
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex gap-2.5">
            <div className="flex flex-col items-center pt-1 flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-slate-800" />
              <span className="w-px flex-1 bg-slate-200 mt-1" />
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Pickup</p>
              <p className="text-sm text-slate-700">{req.pickup}</p>
            </div>
          </div>
          <div className="flex gap-2.5">
            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Drop</p>
              <p className="text-sm text-slate-700">{req.drop}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { label: "Weight", value: req.weight || "-", icon: Package },
            { label: "Client", value: req.clientName || "-", icon: User },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-slate-50 rounded-xl px-3 py-2.5 min-w-0">
              <div className="flex items-center gap-1 text-slate-400 mb-1"><Icon size={11} className="flex-shrink-0" /><span className="text-[10px] font-semibold uppercase truncate">{label}</span></div>
              <p className="text-sm font-bold text-slate-800 truncate" title={value}>{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-auto">
          {locked && (
            <StatusBanner tone="locked" icon={Lock}>You didn&apos;t respond in time — your broker has taken over this request.</StatusBanner>
          )}

          {canAct && (
            <>
              <div className="flex items-center gap-2">
                <button onClick={() => onAccept(req.id)} className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/20">
                  <CheckCircle2 size={14} /> Accept
                </button>
                <button onClick={() => onDecline(req.id)} className="flex-1 py-2.5 text-xs font-bold rounded-xl border-2 border-slate-200 text-slate-500 hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5">
                  <XCircle size={14} /> Decline
                </button>
              </div>
              {role === "broker" && (
                <p className="text-[11px] text-amber-600 text-center mt-2 font-medium">Driver timed out — you&apos;re responding on their behalf.</p>
              )}
            </>
          )}

          {req.status === "Accepted" && (
            <StatusBanner tone="accepted" icon={CheckCircle2}>Accepted — added to your current trip</StatusBanner>
          )}

          {req.status === "Declined" && (
            <StatusBanner tone="declined" icon={XCircle}>Declined</StatusBanner>
          )}

          {(req.clientName || req.clientPhone) && (
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-50 text-xs text-slate-400">
              <Phone size={12} />{req.clientName}{req.clientPhone ? `: ${req.clientPhone}` : ""}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
