import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { IndianRupee, Wallet, TrendingUp } from "lucide-react";
import MonthlyEarningsTable from "../../components/driver/MonthlyEarningsTable";
import { api, getToken } from "../../services/api";
import { adaptTrip, formatCurrency } from "../../utils";

export default function Earnings() {
  const [analytics, setAnalytics] = useState({ thisMonth: 0, lastMonth: 0, tripHistory: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get("/api/analytics/broker", getToken());
        setAnalytics({ ...(response.data || {}), tripHistory: (response.data?.tripHistory || []).map(adaptTrip) });
      } catch {
        setError("Failed to load earnings. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalEarned = useMemo(() => analytics.tripHistory.reduce((sum, trip) => sum + trip.earnings, 0), [analytics]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">Earnings</h1><p className="text-sm text-slate-500 mt-1">Driver earnings from completed trips.</p></div>
        <Link to="/driver/earnings/history" className="text-sm font-semibold text-primary">View history</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[{ label: "This Month", value: formatCurrency(analytics.thisMonth), icon: IndianRupee }, { label: "Last Month", value: formatCurrency(analytics.lastMonth), icon: Wallet }, { label: "Total Earned", value: formatCurrency(totalEarned), icon: TrendingUp }].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-100 shadow-card p-5"><card.icon className="w-5 h-5 text-primary mb-3" /><p className="text-sm text-slate-500">{card.label}</p><p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p></div>
        ))}
      </div>
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-slate-400">Loading earnings...</div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-red-500">{error}</div>
      ) : (
        <>
          <MonthlyEarningsTable rows={analytics.tripHistory.slice(0, 10)} />
          {analytics.tripHistory.length > 10 && (
            <div className="text-center">
              <Link to="/driver/earnings/history" className="text-sm font-semibold text-primary hover:underline">Show More</Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
