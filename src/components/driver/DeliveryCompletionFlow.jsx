import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Phone, MapPin, Check, X, Plus, CheckCheck, AlertTriangle } from "lucide-react";
import Badge from "./Badge";
import ExpressBadge from "../ExpressBadge";
import SwipeToConfirm from "./SwipeToConfirm";
import { useToast } from "../../hooks/useToast";
import { api, getToken } from "../../services/api";
import { adaptTrip, bookingRef, formatCurrency } from "../../utils";
import { compressImage } from "../../lib/imageCompression";

const MAX_MEDIA = 6;
// Mirrors the backend's own minRequired (POST /api/trips/:id/pod's minRequired, and the 409
// PATCH /api/trips/:id/status now throws below this) — enforced client-side too so the driver
// never gets to the "Submit" tap only to be told by the server that 1 wasn't enough.
const MIN_MEDIA = 2;

// POD media (photos and now videos) and the driver's QR are served from routes behind
// `authenticate` (they carry per-user access checks) — a plain <img src="..."> can't attach a
// Bearer token, so it 401s. This fetches the bytes with the token and renders them as a blob
// URL instead, as either an <img> or a <video> depending on the item's `type`.
function AuthMedia({ src, type, alt, className }) {
  const [blobUrl, setBlobUrl] = useState(null);

  useEffect(() => {
    if (!src) {
      setBlobUrl(null);
      return;
    }
    let cancelled = false;
    let objectUrl = null;
    api.getFileBlobUrl(src, getToken())
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setBlobUrl(url);
      })
      .catch(() => { if (!cancelled) setBlobUrl(null); });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (!blobUrl) return <div className={`${className} bg-slate-100 animate-pulse`} />;
  if (type === "video") return <video src={blobUrl} className={className} controls />;
  return <img src={blobUrl} alt={alt} className={className} />;
}

// Money is still owed in either state — 'partial' means the client already paid a 20% advance
// up front (see ADVANCE_PAYMENT_THRESHOLD in gadidosti-backend's booking.controller.js) but the
// remaining balance still needs collecting here; only 'paid' has nothing left to do.
const PAYMENT_DUE_STATUSES = ["pending", "partial"];

// Where to resume the flow if the driver closes the app mid-completion and comes back —
// derives the step purely from server state (trip status / podPhotos / paymentStatus)
// rather than any local flag, so a fresh page load always lands in the right place.
const resolveInitialStep = (trip) => {
  if (trip.rawStatus === "delivered") {
    const uploadedCount = trip.podPhotos?.length || 0;
    if (uploadedCount < (trip.podMinRequired || MIN_MEDIA)) return "upload";
    if (PAYMENT_DUE_STATUSES.includes(trip.paymentStatus)) return "payments";
    return "complete";
  }
  return "arrived";
};

const ALL_STEPS = [
  { key: "arrived", label: "Arrived" },
  { key: "upload", label: "Upload" },
  { key: "payments", label: "Payments" },
  { key: "complete", label: "Complete" },
];

// A compact wizard progress bar so the flow reads as a deliberate multi-step sequence on a
// wide desktop viewport, instead of a single card floating in a lot of empty space with no
// sense of where you are in the process. `includePayments` is fixed once at mount (see
// DeliveryCompletionFlow) so the step count never jumps mid-flow after payment is collected.
function StepProgress({ current, includePayments }) {
  const steps = includePayments ? ALL_STEPS : ALL_STEPS.filter((s) => s.key !== "payments");
  const currentIndex = steps.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center mb-8">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-colors ${
              i < currentIndex ? "bg-emerald-500 text-white" : i === currentIndex ? "bg-primary text-white" : "bg-slate-100 text-slate-400"
            }`}>
              {i < currentIndex ? <Check size={13} /> : i + 1}
            </div>
            <span className={`text-xs font-semibold whitespace-nowrap ${i === currentIndex ? "text-slate-800" : "text-slate-400"}`}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-3 rounded-full transition-colors ${i < currentIndex ? "bg-emerald-500" : "bg-slate-100"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: Arrived ───────────────────────────────────────────────────────────
function ArrivedStep({ trip, onConfirm, loading }) {
  const contactPhone = trip.drop?.contactPhone || trip.clientPhone;
  const contactName = trip.drop?.contactPerson || trip.clientName;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Delivery</p>
          <h2 className="text-lg font-bold text-slate-900 mt-0.5">{bookingRef(trip)}</h2>
          <div className="mt-2 flex items-center gap-1.5"><Badge status={trip.status} />{trip.isExpress && <ExpressBadge />}</div>
        </div>
        {contactPhone && (
          <a
            href={`tel:${contactPhone}`}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 text-primary rounded-lg text-xs font-semibold flex-shrink-0"
          >
            <Phone className="w-4 h-4" /> Call{contactName ? ` ${contactName.split(" ")[0]}` : ""}
          </a>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <MapPin className="w-10 h-10 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Reached the drop location?</h3>
        <p className="text-sm text-slate-400 mt-1">{trip.drop?.location}</p>
      </div>

      <div className="mt-8">
        <SwipeToConfirm label="Swipe to confirm arrival" onConfirm={onConfirm} loading={loading} />
      </div>
    </div>
  );
}

// ─── Step 2: Upload photo/video ────────────────────────────────────────────────
function UploadPhotosStep({ existingMedia, onSubmit, loading }) {
  const [files, setFiles] = useState([]);
  const inputRef = useRef(null);
  const totalCount = existingMedia.length + files.length;
  const remainingSlots = MAX_MEDIA - totalCount;

  const handleFilesSelected = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (!picked.length) return;
    const allowed = picked.slice(0, Math.max(0, remainingSlots));
    setFiles((prev) => [...prev, ...allowed.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))]);
  };

  const removeFile = (index) => setFiles((prev) => prev.filter((_, i) => i !== index));

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-lg font-bold text-slate-900 mb-1">Upload Proof of Delivery</h2>
      <p className="text-sm text-slate-400 mb-5">Add photos or videos of the delivered cargo (at least {MIN_MEDIA})</p>

      <div className="grid grid-cols-3 gap-3 mb-3">
        {existingMedia.map((item, i) => (
          <div key={`existing-${i}`} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200">
            <AuthMedia src={item.url} type={item.type} alt="" className="w-full h-full object-cover" />
            <span className="absolute bottom-1 right-1 bg-emerald-500 text-white rounded-full p-0.5"><Check className="w-3 h-3" /></span>
          </div>
        ))}
        {files.map((f, i) => {
          const isVideo = f.file.type?.startsWith("video/");
          return (
            <div key={`new-${i}`} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200">
              {isVideo ? (
                <video src={f.previewUrl} className="w-full h-full object-cover" controls />
              ) : (
                <img src={f.previewUrl} alt="" className="w-full h-full object-cover" />
              )}
              <button
                onClick={() => removeFile(i)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
        {totalCount < MAX_MEDIA && (
          <button
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="text-[10px] font-semibold mt-1">More</span>
          </button>
        )}
      </div>

      <p className="text-xs text-slate-400 mb-1">{totalCount} of {MAX_MEDIA} photos/videos added</p>
      {totalCount < MIN_MEDIA && (
        <p className="text-xs text-amber-600 font-medium mb-5">Add at least {MIN_MEDIA - totalCount} more to continue.</p>
      )}
      {totalCount >= MIN_MEDIA && <div className="mb-5" />}

      <input ref={inputRef} type="file" accept="image/*,video/*" capture="environment" multiple className="hidden" onChange={handleFilesSelected} />

      <div className="mt-auto">
        <button
          onClick={() => onSubmit(files.map((f) => f.file))}
          disabled={totalCount < MIN_MEDIA || loading}
          className="w-full py-4 rounded-xl font-semibold text-[15px] text-white bg-primary disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] transition-all"
        >
          {loading ? "Uploading..." : "Submit Photos/Videos"}
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Payments (conditional — only when paymentStatus is 'pending') ─────
// No QR upload/display here — the driver just tells the client to pay via whatever UPI means
// they already use (or takes cash) and taps the matching button below once received.
// UPI deep-link intent — every UPI app (GPay, PhonePe, Paytm, ...) understands this exact URI
// scheme when scanned as a QR. Baking `am` (amount) in directly is the whole point versus the
// old static uploaded-QR-image approach: the customer never has to type an amount by hand, and
// the driver never has to keep re-uploading a new QR per trip — one saved UPI ID (Profile ->
// UPI Payment ID) regenerates correctly for every trip's own amount.
const buildUpiIntent = ({ upiId, payeeName, amount, note }) => (
  `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}` +
  `&am=${Number(amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`
);

function PaymentsStep({ trip, onCollect, collecting }) {
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [qrError, setQrError] = useState(false);
  // Which QR to show is the driver's own call, made fresh for every collection — not a saved
  // preference. Defaults to "personal" (today's only behavior) and is only ever offered as a
  // choice when both are configured; see hasPersonalUpi/hasCompanyUpi below.
  const [qrSource, setQrSource] = useState("personal");

  const hasPersonalUpi = !!trip.driverUpiId;
  const hasCompanyUpi = !!trip.companyUpiId;
  // If only one side is configured, use it regardless of qrSource — no toggle is rendered in
  // that case, so there's nothing for the driver to have chosen.
  const activeSource = hasPersonalUpi && hasCompanyUpi ? qrSource : hasCompanyUpi ? "company" : "personal";
  const activeUpiId = activeSource === "company" ? trip.companyUpiId : trip.driverUpiId;
  const activePayeeName = activeSource === "company" ? (trip.companyUpiName || "GadiDost Logistics") : (trip.driverName || "Driver");

  useEffect(() => {
    if (!activeUpiId || !trip.amountToCollect) {
      setQrDataUrl(null);
      return undefined;
    }
    let cancelled = false;
    const upiUrl = buildUpiIntent({
      upiId: activeUpiId,
      payeeName: activePayeeName,
      amount: trip.amountToCollect,
      note: `Payment for ${bookingRef(trip)}`,
    });
    QRCode.toDataURL(upiUrl, { width: 220, margin: 1 })
      .then((url) => { if (!cancelled) { setQrDataUrl(url); setQrError(false); } })
      .catch(() => { if (!cancelled) setQrError(true); });
    return () => { cancelled = true; };
  }, [activeUpiId, activePayeeName, trip.amountToCollect, trip.id]);

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-lg font-bold text-slate-900 mb-1">Collect Payment</h2>
      <p className="text-sm text-slate-400 mb-5">
        {trip.paymentStatus === "partial"
          ? "The client already paid a 20% advance online — collect the remaining balance below."
          : "Payment for this delivery is still pending"}
      </p>

      <div className="bg-slate-50 rounded-xl p-5 text-center mb-4">
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">
          {trip.paymentStatus === "partial" ? "Remaining Balance to Collect" : "Amount to Collect"}
        </p>
        <p className="text-3xl font-bold text-slate-900 mt-1">{formatCurrency(trip.amountToCollect)}</p>
        {trip.haltingCharge > 0 && (
          <p className="text-[11px] text-amber-600 font-medium mt-2">
            Includes halting charge ({trip.haltingHours}h overage): {formatCurrency(trip.haltingCharge)} — already folded into the amount above
          </p>
        )}
        {trip.slaOverageCharge > 0 && (
          <p className="text-[11px] text-amber-600 font-medium mt-2">
            Includes delay charge ({trip.slaOverageHours}h over the expected delivery time): {formatCurrency(trip.slaOverageCharge)} — already folded into the amount above
          </p>
        )}
      </div>

      {hasPersonalUpi || hasCompanyUpi ? (
        <div className="bg-white border border-slate-100 rounded-xl p-5 mb-4 text-center">
          {hasPersonalUpi && hasCompanyUpi && (
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit mx-auto mb-4">
              <button
                onClick={() => setQrSource("personal")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${qrSource === "personal" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Personal QR
              </button>
              <button
                onClick={() => setQrSource("company")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${qrSource === "company" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                Company QR
              </button>
            </div>
          )}
          {qrDataUrl ? (
            <>
              <img src={qrDataUrl} alt="UPI payment QR" className="w-44 h-44 mx-auto rounded-lg" />
              <p className="text-xs text-slate-400 mt-3">Ask the customer to scan &amp; pay {formatCurrency(trip.amountToCollect)} via any UPI app</p>
            </>
          ) : qrError ? (
            <p className="text-xs text-danger">Couldn't generate the QR code — collect via UPI ID or cash instead.</p>
          ) : (
            <div className="w-44 h-44 mx-auto rounded-lg bg-slate-100 animate-pulse" />
          )}
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4 text-center">
          <p className="text-xs text-amber-700">Add your UPI ID in Profile to show a scannable payment QR here next time.</p>
        </div>
      )}

      <div className="mt-auto space-y-3">
        <button
          onClick={() => onCollect("upi")}
          disabled={collecting}
          className="w-full py-4 rounded-xl font-semibold text-[15px] text-white bg-primary disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] transition-all"
        >
          {collecting ? "Confirming..." : "Payment Received via UPI"}
        </button>
        <button
          onClick={() => onCollect("cash")}
          disabled={collecting}
          className="w-full py-4 rounded-xl font-semibold text-[15px] text-slate-700 bg-slate-100 disabled:opacity-50 hover:bg-slate-200 active:scale-[0.98] transition-all"
        >
          Collect Cash
        </button>
      </div>
    </div>
  );
}

// ─── Step 4: Complete ───────────────────────────────────────────────────────────
function CompleteStep({ trip, completing, error, onRetry, onBack }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
      {completing ? (
        <>
          <span className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-sm text-slate-400">Finishing up...</p>
        </>
      ) : error ? (
        <>
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Couldn't complete the trip</h3>
          <p className="text-sm text-slate-400 mb-6">{error}</p>
          <button onClick={onRetry} className="px-6 py-3 rounded-xl font-semibold text-sm text-white bg-primary hover:opacity-90 active:scale-[0.98] transition-all">
            Try Again
          </button>
        </>
      ) : (
        <>
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
            <CheckCheck className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Trip {bookingRef(trip)} has been completed successfully</h3>
          <p className="text-sm text-slate-400 mb-8">Payment and delivery marked complete</p>
          <button onClick={onBack} className="px-6 py-3 rounded-xl font-semibold text-sm text-white bg-primary hover:opacity-90 active:scale-[0.98] transition-all">
            Back to Trips
          </button>
        </>
      )}
    </div>
  );
}

// ─── Flow container ─────────────────────────────────────────────────────────────
// Rebuilds the driver's delivery-completion sequence as dedicated step screens
// (Arrived -> Upload picture -> Payments (conditional) -> Complete) instead of the old
// single "Mark as Delivered" -> "Upload Proof of Delivery" button pair. MyTrip.jsx renders
// this in place of the normal trip page once the driver commits to completing delivery.
export default function DeliveryCompletionFlow({ trip: initialTrip, onExit }) {
  const { addToast } = useToast();
  const [trip, setTrip] = useState(initialTrip);
  const [step, setStep] = useState(() => resolveInitialStep(initialTrip));
  // Fixed once at mount so the step count in the progress bar never jumps mid-flow —
  // paymentStatus flips to "paid" partway through once collected, but by then the driver
  // has already moved past that step.
  const [includePayments] = useState(() => PAYMENT_DUE_STATUSES.includes(initialTrip.paymentStatus));
  const [confirmingArrival, setConfirmingArrival] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [collectingPayment, setCollectingPayment] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState(null);
  const autoRunRef = useRef(false);

  const handleConfirmArrival = async () => {
    setConfirmingArrival(true);
    try {
      const response = await api.patch(`/api/trips/${trip.id}/status`, { status: "delivered" }, getToken());
      if (!response.success) throw new Error(response.message || "Failed to update trip status");
      setTrip(adaptTrip(response.data.trip));
      setStep("upload");
    } catch (err) {
      addToast(err.message || "Failed to confirm arrival.", "error");
    } finally {
      setConfirmingArrival(false);
    }
  };

  const handleSubmitPhotos = async (files) => {
    if (!files.length) {
      setStep(PAYMENT_DUE_STATUSES.includes(trip.paymentStatus) ? "payments" : "complete");
      return;
    }
    setUploadingPhotos(true);
    try {
      // Raw camera photos are compressed before upload — see imageCompression.js for why
      // ("request entity too large" on a full batch of uncompressed photos). Videos pass
      // through compressImage unchanged (it only ever touches image/* files) — compressing
      // video client-side is a different problem entirely and out of scope here.
      const compressed = await Promise.all(files.map((file) => compressImage(file)));
      const formData = new FormData();
      compressed.forEach((file) => formData.append("files", file));
      const response = await api.upload(`/api/trips/${trip.id}/pod`, formData, getToken());
      if (!response.success) throw new Error(response.message || "Failed to upload photos/videos");
      setTrip((prev) => ({
        ...prev,
        podPhotos: response.data?.podPhotos || prev.podPhotos,
        podMedia: response.data?.podMedia || prev.podMedia,
      }));
      addToast("Photos/videos uploaded.", "success");
      setStep(PAYMENT_DUE_STATUSES.includes(trip.paymentStatus) ? "payments" : "complete");
    } catch (err) {
      addToast(err.message || "Failed to upload photos/videos.", "error");
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleCollectPayment = async (mode) => {
    setCollectingPayment(true);
    try {
      const response = await api.patch(`/api/trips/${trip.id}/collect-payment`, { mode }, getToken());
      if (!response.success) throw new Error(response.message || "Failed to record payment");
      setTrip((prev) => ({ ...prev, paymentStatus: "paid" }));
      setStep("complete");
    } catch (err) {
      addToast(err.message || "Failed to record payment.", "error");
    } finally {
      setCollectingPayment(false);
    }
  };

  const runCompletion = async () => {
    setCompleting(true);
    setCompleteError(null);
    try {
      const response = await api.patch(`/api/trips/${trip.id}/status`, { status: "completed" }, getToken());
      if (!response.success) throw new Error(response.message || "Failed to complete the trip");
    } catch (err) {
      setCompleteError(err.message || "Failed to complete the trip.");
    } finally {
      setCompleting(false);
    }
  };

  // Auto-fires the completion PATCH the moment this step is reached — settlement/total_trips
  // side effects live entirely in the existing PATCH /trips/:id/status handler, untouched here.
  useEffect(() => {
    if (step === "complete" && !autoRunRef.current) {
      autoRunRef.current = true;
      runCompletion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-6 md:p-8 min-h-[520px] flex flex-col">
        <StepProgress current={step} includePayments={includePayments} />
        {step === "arrived" && <ArrivedStep trip={trip} onConfirm={handleConfirmArrival} loading={confirmingArrival} />}
        {step === "upload" && (
          <UploadPhotosStep
            existingMedia={trip.podMedia?.length ? trip.podMedia : (trip.podPhotos || []).map((url) => ({ url, type: "image" }))}
            onSubmit={handleSubmitPhotos}
            loading={uploadingPhotos}
          />
        )}
        {step === "payments" && (
          <PaymentsStep
            trip={trip}
            onCollect={handleCollectPayment}
            collecting={collectingPayment}
          />
        )}
        {step === "complete" && (
          <CompleteStep trip={trip} completing={completing} error={completeError} onRetry={runCompletion} onBack={onExit} />
        )}
      </div>
    </div>
  );
}
