import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, X } from "lucide-react";

export default function Toast({ message, type = "success", onClose, duration = 3000 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icon = type === "success" ? (
    <CheckCircle className="w-5 h-5 text-tertiary" />
  ) : (
    <AlertCircle className="w-5 h-5 text-warning" />
  );

  const bgColor = type === "success" ? "bg-white border-l-4 border-tertiary" : "bg-white border-l-4 border-warning";

  return (
    <div
      className={`fixed top-4 left-4 right-4 z-[100] flex justify-center transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      }`}
    >
      <div className={`${bgColor} shadow-lg rounded-lg px-4 py-3 flex items-center gap-3 max-w-sm w-full mx-4`}>
        {icon}
        <p className="text-sm font-medium text-secondary font-inter flex-1">{message}</p>
        <button onClick={() => { setVisible(false); setTimeout(onClose, 300); }} className="p-1">
          <X className="w-4 h-4 text-neutral-400" />
        </button>
      </div>
    </div>
  );
}
