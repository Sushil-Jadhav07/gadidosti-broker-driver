import { useEffect, useState } from "react";
import { api, getToken } from "../../services/api";
import MonthlyEarningsTable from "../../components/driver/MonthlyEarningsTable";
import { adaptTrip } from "../../utils";

export default function EarningsHistory() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const load = async () => {
      const response = await api.get("/api/analytics/broker", getToken());
      setRows((response.data?.tripHistory || []).map(adaptTrip));
    };
    load().catch(() => setRows([]));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Earnings History</h1>
        <p className="text-sm text-slate-500 mt-1">Completed driver trips and earnings.</p>
      </div>
      <MonthlyEarningsTable rows={rows} />
    </div>
  );
}
