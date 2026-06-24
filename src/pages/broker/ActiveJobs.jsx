import { MapPin, Truck, User } from "lucide-react";
import Badge from "../../components/broker/Badge";
import { activeJobs, getDriverById, getTruckById } from "../../data/brokerMockData";

const STATUS_VARIANT = { "In Transit": "primary", Loading: "warning", "Pending Assignment": "default", Completed: "success" };

export default function ActiveJobs() {
  return (
    <div className="space-y-4">
      {activeJobs.map((job) => {
        const driver = job.driverId ? getDriverById(job.driverId) : null;
        const truck = job.truckId ? getTruckById(job.truckId) : null;
        return (
          <div key={job.id} className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-slate-400">{job.bookingId}</span>
                  <Badge variant={STATUS_VARIANT[job.status] || "default"}>{job.status}</Badge>
                </div>
                <h3 className="font-bold text-slate-900 text-[15px]">{job.clientName}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{job.distance} km route</p>
              </div>
              <p className="text-xl font-bold text-slate-900 font-mono flex-shrink-0">Rs {job.amount.toLocaleString("en-IN")}</p>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-start gap-2">
                <MapPin size={13} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                <div><p className="text-[11px] text-slate-400 font-semibold">PICKUP</p><p className="text-sm text-slate-700">{job.pickup}</p></div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin size={13} className="text-red-500 mt-0.5 flex-shrink-0" />
                <div><p className="text-[11px] text-slate-400 font-semibold">DROP</p><p className="text-sm text-slate-700">{job.drop}</p></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2">
                <Truck size={15} className="text-primary flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Truck</p>
                  <p className="text-sm font-semibold text-slate-800">{truck ? truck.registration : "Not Assigned"}</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2">
                <User size={15} className="text-primary flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Driver</p>
                  <p className="text-sm font-semibold text-slate-800">{driver ? driver.name : "Not Assigned"}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="text-[11px] text-slate-400 font-semibold mb-3">TRIP PROGRESS</p>
              <div className="flex items-center gap-2">
                {job.timeline.map((step, i) => (
                  <div key={i} className="flex items-center gap-2 flex-1">
                    <div className={`flex-1 text-center`}>
                      <div className={`w-6 h-6 rounded-full mx-auto mb-1 flex items-center justify-center text-[10px] font-bold ${
                        step.done ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"
                      }`}>
                        {i + 1}
                      </div>
                      <p className={`text-[10px] font-semibold ${step.done ? "text-emerald-600" : "text-slate-400"}`}>{step.step}</p>
                      {step.time && <p className="text-[10px] text-slate-400 mt-0.5">{step.time}</p>}
                    </div>
                    {i < job.timeline.length - 1 && (
                      <div className={`h-0.5 flex-1 ${step.done ? "bg-emerald-500" : "bg-slate-200"}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
