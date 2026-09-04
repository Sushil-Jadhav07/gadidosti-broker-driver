import { useState } from "react";
import { Clock, Phone, XCircle, IndianRupee, History, Lock, CheckCircle2, Truck, User, Route, Package, ArrowRight, Plus, Minus } from "lucide-react";
import { useToast } from "../hooks/useToast";
import { formatCurrency, bookingRef } from "../utils";

// +/- nudge for the inline counter-offer stepper — plain typing into the field still works
// for anything finer than this.
const COUNTER_STEP = 50;

// Slim top accent strip — lets a driver/broker scan a whole grid of cards for what needs
// attention (amber) without reading each one. Locked/declined/etc. all read as "nothing to
// do here right now" in a cooler, quieter color.
const ACCENT = {
  actionable: "bg-amber-400",
  confirm: "bg-teal-400",
  waiting: "bg-teal-300",
  accepted: "bg-emerald-400",
  declined: "bg-red-300",
  neutral: "bg-slate-200",
};

const BANNER_STYLES = {
  locked: "bg-slate-50 text-slate-500",
  countered: "bg-amber-50 text-amber-700",
  confirm: "bg-teal-50 text-teal-700",
  waiting: "bg-teal-50 text-teal-700",
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

// Shared by the driver and broker "driver requests" pages — both hit the exact same
// /api/driver-requests endpoints, the server just decides who's allowed to act (see
// driverTimedOut). `role` only changes what info is shown and whether the timeout lockout
// banner applies (a broker's list is pre-filtered to already-timed-out requests, so it never
// needs the lockout banner on its own cards).
// onCounter(id, amount, note) does the actual PATCH + applies the response — this component
// owns the negotiation UI (no more modal) and just calls it, then handles its own toast/reset.
export default function DriverRequestCard({ req, role, onAccept, onDecline, onCounter }) {
  const { addToast } = useToast();
  const [showCounter, setShowCounter] = useState(false);
  const [counterAmount, setCounterAmount] = useState("");
  const [counterNote, setCounterNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isDriver = role === "driver";
  const locked = isDriver && req.status === "Requested" && req.driverTimedOut;
  const canAct = req.status === "Requested" && !locked;
  // Mutual-confirmation: one side already accepted, the other must now confirm/decline — no
  // more countering past here. "client" pending means the client already committed and it's
  // this driver/broker's turn; "respondent" pending means the reverse (this app already
  // committed and is waiting on the client).
  const isYourTurnToConfirm = req.status === "Awaiting Confirmation" && req.pendingConfirmationBy === "client";
  const isWaitingOnClient = req.status === "Awaiting Confirmation" && req.pendingConfirmationBy === "respondent";
  // Each side gets at most maxCountersPerSide counter-offers (server-enforced too — see
  // driverRequest.controller.js/job.controller.js) — once used up, only Accept/Decline remain.
  const respondentCounterLimitReached = (req.respondentCountersUsed ?? 0) >= (req.maxCountersPerSide ?? Infinity);

  const accent = locked ? "neutral"
    : canAct ? "actionable"
    : isYourTurnToConfirm ? "confirm"
    : isWaitingOnClient ? "waiting"
    : req.status === "Countered" ? "actionable"
    : req.status === "Accepted" ? "accepted"
    : req.status === "Declined" ? "declined"
    : "neutral";

  const fromName = req.pickup?.split(" - ")[0];
  const toName = req.drop?.split(" - ")[0];

  const openCounter = () => {
    setCounterAmount(String(req.amount || ""));
    setCounterNote("");
    setShowCounter(true);
  };

  const adjustCounter = (delta) => {
    setCounterAmount((current) => String(Math.max(1, (Number(current) || 0) + delta)));
  };

  const submitCounter = async () => {
    const amount = Number(counterAmount);
    if (!amount || amount <= 0) {
      addToast("Enter a valid counter amount.", "error");
      return;
    }
    setSubmitting(true);
    try {
      await onCounter(req.id, amount, counterNote.trim() || undefined);
      addToast("Counter-offer sent to the client.", "success");
      setShowCounter(false);
    } catch (err) {
      addToast(err.message || "Failed to send counter-offer.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden flex flex-col hover:shadow-modal transition-shadow">
      <div className={`h-1 w-full ${ACCENT[accent]}`} />
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[11px] font-mono text-slate-400">{bookingRef(req)}</span>
              {req.truckType && (
                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  <Truck size={10} /> {req.truckType}
                </span>
              )}
            </div>
            <h3 className="font-bold text-slate-900 text-[15px] truncate flex items-center gap-1.5">
              <span className="truncate">{fromName}</span>
              <ArrowRight size={13} className="text-slate-300 flex-shrink-0" />
              <span className="truncate">{toName}</span>
            </h3>
            {role === "broker" && (
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><User size={11} /> {req.driverName || req.driver?.name || "-"}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xl font-extrabold text-slate-900 leading-none">{formatCurrency(req.amount)}</p>
            <div className="flex items-center gap-1 justify-end text-[11px] text-slate-400 mt-1.5">
              <Clock size={11} />{req.timestamp}
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

        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "Distance", value: req.distance ? `${req.distance} km` : "-", icon: Route },
            { label: "Weight", value: req.weight || "-", icon: Package },
            { label: "Client", value: req.clientName || "-", icon: User },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-slate-50 rounded-xl px-3 py-2.5 min-w-0">
              <div className="flex items-center gap-1 text-slate-400 mb-1"><Icon size={11} className="flex-shrink-0" /><span className="text-[10px] font-semibold uppercase truncate">{label}</span></div>
              <p className="text-sm font-bold text-slate-800 truncate" title={value}>{value}</p>
            </div>
          ))}
        </div>

        {req.offerHistory?.length > 1 && (
          <div className="bg-slate-50 rounded-xl px-3 py-2.5 mb-4">
            <p className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1 mb-1.5"><History size={11} /> Negotiation History</p>
            <div className="space-y-1">
              {req.offerHistory.map((entry, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{entry.by === "client" ? "Client offered" : "You offered"}</span>
                  <span className="font-semibold text-slate-700 flex items-center gap-0.5"><IndianRupee size={11} />{Number(entry.amount).toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto">
          {locked && (
            <StatusBanner tone="locked" icon={Lock}>You didn&apos;t respond in time — your broker has taken over this request.</StatusBanner>
          )}

          {canAct && showCounter && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1.5 block">Your Offer</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => adjustCounter(-COUNTER_STEP)}
                    className="w-9 h-9 flex-shrink-0 rounded-lg border-2 border-slate-200 text-slate-500 hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center"
                  >
                    <Minus size={15} />
                  </button>
                  <div className="flex-1 relative min-w-0">
                    <IndianRupee size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      min={1}
                      value={counterAmount}
                      onChange={(e) => setCounterAmount(e.target.value)}
                      className="w-full rounded-lg border-2 border-slate-200 pl-8 pr-3 py-2 text-sm font-bold text-slate-800 text-center outline-none focus:border-primary"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => adjustCounter(COUNTER_STEP)}
                    className="w-9 h-9 flex-shrink-0 rounded-lg border-2 border-slate-200 text-slate-500 hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
              <textarea
                value={counterNote}
                onChange={(e) => setCounterNote(e.target.value.slice(0, 500))}
                rows={2}
                placeholder="Reason for the counter-offer... (optional)"
                className="w-full resize-none rounded-lg border-2 border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-primary"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCounter(false)}
                  disabled={submitting}
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl border-2 border-slate-200 text-slate-500 hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={submitCounter}
                  disabled={submitting}
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary-dark active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {submitting ? "Sending..." : "Send Offer"}
                </button>
              </div>
            </div>
          )}

          {canAct && !showCounter && (
            <>
              <div className="flex items-center gap-2">
                <button onClick={() => onAccept(req.id)} className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/20">
                  <CheckCircle2 size={14} /> Accept
                </button>
                {!respondentCounterLimitReached && (
                  <button onClick={openCounter} className="flex-1 py-2.5 text-xs font-bold rounded-xl border-2 border-primary/20 text-primary hover:bg-primary/5 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5">
                    <IndianRupee size={14} /> Counter
                  </button>
                )}
                <button onClick={() => onDecline(req.id)} className="flex-1 py-2.5 text-xs font-bold rounded-xl border-2 border-slate-200 text-slate-500 hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5">
                  <XCircle size={14} /> Decline
                </button>
              </div>
              {role === "broker" && (
                <p className="text-[11px] text-amber-600 text-center mt-2 font-medium">Driver timed out — you&apos;re responding on their behalf.</p>
              )}
              {respondentCounterLimitReached && (
                <p className="text-[11px] text-slate-400 text-center mt-2">You've used both your counter-offers — accept or decline instead.</p>
              )}
            </>
          )}

          {req.status === "Countered" && (
            <StatusBanner tone="countered" icon={Clock}>Waiting for the client&apos;s response to your {formatCurrency(req.amount)} offer</StatusBanner>
          )}

          {isYourTurnToConfirm && (
            <>
              <p className="text-[11px] text-slate-400 text-center mb-2">The client accepted at {formatCurrency(req.amount)} — confirm to finalize.</p>
              <div className="flex items-center gap-2">
                <button onClick={() => onAccept(req.id)} className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/20">
                  <CheckCircle2 size={14} /> Confirm
                </button>
                <button onClick={() => onDecline(req.id)} className="flex-1 py-2.5 text-xs font-bold rounded-xl border-2 border-slate-200 text-slate-500 hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5">
                  <XCircle size={14} /> Decline
                </button>
              </div>
            </>
          )}

          {isWaitingOnClient && (
            <StatusBanner tone="waiting" icon={Clock}>You accepted — waiting for the client to confirm</StatusBanner>
          )}

          {req.status === "Accepted" && (
            <StatusBanner tone="accepted" icon={CheckCircle2}>Accepted — trip confirmed</StatusBanner>
          )}

          {req.status === "Declined" && (
            <StatusBanner tone="declined" icon={XCircle}>Declined</StatusBanner>
          )}

          {(req.clientName || req.clientPhone) && (
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-50 text-xs text-slate-400">
              <Phone size={12} />{req.clientName}{req.clientPhone ? `: ${req.clientPhone}` : ""} - {req.timestamp}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
