import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Package, Phone, Clock, IndianRupee, Navigation, ShieldAlert, XCircle, Wrench, MessageCircle } from "lucide-react";
import Badge from "../../components/driver/Badge";
import StatusTimeline from "../../components/driver/StatusTimeline";
import TripStatusButton from "../../components/driver/TripStatusButton";
import RouteMapPanel from "../../components/driver/RouteMapPanel";
import EmergencySheet from "../../components/driver/EmergencySheet";
import ReportIncidentSheet from "../../components/driver/ReportIncidentSheet";
import ReportBreakdownSheet from "../../components/driver/ReportBreakdownSheet";
import ConfirmDialog from "../../components/broker/ConfirmDialog";
import Modal from "../../components/broker/Modal";
import ChatWindow from "../../components/ChatWindow";
import KycGate from "../../components/kyc/KycGate";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
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
  const [uploadingPod, setUploadingPod] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const podFileInputRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get("/api/trips/active", getToken());
        const loadedTrip = response.data?.trip ? adaptTrip(response.data.trip) : null;
        setTrip(loadedTrip);

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

  const handleUploadPOD = () => {
    if (uploadingPod) return;
    podFileInputRef.current?.click();
  };

  const handlePodFileSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !trip) return;

    setUploadingPod(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await api.upload(`/api/trips/${trip.id}/pod`, formData, getToken());
      if (!uploadRes.success) throw new Error(uploadRes.message || "Failed to upload proof of delivery");

      addToast("Proof of delivery uploaded.", "success");
      await handleStatusChange("completed");
    } catch (err) {
      addToast(err.message || "Failed to upload proof of delivery.", "error");
    } finally {
      setUploadingPod(false);
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

  const statusKey = trip.rawStatus;
  const canDecline = DECLINABLE_STATUSES.includes(statusKey);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">{bookingRef(trip)}</p>
            <h2 className="text-[16px] font-bold text-slate-900 mt-0.5">{trip.pickup?.location} {"->"} {trip.drop?.location}</h2>
            <div className="flex items-center flex-wrap gap-1.5 mt-2">
              <Badge status={trip.status} />
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
            onUploadPOD={handleUploadPOD}
            disabled={uploadingPod}
          />
        </div>
      </div>

      <input
        ref={podFileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePodFileSelected}
      />

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
