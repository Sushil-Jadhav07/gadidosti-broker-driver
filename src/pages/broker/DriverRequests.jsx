import { useEffect, useRef, useState } from "react";
import { CheckCircle, Lock, PackagePlus } from "lucide-react";
import ConfirmDialog from "../../components/broker/ConfirmDialog";
import DriverRequestCard from "../../components/DriverRequestCard";
import TripJoinRequestCard from "../../components/TripJoinRequestCard";
import KycGate from "../../components/kyc/KycGate";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { api, getToken } from "../../services/api";
import { adaptDriverRequest, adaptTripJoinRequest } from "../../utils";
import { useDriverRequestSocket } from "../../hooks/useDriverRequestSocket";
import { useTripJoinRequestSocket } from "../../hooks/useTripJoinRequestSocket";

const LIMIT = 10;
// Live updates now arrive over the socket (useDriverRequestSocket) — polling stays on as a
// fallback in case the socket connection drops, at a longer interval since it's no longer
// doing the real-time work.
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
      setError("Failed to load driver requests. Please try again.");
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

  // This list is server-scoped to requests the driver has already timed out on (see
  // findTimedOutByBroker) — only insert a socket-pushed request the broker hasn't seen yet if
  // it's actually reached that state (driverTimedOut), otherwise just update it in place if
  // already present (e.g. it flips to declined/accepted while shown).
  useDriverRequestSocket((payload) => {
    if (!payload?.id) return;
    setRequests((current) => {
      const exists = current.some((r) => r.id === payload.id);
      if (!exists && !payload.driverTimedOut) return current;
      const adapted = adaptDriverRequest(payload);
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

  // ── Part-load join requests this broker's drivers have timed out on — same endpoint as the
  // driver app's Requests.jsx, server-scoped by role (findTimedOutByBroker, see
  // tripJoinRequest.controller.js's listTripJoinRequests).
  const [joinRequests, setJoinRequests] = useState([]);
  const [joinRequestsLoading, setJoinRequestsLoading] = useState(true);
  const [joinDeclineId, setJoinDeclineId] = useState(null);

  const fetchJoinRequests = async () => {
    const token = getToken();
    const res = await api.get(`/api/trip-join-requests?limit=20`, token);
    setJoinRequests((res.data?.requests || []).map(adaptTripJoinRequest));
  };

  useEffect(() => {
    fetchJoinRequests().catch(() => {}).finally(() => setJoinRequestsLoading(false));
    const interval = setInterval(() => fetchJoinRequests().catch(() => {}), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const applyJoinRequestUpdate = (id, res) => {
    const payload = res.data?.request || res.data || {};
    setJoinRequests((current) => current.map((r) => (r.id === id ? adaptTripJoinRequest({ ...r, ...payload }) : r)));
  };

  // Same "only insert if already timed out" scoping as the driver_requests socket handler above
  // (this list is server-scoped to already-timed-out requests).
  useTripJoinRequestSocket((payload) => {
    if (!payload?.id) return;
    setJoinRequests((current) => {
      const exists = current.some((r) => r.id === payload.id);
      if (!exists && !payload.driverTimedOut) return current;
      const adapted = adaptTripJoinRequest(payload);
      return exists ? current.map((r) => (r.id === payload.id ? adapted : r)) : [adapted, ...current];
    });
  });

  const handleJoinAccept = async (id) => {
    try {
      const res = await api.patch(`/api/trip-join-requests/${id}/accept`, {}, getToken());
      if (!res?.success) throw new Error(res?.message || "Failed to accept request");
      applyJoinRequestUpdate(id, res);
      addToast("Load added to the driver's current trip.", "success");
    } catch (err) {
      addToast(err.message || "Failed to accept request.", "error");
      fetchJoinRequests().catch(() => {});
    }
  };

  const handleJoinDecline = async (id) => {
    try {
      const res = await api.patch(`/api/trip-join-requests/${id}/decline`, {}, getToken());
      if (!res?.success) throw new Error(res?.message || "Failed to decline request");
      applyJoinRequestUpdate(id, res);
      addToast("Request declined.", "success");
    } catch (err) {
      addToast(err.message || "Failed to decline request.", "error");
      fetchJoinRequests().catch(() => {});
    } finally {
      setJoinDeclineId(null);
    }
  };

  const pendingJoinRequests = joinRequests.filter((r) => r.status === "Requested");

  if (user?.kyc_status !== "verified") {
    return (
      <div className="pt-6">
        <KycGate status={user?.kyc_status || "pending"} kycPath="/onboarding" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Driver Requests</h1>
        <p className="text-sm text-slate-500 mt-1">Requests your drivers didn&apos;t respond to within 2 minutes — you can now respond on their behalf.</p>
      </div>

      {loading && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-slate-400">Loading driver requests...</div>
      )}
      {!loading && error && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-red-500">{error}</div>
      )}
      {!loading && !error && requests.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center">
          <Lock size={36} className="mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-800">Nothing to take over</p>
          <p className="text-sm text-slate-400 mt-1">Your drivers are responding to requests on their own — nothing here yet.</p>
        </div>
      )}

      {!loading && !error && requests.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {requests.map((req) => (
            <DriverRequestCard
              key={req.id}
              req={req}
              role="broker"
              onAccept={handleAccept}
              onDecline={setDeclineId}
              onCounter={handleCounter}
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

      {!joinRequestsLoading && pendingJoinRequests.length > 0 && (
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-3">
            <PackagePlus size={16} className="text-teal-600" />
            <h2 className="text-sm font-bold text-slate-800">Part-Load Requests</h2>
            <span className="text-xs text-slate-400">— your driver didn't respond in time</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pendingJoinRequests.map((req) => (
              <TripJoinRequestCard
                key={req.id}
                req={req}
                role="broker"
                onAccept={handleJoinAccept}
                onDecline={setJoinDeclineId}
              />
            ))}
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

      <ConfirmDialog
        isOpen={!!joinDeclineId} onClose={() => setJoinDeclineId(null)}
        onConfirm={() => handleJoinDecline(joinDeclineId)}
        title="Decline this part-load request?"
        message="The client will need to look for a different truck. This action cannot be undone."
        confirmText="Decline"
        variant="danger"
      />
    </div>
  );
}
