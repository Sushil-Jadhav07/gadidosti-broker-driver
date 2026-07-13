import { useEffect, useState } from "react";
import { MapPin, Clock, Phone, CheckCircle, XCircle, Truck, User } from "lucide-react";
import Badge from "../../components/broker/Badge";
import ConfirmDialog from "../../components/broker/ConfirmDialog";
import Modal from "../../components/broker/Modal";
import TruckDropdown from "../../components/broker/TruckDropdown";
import DriverDropdown from "../../components/broker/DriverDropdown";
import KycGate from "../../components/kyc/KycGate";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { api, getToken } from "../../services/api";
import { adaptJobRequest, formatCurrency, bookingRef } from "../../utils";

export default function JobRequests() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accepted, setAccepted] = useState(0);
  const [confirmAction, setConfirmAction] = useState(null);
  const [assignRequest, setAssignRequest] = useState(null);
  const [assignForm, setAssignForm] = useState({ driverId: "", truckId: "" });
  const [assigning, setAssigning] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const [requestRes, driverRes, truckRes] = await Promise.all([
        api.get("/api/jobs/requests?limit=100", token),
        api.get("/api/vehicles/drivers?limit=100", token),
        api.get("/api/vehicles/trucks?limit=100", token),
      ]);
      setRequests((requestRes.data?.requests || []).map(adaptJobRequest));
      setDrivers(driverRes.data?.drivers || []);
      setTrucks(truckRes.data?.trucks || []);
    } catch {
      setError("Failed to load job requests. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const handleAccept = async (id) => {
    try {
      await api.patch(`/api/jobs/requests/${id}/accept`, {}, getToken());
      setAccepted((count) => count + 1);
      setRequests((current) => current.map((request) => (
        request.id === id ? { ...request, status: "Accepted" } : request
      )));
      const req = requests.find((r) => r.id === id);
      setAssignForm({ driverId: "", truckId: "" });
      setAssignRequest(req ? { ...req, status: "Accepted" } : { id });
      addToast("Job accepted. Now assign a driver and truck.", "success");
    } catch (err) {
      addToast(err.message || "Failed to accept job.", "error");
    } finally {
      setConfirmAction(null);
    }
  };

  const handleReject = async (id) => {
    try {
      await api.patch(`/api/jobs/requests/${id}/decline`, {}, getToken());
      setRequests((current) => current.filter((request) => request.id !== id));
      addToast("Job request declined.", "success");
    } catch (err) {
      addToast(err.message || "Failed to decline job.", "error");
    } finally {
      setConfirmAction(null);
    }
  };

  const submitAssignment = async () => {
    if (!assignRequest) return;
    setAssigning(true);
    try {
      await api.post(`/api/jobs/${assignRequest.id}/assign-driver`, {
        driverId: assignForm.driverId,
        truckId: assignForm.truckId,
      }, getToken());
      setRequests((current) => current.filter((request) => request.id !== assignRequest.id));
      addToast("Driver and truck assigned. Trip created.", "success");
      setAssignRequest(null);
    } catch (err) {
      addToast(err.message || "Failed to assign driver.", "error");
    } finally {
      setAssigning(false);
    }
  };

  if (user?.kyc_status !== "verified") {
    return (
      <div className="pt-6">
        <KycGate status={user?.kyc_status || "pending"} kycPath="/kyc" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {accepted > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle size={16} />{accepted} request{accepted > 1 ? "s" : ""} accepted and ready for driver assignment.
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-slate-400">Loading job requests...</div>
      )}
      {!loading && error && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-red-500">{error}</div>
      )}
      {!loading && !error && requests.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center">
          <CheckCircle size={40} className="mx-auto mb-3 text-emerald-400" />
          <p className="font-semibold text-slate-800">All caught up!</p>
          <p className="text-sm text-slate-400 mt-1">No pending job requests at the moment.</p>
        </div>
      )}

      {!loading && !error && requests.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-white rounded-xl border border-slate-100 shadow-card p-5 flex flex-col">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-400">{bookingRef(req)}</span>
                    <Badge variant="primary" size="sm">{req.truckType}</Badge>
                  </div>
                  <h3 className="font-bold text-slate-900 text-[15px]">{req.pickup.split(" - ")[0]} to {req.drop.split(" - ")[0]}</h3>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-bold text-slate-900 font-mono">{formatCurrency(req.amount)}</p>
                  <div className="flex items-center gap-1 justify-end text-[11px] text-amber-500 mt-0.5">
                    <Clock size={11} />Expires in {req.expiresIn} min
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-start gap-2">
                  <MapPin size={13} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div><p className="text-[11px] text-slate-400 font-semibold">PICKUP</p><p className="text-sm text-slate-700">{req.pickup}</p></div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin size={13} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div><p className="text-[11px] text-slate-400 font-semibold">DROP</p><p className="text-sm text-slate-700">{req.drop}</p></div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                {[{ label: "Distance", value: `${req.distance} km` }, { label: "Weight", value: req.weight || "-" }, { label: "Client", value: req.clientName }].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">{label}</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-auto">
                {req.status === "Accepted" ? (
                  <button
                    onClick={() => { setAssignForm({ driverId: "", truckId: "" }); setAssignRequest(req); }}
                    className="w-full btn-primary py-2.5 text-sm flex items-center justify-center gap-2"
                  >
                    <Truck size={15} /> Assign Driver &amp; Truck
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setConfirmAction({ type: "accept", id: req.id })} className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2"><CheckCircle size={15} /> Accept Job</button>
                    <button onClick={() => setConfirmAction({ type: "reject", id: req.id })} className="flex-1 py-2.5 text-sm rounded-lg font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"><XCircle size={15} /> Reject</button>
                  </div>
                )}
                <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-400">
                  <Phone size={12} />{req.clientName}: {req.clientPhone} - {req.timestamp}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmAction} onClose={() => setConfirmAction(null)}
        onConfirm={() => { if (confirmAction?.type === "accept") handleAccept(confirmAction.id); else handleReject(confirmAction?.id); }}
        title={confirmAction?.type === "accept" ? "Accept Job?" : "Reject Job?"}
        message={confirmAction?.type === "accept" ? "This job will be moved to assignment." : "Are you sure you want to reject this job request?"}
        confirmText={confirmAction?.type === "accept" ? "Accept" : "Reject"}
        variant={confirmAction?.type === "accept" ? "warning" : "danger"}
      />

      <Modal isOpen={!!assignRequest} onClose={() => setAssignRequest(null)} title="Assign Driver & Truck" size="sm">
        {assignRequest && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Booking <span className="font-mono text-slate-700">{bookingRef(assignRequest)}</span> — pick an available driver and truck to create the trip.</p>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5"><User size={13} /> Driver</label>
              <DriverDropdown drivers={drivers} value={assignForm.driverId} onChange={(id) => setAssignForm((f) => ({ ...f, driverId: id }))} placeholder="Select driver" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5"><Truck size={13} /> Truck</label>
              <TruckDropdown trucks={trucks} value={assignForm.truckId} onChange={(id) => setAssignForm((f) => ({ ...f, truckId: id }))} placeholder="Select truck" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setAssignRequest(null)} className="flex-1 btn-ghost px-4 py-2.5 text-sm border border-slate-200">Cancel</button>
              <button
                onClick={submitAssignment}
                disabled={assigning}
                className="flex-1 btn-primary px-4 py-2.5 text-sm disabled:opacity-60"
              >
                {assigning ? "Assigning..." : "Confirm Assignment"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
