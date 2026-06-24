import {
  ClipboardList, CheckCircle, Truck, Navigation,
  PackageCheck, Route, CheckCheck, Star,
} from "lucide-react";

const iconMap = {
  "clipboard-list":  ClipboardList,
  "check-circle":    CheckCircle,
  truck:             Truck,
  navigation:        Navigation,
  "package-check":   PackageCheck,
  route:             Route,
  "check-check":     CheckCheck,
  star:              Star,
};

export default function StatusTimeline({ steps, currentStatus, completedTimes = {} }) {
  const currentIndex = steps.findIndex((s) => s.key === currentStatus);

  return (
    <div className="relative">
      {/* Vertical connector line */}
      <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-slate-200" />

      <div className="space-y-0">
        {steps.map((step, index) => {
          const Icon = iconMap[step.icon] || CheckCircle;
          const isCompleted = index < currentIndex;
          const isCurrent   = index === currentIndex;
          const isPending   = index > currentIndex;
          const time = completedTimes[step.key];

          return (
            <div key={step.key} className="flex items-start gap-3 relative py-2.5">
              {/* Icon dot — no z-10 so sticky bar always covers it */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 relative ${
                isCurrent   ? "bg-primary text-white shadow-md shadow-primary/30" :
                isCompleted ? "bg-emerald-500 text-white" :
                              "bg-slate-100 text-slate-400"
              }`}>
                {isCompleted
                  ? <CheckCheck className="w-4 h-4" />
                  : <Icon className="w-4 h-4" />
                }
              </div>

              {/* Text */}
              <div className="flex-1 pt-2">
                <p className={`text-sm font-semibold ${
                  isCurrent   ? "text-primary" :
                  isCompleted ? "text-slate-800" :
                                "text-slate-400"
                }`}>
                  {step.label}
                </p>
                {time && (
                  <p className={`text-xs mt-0.5 ${isCurrent ? "text-primary/70" : "text-slate-400"}`}>
                    {time}
                  </p>
                )}
              </div>

              {/* Right tick for completed */}
              {isCompleted && (
                <div className="flex items-center pt-2.5">
                  <CheckCheck className="w-4 h-4 text-emerald-500" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
