import { useEffect, useState } from "react";
import { api, getToken } from "../../services/api";
import MonthlyEarningsTable from "../../components/broker/MonthlyEarningsTable";
import { adaptSettlement } from "../../utils";

export default function EarningsHistory() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const load = async () => {
      const response = await api.get("/api/payments/settlements?limit=50", getToken());
      setRows((response.data?.settlements || []).map(adaptSettlement));
    };
    load().catch(() => setRows([]));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Earnings History</h1>
        <p className="text-sm text-slate-500 mt-1">All broker settlement rows from the backend.</p>
      </div>
      <MonthlyEarningsTable rows={rows} />
    </div>
  );
}
