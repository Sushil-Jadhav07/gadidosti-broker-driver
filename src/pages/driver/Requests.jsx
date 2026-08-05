import { useEffect, useRef, useState } from "react";
import { CheckCircle } from "lucide-react";
import ConfirmDialog from "../../components/broker/ConfirmDialog";
import DriverRequestCard from "../../components/DriverRequestCard";
import CounterOfferModal from "../../components/CounterOfferModal";
import KycGate from "../../components/kyc/KycGate";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { api, getToken } from "../../services/api";
import { adaptDriverRequest } from "../../utils";

const LIMIT = 10;
// Polled (not pushed) so a client's counter-offer — or the 3-minute driverTimedOut handover —
// shows up without a manual refresh, same cadence used for job requests elsewhere.
const POLL_INTERVAL_MS = 8000;

export default function DriverRequests() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [declineId, setDeclineId] = useState(null);
  const [counterRequest, setCounterRequest] = useState(null);
  const [counterAmount, setCounterAmount] = useState("");
  const [counterNote, setCounterNote] = useState("");
  const [countering, setCountering] = useState(false);
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

  const openCounter = (req) => {
    setCounterAmount(String(req.amount || ""));
    setCounterNote("");
    setCounterRequest(req);
  };

  const submitCounter = async () => {
    if (!counterRequest) return;
    const amount = Number(counterAmount);
    if (!amount || amount <= 0) {
      addToast("Enter a valid counter amount.", "error");
      return;
    }
    setCountering(true);
    try {
      const res = await api.patch(`/api/driver-requests/${counterRequest.id}/counter`, {
        amount,
        note: counterNote.trim() || undefined,
      }, getToken());
      if (!res?.success) throw new Error(res?.message || "Failed to send counter-offer");
      applyUpdate(counterRequest.id, res);
      addToast("Counter-offer sent to the client.", "success");
      setCounterRequest(null);
    } catch (err) {
      addToast(err.message || "Failed to send counter-offer.", "error");
      refresh();
    } finally {
      setCountering(false);
    }
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Requests</h1>
        <p className="text-sm text-slate-500 mt-1">Respond within 3 minutes — after that your broker can act on your behalf.</p>
      </div>

      {loading && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-slate-400">Loading requests...</div>
      )}
      {!loading && error && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-red-500">{error}</div>
      )}
      {!loading && !error && requests.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center">
          <CheckCircle size={40} className="mx-auto mb-3 text-emerald-400" />
          <p className="font-semibold text-slate-800">All caught up!</p>
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
              onCounter={openCounter}
            />
          ))}
        </div>
      )}

      {!loading && !error && (page > 1 || hasMore) && (
        <div className="flex items-center justify-between px-1 pt-2 text-xs text-slate-500">
          <span>Page {page}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Next
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

      <CounterOfferModal
        request={counterRequest}
        amount={counterAmount}
        onAmountChange={setCounterAmount}
        note={counterNote}
        onNoteChange={setCounterNote}
        onClose={() => setCounterRequest(null)}
        onSubmit={submitCounter}
        submitting={countering}
      />
    </div>
  );
}
