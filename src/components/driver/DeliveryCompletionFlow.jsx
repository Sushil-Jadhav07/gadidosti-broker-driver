import { useEffect, useRef, useState } from "react";
import { Phone, MapPin, Check, X, Plus, QrCode, CheckCheck, AlertTriangle } from "lucide-react";
import Badge from "./Badge";
import SwipeToConfirm from "./SwipeToConfirm";
import { useToast } from "../../hooks/useToast";
import { api, getToken } from "../../services/api";
import { adaptTrip, bookingRef, formatCurrency } from "../../utils";

const MAX_PHOTOS = 6;

// POD photos and the driver's QR are served from routes behind `authenticate` (they carry
// per-user access checks) — a plain <img src="..."> can't attach a Bearer token, so it 401s.
// This fetches the bytes with the token and renders them as a blob URL instead.
function AuthImage({ src, alt, className }) {
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
    if (!trip.podPhotos?.length) return "upload";
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
          <div className="mt-2"><Badge status={trip.status} /></div>
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

// ─── Step 2: Upload picture ────────────────────────────────────────────────────
function UploadPhotosStep({ existingPhotos, onSubmit, loading }) {
  const [files, setFiles] = useState([]);
  const inputRef = useRef(null);
  const totalCount = existingPhotos.length + files.length;
  const remainingSlots = MAX_PHOTOS - totalCount;

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
      <p className="text-sm text-slate-400 mb-5">Add photos of the delivered cargo</p>

      <div className="grid grid-cols-3 gap-3 mb-3">
        {existingPhotos.map((url, i) => (
          <div key={`existing-${i}`} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200">
            <AuthImage src={url} alt="" className="w-full h-full object-cover" />
            <span className="absolute bottom-1 right-1 bg-emerald-500 text-white rounded-full p-0.5"><Check className="w-3 h-3" /></span>
          </div>
        ))}
        {files.map((f, i) => (
          <div key={`new-${i}`} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200">
            <img src={f.previewUrl} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => removeFile(i)}
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {totalCount < MAX_PHOTOS && (
          <button
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="text-[10px] font-semibold mt-1">More</span>
          </button>
        )}
      </div>

      <p className="text-xs text-slate-400 mb-6">{totalCount} of {MAX_PHOTOS} photos added</p>

      <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleFilesSelected} />

      <div className="mt-auto">
        <button
          onClick={() => onSubmit(files.map((f) => f.file))}
          disabled={totalCount < 1 || loading}
          className="w-full py-4 rounded-xl font-semibold text-[15px] text-white bg-primary disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] transition-all"
        >
          {loading ? "Uploading..." : "Submit Photos"}
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Payments (conditional — only when paymentStatus is 'pending') ─────
// canUploadQr is false when this flow is being run by a broker completing on a driver's
// behalf — the QR-upload endpoint (POST /api/vehicles/drivers/me/payment-qr) is scoped to
// "my own" driver profile, so it doesn't make sense (and would fail) for a broker to call. The
// broker can still see whichever QR the driver already saved, just can't add/replace it.
function PaymentsStep({ trip, onCollect, collecting, uploadingQr, onUploadQr, canUploadQr = true }) {
  const qrInputRef = useRef(null);

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
      </div>

      <div className="bg-white border border-slate-100 rounded-xl p-5 mb-4 text-center">
        {trip.driverQrUrl ? (
          <>
            <AuthImage src={trip.driverQrUrl} alt="Driver's UPI QR" className="w-40 h-40 mx-auto rounded-lg object-contain border border-slate-100" />
            <p className="text-xs text-slate-400 mt-3">Show this QR to the customer to scan &amp; pay</p>
            {canUploadQr && (
              <button onClick={() => qrInputRef.current?.click()} disabled={uploadingQr} className="text-xs font-semibold text-primary mt-2">
                {uploadingQr ? "Uploading..." : "Replace QR"}
              </button>
            )}
          </>
        ) : canUploadQr ? (
          <button
            onClick={() => qrInputRef.current?.click()}
            disabled={uploadingQr}
            className="w-full py-6 rounded-lg border-2 border-dashed border-slate-200 text-slate-400 hover:border-primary hover:text-primary transition-colors flex flex-col items-center gap-2"
          >
            <QrCode className="w-6 h-6" />
            <span className="text-xs font-semibold">{uploadingQr ? "Uploading..." : "+ Add your QR"}</span>
          </button>
        ) : (
          <p className="text-xs text-slate-400 py-4">No UPI QR on file for this driver — collect cash instead.</p>
        )}
        {canUploadQr && (
          <input
            ref={qrInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) onUploadQr(file);
            }}
          />
        )}
      </div>

      <div className="mt-auto space-y-3">
        <button
          onClick={() => onCollect("upi")}
          disabled={!trip.driverQrUrl || collecting}
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
export default function DeliveryCompletionFlow({ trip: initialTrip, onExit, canUploadQr = true }) {
  const { addToast } = useToast();
  const [trip, setTrip] = useState(initialTrip);
  const [step, setStep] = useState(() => resolveInitialStep(initialTrip));
  // Fixed once at mount so the step count in the progress bar never jumps mid-flow —
  // paymentStatus flips to "paid" partway through once collected, but by then the driver
  // has already moved past that step.
  const [includePayments] = useState(() => PAYMENT_DUE_STATUSES.includes(initialTrip.paymentStatus));
  const [confirmingArrival, setConfirmingArrival] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
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
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      const response = await api.upload(`/api/trips/${trip.id}/pod`, formData, getToken());
      if (!response.success) throw new Error(response.message || "Failed to upload photos");
      setTrip((prev) => ({ ...prev, podPhotos: response.data?.podPhotos || prev.podPhotos }));
      addToast("Photos uploaded.", "success");
      setStep(PAYMENT_DUE_STATUSES.includes(trip.paymentStatus) ? "payments" : "complete");
    } catch (err) {
      addToast(err.message || "Failed to upload photos.", "error");
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleUploadQr = async (file) => {
    setUploadingQr(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.upload("/api/vehicles/drivers/me/payment-qr", formData, getToken());
      if (!response.success) throw new Error(response.message || "Failed to upload QR");
      setTrip((prev) => ({ ...prev, driverQrUrl: response.data?.paymentQrUrl }));
      addToast("QR uploaded.", "success");
    } catch (err) {
      addToast(err.message || "Failed to upload QR.", "error");
    } finally {
      setUploadingQr(false);
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
          <UploadPhotosStep existingPhotos={trip.podPhotos || []} onSubmit={handleSubmitPhotos} loading={uploadingPhotos} />
        )}
        {step === "payments" && (
          <PaymentsStep
            trip={trip}
            onCollect={handleCollectPayment}
            collecting={collectingPayment}
            uploadingQr={uploadingQr}
            onUploadQr={handleUploadQr}
            canUploadQr={canUploadQr}
          />
        )}
        {step === "complete" && (
          <CompleteStep trip={trip} completing={completing} error={completeError} onRetry={runCompletion} onBack={onExit} />
        )}
      </div>
    </div>
  );
}
