import { useRef, useState } from "react";
import { ChevronsRight, Check } from "lucide-react";

const HANDLE_SIZE = 52;
const CONFIRM_THRESHOLD = 0.75;

// Full Tailwind class names, not string-interpolated — Tailwind's build-time scanner only
// picks up classes that appear literally in the source, so `bg-${color}/10` would silently
// produce no CSS at all.
const COLOR_STYLES = {
  primary:   { track: "bg-primary/10",   fill: "bg-primary/20",   handle: "bg-primary",   text: "text-primary" },
  warning:   { track: "bg-warning/10",   fill: "bg-warning/20",   handle: "bg-warning",   text: "text-warning" },
  success:   { track: "bg-success/10",   fill: "bg-success/20",   handle: "bg-success",   text: "text-success" },
  secondary: { track: "bg-secondary/10", fill: "bg-secondary/20", handle: "bg-secondary", text: "text-secondary" },
};

// Slide-to-confirm control — originally just the "Arrived" step of the delivery-completion
// flow, now reused for every trip status advance (see TripStatusButton) so a deliberate drag
// is required everywhere instead of a single accidental tap. `color` picks the track/handle
// theme per status; `icon` overrides the default chevron (e.g. to match the action, Navigation
// for "start trip" vs CheckCheck for "mark delivered").
export default function SwipeToConfirm({ label, confirmedLabel = "Confirmed!", onConfirm, loading = false, disabled = false, color = "primary", icon: HandleIcon }) {
  const styles = COLOR_STYLES[color] || COLOR_STYLES.primary;
  const trackRef = useRef(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const startXRef = useRef(0);
  // pointermove/pointerup can fire before React re-renders after the pointerdown that set
  // `dragging`/`dragX` — a fast drag (or, as it turns out, any synthetic/automated one) can
  // deliver several pointer events in the same tick, so handlers closing over stale state
  // would see dragging=false and bail out. Refs mirror the state for the parts that must be
  // read synchronously inside these handlers; the state itself still drives the render.
  const draggingRef = useRef(false);
  const dragXRef = useRef(0);

  const isLocked = disabled || loading || confirmed;

  const handlePointerDown = (e) => {
    if (isLocked) return;
    draggingRef.current = true;
    setDragging(true);
    startXRef.current = e.clientX - dragXRef.current;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!draggingRef.current || !trackRef.current) return;
    const maxX = trackRef.current.offsetWidth - HANDLE_SIZE;
    const next = Math.max(0, Math.min(maxX, e.clientX - startXRef.current));
    dragXRef.current = next;
    setDragX(next);
  };

  const handlePointerUp = () => {
    if (!draggingRef.current || !trackRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    const maxX = trackRef.current.offsetWidth - HANDLE_SIZE;
    if (dragXRef.current > maxX * CONFIRM_THRESHOLD) {
      dragXRef.current = maxX;
      setDragX(maxX);
      setConfirmed(true);
      onConfirm?.();
    } else {
      dragXRef.current = 0;
      setDragX(0);
    }
  };

  return (
    <div
      ref={trackRef}
      className={`relative w-full h-14 ${styles.track} rounded-full overflow-hidden select-none ${isLocked && !loading ? "opacity-60" : ""}`}
    >
      <div
        className={`absolute inset-y-0 left-0 ${styles.fill}`}
        style={{ width: `${dragX + HANDLE_SIZE / 2}px` }}
      />
      <p className={`absolute inset-0 flex items-center justify-center text-sm font-semibold ${styles.text} pointer-events-none px-16 truncate`}>
        {confirmed || loading ? confirmedLabel : label}
      </p>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`absolute top-1 left-1 rounded-full ${styles.handle} shadow-md flex items-center justify-center text-white ${dragging ? "" : "transition-transform duration-300"}`}
        style={{ width: HANDLE_SIZE, height: HANDLE_SIZE, transform: `translateX(${dragX}px)`, cursor: isLocked ? "default" : "grab" }}
      >
        {loading ? (
          <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        ) : confirmed ? (
          <Check className="w-5 h-5" />
        ) : HandleIcon ? (
          <HandleIcon className="w-5 h-5" />
        ) : (
          <ChevronsRight className="w-5 h-5" />
        )}
      </div>
    </div>
  );
}
