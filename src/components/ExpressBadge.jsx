import { Zap } from "lucide-react";

// Shared across driver + broker screens wherever a booking/trip's route/status is already
// shown — a driver should be able to glance at this and immediately register "this one needs
// to move faster". Deliberately orange, not amber: amber's already spoken for as this app's
// "needs attention / actionable" color (see e.g. Assigned/Pending status pills), and Express
// isn't a status, it's a standing attribute of the booking, so it shouldn't read like one.
const SIZES = {
  sm: "text-[11px] px-2 py-0.5",
  md: "text-xs px-2.5 py-1",
};

export default function ExpressBadge({ size = "sm", className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold bg-orange-50 text-orange-700 border border-orange-200 ${SIZES[size] || SIZES.sm} ${className}`}
    >
      <Zap size={size === "md" ? 12 : 11} className="flex-shrink-0 fill-orange-500 text-orange-500" /> Express
    </span>
  );
}
