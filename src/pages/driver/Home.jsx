import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Navigation, Gauge, Wallet, Clock, TrendingUp, Truck, PackagePlus } from "lucide-react";
import Badge from "../../components/driver/Badge";
import RouteMapPanel from "../../components/driver/RouteMapPanel";
import KycReminderBanner from "../../components/kyc/KycReminderBanner";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { api, getToken } from "../../services/api";
import { adaptTrip, formatCurrency, bookingRef, splitLocationName } from "../../utils";

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
  const { user } = useAuth();
  // Online/offline tracking lives in DriverAppLayout (see App.jsx) so it survives navigating
  // between driver pages — the toggle itself only shows here, on the dashboard, instead of
  // persisting in the top header on every page.
  const { online, toggleOnline, onlineToggleLocked } = useOutletContext();
  const { addToast } = useToast();
  const firstName = (user?.name || "Driver").split(" ")[0];
  // A driver can now have more than one simultaneously-active trip (part-load: a second booking
  // sharing the same truck, matched via the Part Truck toggle below — see
  // TruckModel.findPartTruckCandidates) — activeTrips is the real list, selectedTripIndex picks
  // which one the Current Trip card below shows. Capped at 2 in v1, so a simple tab picker is
  // enough — no need for a scrollable list.
  const [activeTrips, setActiveTrips] = useState([]);
  const [selectedTripIndex, setSelectedTripIndex] = useState(0);
  const [upcomingTrip, setUpcomingTrip] = useState(null);
  const [summary, setSummary] = useState({ trips: 0, distance: 0, earnings: 0 });
  const [trend, setTrend] = useState({ trips: null, distance: null, earnings: null });
  const [profile, setProfile] = useState(user || {});
  const [assignedTruck, setAssignedTruck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [togglingMode, setTogglingMode] = useState(false);
  const [togglingLoads, setTogglingLoads] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = getToken();
        const [truckRes, profileRes, activeRes, upcomingRes, summaryRes] = await Promise.all([
          api.get("/api/vehicles/drivers/me/truck", token),
          api.get("/api/users/profile", token),
          api.get("/api/trips/active", token),
          api.get("/api/trips/upcoming", token),
          api.get("/api/trips/dashboard-summary", token),
        ]);
        setAssignedTruck(truckRes.data?.truck || null);
        setProfile(profileRes.data?.user || profileRes.data || user || {});
        // API returns newest-first (see TripModel.findActiveTripsByDriver) — reversed here so
        // index 0 is the oldest/original trip and any later part-load joins follow it, matching
        // the "Trip 1 (original)" / "Trip 2 (part-load)" labels below.
        setActiveTrips((activeRes.data?.trips || []).map(adaptTrip).reverse());
        setSelectedTripIndex(0);
        setUpcomingTrip(upcomingRes.data?.trip ? adaptTrip(upcomingRes.data.trip) : null);
        setSummary({
          trips: Number(summaryRes.data?.trips || 0),
          distance: Number(summaryRes.data?.distance || 0),
          earnings: Number(summaryRes.data?.earnings || 0),
        });
        setTrend(summaryRes.data?.trend || { trips: null, distance: null, earnings: null });
      } catch {
        setError("Failed to load dashboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  // Full Truck / Part Truck toggle — can be flipped any time, including mid-trip (turning it ON
  // while already on a trip is exactly the "share my spare capacity" case). Turning it OFF never
  // touches a part-load booking already assigned, it only stops the truck matching NEW ones.
  const handleTruckModeToggle = async () => {
    if (!assignedTruck || togglingMode) return;
    const nextMode = !assignedTruck.partTruckMode;
    setTogglingMode(true);
    try {
      const res = await api.patch("/api/vehicles/drivers/me/truck-mode", { part_truck_mode: nextMode }, getToken());
      if (!res?.success) throw new Error(res?.message || "Failed to update truck mode");
      setAssignedTruck(res.data?.truck || { ...assignedTruck, partTruckMode: nextMode });
      addToast(nextMode ? "Part Truck mode is on" : "Switched to Full Truck", "success");
    } catch (err) {
      addToast(err.message || "Failed to update truck mode", "error");
    } finally {
      setTogglingMode(false);
    }
  };

  // Separate pause — only shown/meaningful while Part Truck mode is on. Stops the truck from
  // being matched to any NEW part-load request (e.g. physically full right now) without fully
  // exiting Part Truck mode, and without affecting a booking already assigned.
  const handleAcceptingLoadsToggle = async () => {
    if (!assignedTruck || togglingLoads) return;
    const nextAccepting = !assignedTruck.acceptingLoads;
    setTogglingLoads(true);
    try {
      const res = await api.patch("/api/vehicles/drivers/me/accepting-loads", { accepting_loads: nextAccepting }, getToken());
      if (!res?.success) throw new Error(res?.message || "Failed to update");
      setAssignedTruck(res.data?.truck || { ...assignedTruck, acceptingLoads: nextAccepting });
      addToast(nextAccepting ? "Accepting new loads" : "Paused — no new loads until you turn this back on", "success");
    } catch (err) {
      addToast(err.message || "Failed to update", "error");
    } finally {
      setTogglingLoads(false);
    }
  };

  if (loading) {
    return <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-slate-400">Loading dashboard...</div>;
  }
  if (error) {
    return <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-red-500">{error}</div>;
  }

  const activeTrip = activeTrips[selectedTripIndex] || null;
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

      <KycReminderBanner />

      {assignedTruck && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${assignedTruck.partTruckMode ? "bg-teal-50" : "bg-primary/10"}`}>
              {assignedTruck.partTruckMode ? <PackagePlus size={19} className="text-teal-600" /> : <Truck size={19} className="text-primary" />}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 text-[15px]">{assignedTruck.partTruckMode ? "Part Truck mode" : "Full Truck mode"}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {assignedTruck.partTruckMode
                  ? "Your truck can be matched to a second, smaller load while on a trip."
                  : "Your truck only ever carries one booking at a time."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {assignedTruck.partTruckMode && (
              <button
                onClick={handleAcceptingLoadsToggle}
                disabled={togglingLoads}
                title={assignedTruck.acceptingLoads ? "Pause new part-load requests" : "Resume accepting new part-load requests"}
                className={`flex items-center gap-2 pl-3 pr-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wide transition-colors disabled:opacity-50 ${
                  assignedTruck.acceptingLoads ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                }`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${assignedTruck.acceptingLoads ? "bg-emerald-500" : "bg-amber-500"}`} />
                {assignedTruck.acceptingLoads ? "Accepting Loads" : "Paused"}
              </button>
            )}
            <button
              type="button"
              role="switch"
              aria-checked={assignedTruck.partTruckMode}
              onClick={handleTruckModeToggle}
              disabled={togglingMode}
              title={assignedTruck.partTruckMode ? "Switch to Full Truck" : "Switch to Part Truck"}
              className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors disabled:opacity-50 ${assignedTruck.partTruckMode ? "bg-teal-500" : "bg-slate-200"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${assignedTruck.partTruckMode ? "translate-x-5" : ""}`} />
            </button>
          </div>
        </div>
      )}

      {assignedTruck && activeTrips.length > 1 && (
        <div className="flex items-center gap-2">
          {activeTrips.map((trip, i) => (
            <button
              key={trip.id}
              onClick={() => setSelectedTripIndex(i)}
              className={`flex-1 text-left px-4 py-2.5 rounded-xl border-2 transition-colors ${
                i === selectedTripIndex ? "border-primary bg-primary/5" : "border-slate-100 bg-white hover:border-slate-200"
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Trip {i + 1}{i === 0 ? " (original)" : " (part-load)"}</p>
              <p className="text-xs font-bold text-slate-800 truncate">{bookingRef(trip)}</p>
            </button>
          ))}
        </div>
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

            <RouteMapPanel
              pickup={activeTrip.pickup}
              drop={activeTrip.drop}
              currentLocation={activeTrip.currentLocation}
              isPrePickup={["confirmed", "en_route_pickup"].includes(activeTrip.rawStatus)}
            />
          </div>
        </div>
      )}

      {assignedTruck && activeTrips.length === 0 && !upcomingTrip && (
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
