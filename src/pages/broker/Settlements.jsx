import { useEffect, useState } from "react";
import MonthlyEarningsTable from "../../components/broker/MonthlyEarningsTable";
import { api, getToken } from "../../services/api";
import { adaptSettlement } from "../../utils";

export default function Settlements() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settlements</h1>
        <p className="text-sm text-slate-500 mt-1">Broker settlements fetched from the backend.</p>
      </div>
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-slate-400">Loading settlements...</div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-red-500">{error}</div>
      ) : (
        <MonthlyEarningsTable rows={rows} />
      )}
    </div>
  );
}
