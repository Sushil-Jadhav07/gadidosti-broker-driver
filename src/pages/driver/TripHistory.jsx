import { useState } from "react";
import { TrendingUp, Route, IndianRupee, Search } from "lucide-react";
import TripCard from "../../components/driver/TripCard";
import { tripHistory, historySummary } from "../../data/driverMockData";

const FILTERS = ["All", "Completed", "In Transit", "Cancelled"];

export default function TripHistory() {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = tripHistory.filter((t) => {
    const matchStatus = filter === "All" || t.status === filter;
    const matchSearch = search === "" ||
      t.route.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.cargo.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Trips", value: historySummary.totalTrips,                           icon: Route,      color: "text-primary",    bg: "bg-primary/10" },
          { label: "Total KMs",   value: historySummary.totalKms.toLocaleString(),            icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Total Earned",value: `Rs ${historySummary.totalEarned.toLocaleString()}`, icon: IndianRupee,color: "text-amber-600",   bg: "bg-amber-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 shadow-card p-4 flex flex-col gap-3">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{label}</p>
              <p className="text-[15px] font-bold text-slate-900 mt-0.5">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search trips by route, ID, or cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field w-full pl-9"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all whitespace-nowrap ${
              filter === f
                ? "bg-primary text-white"
                : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
            }`}>
            {f} {f !== "All" && `(${tripHistory.filter((t) => t.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Trip list */}
      <div className="space-y-3">
        {filtered.map((trip) => <TripCard key={trip.id} trip={trip} />)}
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-card p-10 text-center">
            <p className="text-slate-400 text-sm">No trips found</p>
          </div>
        )}
      </div>
    </div>
  );
}
