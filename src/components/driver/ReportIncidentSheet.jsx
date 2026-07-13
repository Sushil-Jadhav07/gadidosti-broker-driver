import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Wrench, TrafficCone, HeartPulse, MessageSquareWarning, X, Loader2 } from "lucide-react";

const REASONS = [
  { id: "accident", label: "Accident", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", ring: "ring-red-200" },
  { id: "breakdown", label: "Breakdown", icon: Wrench, color: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-200" },
  { id: "traffic_block", label: "Traffic Block", icon: TrafficCone, color: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-200" },
  { id: "medical", label: "Medical", icon: HeartPulse, color: "text-red-600", bg: "bg-red-50", ring: "ring-red-200" },
  { id: "other", label: "Other", icon: MessageSquareWarning, color: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-200" },
];

// Second step of the "Report Incident to Support" flow opened from EmergencySheet — the
// driver picks a reason and optionally adds notes before it's sent to POST /api/trips/:id/report-issue.
export default function ReportIncidentSheet({ isOpen, onClose, onSubmit, submitting }) {
  const [reason, setReason] = useState(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isOpen) {
      setReason(null);
      setNotes("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!reason || submitting) return;
    onSubmit?.({ reason, notes: notes.trim() });
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
              <MessageSquareWarning size={18} className="text-amber-600" />
            </div>
            <h3 className="font-bold text-slate-900 text-[15px]">Report Incident</h3>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-3">What's going on? Your broker and the client will be notified right away.</p>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {REASONS.map((r) => (
            <button
              key={r.id}
              onClick={() => setReason(r.id)}
              disabled={submitting}
              className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl transition-all disabled:opacity-50 ${
                reason === r.id ? `${r.bg} ring-2 ${r.ring}` : "bg-slate-50 hover:bg-slate-100"
              }`}
            >
              <r.icon size={18} className={reason === r.id ? r.color : "text-slate-400"} />
              <span className={`text-[11px] font-semibold text-center leading-tight ${reason === r.id ? r.color : "text-slate-500"}`}>{r.label}</span>
            </button>
          ))}
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={submitting}
          placeholder="Add any details (optional)"
          rows={3}
          className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-primary transition-colors mb-4 disabled:opacity-50"
        />

        <button
          onClick={handleSubmit}
          disabled={!reason || submitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Reporting...
            </>
          ) : (
            "Submit Report"
          )}
        </button>
      </div>
    </div>,
    document.body
  );
}
