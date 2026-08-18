import { useEffect, useMemo, useState } from "react";
import { MapPin, Package, Phone, Clock, IndianRupee, Navigation, ShieldAlert, XCircle, Wrench, MessageCircle, PackagePlus, PackageMinus, CheckCircle2 } from "lucide-react";
import Badge from "../../components/driver/Badge";
import StatusTimeline from "../../components/driver/StatusTimeline";
import TripStatusButton from "../../components/driver/TripStatusButton";
import RouteMapPanel from "../../components/driver/RouteMapPanel";
import DeliveryCompletionFlow from "../../components/driver/DeliveryCompletionFlow";
import EmergencySheet from "../../components/driver/EmergencySheet";
import ReportIncidentSheet from "../../components/driver/ReportIncidentSheet";
import ReportBreakdownSheet from "../../components/driver/ReportBreakdownSheet";
import ConfirmDialog from "../../components/broker/ConfirmDialog";
import Modal from "../../components/broker/Modal";
import ChatWindow from "../../components/ChatWindow";
import KycGate from "../../components/kyc/KycGate";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { useBookingPaymentSocket } from "../../hooks/useBookingPaymentSocket";
import { useTripStatusSocket } from "../../hooks/useTripStatusSocket";
import { api, getToken } from "../../services/api";
import { DRIVER_STATUS_STEPS, adaptTrip, formatCurrency, formatDateTime, bookingRef } from "../../utils";

// Declining is only allowed before the driver has started the trip — trips are created
// with raw status "confirmed" and move to "en_route_pickup" once "Start Trip to Pickup" is
// tapped. Past that, cargo may already be picked up, so use report-issue instead.
const DECLINABLE_STATUSES = ["confirmed"];

const MECHANIC_STATUS_LABELS = {
  requested: "Waiting for your broker to arrange a mechanic.",
  mechanic_assigned: "A mechanic has been arranged for you.",
  in_progress: "The mechanic is working on your vehicle.",
  resolved: "Resolved.",
};

export default function MyTrip() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSOS, setShowSOS] = useState(false);
  const [showReportIncident, setShowReportIncident] = useState(false);
  const [reportingIncident, setReportingIncident] = useState(false);
  const [showReportBreakdown, setShowReportBreakdown] = useState(false);
  const [reportingBreakdown, setReportingBreakdown] = useState(false);
  const [activeIncident, setActiveIncident] = useState(null);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [completingStop, setCompletingStop] = useState(null);
  // Once the driver commits to wrapping up delivery (in_transit -> delivered), the page
  // hands off entirely to DeliveryCompletionFlow instead of the normal trip view — see
  // handleStatusChange's 'delivered' special-case below. Auto-resumes true on load if the
  // trip is already past that point (e.g. the driver closed the app mid-flow).
  const [deliveryFlowActive, setDeliveryFlowActive] = useState(false);

  const loadTrip = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/api/trips/active", getToken());
      const loadedTrip = response.data?.trip ? adaptTrip(response.data.trip) : null;
      setTrip(loadedTrip);
      setDeliveryFlowActive(loadedTrip?.rawStatus === "delivered");

      if (loadedTrip) {
        try {
          const incidentsRes = await api.get(`/api/trips/${loadedTrip.id}/incidents`, getToken());
          const unresolved = (incidentsRes.data?.incidents || []).find((i) => i.status !== "resolved");
          setActiveIncident(unresolved || null);
        } catch { /* non-critical — badge just won't show */ }
      }
    } catch {
      setError("Failed to load trip. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live push the moment the client pays via the app — without this the driver would only
  // find out at delivery-completion time (DeliveryCompletionFlow re-fetches then), which is
  // too late to be useful mid-trip.
  useBookingPaymentSocket((payload) => {
    setTrip((current) => {
      if (!current || payload?.bookingId !== current.bookingId) return current;
      return { ...current, paymentStatus: payload.paymentStatus };
    });
    if (payload?.paymentStatus === "paid") {
      addToast(`Payment received for ${payload.bookingNumber || "this booking"} — no COD collection needed.`, "success");
    }
  });

  // Live push the moment this trip's status changes — covers e.g. a broker completing delivery
  // on this driver's behalf. A full reload (not a partial merge) since a status change can
  // affect several derived things at once (deliveryFlowActive, timeline, stop checklist).
  useTripStatusSocket((updatedTrip) => {
    if (updatedTrip?.id && updatedTrip.id === trip?.id) loadTrip();
  });

  const completedTimes = useMemo(() => Object.fromEntries((trip?.timeline || []).filter((step) => step.time).map((step) => [step.step, formatDateTime(step.time)])), [trip]);

  const handleStatusChange = async (nextStatus) => {
    if (!trip) return;
    // The old flow PATCHed straight to 'delivered' from a single button tap. Now that
    // transition hands off to the dedicated completion wizard instead — its own "Arrived"
    // step is the thing that actually PATCHes the status, once the driver swipes to confirm.
    if (nextStatus === "delivered") {
      setDeliveryFlowActive(true);
      return;
    }
    try {
      const response = await api.patch(`/api/trips/${trip.id}/status`, { status: nextStatus }, getToken());
      if (!response.success) throw new Error(response.message || "Failed to update trip status");
      setTrip(adaptTrip(response.data?.trip));
    } catch (err) {
      addToast(err.message || "Failed to update trip status.", "error");
    }
  };

  // Marks one extra loading/unloading stop complete — proximity-gated server-side, same
  // "you're Xkm away" error shape as the pickup/delivered gate, surfaced via toast here since
  // this button lives outside the main status flow.
  const handleCompleteStop = async (index) => {
    if (!trip) return;
    setCompletingStop(index);
    try {
      const response = await api.patch(`/api/trips/${trip.id}/stops/${index}/complete`, {}, getToken());
      if (!response.success) throw new Error(response.message || "Failed to complete stop");
      setTrip(adaptTrip(response.data?.trip));
    } catch (err) {
      addToast(err.message || "Failed to complete stop.", "error");
    } finally {
      setCompletingStop(null);
    }
  };

  const handleReportIncident = async ({ reason, notes }) => {
    if (!trip) return;
    setReportingIncident(true);
    try {
      const response = await api.post(`/api/trips/${trip.id}/report-issue`, { reason, notes }, getToken());
      if (!response.success) throw new Error(response.message || "Failed to report incident");
      setActiveIncident(response.data?.incident || null);
      addToast("Incident reported — your broker and the client have been notified.", "success");
      setShowReportIncident(false);
    } catch (err) {
      addToast(err.message || "Failed to report incident.", "error");
    } finally {
      setReportingIncident(false);
    }
  };

  const handleReportBreakdown = async ({ notes }) => {
    if (!trip) return;
    setReportingBreakdown(true);
    try {
      const response = await api.post(`/api/trips/${trip.id}/report-issue`, { reason: "breakdown", notes }, getToken());
      if (!response.success) throw new Error(response.message || "Failed to report breakdown");
      setActiveIncident(response.data?.incident || null);
      addToast("Breakdown reported — your broker has been notified and will arrange a mechanic.", "success");
      setShowReportBreakdown(false);
    } catch (err) {
      addToast(err.message || "Failed to report breakdown.", "error");
    } finally {
      setReportingBreakdown(false);
    }
  };

  const handleDeclineTrip = async () => {
    if (!trip) return;
    setDeclining(true);
    try {
      const response = await api.post(`/api/trips/${trip.id}/decline`, null, getToken());
      if (!response.success) throw new Error(response.message || "Failed to decline trip");
      addToast("Trip declined. Your broker has been notified.", "success");
      setTrip(null);
    } catch (err) {
      addToast(err.message || "Failed to decline trip.", "error");
    } finally {
      setDeclining(false);
    }
  };

  if (user?.kyc_status !== "verified") return <div className="pt-6"><KycGate status={user?.kyc_status || "pending"} kycPath="/driver/kyc" /></div>;
  if (loading) return <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-slate-400">Loading trip...</div>;
  if (error) return <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-red-500">{error}</div>;
  if (!trip) return <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-slate-400">No active trip assigned.</div>;

  if (deliveryFlowActive) {
    return <DeliveryCompletionFlow trip={trip} onExit={loadTrip} />;
  }

  const statusKey = trip.rawStatus;
  const canDecline = DECLINABLE_STATUSES.includes(statusKey);

  // Where "Open in Maps" should point right now — mirrors the backend's own next-stop
  // ordering (pickup -> loading stops -> unloading stops -> drop) so it always matches
  // whatever the status button/checklist above says is next.
  const nextDestination = (() => {
    if (["confirmed", "en_route_pickup"].includes(statusKey)) return trip.pickup;
    if (statusKey === "picked_up") {
      const stop = trip.stops?.find((s) => s.type === "loading" && s.status !== "done");
      if (stop) return { location: stop.location, lat: stop.lat, lng: stop.lng };
    }
    if (["picked_up", "in_transit"].includes(statusKey)) {
      const stop = trip.stops?.find((s) => s.type === "unloading" && s.status !== "done");
      if (stop) return { location: stop.location, lat: stop.lat, lng: stop.lng };
    }
    return trip.drop;
  })();

  const openInMaps = () => {
    if (nextDestination?.lat == null || nextDestination?.lng == null) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${nextDestination.lat},${nextDestination.lng}&travelmode=driving`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Extra loading/unloading stops (Ola/Uber-style add-stop) — empty for the vast majority of
  // trips, which keeps everything below exactly as it always was. Only the earliest pending
  // stop of each type is actionable (sequential, mirrors the backend's own enforcement).
  const stops = trip.stops || [];
  const pendingLoading = stops.filter((s) => s.type === "loading" && s.status !== "done");
  const pendingUnloading = stops.filter((s) => s.type === "unloading" && s.status !== "done");
  const hasExtraStops = stops.some((s) => s.type === "loading" || s.type === "unloading");
  const nextActionableIndex = (type) => stops.findIndex((s) => s.type === type && s.status !== "done");

  let statusButtonDisabledReason = null;
  if (statusKey === "picked_up" && pendingLoading.length > 0) {
    statusButtonDisabledReason = `Complete ${pendingLoading.length} more loading stop${pendingLoading.length === 1 ? "" : "s"} first`;
  } else if (statusKey === "in_transit" && pendingUnloading.length > 0) {
    statusButtonDisabledReason = `Complete ${pendingUnloading.length} more unloading stop${pendingUnloading.length === 1 ? "" : "s"} first`;
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">{bookingRef(trip)}</p>
            <h2 className="text-[16px] font-bold text-slate-900 mt-0.5">{trip.pickup?.location} {"->"} {trip.drop?.location}</h2>
            <div className="flex items-center flex-wrap gap-1.5 mt-2">
              <Badge status={trip.status} />
              {trip.paymentStatus === "paid" && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 size={12} /> Paid
                </span>
              )}
              {activeIncident && (
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  activeIncident.reason === "breakdown" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-red-50 text-red-600 border border-red-200"
                }`}>
                  {activeIncident.reason === "breakdown" ? <Wrench size={12} /> : <ShieldAlert size={12} />}
                  {activeIncident.reason === "breakdown" ? "Breakdown Reported" : "Issue Reported"}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={openInMaps}
              disabled={nextDestination?.lat == null || nextDestination?.lng == null}
              title="Open directions in Google Maps"
              className="flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold text-xs hover:bg-primary/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Navigation size={16} />
              Directions
            </button>
            <button
              onClick={() => setShowChat(true)}
              title="Chat"
              className="flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold text-xs hover:bg-primary/20 active:scale-95 transition-all"
            >
              <MessageCircle size={16} />
              Chat
            </button>
            <button
              onClick={() => setShowSOS(true)}
              title="Emergency Assistance"
              className="flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-semibold text-xs hover:bg-red-100 active:scale-95 transition-all"
            >
              <ShieldAlert size={16} />
              SOS
            </button>
          </div>
        </div>

        {activeIncident?.reason === "breakdown" && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2.5">
            <Wrench className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-800">Breakdown Reported</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {MECHANIC_STATUS_LABELS[activeIncident.mechanicRequest?.status] || "Waiting for your broker to arrange a mechanic."}
              </p>
              {activeIncident.mechanicRequest?.mechanicName && (
                <p className="text-xs text-amber-700 mt-1">
                  Mechanic: {activeIncident.mechanicRequest.mechanicName}
                  {activeIncident.mechanicRequest.mechanicPhone ? ` · ${activeIncident.mechanicRequest.mechanicPhone}` : ""}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="grid grid-cols-3 gap-3 content-start">
            {[{ label: "Distance", value: `${trip.distance} km`, icon: Navigation }, { label: "Est. Time", value: trip.estimatedTime, icon: Clock }, { label: "Earnings", value: formatCurrency(trip.earnings), icon: IndianRupee }].map((item) => (
              <div key={item.label} className="bg-slate-50 rounded-lg p-3 text-center">
                <item.icon className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                <p className="text-[10px] text-slate-400">{item.label}</p>
                <p className="text-sm font-bold text-slate-800">{item.value}</p>
              </div>
            ))}
          </div>
          <RouteMapPanel pickup={trip.pickup} drop={trip.drop} currentLocation={trip.currentLocation} stops={stops} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
        <h3 className="font-bold text-slate-900 text-[15px] mb-4">Cargo Details</h3>
        <div className="grid grid-cols-2 gap-3">
          {[["Material", trip.cargo?.material], ["Weight", trip.cargo?.weight], ["Quantity", trip.cargo?.quantity], ["Declared Value", trip.cargo?.value]].map(([label, value]) => <div key={label} className="bg-slate-50 rounded-lg p-3"><p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{label}</p><p className="text-sm font-semibold text-slate-800 mt-0.5">{value || "-"}</p></div>)}
        </div>
        {trip.cargo?.specialInstructions && <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3"><div className="flex items-center gap-2 mb-1"><Package className="w-4 h-4 text-amber-600" /><p className="text-xs font-bold text-amber-800">Special Instructions</p></div><p className="text-xs text-amber-700">{trip.cargo.specialInstructions}</p></div>}
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
        <h3 className="font-bold text-slate-900 text-[15px] mb-4">Contact</h3>
        <div className="space-y-3">
          {[["Broker", trip.broker, trip.brokerPhone], ["Pickup Contact", trip.pickup?.contactPerson, trip.pickup?.contactPhone], ["Drop Contact", trip.drop?.contactPerson, trip.drop?.contactPhone]].map(([label, name, phone]) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div><p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{label}</p><p className="text-sm font-semibold text-slate-800">{name || "-"}</p></div>
              {phone ? <a href={`tel:${phone}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-semibold"><Phone className="w-3.5 h-3.5" />{phone}</a> : <span className="text-xs text-slate-400">-</span>}
            </div>
          ))}
        </div>
      </div>

      {hasExtraStops && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
          <h3 className="font-bold text-slate-900 text-[15px] mb-4">Loading &amp; Unloading Stops</h3>
          <div className="space-y-2">
            {stops.map((stop, index) => {
              if (stop.type !== "loading" && stop.type !== "unloading") return null;
              const isDone = stop.status === "done";
              const isActionable = index === nextActionableIndex(stop.type);
              const Icon = stop.type === "loading" ? PackagePlus : PackageMinus;
              return (
                <div key={index} className={`flex items-center gap-3 rounded-lg p-3 ${isDone ? "bg-emerald-50" : "bg-slate-50"}`}>
                  {isDone ? <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" /> : <Icon size={18} className="text-slate-400 flex-shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{stop.type === "loading" ? "Loading Point" : "Unloading Point"}</p>
                    <p className="text-sm font-medium text-slate-800 truncate">{stop.location || "—"}</p>
                  </div>
                  {!isDone && (
                    <button
                      onClick={() => handleCompleteStop(index)}
                      disabled={!isActionable || completingStop === index}
                      className="px-3 py-2 rounded-lg text-xs font-semibold text-white bg-primary hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      {completingStop === index ? "..." : stop.type === "loading" ? "Mark Loaded" : "Mark Unloaded"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
        <h3 className="font-bold text-slate-900 text-[15px] mb-4">Trip Status</h3>
        <StatusTimeline steps={DRIVER_STATUS_STEPS} currentStatus={statusKey} completedTimes={completedTimes} />
      </div>

      <div className="h-20 lg:h-0" />
      <div className="sticky bottom-[68px] lg:bottom-0 z-20 bg-white border-t border-slate-100 p-4 -mx-4 sm:-mx-6 flex items-center gap-3">
        {canDecline && (
          <button
            onClick={() => setShowDeclineConfirm(true)}
            className="px-4 py-4 rounded-xl font-semibold text-[15px] text-red-600 border border-red-200 flex items-center gap-2 hover:bg-red-50 transition-all flex-shrink-0"
          >
            <XCircle className="w-4 h-4" /> Decline Trip
          </button>
        )}
        <div className="flex-1">
          <TripStatusButton
            status={statusKey}
            onStatusChange={handleStatusChange}
            disabled={!!statusButtonDisabledReason}
          />
          {statusButtonDisabledReason && (
            <p className="text-[11px] text-amber-600 font-medium text-center mt-1.5">{statusButtonDisabledReason}</p>
          )}
        </div>
      </div>

      <EmergencySheet
        isOpen={showSOS}
        onClose={() => setShowSOS(false)}
        brokerPhone={trip.brokerPhone}
        onReportIncident={() => setShowReportIncident(true)}
        onReportBreakdown={() => setShowReportBreakdown(true)}
      />

      <ReportIncidentSheet
        isOpen={showReportIncident}
        onClose={() => setShowReportIncident(false)}
        onSubmit={handleReportIncident}
        submitting={reportingIncident}
      />

      <ReportBreakdownSheet
        isOpen={showReportBreakdown}
        onClose={() => setShowReportBreakdown(false)}
        onSubmit={handleReportBreakdown}
        submitting={reportingBreakdown}
      />

      <Modal isOpen={showChat} onClose={() => setShowChat(false)} title="Chat" size="sm">
        <ChatWindow bookingId={trip.bookingId} currentUserId={user?.id} />
      </Modal>

      <ConfirmDialog
        isOpen={showDeclineConfirm}
        onClose={() => setShowDeclineConfirm(false)}
        onConfirm={handleDeclineTrip}
        title="Decline this trip?"
        message="Your broker will be notified and can assign the trip to another driver. This action cannot be undone."
        confirmText={declining ? "Declining..." : "Decline Trip"}
        variant="danger"
      />
    </div>
  );
}
