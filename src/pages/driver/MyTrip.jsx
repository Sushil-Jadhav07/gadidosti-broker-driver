import { useEffect, useMemo, useState } from "react";
import { MapPin, Package, Phone, Clock, IndianRupee, Navigation, ShieldAlert, XCircle } from "lucide-react";
import Badge from "../../components/driver/Badge";
import StatusTimeline from "../../components/driver/StatusTimeline";
import TripStatusButton from "../../components/driver/TripStatusButton";
import RouteMapPanel from "../../components/driver/RouteMapPanel";
import EmergencySheet from "../../components/driver/EmergencySheet";
import ReportIncidentSheet from "../../components/driver/ReportIncidentSheet";
import ConfirmDialog from "../../components/broker/ConfirmDialog";
import KycGate from "../../components/kyc/KycGate";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { api, getToken } from "../../services/api";
import { DRIVER_STATUS_STEPS, adaptTrip, formatCurrency, formatDateTime, bookingRef } from "../../utils";

const CANCELLABLE_STATUSES = ["Assigned", "En Route Pickup"];

export default function MyTrip() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSOS, setShowSOS] = useState(false);
  const [showReportIncident, setShowReportIncident] = useState(false);
  const [reportingIncident, setReportingIncident] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get("/api/trips/active", getToken());
        setTrip(response.data?.trip ? adaptTrip(response.data.trip) : null);
      } catch {
        setError("Failed to load trip. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const completedTimes = useMemo(() => Object.fromEntries((trip?.timeline || []).filter((step) => step.time).map((step) => [step.step, formatDateTime(step.time)])), [trip]);

  const handleStatusChange = async (nextStatus) => {
    if (!trip) return;
    try {
      const response = await api.patch(`/api/trips/${trip.id}/status`, { status: nextStatus }, getToken());
      if (!response.success) throw new Error(response.message || "Failed to update trip status");
      setTrip(adaptTrip(response.data?.trip));
    } catch (err) {
      addToast(err.message || "Failed to update trip status.", "error");
    }
  };

  const handleReportIncident = async ({ reason, notes }) => {
    if (!trip) return;
    setReportingIncident(true);
    try {
      const response = await api.post(`/api/trips/${trip.id}/report-issue`, { reason, notes }, getToken());
      if (!response.success) throw new Error(response.message || "Failed to report incident");
      addToast("Incident reported — your broker and the client have been notified.", "success");
      setShowReportIncident(false);
    } catch (err) {
      addToast(err.message || "Failed to report incident.", "error");
    } finally {
      setReportingIncident(false);
    }
  };

  const handleCancelTrip = async () => {
    if (!trip) return;
    setCancelling(true);
    try {
      const response = await api.patch(`/api/trips/${trip.id}/status`, { status: "cancelled" }, getToken());
      if (!response.success) throw new Error(response.message || "Failed to cancel trip");
      addToast("Trip cancelled.", "success");
      setTrip(null);
    } catch (err) {
      addToast(err.message || "Failed to cancel trip.", "error");
    } finally {
      setCancelling(false);
    }
  };

  if (user?.kyc_status !== "verified") return <div className="pt-6"><KycGate status={user?.kyc_status || "pending"} kycPath="/driver/kyc" /></div>;
  if (loading) return <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-slate-400">Loading trip...</div>;
  if (error) return <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-red-500">{error}</div>;
  if (!trip) return <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-slate-400">No active trip assigned.</div>;

  const statusKey = trip.status.toLowerCase().replace(/ /g, "_");
  const canCancel = CANCELLABLE_STATUSES.includes(trip.status);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
        <div className="flex items-start justify-between mb-4">
          <div><p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">{bookingRef(trip)}</p><h2 className="text-[16px] font-bold text-slate-900 mt-0.5">{trip.pickup?.location} {"->"} {trip.drop?.location}</h2></div>
          <div className="flex items-center gap-2">
            <Badge status={trip.status} />
            <button
              onClick={() => setShowSOS(true)}
              title="Emergency Assistance"
              className="w-7 h-7 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors"
            >
              <ShieldAlert size={14} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_600px] gap-5">
          <div className="flex flex-col">
            <div className="grid grid-cols-3 gap-3 py-4 border-t border-b border-slate-100">
              {[{ label: "Distance", value: `${trip.distance} km`, icon: Navigation }, { label: "Est. Time", value: trip.estimatedTime, icon: Clock }, { label: "Earnings", value: formatCurrency(trip.earnings), icon: IndianRupee }].map((item) => (
                <div key={item.label} className="text-center"><item.icon className="w-4 h-4 text-slate-400 mx-auto mb-1" /><p className="text-[10px] text-slate-400">{item.label}</p><p className="text-sm font-bold text-slate-800">{item.value}</p></div>
              ))}
            </div>
          </div>
          <RouteMapPanel pickup={trip.pickup} drop={trip.drop} />
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
          {[["Broker", trip.broker, trip.brokerPhone], ["Pickup Contact", trip.pickup?.contactPerson, trip.pickup?.contactPhone]].map(([label, name, phone]) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div><p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{label}</p><p className="text-sm font-semibold text-slate-800">{name || "-"}</p></div>
              {phone ? <a href={`tel:${phone}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-semibold"><Phone className="w-3.5 h-3.5" />{phone}</a> : <span className="text-xs text-slate-400">-</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
        <h3 className="font-bold text-slate-900 text-[15px] mb-4">Trip Status</h3>
        <StatusTimeline steps={DRIVER_STATUS_STEPS} currentStatus={statusKey} completedTimes={completedTimes} />
      </div>

      <div className="h-20 lg:h-0" />
      <div className="sticky bottom-[68px] lg:bottom-0 z-20 bg-white border-t border-slate-100 p-4 -mx-4 sm:-mx-6 flex items-center gap-3">
        {canCancel && (
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="px-4 py-4 rounded-xl font-semibold text-[15px] text-red-600 border border-red-200 flex items-center gap-2 hover:bg-red-50 transition-all flex-shrink-0"
          >
            <XCircle className="w-4 h-4" /> Cancel Trip
          </button>
        )}
        <div className="flex-1">
          <TripStatusButton status={statusKey} onStatusChange={handleStatusChange} />
        </div>
      </div>

      <EmergencySheet
        isOpen={showSOS}
        onClose={() => setShowSOS(false)}
        brokerPhone={trip.brokerPhone}
        onReportIncident={() => setShowReportIncident(true)}
      />

      <ReportIncidentSheet
        isOpen={showReportIncident}
        onClose={() => setShowReportIncident(false)}
        onSubmit={handleReportIncident}
        submitting={reportingIncident}
      />

      <ConfirmDialog
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleCancelTrip}
        title="Cancel this trip?"
        message="This will cancel the current trip assignment. This action cannot be undone."
        confirmText={cancelling ? "Cancelling..." : "Cancel Trip"}
        variant="danger"
      />
    </div>
  );
}
