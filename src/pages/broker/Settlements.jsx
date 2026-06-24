import { Wallet, CheckCircle, Clock } from "lucide-react";
import Badge from "../../components/broker/Badge";
import { settlements, formatCurrency, formatDate } from "../../data/brokerMockData";

export default function Settlements() {
  const totalPaid = settlements.filter((s) => s.status === "Paid").reduce((sum, s) => sum + s.amount, 0);
  const pending = settlements.filter((s) => s.status === "Pending");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Settled", value: formatCurrency(totalPaid), icon: CheckCircle, bg: "#F0FDF4", color: "#17D86B", sub: `${settlements.filter(s=>s.status==="Paid").length} payouts` },
          { label: "Pending", value: formatCurrency(pending.reduce((s,p)=>s+p.amount,0)), icon: Clock, bg: "#FFFBEB", color: "#F59E0B", sub: `${pending.length} pending payouts` },
          { label: "Next Settlement", value: "Jun 16-30, 2026", icon: Wallet, bg: "#EBF3FF", color: "#1976FF", sub: "Expected Jul 1, 2026" },
        ].map(({ label, value, icon: Icon, bg, color, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}><Icon size={18} style={{ color }} /></div>
            <p className="text-[13px] text-slate-500 font-medium">{label}</p>
            <p className="text-xl font-bold text-slate-900 font-mono mt-0.5">{value}</p>
            <p className="text-[11px] text-slate-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50">
          <h3 className="font-bold text-slate-900 text-[15px]">Settlement History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Settlement ID", "Period", "Amount", "Date", "Account", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {settlements.map((s) => (
                <tr key={s.id} className="table-row">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.id}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{s.period}</td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">{formatCurrency(s.amount)}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(s.date)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.account}</td>
                  <td className="px-4 py-3"><Badge variant={s.status === "Paid" ? "success" : "warning"}>{s.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-blue-800 mb-1">Settlement Policy</p>
        <p className="text-xs text-blue-600">Settlements are processed bi-monthly (1st-15th and 16th-30th). Funds are credited within 2 business days after the settlement period ends. Platform fee of 10% is deducted before each payout.</p>
      </div>
    </div>
  );
}
