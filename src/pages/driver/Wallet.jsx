import { useEffect, useMemo, useState } from "react";
import { Wallet as WalletIcon, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { useToast } from "../../hooks/useToast";
import { api, getToken } from "../../services/api";

const TXN_META = {
  earning: { label: "Trip Earning", Icon: ArrowDownCircle, className: "text-success bg-success/10" },
  payout: { label: "Payout Received", Icon: ArrowUpCircle, className: "text-primary bg-primary/10" },
};

// Read-only — unlike the client app's prepaid wallet, a driver never recharges this; it's a
// running balance of trip earnings (net of commission) credited automatically on trip
// completion, debited only when a superadmin manually logs having paid them out
// (see gadidosti-backend's payout.controller.js).
export default function DriverWallet() {
  const { addToast } = useToast();
  const token = getToken();

  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [balRes, txnRes] = await Promise.all([
          api.get("/api/wallet", token),
          api.get("/api/wallet/transactions?limit=50", token),
        ]);
        if (balRes?.success) setBalance(Number(balRes.data.balance));
        if (txnRes?.success) setTransactions(txnRes.data.transactions || []);
      } catch {
        addToast("Could not load your wallet", "error");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalEarned = useMemo(
    () => transactions.filter((t) => t.type === "earning").reduce((sum, t) => sum + Number(t.amount), 0),
    [transactions]
  );
  const totalPaidOut = useMemo(
    () => transactions.filter((t) => t.type === "payout").reduce((sum, t) => sum + Number(t.amount), 0),
    [transactions]
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Wallet</h1>
        <p className="text-sm text-slate-400 mt-0.5">Your earnings, owed and paid out.</p>
      </div>

      <div
        className="rounded-2xl p-6 text-white"
        style={{ background: "linear-gradient(155deg, #166534 0%, #14532D 65%, #0f3d22 100%)" }}
      >
        <div className="flex items-center gap-2 mb-2 text-white/70">
          <WalletIcon className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Balance Owed To You</span>
        </div>
        <p className="font-bold text-4xl tabular-nums">
          {loading ? "—" : `₹${(balance ?? 0).toLocaleString("en-IN")}`}
        </p>
        <p className="text-xs text-white/50 mt-2">Credited automatically when a trip completes. Paid out by the admin.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Total Earned</p>
          <p className="text-lg font-bold text-slate-800">{loading ? "—" : `₹${totalEarned.toLocaleString("en-IN")}`}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Total Paid Out</p>
          <p className="text-lg font-bold text-slate-800">{loading ? "—" : `₹${totalPaidOut.toLocaleString("en-IN")}`}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-[15px]">Transaction History</h3>
        </div>
        {loading ? (
          <div className="p-10 flex justify-center">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">No transactions yet</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {transactions.map((t) => {
              const meta = TXN_META[t.type] || { label: t.type, Icon: WalletIcon, className: "text-slate-600 bg-slate-50" };
              const credit = t.type === "earning";
              return (
                <div key={t.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${meta.className}`}>
                      <meta.Icon className="w-4.5 h-4.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{meta.label}</p>
                      <p className="text-xs text-slate-400">{new Date(t.created_at).toLocaleString("en-IN")}</p>
                      {t.note && <p className="text-xs text-slate-400 italic mt-0.5">{t.note}</p>}
                    </div>
                  </div>
                  <p className={`text-sm font-semibold flex-shrink-0 ${credit ? "text-success" : "text-primary"}`}>
                    {credit ? "+" : "-"}₹{Number(t.amount).toLocaleString("en-IN")}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
