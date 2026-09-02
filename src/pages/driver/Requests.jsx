import { useEffect, useRef, useState } from "react";
import { CheckCircle, Inbox, ChevronLeft, ChevronRight } from "lucide-react";
import ConfirmDialog from "../../components/broker/ConfirmDialog";
import DriverRequestCard from "../../components/DriverRequestCard";
import KycGate from "../../components/kyc/KycGate";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { api, getToken } from "../../services/api";
import { adaptDriverRequest } from "../../utils";
import { useDriverRequestSocket } from "../../hooks/useDriverRequestSocket";

const LIMIT = 10;
// Live updates now arrive over the socket (useDriverRequestSocket) — a client's counter-offer,
// the 2-minute driverTimedOut handover, or a brand-new broker-assigned offer all push straight
// in. Polling stays on as a fallback in case the socket connection drops, at a longer interval
// since it's no longer doing the real-time work.
const POLL_INTERVAL_MS = 30000;

export default function DriverRequests() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [declineId, setDeclineId] = useState(null);
  const pageRef = useRef(page);
  pageRef.current = page;

  const fetchPage = async (pageNum) => {
    const token = getToken();
    const res = await api.get(`/api/driver-requests?page=${pageNum}&limit=${LIMIT}`, token);
    const list = (res.data?.requests || []).map(adaptDriverRequest);
    setRequests(list);
    setHasMore(list.length === LIMIT);
  };

  const loadAll = async (pageNum) => {
    setLoading(true);
    setError(null);
    try {
      await fetchPage(pageNum);
    } catch {
      setError("Failed to load requests. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    try {
      await fetchPage(pageRef.current);
    } catch { /* silent — next poll retries */ }
  };

  useEffect(() => {
    loadAll(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const applyUpdate = (id, res) => {
    const payload = res.data?.request || res.data || {};
    setRequests((current) => current.map((r) => (r.id === id ? adaptDriverRequest({ ...r, ...payload }) : r)));
  };

  // Socket push can be a brand-new offer this driver hasn't seen yet (a broker just assigned
  // them via job.controller.js's assignDriver), not just an update to one already in the list —
  // upsert instead of the map-only applyUpdate above, which silently drops unknown ids.
  useDriverRequestSocket((payload) => {
    if (!payload?.id) return;
    setRequests((current) => {
      const adapted = adaptDriverRequest(payload);
      const exists = current.some((r) => r.id === payload.id);
      return exists ? current.map((r) => (r.id === payload.id ? adapted : r)) : [adapted, ...current];
    });
  });

  const handleAccept = async (id) => {
    try {
      const res = await api.patch(`/api/driver-requests/${id}/accept`, {}, getToken());
      if (!res?.success) throw new Error(res?.message || "Failed to accept request");
      applyUpdate(id, res);
      addToast("Request accepted.", "success");
    } catch (err) {
      addToast(err.message || "Failed to accept request.", "error");
      refresh();
    }
  };

  const handleDecline = async (id) => {
    try {
      const res = await api.patch(`/api/driver-requests/${id}/decline`, {}, getToken());
      if (!res?.success) throw new Error(res?.message || "Failed to decline request");
      applyUpdate(id, res);
      addToast("Request declined.", "success");
    } catch (err) {
      addToast(err.message || "Failed to decline request.", "error");
      refresh();
    } finally {
      setDeclineId(null);
    }
  };

  // The card itself owns the counter-offer UI (inline stepper, no modal) — this just does the
  // PATCH and applies the response; the card handles its own toast/reset on success or failure.
  const handleCounter = async (id, amount, note) => {
    const res = await api.patch(`/api/driver-requests/${id}/counter`, { amount, note }, getToken());
    if (!res?.success) throw new Error(res?.message || "Failed to send counter-offer");
    applyUpdate(id, res);
  };

  if (user?.kyc_status !== "verified") {
    return (
      <div className="pt-6">
        <KycGate status={user?.kyc_status || "pending"} kycPath="/driver/kyc" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Inbox size={19} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Requests</h1>
          <p className="text-sm text-slate-500 mt-0.5">Respond within 2 minutes — after that your broker can act on your behalf.</p>
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-16 flex justify-center">
          <div className="w-7 h-7 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      {!loading && error && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-12 text-center text-red-500">{error}</div>
      )}
      {!loading && !error && requests.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={30} className="text-emerald-500" />
          </div>
          <p className="font-bold text-slate-800 text-[15px]">All caught up!</p>
          <p className="text-sm text-slate-400 mt-1">No requests waiting on you right now.</p>
        </div>
      )}

      {!loading && !error && requests.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {requests.map((req) => (
            <DriverRequestCard
              key={req.id}
              req={req}
              role="driver"
              onAccept={handleAccept}
              onDecline={setDeclineId}
              onCounter={handleCounter}
            />
          ))}
        </div>
      )}

      {!loading && !error && (page > 1 || hasMore) && (
        <div className="flex items-center justify-between px-1 pt-2 text-xs text-slate-500">
          <span className="font-medium">Page {page}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!declineId} onClose={() => setDeclineId(null)}
        onConfirm={() => handleDecline(declineId)}
        title="Decline this request?"
        message="The client will need to pick a different truck. This action cannot be undone."
        confirmText="Decline"
        variant="danger"
      />
    </div>
  );
}
