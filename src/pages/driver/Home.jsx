import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Navigation, Gauge, Wallet, Clock, TrendingUp, Truck, ShieldAlert, ArrowRight } from "lucide-react";
import Badge from "../../components/driver/Badge";
import RouteMapPanel from "../../components/driver/RouteMapPanel";
import { useAuth } from "../../hooks/useAuth";
import { api, getToken } from "../../services/api";
import { adaptTrip, formatCurrency, bookingRef, splitLocationName } from "../../utils";

const KYC_BANNER = {
  pending: { text: "Complete your KYC to start accepting trips.", cta: "Complete KYC" },
  submitted: { text: "Your KYC documents are under review. We'll notify you once verified.", cta: "View Status" },
  rejected: { text: "Your KYC submission was rejected. Please review and resubmit.", cta: "Resubmit KYC" },
};

// Solid-fill pills for the trip hero card — bolder than the outlined Badge used elsewhere,
// since this is the one status that's meant to read at a glance.
const TRIP_STATUS_STYLES = {
  Delivered: "bg-emerald-500",
  Completed: "bg-emerald-500",
  "In Transit": "bg-primary",
  "En Route Pickup": "bg-primary",
  "Picked Up": "bg-amber-500",
  Assigned: "bg-slate-500",
  Accepted: "bg-slate-500",
};

const titleCase = (value) => (value || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const formatTimeOnly = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Online/offline tracking lives in DriverAppLayout (see App.jsx) so it survives navigating
  // between driver pages — the toggle itself only shows here, on the dashboard, instead of
  // persisting in the top header on every page.
  const { online, toggleOnline, onlineToggleLocked } = useOutletContext();
  const firstName = (user?.name || "Driver").split(" ")[0];
  const [activeTrip, setActiveTrip] = useState(null);
  const [upcomingTrip, setUpcomingTrip] = useState(null);
  const [history, setHistory] = useState([]);
  const [profile, setProfile] = useState(user || {});
  const [assignedTruck, setAssignedTruck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const kycBanner = KYC_BANNER[user?.kyc_status || "pending"];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = getToken();
        const [truckRes, profileRes, activeRes, upcomingRes, analyticsRes] = await Promise.all([
          api.get("/api/vehicles/drivers/me/truck", token),
          api.get("/api/users/profile", token),
          api.get("/api/trips/active", token),
          api.get("/api/trips/upcoming", token),
          api.get("/api/analytics/broker", token),
        ]);
        setAssignedTruck(truckRes.data?.truck || null);
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
    trips: history.length,
    distance: history.reduce((sum, trip) => sum + Number(trip.distance || 0), 0),
    earnings: history.reduce((sum, trip) => sum + Number(trip.earnings || 0), 0),
  }), [history]);

  // Real month-over-month change, not a placeholder number — buckets each trip by whether it
  // fell in the current or previous calendar month (using its createdAt) and compares totals.
  // null (not 0%) when there's nothing to compare against, so the trend row just doesn't show
  // rather than claiming a misleading "+0%".
  const trend = useMemo(() => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const totals = { current: { trips: 0, distance: 0, earnings: 0 }, previous: { trips: 0, distance: 0, earnings: 0 } };

    history.forEach((trip) => {
      const created = trip.createdAt ? new Date(trip.createdAt) : null;
      if (!created || Number.isNaN(created.getTime())) return;
      const bucket = created >= thisMonthStart ? "current" : created >= lastMonthStart ? "previous" : null;
      if (!bucket) return;
      totals[bucket].trips += 1;
      totals[bucket].distance += Number(trip.distance || 0);
      totals[bucket].earnings += Number(trip.earnings || 0);
    });

    const pctChange = (curr, prev) => (prev > 0 ? Math.round(((curr - prev) / prev) * 100) : null);
    return {
      trips: pctChange(totals.current.trips, totals.previous.trips),
      distance: pctChange(totals.current.distance, totals.previous.distance),
      earnings: pctChange(totals.current.earnings, totals.previous.earnings),
    };
  }, [history]);

  if (loading) {
    return <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-slate-400">Loading dashboard...</div>;
  }
  if (error) {
    return <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-red-500">{error}</div>;
  }

  const pickup = splitLocationName(activeTrip?.pickup?.location);
  const drop = splitLocationName(activeTrip?.drop?.location);
  const pickupTime = formatTimeOnly(activeTrip?.pickup?.time);
  const dropTime = formatTimeOnly(activeTrip?.drop?.time);

  const statCards = [
    { label: "Total Trips", value: summary.trips, icon: Navigation, trend: trend.trips },
    { label: "Total Distance", value: `${summary.distance.toLocaleString("en-IN")} km`, icon: Gauge, trend: trend.distance },
    { label: "Total Earnings", value: formatCurrency(summary.earnings), icon: Wallet, trend: trend.earnings },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Welcome back, {firstName}</h1>
          <p className="text-sm text-slate-500 mt-1">Your dashboard overview for today.</p>
        </div>
        {onlineToggleLocked ? (
          // Not just disabled — the toggle disappears entirely during an active trip and is
          // replaced with a plain, non-interactive status pill, since tracking is already
          // forced on by the trip itself.
          <span
            title="You're online for the duration of your active trip"
            className="flex items-center gap-2 pl-3 pr-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 flex-shrink-0"
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0 bg-emerald-500 animate-pulse" />
            Driver Status: On Trip
          </span>
        ) : (
          <button
            onClick={toggleOnline}
            className={`flex items-center gap-2 pl-3 pr-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wide transition-colors flex-shrink-0 ${
              online ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${online ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
            Driver Status: {online ? "Active" : "Offline"}
          </button>
        )}
      </div>

      {kycBanner && (
        <button onClick={() => navigate("/driver/kyc")} className="w-full flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-left hover:bg-amber-100 transition-colors">
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="flex-1 text-sm font-medium text-amber-800">{kycBanner.text}</p>
          <span className="flex items-center gap-1 text-xs font-bold text-amber-700 whitespace-nowrap">{kycBanner.cta} <ArrowRight size={13} /></span>
        </button>
      )}

      {assignedTruck && activeTrip && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h3 className="font-bold text-slate-900 text-[15px]">Current Trip</h3>
              <p className="text-xs text-slate-400 mt-0.5">{bookingRef(activeTrip)} • {activeTrip.cargo?.material || "Freight"}</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-white flex-shrink-0 ${TRIP_STATUS_STYLES[activeTrip.status] || "bg-slate-500"}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
              {activeTrip.status?.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-5">
            <div className="flex flex-col justify-between gap-4">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-800 flex-shrink-0 mt-1" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Pickup</p>
                    <p className="text-sm font-bold text-slate-900 truncate">{pickup.name || "-"}</p>
                    {pickup.address && <p className="text-xs text-slate-500">{pickup.address}</p>}
                    {pickupTime && (
                      <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1"><Clock size={11} />{pickupTime}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-1" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Drop-off</p>
                    <p className="text-sm font-bold text-slate-900 truncate">{drop.name || "-"}</p>
                    {drop.address && <p className="text-xs text-slate-500">{drop.address}</p>}
                    {dropTime && (
                      <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1"><Clock size={11} />{dropTime}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Total Distance</span>
                <span className="text-sm font-bold text-primary">{activeTrip.distance} km</span>
              </div>
            </div>

            <RouteMapPanel pickup={activeTrip.pickup} drop={activeTrip.drop} currentLocation={activeTrip.currentLocation} />
          </div>
        </div>
      )}

      {assignedTruck && !activeTrip && !upcomingTrip && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-10 text-center text-slate-400">
          No active or upcoming trips right now.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-100 shadow-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">{card.label}</p>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <card.icon className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{card.value}</p>
            {card.trend != null && (
              <p className="text-xs text-emerald-600 font-semibold mt-1.5 flex items-center gap-1">
                <TrendingUp size={12} /> {card.trend > 0 ? "+" : ""}{card.trend}% this month
              </p>
            )}
          </div>
        ))}
      </div>

      {assignedTruck ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-[15px]">My Truck</h3>
            <Badge>{titleCase(assignedTruck.status) || "Unknown"}</Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              ["Registration", assignedTruck.registration],
              ["Type", titleCase(assignedTruck.category || assignedTruck.type)],
              ["Capacity", assignedTruck.capacity],
              ["Make", assignedTruck.make ? `${assignedTruck.make}${assignedTruck.year ? ` (${assignedTruck.year})` : ""}` : null],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">{label}</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{value || "-"}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-10 text-center text-slate-400">
          <Truck size={28} className="mx-auto mb-2 opacity-30" />
          No truck assigned yet — contact your broker.
        </div>
      )}

      {assignedTruck && upcomingTrip && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
          <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-slate-900 text-[15px]">Upcoming Assignment</h3><Badge status="Upcoming" /></div>
          <p className="text-[15px] font-bold text-slate-900">{upcomingTrip.pickup?.location} {"->"} {upcomingTrip.drop?.location}</p>
          <p className="text-xs text-slate-500 mt-1">{upcomingTrip.cargo?.material} - {upcomingTrip.distance} km</p>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between"><p className="text-xs text-slate-500">Driver: {profile.name || user?.name}</p><p className="text-[15px] font-bold text-primary">{formatCurrency(upcomingTrip.earnings)}</p></div>
        </div>
      )}
    </div>
  );
}
