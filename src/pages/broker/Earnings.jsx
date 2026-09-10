import { useEffect, useMemo, useState } from "react";
import { IndianRupee, Wallet, TrendingUp, TrendingDown, Minus } from "lucide-react";
import MonthlyEarningsTable from "../../components/broker/MonthlyEarningsTable";
import { api, getToken } from "../../services/api";
import { adaptSettlement, formatCurrency } from "../../utils";

const STAT_CARDS = [
  { key: "gross", label: "Gross Revenue", icon: IndianRupee, iconBg: "bg-primary/10", iconColor: "text-primary", blob: "bg-primary" },
  { key: "fees", label: "Platform Fees", icon: Wallet, iconBg: "bg-red-50", iconColor: "text-red-500", blob: "bg-red-500" },
  { key: "net", label: "Net Earnings", icon: TrendingUp, iconBg: "bg-emerald-50", iconColor: "text-emerald-600", blob: "bg-emerald-500" },
];

export default function Earnings() {
  const [rows, setRows] = useState([]);
  const [analytics, setAnalytics] = useState({ thisMonth: 0, lastMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = getToken();
        const [settlementRes, analyticsRes] = await Promise.all([
          api.get("/api/payments/settlements?limit=100", token),
          api.get("/api/analytics/broker", token),
        ]);
        setRows((settlementRes.data?.settlements || []).map(adaptSettlement));
        setAnalytics(analyticsRes.data || { thisMonth: 0, lastMonth: 0 });
      } catch {
        setError("Failed to load earnings. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalGross = useMemo(() => rows.reduce((sum, row) => sum + row.amount, 0), [rows]);
  const totalFees = useMemo(() => rows.reduce((sum, row) => sum + row.platformFee, 0), [rows]);
  const totalNet = useMemo(() => rows.reduce((sum, row) => sum + row.netEarnings, 0), [rows]);
  const values = { gross: totalGross, fees: totalFees, net: totalNet };

  const comparisonMax = Math.max(analytics.thisMonth, analytics.lastMonth, 1);

  const monthChangePct = analytics.lastMonth > 0
    ? Math.round(((analytics.thisMonth - analytics.lastMonth) / analytics.lastMonth) * 100)
    : null;
  const TrendIcon = monthChangePct == null || monthChangePct === 0 ? Minus : monthChangePct > 0 ? TrendingUp : TrendingDown;
  const trendColor = monthChangePct == null || monthChangePct === 0 ? "text-slate-400" : monthChangePct > 0 ? "text-emerald-600" : "text-red-500";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Earnings</h1>
        <p className="text-sm text-slate-500 mt-1">Broker revenue and settlement performance.</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-12 text-center text-slate-400">Loading earnings...</div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-12 text-center text-red-500">{error}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STAT_CARDS.map((card) => (
              <div key={card.key} className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 relative overflow-hidden hover:shadow-md transition-shadow">
                <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-[0.06] ${card.blob}`} />
                <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center mb-3 relative`}>
                  <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                <p className="text-[13px] text-slate-500 font-medium relative">{card.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5 font-mono tracking-tight relative">{formatCurrency(values[card.key])}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Monthly Comparison</p>
            <div className="flex items-center gap-6 flex-wrap mb-3">
              <div>
                <p className="text-xs text-slate-400">This Month</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5 font-mono">{formatCurrency(analytics.thisMonth)}</p>
              </div>
              <div className="h-10 w-px bg-slate-100 hidden sm:block" />
              <div>
                <p className="text-xs text-slate-400">Last Month</p>
                <p className="text-xl font-bold text-slate-500 mt-0.5 font-mono">{formatCurrency(analytics.lastMonth)}</p>
              </div>
              {monthChangePct != null && (
                <div className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${trendColor} ${
                  monthChangePct > 0 ? "bg-emerald-50" : monthChangePct < 0 ? "bg-red-50" : "bg-slate-50"
                }`}>
                  <TrendIcon size={14} />
                  {monthChangePct > 0 ? "+" : ""}{monthChangePct}% vs last month
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(analytics.thisMonth / comparisonMax) * 100}%` }} />
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-slate-300" style={{ width: `${(analytics.lastMonth / comparisonMax) * 100}%` }} />
              </div>
            </div>
          </div>

          <MonthlyEarningsTable rows={rows} />
        </>
      )}
    </div>
  );
}
