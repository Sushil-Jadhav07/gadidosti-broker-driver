import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Truck } from "lucide-react";

const STATUS_LABEL = {
  available: { text: "Available", className: "bg-emerald-50 text-emerald-600" },
  on_trip: { text: "On Trip", className: "bg-amber-50 text-amber-600" },
  maintenance: { text: "Maintenance", className: "bg-slate-100 text-slate-500" },
};

// Custom div-based dropdown (no native <select>) — lists every truck, showing its
// status, but only lets you pick ones that are actually available.
//
// The option panel is portaled to document.body and positioned via getBoundingClientRect
// rather than living inside the trigger's own DOM subtree. Otherwise, when this sits inside
// a scrollable modal body, the panel's height gets counted toward that container's scroll
// area and produces a stray scrollbar on the modal itself.
export default function TruckDropdown({ trucks = [], value, onChange, placeholder = "Select a truck" }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const wrapRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const updatePos = () => {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (rect) setPos({ top: rect.bottom + 6, left: rect.left, width: rect.width });
    };
    updatePos();
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open]);

  const selected = trucks.find((t) => t.id === value);

  return (
    <div className="relative w-full" ref={wrapRef}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpen((v) => !v); }}
        className={`w-full flex items-center justify-between gap-2 bg-white border rounded-lg px-3 py-2 text-sm cursor-pointer outline-none transition-all ${
          open ? "border-primary ring-2 ring-primary/15" : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <span className={selected ? "text-slate-800 font-medium" : "text-slate-400"}>
          {selected ? `${selected.registration} - ${selected.type || selected.make || ""}` : placeholder}
        </span>
        <ChevronDown size={14} className={`text-slate-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </div>

      {open && pos && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[10000] bg-white border border-slate-100 rounded-lg shadow-modal py-1 max-h-56 overflow-y-auto"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
          {!trucks.length && (
            <div className="px-3 py-3 text-xs text-slate-400 flex items-center gap-2">
              <Truck size={14} className="opacity-40" /> No trucks found
            </div>
          )}
          {trucks.map((truck) => {
            const isAvailable = truck.status === "available";
            const status = STATUS_LABEL[truck.status] || { text: truck.status, className: "bg-slate-100 text-slate-500" };
            return (
              <div
                key={truck.id}
                role="option"
                aria-selected={value === truck.id}
                aria-disabled={!isAvailable}
                onClick={() => { if (isAvailable) { onChange(truck.id); setOpen(false); } }}
                className={`flex items-center justify-between gap-2 px-3 py-2 text-sm transition-colors ${
                  !isAvailable
                    ? "opacity-50 cursor-not-allowed"
                    : value === truck.id
                    ? "bg-primary-50 text-primary font-medium cursor-pointer"
                    : "text-slate-700 hover:bg-slate-50 cursor-pointer"
                }`}
              >
                <span className="truncate">{truck.registration} - {truck.type || truck.make || ""}</span>
                <span className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${status.className}`}>{status.text}</span>
                  {value === truck.id && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" strokeWidth={3} />}
                </span>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
