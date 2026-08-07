import { useEffect, useState } from "react";
import { Navigation } from "lucide-react";
import { api, getToken } from "../services/api";
import { formatDate, formatDuration } from "../utils";

const STATUS_DOT = {
  completed: "bg-emerald-500", delivered: "bg-emerald-500",
  cancelled: "bg-red-500",
  in_transit: "bg-amber-500", picked_up: "bg-amber-500", en_route_pickup: "bg-amber-500",
  confirmed: "bg-slate-300",
};

// Compact trip-history list for a single truck or driver — used inside Trucks.jsx's/
// Drivers.jsx's detail views. Pass exactly one of truckId/driverId (whichever this view is
// scoped to); the backend's GET /api/trips truckId/driverId filters do the rest.
export default function TripHistoryList({ truckId, driverId, limit = 20 }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!truckId && !driverId) return;
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({ limit: String(limit) });
    if (truckId) params.set("truckId", truckId);
    if (driverId) params.set("driverId", driverId);
    api.get(`/api/trips?${params.toString()}`, getToken())
      .then((res) => setTrips(res.data?.trips || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [truckId, driverId, limit]);

  if (loading) return <div className="text-sm text-slate-400 py-4 text-center">Loading trip history...</div>;
  if (error) return <div className="text-sm text-red-500 py-4 text-center">Failed to load trip history.</div>;
  if (!trips.length) return <div className="text-sm text-slate-400 py-4 text-center flex flex-col items-center gap-1"><Navigation size={20} className="opacity-30" />No trips yet.</div>;

  return (
    <div className="space-y-1.5 max-h-72 overflow-y-auto">
      {trips.map((trip) => (
        <div key={trip.id} className="flex items-center justify-between gap-3 bg-slate-50 rounded-lg px-3 py-2">
          <div className="min-w-0 flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[trip.status] || "bg-slate-300"}`} />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-700 truncate">{trip.pickup?.location || "—"} → {trip.drop?.location || "—"}</p>
              <p className="text-[11px] text-slate-400">{formatDate(trip.createdAt)}{trip.timeTakenMinutes != null ? ` · ${formatDuration(trip.timeTakenMinutes)}` : ""}</p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 capitalize flex-shrink-0">{trip.status?.replace(/_/g, " ")}</span>
        </div>
      ))}
    </div>
  );
}
