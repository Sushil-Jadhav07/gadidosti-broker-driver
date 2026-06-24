import { Navigation, CheckCheck, Camera, Truck } from "lucide-react";

const BUTTON_CONFIG = {
  "Assigned": {
    label: "Start Trip to Pickup",
    icon: Navigation,
    bg: "bg-primary",
    nextStatus: "En Route Pickup",
  },
  "En Route Pickup": {
    label: "I've Reached Pickup",
    icon: Truck,
    bg: "bg-warning",
    nextStatus: "Picked Up",
  },
  "Picked Up": {
    label: "Start Delivery",
    icon: Truck,
    bg: "bg-primary",
    nextStatus: "In Transit",
  },
  "In Transit": {
    label: "Mark as Delivered",
    icon: CheckCheck,
    bg: "bg-success",
    nextStatus: "Delivered",
  },
  "Delivered": {
    label: "Upload Proof of Delivery",
    icon: Camera,
    bg: "bg-secondary",
    nextStatus: "Completed",
  },
  "Completed": {
    label: "Trip Completed",
    icon: CheckCheck,
    bg: "bg-emerald-400",
    nextStatus: null,
  },
};

export default function TripStatusButton({ status, onStatusChange, onUploadPOD, disabled = false }) {
  const config = BUTTON_CONFIG[status];
  if (!config) return null;

  const Icon = config.icon;
  const isCompleted = status === "Completed";

  const handleClick = () => {
    if (isCompleted) return;
    if (status === "Delivered") { onUploadPOD?.(); return; }
    if (config.nextStatus) onStatusChange(config.nextStatus);
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isCompleted}
      className={`w-full py-4 px-6 rounded-xl font-semibold text-[15px] text-white flex items-center justify-center gap-3 transition-all ${config.bg} ${
        disabled || isCompleted
          ? "opacity-50 cursor-not-allowed"
          : "hover:opacity-90 active:scale-[0.98] shadow-md"
      }`}
    >
      <Icon className="w-5 h-5" />
      {config.label}
    </button>
  );
}
