import { MapPin, IndianRupee, User, ArrowRight } from "lucide-react";
import Modal from "./Modal";

// Broker counterpart to driver/NewRequestPopup.jsx — shown the instant a brand-new job_requests
// row lands for this broker (see FcmBridge.jsx, which listens for the 'job-request-created'
// socket event rather than relying on a foreground push notification).
export default function NewJobRequestPopup({ request, onReview, onClose }) {
  if (!request) return null;

  return (
    <Modal isOpen={!!request} onClose={onClose} title="New Job Request" size="sm">
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
