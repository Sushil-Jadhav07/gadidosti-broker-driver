import { useEffect, useState } from "react";
import { Clock, AlertTriangle, Hourglass } from "lucide-react";
import { formatCurrency, formatDuration } from "../utils";

// Same "tick every N seconds to force a re-render" convention used by the polling hooks
// elsewhere in this app (useDriverSidebarCounts, useUnreadChatCount, etc.) — just ticking a
// local clock instead of refetching, since everything needed to compute the halting state is
// already sitting on the trip object.
const TICK_INTERVAL_MS = 30000;

const DONE_STATUSES = ["delivered", "completed"];

// Live "free halting window" indicator for inter-city trips (see trip.controller.js /
// booking.controller.js) — shown wherever a trip/booking with startedAt + haltingGraceHours +
// haltingRatePerHour is on screen. Renders nothing for trips that were never halting-eligible
// (haltingGraceHours null — intra-city, or inter-city at/under the base distance threshold).
//
// Before delivery this is a client-side ESTIMATE only (clearly labeled as such) — the real
// haltingHours/haltingCharge are computed server-side and only become final the moment the
// trip is actually marked delivered, at which point this switches to showing that fixed number
// instead of ticking.
export default function HaltingTimer({ trip }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  if (!trip || trip.haltingGraceHours == null) return null;

  const isDone = DONE_STATUSES.includes(String(trip.rawStatus || trip.status || "").toLowerCase());

  // Trip has already been delivered/completed — haltingHours/haltingCharge are final and fixed
  // forever at this point, nothing left to tick. Nothing to show if it was delivered within the
  // free window (haltingCharge stays 0).
  if (isDone) {
    if (!trip.haltingCharge) return null;
    return (
      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-700">
          <span className="font-bold">Halting charge applied:</span> {formatCurrency(trip.haltingCharge)} for {trip.haltingHours}h over the free {trip.haltingGraceHours}h window.
        </p>
      </div>
    );
  }

  // Eligible, but the trip hasn't actually started moving yet — nothing to count down from.
  if (!trip.startedAt) {
    return (
      <div className="flex items-center gap-2.5 bg-slate-50 rounded-lg p-3">
        <Hourglass className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <p className="text-xs text-slate-500">Free halting window: {trip.haltingGraceHours}h once the trip starts.</p>
      </div>
    );
  }

  const deadlineMs = new Date(trip.startedAt).getTime() + trip.haltingGraceHours * 60 * 60 * 1000;
  const remainingMinutes = Math.round((deadlineMs - now) / 60000);

  if (remainingMinutes > 0) {
    return (
      <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
        <Clock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
        <p className="text-xs text-emerald-700">
          <span className="font-bold">Free halting time remaining:</span> {formatDuration(remainingMinutes)}
        </p>
      </div>
    );
  }

  const overageMinutes = -remainingMinutes;
  const estimatedCharge = trip.haltingRatePerHour != null ? Math.round((overageMinutes / 60) * trip.haltingRatePerHour) : null;

  return (
    <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg p-3">
      <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
      <p className="text-xs text-red-700">
        <span className="font-bold">Halting time exceeded by {formatDuration(overageMinutes)}</span>
        {estimatedCharge != null && <> — ~{formatCurrency(estimatedCharge)} and counting (estimate, finalized at delivery)</>}
      </p>
    </div>
  );
}
