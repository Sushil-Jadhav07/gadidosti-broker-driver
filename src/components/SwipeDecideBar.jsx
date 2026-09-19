import { useRef, useState } from "react";
import { XCircle, IndianRupee } from "lucide-react";

const HANDLE_SIZE = 44;
// Fraction of the max drag distance (from center to either edge) that counts as "committed" —
// same idea as SwipeToConfirm's CONFIRM_THRESHOLD, just measured from the middle instead of
// from one end since this drags both ways.
const COMMIT_THRESHOLD = 0.65;

// Bidirectional swipe — starts centered, drag left far enough to decline, drag right far enough
// to open the counter-offer panel. Replaces the separate Counter/Decline buttons wherever a
// driver_request is still negotiable (Accept stays its own tap button above this — too
// consequential to bury in a gesture). Not used at all for broker-assigned or counter-exhausted
// requests, which fall back to plain Accept/Decline buttons since there's nothing to negotiate.
export default function SwipeDecideBar({ onDecline, onNegotiate, disabled = false }) {
  const trackRef = useRef(null);
  const [dragX, setDragX] = useState(0); // 0 = centered; negative = toward decline, positive = toward negotiate
  const [dragging, setDragging] = useState(false);
  const [settled, setSettled] = useState(null); // 'decline' | 'negotiate' | null — brief landing state before the callback fires
  const startXRef = useRef(0);
  // Same reasoning as SwipeToConfirm: pointermove/pointerup can arrive before React commits the
  // pointerdown state update, so the parts read synchronously inside handlers are mirrored in
  // refs rather than trusted from closed-over state.
  const draggingRef = useRef(false);
  const dragXRef = useRef(0);

  const isLocked = disabled || !!settled;

  const maxOffset = () => {
    const half = (trackRef.current?.offsetWidth || 0) / 2;
    return Math.max(0, half - HANDLE_SIZE / 2);
  };

  const handlePointerDown = (e) => {
    if (isLocked) return;
    draggingRef.current = true;
    setDragging(true);
    startXRef.current = e.clientX - dragXRef.current;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!draggingRef.current || !trackRef.current) return;
    const max = maxOffset();
    const next = Math.max(-max, Math.min(max, e.clientX - startXRef.current));
    dragXRef.current = next;
    setDragX(next);
  };

  const finish = () => {
    draggingRef.current = false;
    setDragging(false);
    const max = maxOffset();
    const commitAt = max * COMMIT_THRESHOLD;
    if (dragXRef.current <= -commitAt) {
      dragXRef.current = -max;
      setDragX(-max);
      setSettled("decline");
      onDecline?.();
    } else if (dragXRef.current >= commitAt) {
      dragXRef.current = max;
      setDragX(max);
      setSettled("negotiate");
      onNegotiate?.();
    } else {
      dragXRef.current = 0;
      setDragX(0);
    }
  };

  const handlePointerUp = () => {
    if (!draggingRef.current || !trackRef.current) return;
    finish();
  };

  return (
    <div
      ref={trackRef}
      className={`relative w-full h-12 rounded-xl overflow-hidden select-none bg-gradient-to-r from-red-50 via-slate-50 to-primary/10 ${isLocked ? "opacity-70" : ""}`}
      style={{ touchAction: "none" }}
    >
      <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
        <span className="flex items-center gap-1 text-[11px] font-bold text-red-500">
          <XCircle size={13} /> Decline
        </span>
        <span className="flex items-center gap-1 text-[11px] font-bold text-primary">
          Negotiate <IndianRupee size={13} />
        </span>
      </div>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`absolute top-1 left-1/2 rounded-lg bg-white shadow-md border-2 flex items-center justify-center ${
          settled === "decline" ? "border-red-400 text-red-500" : settled === "negotiate" ? "border-primary text-primary" : "border-slate-200 text-slate-400"
        } ${dragging ? "" : "transition-transform duration-300"}`}
        style={{
          width: HANDLE_SIZE,
          height: HANDLE_SIZE - 8,
          transform: `translateX(calc(-50% + ${dragX}px))`,
          cursor: isLocked ? "default" : "grab",
        }}
      >
        {settled === "decline" ? <XCircle size={16} /> : settled === "negotiate" ? <IndianRupee size={16} /> : <span className="text-[10px] font-bold">↔</span>}
      </div>
    </div>
  );
}
