import { MapPin, IndianRupee, User, ArrowRight } from "lucide-react";
import Modal from "../broker/Modal";

// Shown in place of the generic top-right toast when a brand-new driver_requests row lands for
// this driver (either from a client's direct single-truck pick, or one row of a "Find Truck"
// radius broadcast — see FcmBridge.jsx for how the two are told apart) — a small corner toast is
// too easy to miss for something time-sensitive (2-minute response window before the broker gets
// looped in, see gadidosti-backend's driverRequestTimeoutSweep.js), so this is a real modal
// instead, with enough of the request on it to decide "is this worth reviewing" without leaving
// whatever page the driver is already on.
export default function NewRequestPopup({ request, onReview, onClose }) {
  if (!request) return null;

  return (
    <Modal isOpen={!!request} onClose={onClose} title="New Booking Request" size="sm">
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-primary-50 rounded-xl px-4 py-3">
          <span className="text-xs font-semibold text-slate-500">Offered Amount</span>
          <span className="text-xl font-extrabold text-slate-900 flex items-center gap-0.5">
            <IndianRupee size={17} />{Number(request.amount || 0).toLocaleString("en-IN")}
          </span>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-start gap-2.5">
            <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin size={12} className="text-emerald-600" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Pickup</p>
              <p className="text-sm text-slate-700 break-words">{request.pickup || "-"}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin size={12} className="text-rose-600" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Drop</p>
              <p className="text-sm text-slate-700 break-words">{request.drop || "-"}</p>
            </div>
          </div>
          {request.clientName && (
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                <User size={12} className="text-slate-500" />
              </span>
              <p className="text-sm text-slate-700">{request.clientName}</p>
            </div>
          )}
        </div>

        <p className="text-[11px] text-slate-400 text-center">
          Respond within 2 minutes, or your broker will be notified to respond in your place.
        </p>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 btn-ghost px-4 py-2.5 text-sm border border-slate-200">
            Dismiss
          </button>
          <button onClick={onReview} className="flex-1 btn-primary px-4 py-2.5 text-sm flex items-center justify-center gap-1.5">
            Review <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </Modal>
  );
}
