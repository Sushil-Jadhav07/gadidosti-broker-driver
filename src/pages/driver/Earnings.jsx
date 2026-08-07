import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IndianRupee, Wallet, TrendingUp, Search } from "lucide-react";
import MonthlyEarningsTable from "../../components/driver/MonthlyEarningsTable";
import { api, getToken } from "../../services/api";
import { adaptTrip, formatCurrency } from "../../utils";

const PAGE_SIZE = 10;

// Single earnings page — used to be split across this + a separate EarningsHistory.jsx (only
// difference was this page's month-summary cards, sourced from /api/analytics/broker; the
// trip rows table was otherwise identical data from /api/trips). Consolidated per request:
// one page, full search + pagination instead of a slice(0, 10) + "Show More" link.
export default function Earnings() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState({ thisMonth: 0, lastMonth: 0 });
  const [trips, setTrips] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [analyticsRes, tripsRes] = await Promise.all([
          api.get("/api/analytics/broker", getToken()),
          api.get("/api/trips?status=delivered,completed&limit=100", getToken()),
        ]);
        setAnalytics({ thisMonth: analyticsRes.data?.thisMonth || 0, lastMonth: analyticsRes.data?.lastMonth || 0 });
        setTrips((tripsRes.data?.trips || []).map(adaptTrip));
      } catch {
        setError("Failed to load earnings. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalEarned = useMemo(() => trips.reduce((sum, trip) => sum + Number(trip.earnings || 0), 0), [trips]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return trips;
    return trips.filter((trip) =>
      trip.bookingNumber?.toLowerCase().includes(q) ||
      trip.pickup?.location?.toLowerCase().includes(q) ||
      trip.drop?.location?.toLowerCase().includes(q) ||
      trip.broker?.toLowerCase().includes(q)
    );
  }, [trips, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Earnings</h1>
        <p className="text-sm text-slate-500 mt-1">Driver earnings from completed trips.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[{ label: "This Month", value: formatCurrency(analytics.thisMonth), icon: IndianRupee }, { label: "Last Month", value: formatCurrency(analytics.lastMonth), icon: Wallet }, { label: "Total Earned", value: formatCurrency(totalEarned), icon: TrendingUp }].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-100 shadow-card p-5"><card.icon className="w-5 h-5 text-primary mb-3" /><p className="text-sm text-slate-500">{card.label}</p><p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p></div>
        ))}
      </div>

      <div className="relative max-w-xs w-full">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by booking ID, route, broker..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="input-field pl-9 pr-3 py-2 w-full"
        />
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-slate-400">Loading earnings...</div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-red-500">{error}</div>
      ) : (
        <>
          <MonthlyEarningsTable rows={paged} onRowClick={(row) => navigate(`/driver/history/${row.id}`)} />
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1 text-xs text-slate-500">
              <span>Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50">Prev</button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
