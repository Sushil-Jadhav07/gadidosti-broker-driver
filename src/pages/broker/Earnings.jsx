import { IndianRupee, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import Badge from "../../components/broker/Badge";
import { earningsData, dailyEarnings, formatCurrency, formatDate } from "../../data/brokerMockData";

export default function Earnings() {
  const paid = earningsData.filter((e) => e.status === "Paid");
  const pending = earningsData.filter((e) => e.status === "Pending");
  const totalPaid = paid.reduce((s, e) => s + e.net, 0);
  const totalPending = pending.reduce((s, e) => s + e.net, 0);
  const totalFees = earningsData.reduce((s, e) => s + e.platformFee, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Earnings", value: formatCurrency(earningsData.reduce((s,e)=>s+e.amount,0)), icon: IndianRupee, bg: "#EBF3FF", color: "#1976FF", sub: "Gross revenue" },
          { label: "Net Received", value: formatCurrency(totalPaid), icon: TrendingUp, bg: "#F0FDF4", color: "#17D86B", sub: `${paid.length} settlements paid` },
          { label: "Pending", value: formatCurrency(totalPending), icon: Clock, bg: "#FFFBEB", color: "#F59E0B", sub: `${pending.length} settlements` },
          { label: "Platform Fees", value: formatCurrency(totalFees), icon: TrendingDown, bg: "#FEF2F2", color: "#EF4444", sub: "10% per booking" },
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
        <h3 className="font-bold text-slate-900 text-[15px] mb-4">Daily Revenue vs Expenses</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={dailyEarnings} barSize={22} barGap={4}>
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 12 }} />
            <YAxis hide />
            <Tooltip formatter={(v) => [`Rs ${v.toLocaleString("en-IN")}`, ""]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="revenue" fill="#1976FF" radius={[6,6,0,0]} name="Revenue" />
            <Bar dataKey="expenses" fill="#FCA5A5" radius={[6,6,0,0]} name="Expenses" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50">
          <h3 className="font-bold text-slate-900 text-[15px]">Earnings Ledger</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Date", "Booking ID", "Route", "Amount", "Fee", "Net", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {earningsData.slice(0,15).map((e, i) => (
                <tr key={i} className="table-row">
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(e.date)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{e.bookingId}</td>
                  <td className="px-4 py-3 text-slate-700">{e.route}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-slate-800">{formatCurrency(e.amount)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-red-500">{formatCurrency(e.platformFee)}</td>
                  <td className="px-4 py-3 font-mono font-bold text-emerald-600">{formatCurrency(e.net)}</td>
                  <td className="px-4 py-3"><Badge variant={e.status === "Paid" ? "success" : "warning"} size="sm">{e.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
