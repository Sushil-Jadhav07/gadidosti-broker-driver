import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Truck, User, Phone, Package, Ruler, IndianRupee, Calendar, Trash2, Download, Mail, Clock, Share2, Send, PackagePlus, PackageMinus, CheckCircle2, Circle, ClipboardCheck, MessageCircle, Repeat, AlertTriangle, ChevronDown, Camera } from "lucide-react";
import Badge from "../../components/broker/Badge";
import ExpressBadge from "../../components/ExpressBadge";
import ConfirmDialog from "../../components/broker/ConfirmDialog";
import RouteMapPanel from "../../components/driver/RouteMapPanel";
import DeliveryCompletionFlow from "../../components/driver/DeliveryCompletionFlow";
import InvoiceEmailModal from "../../components/InvoiceEmailModal";
import PodGallery from "../../components/PodGallery";
import Modal from "../../components/broker/Modal";
import ChatWindow from "../../components/ChatWindow";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { useTripStatusSocket } from "../../hooks/useTripStatusSocket";
import { api, getToken } from "../../services/api";
import { adaptBooking, adaptTrip, bookingRef, formatBookingStatus, formatCurrency, formatDate, formatDateTime, formatDuration, formatPaymentMode, shareInvoicePdf } from "../../utils";

const INVOICE_READY_STATUSES = ["Delivered", "Completed"];

// The trip's own forward lifecycle (mirrors DRIVER_STATUS_STEPS in utils.js, minus the label
// bits this file doesn't need) — used to build the "force status" dropdown's options as
// whatever comes after the trip's current raw status. Cancelled sits outside this sequence and
// is offered separately as an always-available escape hatch.
const TRIP_STATUS_ORDER = ["confirmed", "en_route_pickup", "picked_up", "in_transit", "delivered", "completed"];

// Section is hidden once the booking is past the point a "take over" action would ever make
// sense — matches INVOICE_READY_STATUSES' own casing convention.
const OVERRIDE_HIDDEN_STATUSES = ["Delivered", "Completed", "Cancelled"];

const STATUS_BADGE = { Completed: "success", Cancelled: "danger" };
const PAYMENT_BADGE = { paid: "success", pending: "warning", partial: "warning", refunded: "default" };
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-b-0">
      <Icon size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-slate-800 truncate">{value}</p>
      </div>
    </div>
  );
}

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [notifying, setNotifying] = useState(false);
  // Lets the broker finish proof-of-delivery + payment collection on a driver's behalf —
  // e.g. the driver marked the trip delivered and then logged out/is unreachable. Only
  // fetched on demand (not on every load) since it's only relevant once status is Delivered.
  const [completingTrip, setCompletingTrip] = useState(null);
  const [loadingCompletion, setLoadingCompletion] = useState(false);
  const [collectingPayment, setCollectingPayment] = useState(false);
  // Hidden entirely when empty — most bookings are never reassigned, so this only shows up
  // when there's actually something to show.
  const [reassignmentHistory, setReassignmentHistory] = useState([]);
  // "Take over" section for when the driver is stuck/unreachable (dead phone, crashed app, lost
  // signal) and can't advance the trip themselves — lets the broker force the trip's status
  // forward (or cancel it) and check off any extra loading/unloading stops, directly on the
  // driver's behalf. Collapsed by default; the trip is only fetched once expanded, same
  // on-demand pattern as handleOpenCompletion above.
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideTrip, setOverrideTrip] = useState(null);
  const [loadingOverrideTrip, setLoadingOverrideTrip] = useState(false);
  const [completingOverrideStop, setCompletingOverrideStop] = useState(null);
  const [selectedForceStatus, setSelectedForceStatus] = useState("");
  const [forceStatusConfirmOpen, setForceStatusConfirmOpen] = useState(false);
  const [applyingForceStatus, setApplyingForceStatus] = useState(false);

  const load = async ({ silent } = {}) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const response = await api.get(`/api/bookings/${id}`, getToken());
      if (!response?.success || !response.data?.booking) throw new Error(response?.message || "Job not found");
      setBooking(adaptBooking(response.data.booking));
    } catch (err) {
      if (!silent) setError(err.message || "Failed to load job details. Please try again.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    api.get(`/api/bookings/${id}/reassignment-history`, getToken())
      .then((res) => { if (!cancelled) setReassignmentHistory(res?.data?.history || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  // Live push the moment this job's trip status changes (picked up, delivered, etc.) — updates
  // the status badge/timeline without the broker needing to reload the page. Silent refresh
  // (no loading spinner) since this can fire at any point while the page is open.
  useTripStatusSocket((updatedTrip) => {
    if (updatedTrip?.bookingId === id) load({ silent: true });
  });

  const handleDownloadInvoice = async () => {
    setDownloading(true);
    try {
      const blobUrl = await api.getFileBlobUrl(`${API_BASE}/api/bookings/${id}/invoice`, getToken());
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `invoice-${booking.bookingNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      addToast(err.message || "Failed to download invoice.", "error");
    } finally {
      setDownloading(false);
    }
  };

  const handleShareInvoice = async () => {
    setSharing(true);
    try {
      const blob = await api.getFileBlob(`${API_BASE}/api/bookings/${id}/invoice`, getToken());
      await shareInvoicePdf({
        blob,
        filename: `invoice-${booking.bookingNumber}.pdf`,
        text: `Invoice for ${bookingRef(booking)} (${booking.pickup} → ${booking.drop}, ${formatCurrency(booking.amount)}) — see attached.`,
      });
    } catch (err) {
      if (err?.name !== "AbortError") addToast(err.message || "Failed to share invoice.", "error");
    } finally {
      setSharing(false);
    }
  };

  const handleNotifyClient = async () => {
    setNotifying(true);
    try {
      const res = await api.post(`/api/bookings/${id}/invoice/notify`, {}, getToken());
      if (!res?.success) throw new Error(res?.message || "Failed to notify client");
      addToast("Client notified — invoice shared to their portal.", "success");
    } catch (err) {
      addToast(err.message || "Failed to notify client.", "error");
    } finally {
      setNotifying(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await api.delete(`/api/bookings/${id}`, null, getToken());
      if (!res?.success) throw new Error(res?.message || "Failed to remove booking");
      addToast(res.message || "Booking removed from your list.", "success");
      navigate("/job-history");
    } catch (err) {
      addToast(err.message || "Failed to remove booking.", "error");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  // Covers a real gap: "Complete Delivery" above (which leads into DeliveryCompletionFlow's own
  // payment step) only shows while booking.status === "Delivered" — once a trip moves on to
  // "Completed" (nothing stops that from happening with payment still due, e.g. an advance-only
  // booking, or a driver who completed without collecting), that button disappears, leaving no
  // way here to finish it either. This is a lighter direct path, not routed through the full
  // completion flow, since there's no delivery step left to walk through at this point.
  const handleCollectPayment = async (mode) => {
    setCollectingPayment(true);
    try {
      const tripRes = await api.get(`/api/trips/booking/${id}`, getToken());
      if (!tripRes?.success || !tripRes.data?.trip) throw new Error(tripRes?.message || "Trip not found");
      const res = await api.patch(`/api/trips/${tripRes.data.trip.id}/collect-payment`, { mode }, getToken());
      if (!res?.success) throw new Error(res?.message || "Failed to record payment");
      setBooking((prev) => (prev ? { ...prev, paymentStatus: "paid" } : prev));
      addToast("Payment recorded.", "success");
    } catch (err) {
      addToast(err.message || "Failed to record payment.", "error");
    } finally {
      setCollectingPayment(false);
    }
  };

  const handleOpenCompletion = async () => {
    setLoadingCompletion(true);
    try {
      const res = await api.get(`/api/trips/booking/${id}`, getToken());
      if (!res?.success || !res.data?.trip) throw new Error(res?.message || "Trip not found");
      setCompletingTrip(adaptTrip(res.data.trip));
    } catch (err) {
      addToast(err.message || "Failed to load trip for completion.", "error");
    } finally {
      setLoadingCompletion(false);
    }
  };

  const handleToggleOverride = async () => {
    const next = !overrideOpen;
    setOverrideOpen(next);
    if (!next || overrideTrip) return;
    setLoadingOverrideTrip(true);
    try {
      const res = await api.get(`/api/trips/booking/${id}`, getToken());
      if (!res?.success || !res.data?.trip) throw new Error(res?.message || "Trip not found");
      setOverrideTrip(adaptTrip(res.data.trip));
    } catch (err) {
      addToast(err.message || "Failed to load trip.", "error");
    } finally {
      setLoadingOverrideTrip(false);
    }
  };

  // Only the earliest pending stop of each type is actionable — mirrors the sequential
  // enforcement already used in src/pages/driver/MyTrip.jsx (nextActionableIndex there).
  const overrideNextActionableIndex = (type) =>
    (overrideTrip?.stops || []).findIndex((s) => s.type === type && s.status !== "done");

  const handleCompleteOverrideStop = async (index) => {
    if (!overrideTrip) return;
    setCompletingOverrideStop(index);
    try {
      const res = await api.patch(`/api/trips/${overrideTrip.id}/stops/${index}/complete`, {}, getToken());
      if (!res?.success) throw new Error(res?.message || "Failed to complete stop");
      setOverrideTrip(adaptTrip(res.data.trip));
      addToast("Stop marked complete.", "success");
    } catch (err) {
      addToast(err.message || "Failed to complete stop.", "error");
    } finally {
      setCompletingOverrideStop(null);
    }
  };

  const forwardStatusOptions = (() => {
    if (!overrideTrip) return [];
    const currentIndex = TRIP_STATUS_ORDER.indexOf(overrideTrip.rawStatus);
    const forward = currentIndex === -1 ? [] : TRIP_STATUS_ORDER.slice(currentIndex + 1);
    return [...forward, "cancelled"];
  })();
  const effectiveForceStatus = selectedForceStatus || forwardStatusOptions[0] || "";

  const handleForceStatus = async () => {
    if (!overrideTrip || !effectiveForceStatus) return;
    setApplyingForceStatus(true);
    try {
      const res = await api.patch(`/api/trips/${overrideTrip.id}/status`, { status: effectiveForceStatus }, getToken());
      if (!res?.success) throw new Error(res?.message || "Failed to update trip status");
      setOverrideTrip(adaptTrip(res.data.trip));
      setSelectedForceStatus("");
      addToast(`Trip status forced to "${formatBookingStatus(effectiveForceStatus)}".`, "success");
      load({ silent: true });
    } catch (err) {
      // Surfaces the backend's own 409 message (e.g. "Complete all loading stops before
      // starting delivery.") verbatim rather than a generic one.
      addToast(err.message || "Failed to update trip status.", "error");
    } finally {
      setApplyingForceStatus(false);
    }
  };

  if (completingTrip) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setCompletingTrip(null)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={15} /> Back to Job Details
        </button>
        <DeliveryCompletionFlow
          trip={completingTrip}
          onExit={() => {
            setCompletingTrip(null);
            load();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={() => navigate("/job-history")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft size={15} /> Back to Job History
      </button>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-slate-400">Loading job details...</div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-red-500 flex flex-col items-center gap-2">
          <span>{error}</span>
          <button onClick={load} className="underline text-sm">Retry</button>
        </div>
      ) : booking ? (
        <>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-slate-400">{bookingRef(booking)}</span>
                <Badge variant={STATUS_BADGE[booking.status] || "default"} size="sm">{booking.status}</Badge>
                {booking.isExpress && <ExpressBadge size="md" />}
              </div>
              <h1 className="text-xl font-bold text-slate-900">{booking.pickup} <span className="text-slate-300">→</span> {booking.drop}</h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end flex-shrink-0">
              <button
                onClick={() => setShowChat(true)}
                title="Chat"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-primary border border-primary/30 hover:bg-primary/5 transition-colors flex-shrink-0"
              >
                <MessageCircle size={16} />
              </button>
              {booking.status === "Delivered" && (
                <button
                  onClick={handleOpenCompletion}
                  disabled={loadingCompletion}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-primary rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  <ClipboardCheck size={14} /> {loadingCompletion ? "Loading..." : "Complete Delivery"}
                </button>
              )}
              {INVOICE_READY_STATUSES.includes(booking.status) ? (
                <>
                  <button
                    onClick={handleDownloadInvoice}
                    disabled={downloading}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-60"
                  >
                    <Download size={14} /> {downloading ? "Downloading..." : "Download Invoice"}
                  </button>
                  <button
                    onClick={() => setEmailOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
                  >
                    <Mail size={14} /> Send by Email
                  </button>
                  <button
                    onClick={handleShareInvoice}
                    disabled={sharing}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-60"
                  >
                    <Share2 size={14} /> {sharing ? "Preparing..." : "Share via WhatsApp"}
                  </button>
                  <button
                    onClick={handleNotifyClient}
                    disabled={notifying}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-60"
                  >
                    <Send size={14} /> {notifying ? "Sending..." : "Notify Client"}
                  </button>
                </>
              ) : (
                <span className="text-xs text-slate-400 italic px-1">Invoice available once delivery is complete</span>
              )}
              {["Completed", "Cancelled"].includes(booking.status) && (
                <button
                  onClick={() => setDeleteOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} /> Remove from my list
                </button>
              )}
            </div>
          </div>

          {!OVERRIDE_HIDDEN_STATUSES.includes(booking.status) && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-card">
              <button onClick={handleToggleOverride} className="w-full flex items-center justify-between p-4 text-left">
                <span className="flex items-center gap-2">
                  <AlertTriangle size={15} className="text-amber-500 flex-shrink-0" />
                  <span className="text-sm font-semibold text-slate-800">Driver unreachable? Take over this trip</span>
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 flex-shrink-0">
                  {overrideOpen ? "Hide" : "Show"}
                  <ChevronDown size={14} className={`transition-transform ${overrideOpen ? "rotate-180" : ""}`} />
                </span>
              </button>

              {overrideOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-50 space-y-4">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Use this only if the driver's phone is dead, their app crashed, or they've lost signal and can't update the trip themselves.
                    Actions here happen directly on the driver's behalf.
                  </p>

                  {loadingOverrideTrip ? (
                    <p className="text-xs text-slate-400">Loading trip...</p>
                  ) : !overrideTrip ? (
                    <button onClick={handleToggleOverride} className="text-xs font-semibold text-primary underline">Retry loading trip</button>
                  ) : (
                    <>
                      {overrideTrip.stops?.some((s) => s.type === "loading" || s.type === "unloading") && (
                        <div>
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Loading &amp; Unloading Stops</p>
                          <div className="space-y-1.5">
                            {overrideTrip.stops.map((stop, index) => {
                              if (stop.type !== "loading" && stop.type !== "unloading") return null;
                              const isDone = stop.status === "done";
                              const isActionable = index === overrideNextActionableIndex(stop.type);
                              const Icon = stop.type === "loading" ? PackagePlus : PackageMinus;
                              return (
                                <div key={index} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${isDone ? "bg-emerald-50" : "bg-slate-50"}`}>
                                  {isDone ? <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" /> : <Icon size={14} className="text-slate-400 flex-shrink-0" />}
                                  <span className="text-sm text-slate-700 truncate flex-1">{stop.location || "—"}</span>
                                  {!isDone && (
                                    <button
                                      onClick={() => handleCompleteOverrideStop(index)}
                                      disabled={!isActionable || completingOverrideStop === index}
                                      className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-white bg-primary hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                                    >
                                      {completingOverrideStop === index ? "..." : stop.type === "loading" ? "Mark Loaded" : "Mark Unloaded"}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Force Status</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <select
                            value={effectiveForceStatus}
                            onChange={(e) => setSelectedForceStatus(e.target.value)}
                            className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:border-primary"
                          >
                            {forwardStatusOptions.map((s) => (
                              <option key={s} value={s}>{formatBookingStatus(s)}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => setForceStatusConfirmOpen(true)}
                            disabled={!effectiveForceStatus || applyingForceStatus}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-amber-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
                          >
                            {applyingForceStatus ? "Applying..." : "Apply"}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-100 shadow-card p-2 overflow-hidden">
              <RouteMapPanel
                pickup={{ location: booking.pickup, lat: booking.pickupLat, lng: booking.pickupLng }}
                drop={{ location: booking.drop, lat: booking.dropLat, lng: booking.dropLng }}
                currentLocation={booking.currentLat != null && booking.currentLng != null ? { lat: booking.currentLat, lng: booking.currentLng } : null}
                stops={booking.stops || []}
                isPrePickup={["Accepted", "Assigned", "En Route Pickup"].includes(booking.status)}
              />
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-card p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Job Details</p>
              <div>
                <DetailRow icon={Truck} label="Truck" value={booking.truckReg || "—"} />
                <DetailRow icon={User} label="Driver" value={booking.driver?.name || "—"} />
                {booking.driver?.phone && <DetailRow icon={Phone} label="Driver Phone" value={booking.driver.phone} />}
                <DetailRow icon={Calendar} label="Date" value={formatDate(booking.date || booking.createdAt)} />
                <DetailRow icon={Ruler} label="Distance" value={booking.distance ? `${booking.distance} km` : "—"} />
                <DetailRow icon={Package} label="Cargo" value={`${booking.material || "—"} · ${booking.weight ? `${booking.weight} ${booking.weightUnit || ""}`.trim() : "—"}`} />
              </div>
            </div>

            {(booking.stops || []).some((s) => s.type === "loading" || s.type === "unloading") && (
              <div className="bg-white rounded-xl border border-slate-100 shadow-card p-4 lg:col-span-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Loading &amp; Unloading Stops</p>
                <div className="space-y-1.5">
                  {booking.stops.map((stop, index) => {
                    if (stop.type !== "loading" && stop.type !== "unloading") return null;
                    const isDone = stop.status === "done";
                    const Icon = stop.type === "loading" ? PackagePlus : PackageMinus;
                    return (
                      <div key={index} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${isDone ? "bg-emerald-50" : "bg-slate-50"}`}>
                        {isDone ? <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" /> : <Circle size={15} className="text-slate-300 flex-shrink-0" />}
                        <Icon size={14} className="text-slate-400 flex-shrink-0" />
                        <span className="text-sm text-slate-700 truncate flex-1">{stop.location || "—"}</span>
                        <span className={`text-[11px] font-semibold flex-shrink-0 ${isDone ? "text-emerald-600" : "text-slate-400"}`}>{isDone ? "Done" : "Pending"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-slate-100 shadow-card p-4 lg:col-span-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Earnings &amp; Payment</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1"><IndianRupee size={11} /> Amount</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{formatCurrency(booking.amount)}</p>
                  {booking.haltingCharge > 0 && (
                    <p className="text-[10px] text-amber-600 font-medium mt-1">
                      Incl. halting charge ({booking.haltingHours}h overage): {formatCurrency(booking.haltingCharge)}
                    </p>
                  )}
                  {booking.slaOverageCharge > 0 && (
                    <p className="text-[10px] text-amber-600 font-medium mt-1">
                      Incl. delay charge ({booking.slaOverageHours}h over SLA): {formatCurrency(booking.slaOverageCharge)}
                    </p>
                  )}
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Platform Fee</p>
                  <p className="text-sm font-bold text-red-500 mt-0.5">{formatCurrency(booking.platformFee)}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] text-emerald-600 font-semibold uppercase">Net Earnings</p>
                  <p className="text-sm font-bold text-emerald-700 mt-0.5">{formatCurrency(Number(booking.amount || 0) - Number(booking.platformFee || 0))}</p>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Payment Status</p>
                  <p className="mt-0.5"><Badge variant={PAYMENT_BADGE[booking.paymentStatus] || "default"} size="sm">{booking.paymentStatus || "pending"}</Badge></p>
                  {["pending", "partial"].includes(booking.paymentStatus) && !["Requested", "Confirmed", "Cancelled"].includes(booking.status) && (
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => handleCollectPayment("upi")}
                        disabled={collectingPayment}
                        className="flex-1 py-1.5 text-[11px] font-semibold rounded-md border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-all disabled:opacity-60"
                      >
                        UPI
                      </button>
                      <button
                        onClick={() => handleCollectPayment("cash")}
                        disabled={collectingPayment}
                        className="flex-1 py-1.5 text-[11px] font-semibold rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-60"
                      >
                        Cash
                      </button>
                    </div>
                  )}
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Payment Mode</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{formatPaymentMode(booking.paymentMode) || "—"}</p>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1"><Clock size={11} /> Time Taken</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{formatDuration(booking.timeTakenMinutes)}</p>
                </div>
              </div>
            </div>

            {booking.podMedia?.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-100 shadow-card p-4 lg:col-span-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Camera size={13} className="text-primary" /> Proof of Delivery
                </p>
                <PodGallery media={booking.podMedia} token={getToken()} />
              </div>
            )}

            {reassignmentHistory.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-100 shadow-card p-4 lg:col-span-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Reassignment History</p>
                <div className="space-y-2">
                  {reassignmentHistory.map((h) => (
                    <div key={h.id} className="flex items-start gap-3 bg-slate-50 rounded-lg px-3 py-2.5">
                      <Repeat size={14} className="text-primary mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-700">
                          <span className="font-semibold">{h.fromDriverName || "Unassigned"}</span>
                          <span className="text-slate-300 mx-1.5">→</span>
                          <span className="font-semibold">{h.toDriverName || "Unknown"}</span>
                        </p>
                        {h.reason && <p className="text-xs text-slate-500 mt-0.5">{h.reason}</p>}
                        <p className="text-[11px] text-slate-400 mt-1">By {h.reassignedByName || "—"} · {formatDateTime(h.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <ConfirmDialog
            isOpen={deleteOpen} onClose={() => setDeleteOpen(false)}
            onConfirm={handleDelete}
            title="Remove from my list?"
            message="This only removes it from your own list — it stays visible to admin. There's no undo."
            confirmText={deleting ? "Removing..." : "Remove"}
            variant="danger"
          />

          <ConfirmDialog
            isOpen={forceStatusConfirmOpen} onClose={() => setForceStatusConfirmOpen(false)}
            onConfirm={handleForceStatus}
            title={`Force status to "${formatBookingStatus(effectiveForceStatus)}"?`}
            message="This will override the driver's own status update. Use this only if the driver can't act themselves."
            confirmText={applyingForceStatus ? "Applying..." : "Force Status"}
            variant={effectiveForceStatus === "cancelled" ? "danger" : "warning"}
          />

          <InvoiceEmailModal
            isOpen={emailOpen}
            onClose={() => setEmailOpen(false)}
            bookingId={id}
            defaultTo={booking.clientEmail || ""}
            bookingRef={bookingRef(booking)}
          />

          <Modal isOpen={showChat} onClose={() => setShowChat(false)} title="Chat" size="sm">
            <ChatWindow bookingId={booking.id} currentUserId={user?.id} />
          </Modal>
        </>
      ) : null}
    </div>
  );
}
