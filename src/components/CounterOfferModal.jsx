import { IndianRupee } from "lucide-react";
import Modal from "./broker/Modal";
import { formatCurrency, bookingRef } from "../utils";

export default function CounterOfferModal({ request, amount, onAmountChange, note, onNoteChange, onClose, onSubmit, submitting }) {
  return (
    <Modal isOpen={!!request} onClose={onClose} title="Send Counter-Offer" size="sm">
      {request && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Booking <span className="font-mono text-slate-700">{bookingRef(request)}</span> — client asked {formatCurrency(request.amount)}. Propose a different amount.
          </p>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5"><IndianRupee size={13} /> Your Offer</label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              placeholder="Enter amount"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => onNoteChange(e.target.value.slice(0, 500))}
              rows={2}
              placeholder="Reason for the counter-offer..."
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 btn-ghost px-4 py-2.5 text-sm border border-slate-200">Cancel</button>
            <button
              onClick={onSubmit}
              disabled={submitting}
              className="flex-1 btn-primary px-4 py-2.5 text-sm disabled:opacity-60"
            >
              {submitting ? "Sending..." : "Send Offer"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
