import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Truck, User, Phone, Package, Ruler, IndianRupee, Calendar, Clock, Download, Mail, Share2, Send } from "lucide-react";
import Badge from "../../components/driver/Badge";
import RouteMapPanel from "../../components/driver/RouteMapPanel";
import InvoiceEmailModal from "../../components/InvoiceEmailModal";
import { api, getToken } from "../../services/api";
import { adaptTrip, bookingRef, formatCurrency, formatDate, formatDuration, shareInvoicePdf } from "../../utils";
import { useToast } from "../../hooks/useToast";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const INVOICE_READY_STATUSES = ["Delivered", "Completed"];

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

export default function TripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [notifying, setNotifying] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/trips/${id}`, getToken());
      if (!response?.success || !response.data?.trip) throw new Error(response?.message || "Trip not found");
      setTrip(adaptTrip(response.data.trip));
    } catch (err) {
      setError(err.message || "Failed to load trip details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDownloadInvoice = async () => {
    setDownloading(true);
    try {
      const blobUrl = await api.getFileBlobUrl(`${API_BASE}/api/bookings/${trip.bookingId}/invoice`, getToken());
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `invoice-${trip.bookingNumber}.pdf`;
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
      const blob = await api.getFileBlob(`${API_BASE}/api/bookings/${trip.bookingId}/invoice`, getToken());
      await shareInvoicePdf({
        blob,
        filename: `invoice-${trip.bookingNumber}.pdf`,
        text: `Invoice for ${bookingRef(trip)} (${trip.pickup?.location} → ${trip.drop?.location}, ${formatCurrency(trip.earnings)}) — see attached.`,
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
      const res = await api.post(`/api/bookings/${trip.bookingId}/invoice/notify`, {}, getToken());
      if (!res?.success) throw new Error(res?.message || "Failed to notify client");
      addToast("Client notified — invoice shared to their portal.", "success");
    } catch (err) {
      addToast(err.message || "Failed to notify client.", "error");
    } finally {
      setNotifying(false);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft size={15} /> Back
      </button>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-slate-400">Loading trip details...</div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-red-500 flex flex-col items-center gap-2">
          <span>{error}</span>
          <button onClick={load} className="underline text-sm">Retry</button>
        </div>
      ) : trip ? (
        <>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-slate-400">{bookingRef(trip)}</span>
                <Badge status={trip.status} />
              </div>
              <h1 className="text-xl font-bold text-slate-900">{trip.pickup?.location} <span className="text-slate-300">→</span> {trip.drop?.location}</h1>
            </div>
            {INVOICE_READY_STATUSES.includes(trip.status) ? (
              <div className="flex items-center gap-2 flex-wrap justify-end flex-shrink-0">
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
              </div>
            ) : (
              <span className="text-xs text-slate-400 italic px-1 flex-shrink-0">Invoice available once delivery is complete</span>
            )}
          </div>

          <InvoiceEmailModal
            isOpen={emailOpen}
            onClose={() => setEmailOpen(false)}
            bookingId={trip.bookingId}
            defaultTo=""
            bookingRef={bookingRef(trip)}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-100 shadow-card p-2 overflow-hidden">
              <RouteMapPanel pickup={trip.pickup} drop={trip.drop} currentLocation={trip.currentLocation} />
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-card p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Trip Details</p>
              <div>
                <DetailRow icon={Truck} label="Truck" value={trip.truckReg || "—"} />
                <DetailRow icon={User} label="Broker" value={trip.broker || "—"} />
                {trip.brokerPhone && <DetailRow icon={Phone} label="Broker Phone" value={trip.brokerPhone} />}
                <DetailRow icon={Calendar} label="Date" value={formatDate(trip.createdAt)} />
                <DetailRow icon={Ruler} label="Distance" value={trip.distance ? `${trip.distance} km` : "—"} />
                <DetailRow icon={Clock} label="Time Taken" value={formatDuration(trip.timeTakenMinutes)} />
                <DetailRow icon={Package} label="Cargo" value={`${trip.cargo?.material || "—"} · ${trip.cargo?.weight ? `${trip.cargo.weight} tons` : "—"}`} />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-card p-4 lg:col-span-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Earnings</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1"><IndianRupee size={11} /> Earnings</p>
                  <p className="text-sm font-bold text-emerald-700 mt-0.5">{formatCurrency(trip.earnings)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Payment Status</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5 capitalize">{trip.paymentStatus || "—"}</p>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Started</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{trip.startedAt ? formatDate(trip.startedAt) : "—"}</p>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Delivered</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{trip.deliveredAt ? formatDate(trip.deliveredAt) : "—"}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
