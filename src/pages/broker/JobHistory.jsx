import { useState } from "react";
import { Search } from "lucide-react";
import Badge from "../../components/broker/Badge";
import { jobHistory, formatCurrency, formatDate } from "../../data/brokerMockData";

const STATUS_VARIANT = { Completed: "success", Cancelled: "danger" };

export default function JobHistory() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const filtered = jobHistory.filter((j) => {
    const matchSearch =
      j.bookingId.toLowerCase().includes(search.toLowerCase()) ||
      j.route.toLowerCase().includes(search.toLowerCase()) ||
      j.driver.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || j.status === filter;
    return matchSearch && matchFilter;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalNet = filtered.reduce((sum, j) => sum + j.netEarnings, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search bookings, routes, drivers..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-field pl-9 pr-3 py-2 w-72" />
        </div>
        <div className="flex items-center gap-2">
          {["All", "Completed", "Cancelled"].map((f) => (
            <button key={f} onClick={() => { setFilter(f); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === f ? "bg-primary text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {f} {f !== "All" && `(${jobHistory.filter((j) => j.status === f).length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
        <p className="text-xs text-emerald-600 font-semibold">Total Net Earnings (filtered): <span className="font-mono">{formatCurrency(totalNet)}</span></p>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Booking ID", "Route", "Truck", "Driver", "Date", "Amount", "Fee", "Net", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((job) => (
                <tr key={job.id} className="table-row">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{job.bookingId}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{job.route}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{job.truck}</td>
                  <td className="px-4 py-3 text-slate-600">{job.driver}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(job.date)}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-slate-800">{formatCurrency(job.amount)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-red-500">{formatCurrency(job.platformFee)}</td>
                  <td className="px-4 py-3 font-mono font-bold text-emerald-600">{formatCurrency(job.netEarnings)}</td>
                  <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[job.status] || "default"}>{job.status}</Badge></td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">No records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-all">Prev</button>
              <span className="text-xs text-slate-600">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-all">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
