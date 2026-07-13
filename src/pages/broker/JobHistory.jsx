import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import Badge from "../../components/broker/Badge";
import { api, getToken } from "../../services/api";
import { adaptBooking, bookingRef, formatCurrency, formatDate } from "../../utils";

const PAGE_SIZE = 10;
const STATUS_BADGE = { completed: "success", cancelled: "danger" };

export default function JobHistory() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get("/api/bookings?status=completed,cancelled&limit=100", getToken());
        setBookings((response.data?.bookings || []).map(adaptBooking));
      } catch {
        setError("Failed to load job history. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const rows = useMemo(() => bookings.map((booking) => ({
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    route: `${booking.pickup} -> ${booking.drop}`,
    truck: booking.truckReg || "-",
    driver: booking.driver?.name || "-",
    date: booking.createdAt,
    amount: Number(booking.amount || 0),
    platformFee: Number(booking.platformFee || 0),
    net: Number(booking.amount || 0) - Number(booking.platformFee || 0),
    status: booking.status,
  })), [bookings]);

  const counts = useMemo(() => ({
    completed: rows.filter((r) => r.status === "completed").length,
    cancelled: rows.filter((r) => r.status === "cancelled").length,
  }), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => tab === "all" || r.status === tab)
      .filter((r) => !q || r.bookingNumber?.toLowerCase().includes(q) || r.route.toLowerCase().includes(q) || r.driver.toLowerCase().includes(q));
  }, [rows, tab, search]);

  const totalNet = useMemo(() => filtered.reduce((sum, r) => sum + r.net, 0), [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const changeTab = (value) => { setTab(value); setPage(1); };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Job History</h1>
        <p className="text-sm text-slate-500 mt-1">Completed and cancelled bookings</p>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative max-w-xs w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search bookings, routes, drivers..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-field pl-9 pr-3 py-2 w-full"
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: "all", label: "All" },
            { key: "completed", label: `Completed (${counts.completed})` },
            { key: "cancelled", label: `Cancelled (${counts.cancelled})` },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => changeTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                tab === t.key ? "bg-primary text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {!loading && !error && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm font-semibold text-emerald-700">
          Total Net Earnings (filtered): {formatCurrency(totalNet)}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-slate-400">Loading job history...</div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-red-500">{error}</div>
      ) : !filtered.length ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-slate-400">No bookings found.</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Booking ID", "Route", "Truck", "Driver", "Date", "Amount", "Fee", "Net", "Status"].map((label) => (
                    <th key={label} className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((row) => (
                  <tr key={row.id} className="table-row">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">{bookingRef(row)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{row.route}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{row.truck}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row.driver}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-4 py-3 text-slate-800 font-semibold whitespace-nowrap">{formatCurrency(row.amount)}</td>
                    <td className="px-4 py-3 text-red-500 whitespace-nowrap">{formatCurrency(row.platformFee)}</td>
                    <td className="px-4 py-3 text-emerald-700 font-semibold whitespace-nowrap">{formatCurrency(row.net)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={STATUS_BADGE[row.status] || "default"} size="sm">
                        {row.status === "completed" ? "Completed" : "Cancelled"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
            <span>Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
