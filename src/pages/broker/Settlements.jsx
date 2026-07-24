import { useEffect, useMemo, useState } from "react";
import { Search, CheckCircle2, Clock } from "lucide-react";
import MonthlyEarningsTable from "../../components/broker/MonthlyEarningsTable";
import { api, getToken } from "../../services/api";
import { adaptSettlement, formatCurrency } from "../../utils";

export default function Settlements() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get("/api/payments/settlements?limit=100", getToken());
        setRows((response.data?.settlements || []).map(adaptSettlement));
      } catch {
        setError("Failed to load settlements. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const counts = useMemo(() => ({
    Paid: rows.filter((r) => r.status === "Paid").length,
    Pending: rows.filter((r) => r.status === "Pending").length,
  }), [rows]);

  const totals = useMemo(() => ({
    paid: rows.filter((r) => r.status === "Paid").reduce((sum, r) => sum + r.netEarnings, 0),
    pending: rows.filter((r) => r.status === "Pending").reduce((sum, r) => sum + r.netEarnings, 0),
  }), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => tab === "all" || r.status === tab)
      .filter((r) => !q
        || r.bookingNumber?.toLowerCase().includes(q)
        || r.route?.toLowerCase().includes(q)
        || r.driver?.toLowerCase().includes(q)
        || r.truck?.toLowerCase().includes(q));
  }, [rows, tab, search]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settlements</h1>
        <p className="text-sm text-slate-500 mt-1">Payout history for your completed trips.</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-slate-400">Loading settlements...</div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-red-500">{error}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Settled ({counts.Paid})</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">{formatCurrency(totals.paid)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Pending ({counts.Pending})</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">{formatCurrency(totals.pending)}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative max-w-xs w-full">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search bookings, routes, drivers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-9 pr-3 py-2 w-full"
              />
            </div>
            <div className="flex gap-2">
              {[
                { key: "all", label: "All" },
                { key: "Paid", label: `Paid (${counts.Paid})` },
                { key: "Pending", label: `Pending (${counts.Pending})` },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    tab === t.key ? "bg-primary text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <MonthlyEarningsTable rows={filtered} />
        </>
      )}
    </div>
  );
}
