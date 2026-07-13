import { createPortal } from "react-dom";
import { ShieldAlert, PhoneCall, Siren, MessageSquareWarning, X } from "lucide-react";

export default function EmergencySheet({ isOpen, onClose, brokerPhone, onReportIncident }) {
  if (!isOpen) return null;

  const actions = [
    { label: "Call Police", sub: "Emergency: 112", href: "tel:112", icon: Siren, color: "text-red-600", bg: "bg-red-50" },
    { label: "Call Ambulance", sub: "Emergency: 108", href: "tel:108", icon: PhoneCall, color: "text-red-600", bg: "bg-red-50" },
    ...(brokerPhone ? [{ label: "Call Broker", sub: brokerPhone, href: `tel:${brokerPhone}`, icon: PhoneCall, color: "text-primary", bg: "bg-primary/10" }] : []),
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(2,6,23,0.55)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-modal max-w-sm w-full p-6 animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <ShieldAlert size={18} className="text-red-500" />
            </div>
            <h3 className="font-bold text-slate-900 text-[15px]">Emergency Assistance</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2.5">
          {actions.map((action) => (
            <a
              key={action.label}
              href={action.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl ${action.bg} hover:opacity-80 transition-opacity`}
            >
              <action.icon size={18} className={action.color} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">{action.label}</p>
                <p className="text-xs text-slate-500">{action.sub}</p>
              </div>
            </a>
          ))}

          <button
            onClick={() => { onReportIncident?.(); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 hover:opacity-80 transition-opacity"
          >
            <MessageSquareWarning size={18} className="text-amber-600" />
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-slate-900">Report Incident to Support</p>
              <p className="text-xs text-slate-500">Notify our support team immediately</p>
            </div>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
