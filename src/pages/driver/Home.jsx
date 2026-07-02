import { useNavigate } from "react-router-dom";
import { MapPin, Navigation, Package, Truck, Clock, IndianRupee, TrendingUp, ShieldAlert, ArrowRight } from "lucide-react";
import Badge from "../../components/driver/Badge";
import { useAuth } from "../../hooks/useAuth";
import { driverData, vehicleData, activeTrip, upcomingAssignment, todaySummary } from "../../data/driverMockData";

const KYC_BANNER = {
  pending: { text: "Complete your KYC to start accepting trips.", cta: "Complete KYC" },
  submitted: { text: "Your KYC documents are under review. We'll notify you once verified.", cta: "View Status" },
  rejected: { text: "Your KYC submission was rejected. Please review and resubmit.", cta: "Resubmit KYC" },
};

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const kycBanner = KYC_BANNER[user?.kyc_status || "pending"];

  return (
    <div className="space-y-6">
      {kycBanner && (
        <button
          onClick={() => navigate("/driver/kyc")}
          className="w-full flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-left hover:bg-amber-100 transition-colors"
        >
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="flex-1 text-sm font-medium text-amber-800">{kycBanner.text}</p>
          <span className="flex items-center gap-1 text-xs font-bold text-amber-700 whitespace-nowrap">
            {kycBanner.cta} <ArrowRight size={13} />
          </span>
        </button>
      )}

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Trips Today",      value: todaySummary.tripsToday,                              icon: Navigation,   color: "text-primary",    bg: "bg-primary/10" },
          { label: "KMs Driven",       value: todaySummary.kmsDriven,                               icon: Truck,        color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Today's Earnings", value: `Rs ${todaySummary.todayEarnings.toLocaleString()}`,  icon: IndianRupee,  color: "text-amber-600",   bg: "bg-amber-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 shadow-card p-4 flex flex-col gap-3">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">{label}</p>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 text-[15px]">Active Trip</h3>
          <Badge status={activeTrip.status} />
        </div>
        <div className="flex items-start gap-3 mb-4">
          <div className="mt-1 flex flex-col items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <div className="w-0.5 h-8 bg-slate-200" />
            <div className="w-3 h-3 rounded-full bg-red-500" />
          </div>
          <div className="space-y-3 flex-1">
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Pickup</p>
              <p className="text-sm font-semibold text-slate-800">{activeTrip.pickup.location}</p>
              <p className="text-xs text-slate-500">{activeTrip.pickup.time}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Drop</p>
              <p className="text-sm font-semibold text-slate-800">{activeTrip.drop.location}</p>
              <p className="text-xs text-slate-500">{activeTrip.drop.time}</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
          {[
            { label: "Distance", value: `${activeTrip.distance} km`, icon: MapPin },
            { label: "Est. Time", value: activeTrip.estimatedTime, icon: Clock },
            { label: "Earnings", value: `Rs ${activeTrip.earnings.toLocaleString()}`, icon: TrendingUp },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="text-center">
              <Icon className="w-4 h-4 text-slate-400 mx-auto mb-1" />
              <p className="text-[11px] text-slate-400">{label}</p>
              <p className="text-sm font-bold text-slate-800">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 text-[15px]">Upcoming Assignment</h3>
          <Badge status={upcomingAssignment.status} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <p className="text-sm font-semibold text-slate-700">{upcomingAssignment.pickupTime}</p>
          </div>
          <p className="text-[15px] font-bold text-slate-900">{upcomingAssignment.route}</p>
          <p className="text-xs text-slate-500">{upcomingAssignment.cargo} · {upcomingAssignment.weight}</p>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500">Broker: {upcomingAssignment.broker}</p>
          <p className="text-[15px] font-bold text-primary">Rs {upcomingAssignment.earnings.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
        <h3 className="font-bold text-slate-900 text-[15px] mb-4">My Vehicle</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Registration", value: vehicleData.registration },
            { label: "Type",         value: vehicleData.type },
            { label: "Capacity",     value: vehicleData.capacity },
            { label: "Broker",       value: vehicleData.broker },
            { label: "Insurance",    value: vehicleData.insuranceValidTill },
            { label: "Permit",       value: vehicleData.permitType },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-50 rounded-lg p-3">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{label}</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
