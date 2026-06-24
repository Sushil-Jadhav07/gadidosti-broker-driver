import { AlertTriangle } from "lucide-react";

export default function ConfirmDialog({
  isOpen, onClose, onConfirm,
  title, message,
  confirmText = "Confirm", cancelText = "Cancel",
  variant = "danger",
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-fade-in"
      style={{ background: "rgba(2,6,23,0.45)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-modal max-w-sm w-full p-6 animate-fade-up"
        style={{ border: "1px solid rgba(0,0,0,0.06)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            variant === "danger" ? "bg-red-50" : "bg-amber-50"
          }`}>
            <AlertTriangle size={22} className={variant === "danger" ? "text-red-500" : "text-amber-500"} />
          </div>

          <div>
            <h3 className="font-bold text-[15px] text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">{message}</p>
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all active:scale-[0.98]"
            >
              {cancelText}
            </button>
            <button
              onClick={() => { onConfirm(); onClose(); }}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all active:scale-[0.98] ${
                variant === "danger" ? "bg-red-500 hover:bg-red-600" : "bg-amber-500 hover:bg-amber-600"
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
