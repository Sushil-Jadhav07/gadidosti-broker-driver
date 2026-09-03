import { useState } from "react";
import { ChevronDown, ChevronUp, MapPin, Package, Phone, Trash2, ArrowUpRight, Clock } from "lucide-react";
import Badge from "./Badge";
import { bookingRef, splitLocationName } from "../../utils";

// Delete is only ever allowed while the underlying booking is pending/cancelled/completed —
// on this page that means Completed or Cancelled, since anything still in progress never
// reaches trip history. onDelete is optional so this card can still be reused read-only.
const DELETABLE_STATUSES = ["Completed", "Cancelled"];

// Slim top accent strip, same idea as the driver-request cards — lets a driver scan a whole
// grid of past trips for outcome at a glance without reading each one.
const ACCENT = {
  Completed: "bg-emerald-400",
  Delivered: "bg-emerald-400",
  "In Transit": "bg-primary",
  Cancelled: "bg-red-300",
};

const PRICE_COLOR = {
  Completed: "text-emerald-600",
  Delivered: "text-emerald-600",
  Cancelled: "text-red-500",
  "In Transit": "text-primary",
};

export default function TripCard({ trip, onDelete, onViewDetails }) {
  const [expanded, setExpanded] = useState(false);
  if (!trip) return null;
  const canDelete = onDelete && DELETABLE_STATUSES.includes(trip.status);
  const pickup = splitLocationName(trip.pickup);
  const drop = splitLocationName(trip.drop);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden hover:shadow-modal transition-shadow">
      <div className={`h-1 w-full ${ACCENT[trip.status] || "bg-slate-200"}`} />
      <button className="w-full p-4 text-left" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-mono text-slate-400 flex-shrink-0">{bookingRef(trip)}</span>
            <Badge status={trip.status || "Unknown"} />
          </div>
          <div className="text-right flex-shrink-0">
            <p className={`text-base font-extrabold leading-none ${PRICE_COLOR[trip.status] || "text-slate-800"}`}>
              {trip.status === "Cancelled" ? "—" : `Rs ${(trip.earnings || 0).toLocaleString()}`}
            </p>
            {trip.duration && <p className="text-[11px] text-slate-400 mt-1">{trip.duration}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-800 flex-shrink-0" />
            <p className="text-sm font-semibold text-slate-800 truncate" title={trip.pickup}>{pickup.name || "—"}</p>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
            <p className="text-sm font-semibold text-slate-800 truncate" title={trip.drop}>{drop.name || "—"}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
          <div className="flex items-center gap-3 text-xs text-slate-500 min-w-0">
            <span className="flex items-center gap-1.5 flex-shrink-0">
              <Package className="w-3.5 h-3.5 text-slate-400" />
              {trip.cargo || "Cargo"} · {trip.weight || "—"}
            </span>
            <span className="flex items-center gap-1.5 flex-shrink-0">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {trip.distance || 0} km
            </span>
          </div>
          <span className="flex items-center gap-1 text-[11px] text-slate-400 flex-shrink-0">
            <Clock className="w-3 h-3" />{trip.date || "—"}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-2.5">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-slate-800 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Pickup</p>
              <p className="text-sm font-medium text-slate-800">{trip.pickup || "—"}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Drop</p>
              <p className="text-sm font-medium text-slate-800">{trip.drop || "—"}</p>
            </div>
          </div>
          {trip.broker && (
            <div className="flex items-center gap-2 pt-1">
              <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Broker</p>
                <p className="text-sm font-medium text-slate-800">{trip.broker}</p>
              </div>
            </div>
          )}
          {onViewDetails && (
            <button
              onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
              className="w-full flex items-center justify-center gap-1.5 mt-1 py-2 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
            >
              View Full Details <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
          {canDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(trip); }}
              className="w-full flex items-center justify-center gap-1.5 mt-1 py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Remove from my list
            </button>
          )}
        </div>
      )}

      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex justify-center py-1.5 border-t border-slate-50 hover:bg-slate-50 transition-colors">
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
    </div>
  );
}
