import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Search, Truck, User, Navigation } from "lucide-react";
import Badge from "../../components/broker/Badge";
import { api, getToken } from "../../services/api";
import { adaptTrip, bookingRef, formatCurrency, formatDate, formatDuration } from "../../utils";

const STATUS_BADGE = { Completed: "success", Delivered: "success", Cancelled: "danger", "In Transit": "warning" };

// Full trip-history page for a single truck or driver, reached from Trucks.jsx's/Drivers.jsx's
// row menu. Replaces the earlier cramped list-or-empty-state modal — same
// GET /api/trips?truckId=/driverId= filter (already broker-scoped server-side), just a proper
// page with search and rows that link into each trip's full JobDetail.jsx.
export default function TripHistoryPage({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entity, setEntity] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const entityPath = mode === "truck" ? `/api/vehicles/trucks/${id}` : `/api/vehicles/drivers/${id}`;
        const tripsQuery = mode === "truck" ? `truckId=${id}` : `driverId=${id}`;
        const [entityRes, tripsRes] = await Promise.all([
          api.get(entityPath, getToken()),
          api.get(`/api/trips?${tripsQuery}&limit=100`, getToken()),
        ]);
        if (!entityRes?.success) throw new Error(entityRes?.message || `${mode === "truck" ? "Truck" : "Driver"} not found`);
        setEntity(entityRes.data?.[mode]);
        setTrips((tripsRes.data?.trips || []).map(adaptTrip));
      } catch (err) {
        setError(err.message || "Failed to load trip history.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, mode]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return trips;
    return trips.filter((trip) => {
      const counterparty = mode === "truck" ? trip.driverName : trip.broker;
      return (
        bookingRef(trip).toLowerCase().includes(q) ||
        trip.pickup?.location?.toLowerCase().includes(q) ||
        trip.drop?.location?.toLowerCase().includes(q) ||
        counterparty?.toLowerCase().includes(q)
      );
    });
  }, [trips, search, mode]);

  const backPath = mode === "truck" ? "/trucks" : "/drivers";
  const title = mode === "truck" ? entity?.registration : entity?.name;
  const subtitle = mode === "truck" ? (entity?.driver || "No driver assigned") : (entity?.truckReg || "No truck assigned");

  return (
    <div className="space-y-4">
      <button onClick={() => navigate(backPath)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft size={15} /> Back to {mode === "truck" ? "Trucks" : "Drivers"}
      </button>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-slate-400">Loading trip history...</div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-red-500">{error}</div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                {mode === "truck" ? <Truck size={19} className="text-primary" /> : <User size={19} className="text-primary" />}
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 font-mono">{title || "—"}</h1>
                <p className="text-sm text-slate-500">{subtitle} &middot; {trips.length} trip{trips.length === 1 ? "" : "s"}</p>
              </div>
            </div>
            <div className="relative max-w-xs w-full">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by booking ID, route..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-9 pr-3 py-2 w-full"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Trip", "Route", mode === "truck" ? "Driver" : "Broker", "Status", "Distance", "Time Taken", "Earnings", "Date"].map((label) => (
                    <th key={label} className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((trip) => (
                  <tr key={trip.id} onClick={() => navigate(`/job-history/${trip.bookingId}`)} className="table-row cursor-pointer">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{bookingRef(trip)}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[220px] truncate">{trip.pickup?.location} → {trip.drop?.location}</td>
                    <td className="px-4 py-3 text-slate-600">{(mode === "truck" ? trip.driverName : trip.broker) || "—"}</td>
                    <td className="px-4 py-3"><Badge variant={STATUS_BADGE[trip.status] || "default"} size="sm">{trip.status}</Badge></td>
                    <td className="px-4 py-3 text-slate-600">{trip.distance ? `${trip.distance} km` : "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDuration(trip.timeTakenMinutes)}</td>
                    <td className="px-4 py-3 text-emerald-700 font-semibold">{formatCurrency(trip.earnings)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(trip.createdAt)}</td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={8} className="px-4 py-14 text-center text-slate-400">
                      <Navigation size={20} className="mx-auto mb-2 opacity-30" />
                      {trips.length ? "No trips match your search." : "No trips yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
