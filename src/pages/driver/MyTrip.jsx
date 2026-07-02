import { useState } from "react";
import { MapPin, Package, Phone, Clock, IndianRupee, Navigation } from "lucide-react";
import Badge from "../../components/driver/Badge";
import StatusTimeline from "../../components/driver/StatusTimeline";
import TripStatusButton from "../../components/driver/TripStatusButton";
import KycGate from "../../components/kyc/KycGate";
import { useAuth } from "../../hooks/useAuth";
import { activeTrip, statusSteps } from "../../data/driverMockData";

export default function MyTrip() {
  const { user } = useAuth();
  const [status, setStatus] = useState(activeTrip.status);

  if (user?.kyc_status !== "verified") {
    return (
      <div className="pt-6">
        <KycGate status={user?.kyc_status || "pending"} kycPath="/driver/kyc" />
      </div>
    );
  }

  const completedTimes = {
    Requested:         "Dec 12, 8:00 AM",
    Accepted:          "Dec 12, 8:10 AM",
    Assigned:          "Dec 12, 8:15 AM",
    "En Route Pickup": "Dec 12, 8:20 AM",
    "Picked Up":       "Dec 12, 8:30 AM",
    "In Transit":      "Current",
  };

  return (
    <div className="space-y-5">
      {/* Trip Header */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">{activeTrip.bookingId}</p>
            <h2 className="text-[16px] font-bold text-slate-900 mt-0.5">
              {activeTrip.pickup.location} → {activeTrip.drop.location}
            </h2>
          </div>
          <Badge status={status} />
        </div>
        <div className="grid grid-cols-3 gap-3 py-4 border-t border-b border-slate-100">
          {[
            { label: "Distance",  value: `${activeTrip.distance} km`,              icon: Navigation },
            { label: "Est. Time", value: activeTrip.estimatedTime,                 icon: Clock },
            { label: "Earnings",  value: `Rs ${activeTrip.earnings.toLocaleString()}`, icon: IndianRupee },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="text-center">
              <Icon className="w-4 h-4 text-slate-400 mx-auto mb-1" />
              <p className="text-[10px] text-slate-400">{label}</p>
              <p className="text-sm font-bold text-slate-800">{value}</p>
            </div>
          ))}
        </div>
        <div className="space-y-3 mt-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Pickup</p>
              <p className="text-sm font-semibold text-slate-800">{activeTrip.pickup.location}</p>
              <p className="text-xs text-slate-500">{activeTrip.pickup.address}</p>
              <p className="text-xs text-slate-500">{activeTrip.pickup.time}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Drop</p>
              <p className="text-sm font-semibold text-slate-800">{activeTrip.drop.location}</p>
              <p className="text-xs text-slate-500">{activeTrip.drop.address}</p>
              <p className="text-xs text-slate-500">{activeTrip.drop.time}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cargo Details */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
        <h3 className="font-bold text-slate-900 text-[15px] mb-4">Cargo Details</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Material",       value: activeTrip.cargo.material },
            { label: "Weight",         value: activeTrip.cargo.weight },
            { label: "Quantity",       value: activeTrip.cargo.quantity },
            { label: "Declared Value", value: activeTrip.cargo.value },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-50 rounded-lg p-3">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{label}</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-amber-600" />
            <p className="text-xs font-bold text-amber-800">Special Instructions</p>
          </div>
          <p className="text-xs text-amber-700">{activeTrip.cargo.specialInstructions}</p>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
        <h3 className="font-bold text-slate-900 text-[15px] mb-4">Contact</h3>
        <div className="space-y-3">
          {[
            { label: "Broker",         name: activeTrip.broker,              phone: activeTrip.brokerPhone },
            { label: "Pickup Contact", name: activeTrip.pickup.contactPerson, phone: activeTrip.pickup.contactPhone },
            { label: "Drop Contact",   name: activeTrip.drop.contactPerson,  phone: activeTrip.drop.contactPhone },
          ].map(({ label, name, phone }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{label}</p>
                <p className="text-sm font-semibold text-slate-800">{name}</p>
              </div>
              <a href={`tel:${phone}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-semibold">
                <Phone className="w-3.5 h-3.5" />{phone}
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Status Timeline */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
        <h3 className="font-bold text-slate-900 text-[15px] mb-4">Trip Status</h3>
        <StatusTimeline steps={statusSteps} currentStatus={status} completedTimes={completedTimes} />
      </div>

      {/* Spacer so content isn't hidden under sticky button */}
      <div className="h-20 lg:h-0" />

      {/* Action Button — z-20 ensures it always covers timeline dots */}
      <div className="sticky bottom-[68px] lg:bottom-0 z-20 bg-white border-t border-slate-100 p-4 -mx-4 sm:-mx-6">
        <TripStatusButton status={status} onStatusChange={setStatus} />
      </div>
    </div>
  );
}
