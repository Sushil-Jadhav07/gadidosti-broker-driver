import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Truck, User, Phone, Package, Ruler, IndianRupee, Calendar, Trash2, Download, Mail, Clock, Share2, Send, PackagePlus, PackageMinus, CheckCircle2, Circle, ClipboardCheck } from "lucide-react";
import Badge from "../../components/broker/Badge";
import ConfirmDialog from "../../components/broker/ConfirmDialog";
import RouteMapPanel from "../../components/driver/RouteMapPanel";
import DeliveryCompletionFlow from "../../components/driver/DeliveryCompletionFlow";
import InvoiceEmailModal from "../../components/InvoiceEmailModal";
import { useToast } from "../../hooks/useToast";
import { useTripStatusSocket } from "../../hooks/useTripStatusSocket";
import { api, getToken } from "../../services/api";
import { adaptBooking, adaptTrip, bookingRef, formatCurrency, formatDate, formatDuration, shareInvoicePdf } from "../../utils";

const INVOICE_READY_STATUSES = ["Delivered", "Completed"];

const STATUS_BADGE = { Completed: "success", Cancelled: "danger" };
const PAYMENT_BADGE = { paid: "success", pending: "warning", refunded: "default" };
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
  const { addToast } = useToast();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [notifying, setNotifying] = useState(false);
  // Lets the broker finish proof-of-delivery + payment collection on a driver's behalf —
  // e.g. the driver marked the trip delivered and then logged out/is unreachable. Only
  // fetched on demand (not on every load) since it's only relevant once status is Delivered.
  const [completingTrip, setCompletingTrip] = useState(null);
  const [loadingCompletion, setLoadingCompletion] = useState(false);

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
          canUploadQr={false}
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
              </div>
              <h1 className="text-xl font-bold text-slate-900">{booking.pickup} <span className="text-slate-300">→</span> {booking.drop}</h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end flex-shrink-0">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-100 shadow-card p-2 overflow-hidden">
              <RouteMapPanel
                pickup={{ location: booking.pickup, lat: booking.pickupLat, lng: booking.pickupLng }}
                drop={{ location: booking.drop, lat: booking.dropLat, lng: booking.dropLng }}
                currentLocation={booking.currentLat != null && booking.currentLng != null ? { lat: booking.currentLat, lng: booking.currentLng } : null}
                stops={booking.stops || []}
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
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Payment Mode</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5 capitalize">{booking.paymentMode || "—"}</p>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1"><Clock size={11} /> Time Taken</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{formatDuration(booking.timeTakenMinutes)}</p>
                </div>
              </div>
            </div>
          </div>

          <ConfirmDialog
            isOpen={deleteOpen} onClose={() => setDeleteOpen(false)}
            onConfirm={handleDelete}
            title="Remove from my list?"
            message="This only removes it from your own list — it stays visible to admin. There's no undo."
            confirmText={deleting ? "Removing..." : "Remove"}
            variant="danger"
          />

          <InvoiceEmailModal
            isOpen={emailOpen}
            onClose={() => setEmailOpen(false)}
            bookingId={id}
            defaultTo={booking.clientEmail || ""}
            bookingRef={bookingRef(booking)}
          />
        </>
      ) : null}
    </div>
  );
}
