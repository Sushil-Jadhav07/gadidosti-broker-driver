import { useState } from "react";
import { Navigation, CheckCheck, Camera, Truck } from "lucide-react";
import SwipeToConfirm from "./SwipeToConfirm";

const BUTTON_CONFIG = {
  confirmed: { label: "Swipe to start trip to pickup", confirmedLabel: "Starting trip...", icon: Navigation, color: "primary", nextStatus: "en_route_pickup" },
  en_route_pickup: { label: "Swipe — I've reached pickup", confirmedLabel: "Confirming arrival...", icon: Truck, color: "warning", nextStatus: "picked_up" },
  picked_up: { label: "Swipe to start delivery", confirmedLabel: "Starting delivery...", icon: Truck, color: "primary", nextStatus: "in_transit" },
  in_transit: { label: "Swipe to mark as delivered", confirmedLabel: "Marking delivered...", icon: CheckCheck, color: "success", nextStatus: "delivered" },
  delivered: { label: "Swipe to upload proof of delivery", confirmedLabel: "Opening upload...", icon: Camera, color: "secondary", nextStatus: "completed" },
};

// Every status advance is a swipe, not a tap — a deliberate drag is harder to trigger by
// accident than a single tap, which matters more here than anywhere else in the app since
// each of these PATCHes a live shipment's status. `key` on the underlying SwipeToConfirm
// forces a fresh mount (drag position + confirmed state reset) after every attempt, whether
// it succeeded (status prop changed) or failed (same status, but the attempt counter did) —
// otherwise a failed swipe would be stuck showing "confirmed" with no way to retry.
export default function TripStatusButton({ status, onStatusChange, onUploadPOD, disabled = false }) {
  const [attempt, setAttempt] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  if (status === "completed") {
    return (
      <div className="w-full h-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center gap-2 text-emerald-700 font-semibold text-sm">
        <CheckCheck className="w-5 h-5" /> Trip Completed
      </div>
    );
  }

  const config = BUTTON_CONFIG[status];
  if (!config) return null;

  const handleConfirm = async () => {
    // Uploading POD isn't itself a status PATCH — it opens the upload flow instead, so there's
    // nothing to await/disable-during here.
    if (status === "delivered" && onUploadPOD) {
      onUploadPOD();
      setAttempt((a) => a + 1);
      return;
    }
    setSubmitting(true);
    try {
      await onStatusChange(config.nextStatus);
    } finally {
      setSubmitting(false);
      setAttempt((a) => a + 1);
    }
  };

  return (
    <SwipeToConfirm
      key={`${status}-${attempt}`}
      label={config.label}
      confirmedLabel={config.confirmedLabel}
      onConfirm={handleConfirm}
      loading={submitting}
      disabled={disabled}
      color={config.color}
      icon={config.icon}
    />
  );
}
