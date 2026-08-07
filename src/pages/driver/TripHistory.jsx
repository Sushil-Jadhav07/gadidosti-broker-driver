import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation, Route, IndianRupee, Search } from "lucide-react";
import TripCard from "../../components/driver/TripCard";
import ConfirmDialog from "../../components/broker/ConfirmDialog";
import { useToast } from "../../hooks/useToast";
import { api, getToken } from "../../services/api";
import { adaptTrip, formatCurrency, formatDate } from "../../utils";

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

  const totals = useMemo(() => ({
    trips: trips.length,
    kms: trips.reduce((sum, trip) => sum + Number(trip.distance || 0), 0),
    earned: trips.reduce((sum, trip) => sum + Number(trip.earnings || 0), 0),
  }), [trips]);

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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Trip History</h1>
        <p className="text-sm text-slate-500 mt-1">Completed and past trips.</p>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative max-w-xs w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by booking ID, route, broker..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 pr-3 py-2 w-full"
          />
        </div>
        <div className="flex gap-2">{["All", "Delivered", "Completed", "In Transit"].map((value) => <button key={value} onClick={() => setFilter(value)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filter === value ? "bg-primary text-white" : "bg-white border border-slate-200 text-slate-600"}`}>{value}</button>)}</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5 border-l-4 border-l-primary">
          <Navigation className="w-5 h-5 text-primary mb-3" />
          <p className="text-sm text-slate-500">Total Trips</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totals.trips}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5 border-l-4 border-l-emerald-500">
          <Route className="w-5 h-5 text-emerald-500 mb-3" />
          <p className="text-sm text-slate-500">Total KMs</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totals.kms} km</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5 border-l-4 border-l-amber-500">
          <IndianRupee className="w-5 h-5 text-amber-500 mb-3" />
          <p className="text-sm text-slate-500">Total Earned</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totals.earned)}</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-slate-400">Loading trip history...</div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-red-500">{error}</div>
      ) : !filteredCards.length ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-slate-400">No trips found.</div>
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
