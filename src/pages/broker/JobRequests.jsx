import { useState } from "react";
import { MapPin, Clock, Phone, CheckCircle, XCircle } from "lucide-react";
import Badge from "../../components/broker/Badge";
import ConfirmDialog from "../../components/broker/ConfirmDialog";
import KycGate from "../../components/kyc/KycGate";
import { useAuth } from "../../hooks/useAuth";
import { jobRequests as initialRequests } from "../../data/brokerMockData";

export default function JobRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState(initialRequests);
  const [accepted, setAccepted] = useState(0);
  const [confirmAction, setConfirmAction] = useState(null);

  const handleAccept = (id) => { setAccepted((n) => n + 1); setRequests((prev) => prev.filter((r) => r.id !== id)); setConfirmAction(null); };
  const handleReject = (id) => { setRequests((prev) => prev.filter((r) => r.id !== id)); setConfirmAction(null); };

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
          <CheckCircle size={16} />{accepted} request{accepted > 1 ? "s" : ""} accepted and moved to Active Jobs.
        </div>
      )}
      {requests.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center">
          <CheckCircle size={40} className="mx-auto mb-3 text-emerald-400" />
          <p className="font-semibold text-slate-800">All caught up!</p>
          <p className="text-sm text-slate-400 mt-1">No pending job requests at the moment.</p>
        </div>
      )}
      {requests.map((req) => (
        <div key={req.id} className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-slate-400">{req.bookingId}</span>
                <Badge variant="primary" size="sm">{req.truckType}</Badge>
              </div>
              <h3 className="font-bold text-slate-900 text-[15px]">{req.pickup.split(" - ")[0]} to {req.drop.split(" - ")[0]}</h3>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xl font-bold text-slate-900 font-mono">Rs {req.amount.toLocaleString("en-IN")}</p>
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
            {[{ label: "Distance", value: `${req.distance} km` }, { label: "Weight", value: req.weight }, { label: "Client", value: req.clientName }].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-lg px-3 py-2">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">{label}</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setConfirmAction({ type: "accept", id: req.id })} className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2"><CheckCircle size={15} /> Accept Job</button>
            <button onClick={() => setConfirmAction({ type: "reject", id: req.id })} className="flex-1 py-2.5 text-sm rounded-lg font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"><XCircle size={15} /> Reject</button>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-400">
            <Phone size={12} />{req.clientName}: {req.clientPhone} - {req.timestamp}
          </div>
        </div>
      ))}
      <ConfirmDialog
        isOpen={!!confirmAction} onClose={() => setConfirmAction(null)}
        onConfirm={() => { if (confirmAction?.type === "accept") handleAccept(confirmAction.id); else handleReject(confirmAction?.id); }}
        title={confirmAction?.type === "accept" ? "Accept Job?" : "Reject Job?"}
        message={confirmAction?.type === "accept" ? "This job will be moved to Active Jobs." : "Are you sure you want to reject this job request?"}
        confirmText={confirmAction?.type === "accept" ? "Accept" : "Reject"}
        variant={confirmAction?.type === "accept" ? "warning" : "danger"}
      />
    </div>
  );
}
