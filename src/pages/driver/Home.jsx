import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Navigation, Truck, Clock, IndianRupee, TrendingUp, ShieldAlert, ArrowRight } from "lucide-react";
import Badge from "../../components/driver/Badge";
import RouteMapPanel from "../../components/driver/RouteMapPanel";
import { useAuth } from "../../hooks/useAuth";
import { api, getToken } from "../../services/api";
import { adaptTrip, formatCurrency } from "../../utils";

const KYC_BANNER = {
  pending: { text: "Complete your KYC to start accepting trips.", cta: "Complete KYC" },
  submitted: { text: "Your KYC documents are under review. We'll notify you once verified.", cta: "View Status" },
  rejected: { text: "Your KYC submission was rejected. Please review and resubmit.", cta: "Resubmit KYC" },
};

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTrip, setActiveTrip] = useState(null);
  const [upcomingTrip, setUpcomingTrip] = useState(null);
  const [history, setHistory] = useState([]);
  const [profile, setProfile] = useState(user || {});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const kycBanner = KYC_BANNER[user?.kyc_status || "pending"];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = getToken();
        const [profileRes, activeRes, upcomingRes, analyticsRes] = await Promise.all([
          api.get("/api/users/profile", token),
          api.get("/api/trips/active", token),
          api.get("/api/trips/upcoming", token),
          api.get("/api/analytics/broker", token),
        ]);
        setProfile(profileRes.data?.user || profileRes.data || user || {});
        setActiveTrip(activeRes.data?.trip ? adaptTrip(activeRes.data.trip) : null);
        setUpcomingTrip(upcomingRes.data?.trip ? adaptTrip(upcomingRes.data.trip) : null);
        setHistory((analyticsRes.data?.tripHistory || []).map(adaptTrip));
      } catch {
        setError("Failed to load dashboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const summary = useMemo(() => ({
    tripsToday: history.length,
    kmsDriven: history.reduce((sum, trip) => sum + Number(trip.distance || 0), 0),
    todayEarnings: history.reduce((sum, trip) => sum + Number(trip.earnings || 0), 0),
  }), [history]);

  if (loading) {
    return <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-slate-400">Loading dashboard...</div>;
  }
  if (error) {
    return <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {kycBanner && (
        <button onClick={() => navigate("/driver/kyc")} className="w-full flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-left hover:bg-amber-100 transition-colors">
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="flex-1 text-sm font-medium text-amber-800">{kycBanner.text}</p>
          <span className="flex items-center gap-1 text-xs font-bold text-amber-700 whitespace-nowrap">{kycBanner.cta} <ArrowRight size={13} /></span>
        </button>
      )}

      <div className="grid grid-cols-3 gap-4">
        {[{ label: "Trips", value: summary.tripsToday, icon: Navigation, color: "text-primary", bg: "bg-primary/10" }, { label: "KMs", value: summary.kmsDriven, icon: Truck, color: "text-emerald-600", bg: "bg-emerald-50" }, { label: "Earnings", value: formatCurrency(summary.todayEarnings), icon: IndianRupee, color: "text-amber-600", bg: "bg-amber-50" }].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-100 shadow-card p-4 flex flex-col gap-3">
            <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center`}><card.icon className={`w-5 h-5 ${card.color}`} /></div>
            <div><p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">{card.label}</p><p className="text-lg font-bold text-slate-900 mt-0.5">{card.value}</p></div>
          </div>
        ))}
      </div>

      {activeTrip && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-[15px]">Active Trip</h3>
            <Badge status={activeTrip.status} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_600px] gap-5">
            <div className="flex flex-col">
              <div className="space-y-3">
                <div><p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Pickup</p><p className="text-sm font-semibold text-slate-800">{activeTrip.pickup?.location}</p></div>
                <div><p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Drop</p><p className="text-sm font-semibold text-slate-800">{activeTrip.drop?.location}</p></div>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100 mt-4">
                {[{ label: "Distance", value: `${activeTrip.distance} km`, icon: MapPin }, { label: "Est. Time", value: activeTrip.estimatedTime, icon: Clock }, { label: "Earnings", value: formatCurrency(activeTrip.earnings), icon: TrendingUp }].map((item) => (
                  <div key={item.label} className="text-center"><item.icon className="w-4 h-4 text-slate-400 mx-auto mb-1" /><p className="text-[11px] text-slate-400">{item.label}</p><p className="text-sm font-bold text-slate-800">{item.value}</p></div>
                ))}
              </div>
            </div>
            <RouteMapPanel pickup={activeTrip.pickup} drop={activeTrip.drop} />
          </div>
        </div>
      )}

      {upcomingTrip && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
          <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-slate-900 text-[15px]">Upcoming Assignment</h3><Badge status="Upcoming" /></div>
          <p className="text-[15px] font-bold text-slate-900">{upcomingTrip.pickup?.location} {"->"} {upcomingTrip.drop?.location}</p>
          <p className="text-xs text-slate-500 mt-1">{upcomingTrip.cargo?.material} - {upcomingTrip.distance} km</p>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between"><p className="text-xs text-slate-500">Driver: {profile.name || user?.name}</p><p className="text-[15px] font-bold text-primary">{formatCurrency(upcomingTrip.earnings)}</p></div>
        </div>
      )}

      {!activeTrip && !upcomingTrip && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-10 text-center text-slate-400">
          No active or upcoming trips right now.
        </div>
      )}
    </div>
  );
}
