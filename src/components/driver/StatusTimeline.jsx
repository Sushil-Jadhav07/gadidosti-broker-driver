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
    <div className="w-full overflow-x-auto">
      <div className="flex min-w-[560px] sm:min-w-0">
        {steps.map((step, index) => {
          const Icon = iconMap[step.icon] || CheckCircle;
          const isCompleted = index < currentIndex;
          const isCurrent   = index === currentIndex;
          const time = completedTimes[step.key];
          const isLast = index === steps.length - 1;

          return (
            <div key={step.key} className="relative flex flex-col items-center text-center flex-1">
              {/* Connector spans from this circle's center to the next one's — anchored to
                  the circle's fixed vertical center (top-5 = half of the 40px circle) so it
                  stays put regardless of how tall the label/time text underneath is. */}
              {!isLast && (
                <div className={`absolute top-5 left-1/2 w-full h-0.5 ${isCompleted ? "bg-emerald-500" : "bg-slate-200"}`} />
              )}
              <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                isCurrent   ? "bg-primary text-white shadow-md shadow-primary/30" :
                isCompleted ? "bg-emerald-500 text-white" :
                              "bg-slate-100 text-slate-400"
              }`}>
                {isCompleted
                  ? <CheckCheck className="w-4 h-4" />
                  : <Icon className="w-4 h-4" />
                }
              </div>
              <p className={`text-[11px] font-semibold mt-2 leading-tight ${
                isCurrent   ? "text-primary" :
                isCompleted ? "text-slate-800" :
                              "text-slate-400"
              }`}>
                {step.label}
              </p>
              {time && (
                <p className={`text-[10px] mt-0.5 ${isCurrent ? "text-primary/70" : "text-slate-400"}`}>
                  {time}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
