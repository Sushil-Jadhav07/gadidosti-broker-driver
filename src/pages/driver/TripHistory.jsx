import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { History, Search } from "lucide-react";
import TripCard from "../../components/driver/TripCard";
import ConfirmDialog from "../../components/broker/ConfirmDialog";
import { useToast } from "../../hooks/useToast";
import { api, getToken } from "../../services/api";
import { adaptTrip, formatDate } from "../../utils";

export default function TripHistory() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [trips, setTrips] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // Was querying /api/analytics/broker (settlement rows — no distance/earnings fields,
      // status is a 'pending'/'paid' payout state, not a trip status), which is why completed
      // trips rendered as "Requested"/"Rs 0"/"0 km" here. /api/trips is the real trip data
      // adaptTrip was actually built for.
      const response = await api.get("/api/trips?status=delivered,completed,in_transit,cancelled&limit=100", getToken());
      setTrips((response.data?.trips || []).map(adaptTrip));
    } catch {
      setError("Failed to load trip history. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Only ever offered on an independent (self-registered, no-broker) driver's own bookings —
  // a driver working under a real broker will get 403 "Not your booking" back from the server,
  // which we surface as-is rather than trying to pre-detect that case client-side.
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api.delete(`/api/bookings/${deleteTarget.bookingId}`, null, getToken());
      if (!res?.success) throw new Error(res?.message || "Failed to remove booking");
      setTrips((current) => current.filter((trip) => trip.id !== deleteTarget.id));
      addToast(res.message || "Booking removed from your list.", "success");
    } catch (err) {
      addToast(err.message || "Failed to remove booking.", "error");
      load();
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const cards = useMemo(() => trips.map((trip) => ({
    id: trip.id,
    bookingId: trip.bookingId,
    bookingNumber: trip.bookingNumber,
    status: trip.status,
    route: trip.pickup?.location && trip.drop?.location ? `${trip.pickup.location} -> ${trip.drop.location}` : trip.route,
    date: formatDate(trip.createdAt),
    earnings: trip.earnings,
    duration: trip.estimatedTime,
    cargo: trip.cargo?.material,
    weight: trip.cargo?.weight,
    distance: trip.distance,
    pickup: trip.pickup?.location,
    drop: trip.drop?.location,
    broker: trip.broker,
  })), [trips]);

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cards
      .filter((c) => filter === "All" || c.status === filter)
      .filter((c) => !q || c.bookingNumber?.toLowerCase().includes(q) || c.route?.toLowerCase().includes(q) || c.broker?.toLowerCase().includes(q));
  }, [filter, cards, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <History size={19} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Trip History</h1>
          <p className="text-sm text-slate-500 mt-0.5">Completed and past trips.</p>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative max-w-xs w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by booking ID, route, broker..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 pr-3 py-2 w-full rounded-full"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["All", "Delivered", "Completed", "In Transit"].map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filter === value ? "bg-primary text-white shadow-sm shadow-primary/20" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-16 flex justify-center">
          <div className="w-7 h-7 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-12 text-center text-red-500">{error}</div>
      ) : !filteredCards.length ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
            <History size={28} className="text-slate-300" />
          </div>
          <p className="font-bold text-slate-800 text-[15px]">No trips found</p>
          <p className="text-sm text-slate-400 mt-1">Try a different search or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCards.map((trip) => <TripCard key={trip.id} trip={trip} onDelete={setDeleteTarget} onViewDetails={() => navigate(`/driver/history/${trip.id}`)} />)}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove from my list?"
        message="This only removes it from your own list — it stays visible to admin. There's no undo."
        confirmText={deleting ? "Removing..." : "Remove"}
        variant="danger"
      />
    </div>
  );
}
