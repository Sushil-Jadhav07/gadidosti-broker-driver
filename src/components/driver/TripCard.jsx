import { useState } from "react";
import { ChevronDown, ChevronUp, MapPin, Package, Phone } from "lucide-react";
import Badge from "./Badge";

export default function TripCard({ trip }) {
  const [expanded, setExpanded] = useState(false);
  if (!trip) return null;

  const earningColor = {
    Completed: "text-emerald-600",
    Cancelled: "text-red-500",
    "In Transit": "text-primary",
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-card overflow-hidden">
      <button className="w-full p-4 text-left" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-slate-400">{trip.id || "Unknown"}</span>
              <Badge status={trip.status || "Unknown"} />
            </div>
            <h3 className="text-[14px] font-semibold text-slate-900 truncate">{trip.route || "Route not available"}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{trip.date || "Date not available"}</p>
          </div>
          <div className="flex flex-col items-end gap-1 ml-3 flex-shrink-0">
            <span className={`text-[15px] font-bold ${earningColor[trip.status] || "text-slate-800"}`}>
              {trip.status === "Cancelled" ? "—" : `Rs ${(trip.earnings || 0).toLocaleString()}`}
            </span>
            <span className="text-xs text-slate-400">{trip.duration || "—"}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Package className="w-3.5 h-3.5 text-slate-400" />
            {trip.cargo || "Cargo"} · {trip.weight || "—"}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {trip.distance || 0} km
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-2.5">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Pickup</p>
              <p className="text-sm font-medium text-slate-800">{trip.pickup || "—"}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
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
        </div>
      )}

      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex justify-center py-1.5 border-t border-slate-50 hover:bg-slate-50 transition-colors">
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
    </div>
  );
}
