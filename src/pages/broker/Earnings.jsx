import { useEffect, useMemo, useState } from "react";
import { IndianRupee, Wallet, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import MonthlyEarningsTable from "../../components/broker/MonthlyEarningsTable";
import { api, getToken } from "../../services/api";
import { adaptSettlement, formatCurrency } from "../../utils";

export default function Earnings() {
  const [rows, setRows] = useState([]);
  const [analytics, setAnalytics] = useState({ thisMonth: 0, lastMonth: 0 });

  useEffect(() => {
    const load = async () => {
      const token = getToken();
      const [settlementRes, analyticsRes] = await Promise.all([
        api.get("/api/payments/settlements?limit=100", token),
        api.get("/api/analytics/broker", token),
      ]);
      setRows((settlementRes.data?.settlements || []).map(adaptSettlement));
      setAnalytics(analyticsRes.data || { thisMonth: 0, lastMonth: 0 });
    };
    load().catch(() => {});
  }, []);

  const totalGross = useMemo(() => rows.reduce((sum, row) => sum + row.amount, 0), [rows]);
  const totalFees = useMemo(() => rows.reduce((sum, row) => sum + row.platformFee, 0), [rows]);
  const totalNet = useMemo(() => rows.reduce((sum, row) => sum + row.netEarnings, 0), [rows]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Earnings</h1>
          <p className="text-sm text-slate-500 mt-1">Broker revenue and settlement performance.</p>
        </div>
        <Link to="/earnings/history" className="text-sm font-semibold text-primary">View history</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Gross Revenue", value: formatCurrency(totalGross), icon: IndianRupee },
          { label: "Platform Fees", value: formatCurrency(totalFees), icon: Wallet },
          { label: "Net Earnings", value: formatCurrency(totalNet), icon: TrendingUp },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
            <card.icon className="w-5 h-5 text-primary mb-3" />
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5 text-sm text-slate-600">
        This month: <span className="font-semibold text-slate-900">{formatCurrency(analytics.thisMonth)}</span> | Last month: <span className="font-semibold text-slate-900">{formatCurrency(analytics.lastMonth)}</span>
      </div>
      <MonthlyEarningsTable rows={rows.slice(0, 10)} />
      {rows.length > 10 && (
        <div className="text-center">
          <Link to="/earnings/history" className="text-sm font-semibold text-primary hover:underline">Show More</Link>
        </div>
      )}
    </div>
  );
}
