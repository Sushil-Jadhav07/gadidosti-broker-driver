import { IndianRupee, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { earningsData, tripHistory } from "../../data/driverMockData";

export default function DriverEarnings() {
  const completedTrips = tripHistory.filter((t) => t.status === "Completed" || t.status === "Delivered" || t.earnings > 0);
  const growth = earningsData.lastMonth
    ? Math.round(((earningsData.thisMonth - earningsData.lastMonth) / earningsData.lastMonth) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "This Month", value: `Rs ${earningsData.thisMonth.toLocaleString("en-IN")}`, icon: IndianRupee, bg: "#EBF3FF", color: "#1976FF", sub: "Current month earnings" },
          { label: "Last Month", value: `Rs ${earningsData.lastMonth.toLocaleString("en-IN")}`, icon: Wallet, bg: "#F8FAFC", color: "#64748B", sub: "Previous month" },
          {
            label: "Growth", value: `${growth >= 0 ? "+" : ""}${growth}%`,
            icon: growth >= 0 ? TrendingUp : TrendingDown,
            bg: growth >= 0 ? "#F0FDF4" : "#FEF2F2", color: growth >= 0 ? "#17D86B" : "#EF4444",
            sub: "Vs. previous month",
          },
          { label: "Total Earned", value: `Rs ${earningsData.totalEarned.toLocaleString("en-IN")}`, icon: TrendingUp, bg: "#FFFBEB", color: "#F59E0B", sub: "Lifetime earnings" },
        ].map(({ label, value, icon: Icon, bg, color, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
              <Icon size={18} style={{ color }} />
            </div>
            <p className="text-[13px] text-slate-500 font-medium">{label}</p>
            <p className="text-xl font-bold text-slate-900 font-mono mt-0.5">{value}</p>
            <p className="text-[11px] text-slate-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
        <h3 className="font-bold text-slate-900 text-[15px] mb-4">Monthly Earnings</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={earningsData.monthlyBreakdown} barSize={28}>
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 12 }} />
            <YAxis hide />
            <Tooltip formatter={(v) => [`Rs ${v.toLocaleString("en-IN")}`, "Earnings"]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }} />
            <Bar dataKey="amount" fill="#1976FF" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50">
          <h3 className="font-bold text-slate-900 text-[15px]">Trip Earnings</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Date", "Booking ID", "Route", "Earnings"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {completedTrips.slice(0, 15).map((t) => (
                <tr key={t.id} className="table-row">
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{t.date}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{t.id}</td>
                  <td className="px-4 py-3 text-slate-700">{t.route}</td>
                  <td className="px-4 py-3 font-mono font-bold text-emerald-600">Rs {t.earnings.toLocaleString("en-IN")}</td>
                </tr>
              ))}
              {completedTrips.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">No earnings yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
