import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Wrench, X, Loader2 } from "lucide-react";

// Dedicated, one-tap breakdown report — distinct from the multi-reason ReportIncidentSheet so
// "my truck broke down, I need a mechanic" doesn't require picking a reason from a grid first.
// Still creates a plain trip_incidents row (reason='breakdown') via the same
// POST /api/trips/:id/report-issue endpoint; the backend auto-creates the linked
// mechanic_requests row that the broker tracks assignment progress on.
export default function ReportBreakdownSheet({ isOpen, onClose, onSubmit, submitting }) {
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isOpen) setNotes("");
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (submitting) return;
    onSubmit?.({ notes: notes.trim() });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(2,6,23,0.55)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
      onClick={submitting ? undefined : onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-modal max-w-sm w-full p-6 animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <Wrench size={18} className="text-amber-600" />
            </div>
            <h3 className="font-bold text-slate-900 text-[15px]">Report Breakdown</h3>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-3">Let your broker know your truck has broken down and you need a mechanic. They'll be notified right away.</p>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={submitting}
          placeholder="What's wrong with the truck? (e.g. flat tyre, engine trouble, won't start)"
          rows={3}
          autoFocus
          className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-primary transition-colors mb-4 disabled:opacity-50"
        />

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Reporting...
            </>
          ) : (
            "Report Breakdown / Need Mechanic"
          )}
        </button>
      </div>
    </div>,
    document.body
  );
}
