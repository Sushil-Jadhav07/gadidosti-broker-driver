import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Phone, MapPin, Check, X, Plus, CheckCheck, AlertTriangle, Camera, Wallet, Clock3 } from "lucide-react";
import Badge from "./Badge";
import ExpressBadge from "../ExpressBadge";
import SwipeToConfirm from "./SwipeToConfirm";
import { useToast } from "../../hooks/useToast";
import { api, getToken, API_BASE } from "../../services/api";
import { adaptTrip, bookingRef, formatCurrency } from "../../utils";
import { compressImage } from "../../lib/imageCompression";
import { extractQrCrop } from "../../lib/qrCrop";
import { useTripStatusSocket } from "../../hooks/useTripStatusSocket";

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
    // A rejected POD sends the driver straight back to re-upload, even if the old (rejected)
    // photos still technically meet the minimum count — those don't count anymore.
    if (trip.podStatus === "rejected" || uploadedCount < (trip.podMinRequired || MIN_MEDIA)) return "upload";
    if (PAYMENT_DUE_STATUSES.includes(trip.paymentStatus)) return "payments";
    return "complete";
  }
  return "arrived";
};

const ALL_STEPS = [
  { key: "arrived", label: "Arrived", icon: MapPin },
  { key: "upload", label: "Upload", icon: Camera },
  { key: "payments", label: "Payments", icon: Wallet },
  { key: "complete", label: "Complete", icon: CheckCheck },
];

// A compact wizard progress bar so the flow reads as a deliberate multi-step sequence on a
// wide desktop viewport, instead of a single card floating in a lot of empty space with no
// sense of where you are in the process. `includePayments` is fixed once at mount (see
// DeliveryCompletionFlow) so the step count never jumps mid-flow after payment is collected.
// Labels sit below each icon (not beside it) so the connecting line reads as one continuous
// track across the full width — the mt-4 on that line is deliberate, not a magic number: it's
// half the w-9/h-9 circle's height, centering the track on the circle regardless of how tall
// the label text below happens to be.
function StepProgress({ current, includePayments }) {
  const steps = includePayments ? ALL_STEPS : ALL_STEPS.filter((s) => s.key !== "payments");
  const currentIndex = steps.findIndex((s) => s.key === current);

  return (
    <div className="flex items-start mb-8">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-start flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
              i < currentIndex ? "bg-emerald-500 text-white" :
              i === currentIndex ? "bg-primary text-white ring-4 ring-primary/15" :
              "bg-slate-100 text-slate-400"
            }`}>
              {i < currentIndex ? <Check size={16} /> : <s.icon size={16} />}
            </div>
            <span className={`text-[11px] font-semibold whitespace-nowrap ${
              i === currentIndex ? "text-slate-800" : i < currentIndex ? "text-emerald-600" : "text-slate-400"
            }`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-1 mx-2 mt-4 rounded-full transition-colors duration-300 ${i < currentIndex ? "bg-emerald-500" : "bg-slate-100"}`} />
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
function UploadPhotosStep({ existingMedia, onSubmit, loading, rejectionReason }) {
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

      {rejectionReason && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl p-4 mb-4">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">The customer rejected your last upload</p>
            <p className="text-xs text-red-500 mt-0.5">{rejectionReason}</p>
          </div>
        </div>
      )}

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

function PaymentsStep({ trip, onCollect, collecting, onVerifiedPaid }) {
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [qrError, setQrError] = useState(false);

  const hasPersonalUpi = !!trip.driverUpiId;
  const hasCompanyUpi = !!trip.companyUpiId;
  // Only offered when the backend's active payment gateway is Razorpay — see
  // gadidosti-backend's collect-payment/qr endpoints. Unlike the two UPI-intent QRs above,
  // this one is generated server-side and independently confirmed by Razorpay, so it doesn't
  // rely on the driver self-reporting that they were paid.
  const hasRazorpayQr = !!trip.razorpayQrAvailable;
  const availableSources = [
    hasPersonalUpi && "personal",
    hasCompanyUpi && "company",
    hasRazorpayQr && "razorpay",
  ].filter(Boolean);

  // Which QR to show is the driver's own call, made fresh for every collection — not a saved
  // preference. Defaults to whichever source is available first (personal, then company, then
  // Razorpay) and only offers a toggle at all when more than one source is configured.
  const [qrSource, setQrSource] = useState(() => availableSources[0] || "personal");
  const activeSource = availableSources.includes(qrSource) ? qrSource : (availableSources[0] || "personal");
  const activeUpiId = activeSource === "company" ? trip.companyUpiId : trip.driverUpiId;
  const activePayeeName = activeSource === "company" ? (trip.companyUpiName || "GadiDost Logistics") : (trip.driverName || "Driver");

  // Razorpay-verified QR: fetched from the backend (not generated client-side), and polled so
  // the flow can auto-advance once Razorpay confirms the customer actually paid — no button tap
  // needed, unlike the self-reported Personal/Company QR below.
  const [razorpayQr, setRazorpayQr] = useState(() => (
    trip.razorpayQrStatus === "active" && trip.razorpayQrImageUrl
      ? { qrCodeId: trip.razorpayQrCodeId, imageUrl: trip.razorpayQrImageUrl }
      : { qrCodeId: null, imageUrl: null }
  ));
  const [razorpayQrError, setRazorpayQrError] = useState(false);
  const [razorpayPaid, setRazorpayPaid] = useState(false);
  const razorpayPollRef = useRef(null);

  // Once the Razorpay QR image is available, fetch it through our own backend (same-origin,
  // so <canvas> can actually read its pixels — see getPaymentQrImage in trip.controller.js)
  // and auto-crop just the QR square out of Razorpay's branded poster (see lib/qrCrop.js) so
  // the driver only ever sees the scannable code, not the surrounding header/logos/business
  // name text. Falls back to the uncropped (but still same-origin) image if detection can't
  // confidently find a QR-shaped region, so there's always something to show.
  const [razorpayQrDisplaySrc, setRazorpayQrDisplaySrc] = useState(null);
  useEffect(() => {
    if (!razorpayQr.imageUrl) {
      setRazorpayQrDisplaySrc(null);
      return undefined;
    }
    let cancelled = false;
    let objectUrl = null;
    const proxyUrl = `${API_BASE}/api/trips/${trip.id}/collect-payment/qr/image`;
    api.getFileBlobUrl(proxyUrl, getToken())
      .then(async (blobUrl) => {
        if (cancelled) { URL.revokeObjectURL(blobUrl); return; }
        objectUrl = blobUrl;
        const cropped = await extractQrCrop(blobUrl);
        if (!cancelled) setRazorpayQrDisplaySrc(cropped || blobUrl);
      })
      .catch(() => { if (!cancelled) setRazorpayQrDisplaySrc(null); });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [razorpayQr.imageUrl, trip.id]);

  useEffect(() => {
    if (activeSource === "razorpay") {
      setQrDataUrl(null);
      return undefined;
    }
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
  }, [activeSource, activeUpiId, activePayeeName, trip.amountToCollect, trip.id]);

  // Creates (or reuses) the Razorpay QR while this tab is active, then polls payment status
  // every ~3.5s until it's paid, the driver switches tabs, or the component unmounts — the
  // interval is always cleared in the cleanup function so it never leaks across any of those.
  useEffect(() => {
    if (activeSource !== "razorpay" || !hasRazorpayQr || razorpayPaid) return undefined;

    let cancelled = false;

    const stopPolling = () => {
      if (razorpayPollRef.current) {
        clearInterval(razorpayPollRef.current);
        razorpayPollRef.current = null;
      }
    };

    const pollStatus = async () => {
      try {
        const response = await api.get(`/api/trips/${trip.id}/collect-payment/qr/status`, getToken());
        if (cancelled) return;
        if (response.success && response.data?.paid) {
          stopPolling();
          setRazorpayPaid(true);
          onVerifiedPaid();
        }
      } catch {
        // Transient poll failure — just try again on the next tick.
      }
    };

    const start = async () => {
      let qr = razorpayQr;
      if (!qr.imageUrl) {
        setRazorpayQrError(false);
        try {
          const response = await api.post(`/api/trips/${trip.id}/collect-payment/qr`, {}, getToken());
          if (!response.success) throw new Error(response.message || "Failed to generate QR code");
          qr = { qrCodeId: response.data?.qrCodeId, imageUrl: response.data?.imageUrl };
          if (cancelled) return;
          setRazorpayQr(qr);
        } catch {
          if (!cancelled) setRazorpayQrError(true);
          return;
        }
      }
      if (cancelled || !qr.imageUrl) return;
      pollStatus();
      razorpayPollRef.current = setInterval(pollStatus, 3500);
    };

    start();

    return () => {
      cancelled = true;
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSource, hasRazorpayQr, razorpayPaid, trip.id]);

  const razorpayTabActiveUnpaid = activeSource === "razorpay" && !razorpayPaid;
  const tabButtonClass = (source) =>
    `px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${activeSource === source ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"}`;

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

      {hasPersonalUpi || hasCompanyUpi || hasRazorpayQr ? (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-card p-5 mb-4">
          {availableSources.length > 1 && (
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit mx-auto mb-5">
              {hasPersonalUpi && (
                <button onClick={() => setQrSource("personal")} className={tabButtonClass("personal")}>
                  Personal QR
                </button>
              )}
              {hasCompanyUpi && (
                <button onClick={() => setQrSource("company")} className={tabButtonClass("company")}>
                  Company QR
                </button>
              )}
              {hasRazorpayQr && (
                <button onClick={() => setQrSource("razorpay")} className={tabButtonClass("razorpay")}>
                  Verified QR
                </button>
              )}
            </div>
          )}

          {activeSource === "razorpay" ? (
            razorpayPaid ? (
              <div className="flex flex-col items-center py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCheck className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="text-sm font-semibold text-emerald-600 mt-3">Payment verified by Razorpay</p>
              </div>
            ) : razorpayQr.imageUrl ? (
              <div className="flex flex-col items-center">
                <p className="text-sm font-semibold text-slate-800">Scan to pay {formatCurrency(trip.amountToCollect)}</p>
                <p className="text-xs text-slate-400 mt-0.5 text-center">Auto-confirms the moment Razorpay verifies the payment — no button tap needed</p>
                {/* Razorpay's image is a full branded poster (header, the QR, scan-text,
                    payment-app logos, our business name/trip number, a decorative footer) —
                    fixed CSS crops kept breaking since that bottom block is generated per-QR,
                    not part of any stable template. razorpayQrDisplaySrc is instead the result
                    of actually scanning the image's pixels for the QR's real bounding box (see
                    lib/qrCrop.js) — shown at a fixed max width, letting its own (now roughly
                    square) aspect ratio decide the height rather than forcing one. */}
                {razorpayQrDisplaySrc ? (
                  <div className="mt-4 w-full max-w-[220px] rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white p-3">
                    <img src={razorpayQrDisplaySrc} alt="Razorpay verified payment QR" className="w-full h-auto block" />
                  </div>
                ) : (
                  <div className="mt-4 w-full max-w-[220px] aspect-square mx-auto rounded-xl bg-slate-100 animate-pulse" />
                )}
                <div className="flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full bg-amber-50">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[11px] text-amber-600 font-semibold">Waiting for payment...</span>
                </div>
              </div>
            ) : razorpayQrError ? (
              <p className="text-xs text-danger text-center py-6">Couldn't generate the verified QR code — collect via UPI ID or cash instead.</p>
            ) : (
              <div className="w-full max-w-[240px] aspect-[3/4] mx-auto rounded-xl bg-slate-100 animate-pulse" />
            )
          ) : qrDataUrl ? (
            <div className="flex flex-col items-center">
              <p className="text-sm font-semibold text-slate-800">Scan to pay {formatCurrency(trip.amountToCollect)}</p>
              <p className="text-xs text-slate-400 mt-0.5">via any UPI app</p>
              <div className="mt-4 p-3 rounded-xl border border-slate-200 shadow-sm bg-white">
                <img src={qrDataUrl} alt="UPI payment QR" className="w-44 h-44" />
              </div>
            </div>
          ) : qrError ? (
            <p className="text-xs text-danger text-center py-6">Couldn't generate the QR code — collect via UPI ID or cash instead.</p>
          ) : (
            <div className="w-44 h-44 mx-auto rounded-xl bg-slate-100 animate-pulse" />
          )}
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4 text-center">
          <p className="text-xs text-amber-700">Add your UPI ID in Profile to show a scannable payment QR here next time.</p>
        </div>
      )}

      <div className="mt-auto space-y-3">
        {!razorpayTabActiveUnpaid && (
          <button
            onClick={() => onCollect("upi")}
            disabled={collecting}
            className="w-full py-4 rounded-xl font-semibold text-[15px] text-white bg-primary disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] transition-all"
          >
            {collecting ? "Confirming..." : "Payment Received via UPI"}
          </button>
        )}
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
// Three POD states can land here now (see resolveInitialStep/handleSubmitPhotos — both routes
// through "complete" the same way they always did): 'pending_verification' shows a waiting
// screen (live-updated by useTripStatusSocket, no polling needed) instead of blindly firing the
// completion PATCH; 'rejected' routes back to re-upload; only 'verified' actually auto-completes,
// same as this step always did before POD review existed.
function CompleteStep({ trip, completing, error, onRetry, onBack, onReupload }) {
  if (trip.podStatus === "pending_verification") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
        <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mb-4">
          <Clock3 className="w-10 h-10 text-amber-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Waiting for the customer to review</h3>
        <p className="text-sm text-slate-400 mb-1">Your proof-of-delivery photos are up — this screen updates automatically the moment they respond.</p>
      </div>
    );
  }

  if (trip.podStatus === "rejected") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Proof of delivery rejected</h3>
        <p className="text-sm text-slate-400 mb-6">{trip.podRejectionReason || "The customer asked for new photos."}</p>
        <button onClick={onReupload} className="px-6 py-3 rounded-xl font-semibold text-sm text-white bg-primary hover:opacity-90 active:scale-[0.98] transition-all">
          Upload New Photos
        </button>
      </div>
    );
  }

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

  // The client's approve/reject (and a driver-side re-upload) all reach this screen live —
  // same event every other trip-status listener in this app already uses, so no new polling
  // needed for the "waiting for review" step to update itself.
  useTripStatusSocket((updated) => {
    if (updated?.id === trip.id) setTrip(adaptTrip(updated));
  });

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
        podStatus: response.data?.podStatus || prev.podStatus,
        podRejectionReason: response.data?.podStatus === "pending_verification" ? null : prev.podRejectionReason,
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

  // Called by PaymentsStep once its Razorpay QR poll reports `paid: true` — the backend has
  // already fully finalized the payment server-side at that point (same as the PATCH above
  // would have), so this just mirrors handleCollectPayment's success path without another
  // network call.
  const handleVerifiedPayment = () => {
    setTrip((prev) => ({ ...prev, paymentStatus: "paid" }));
    setStep("complete");
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

  // Sends the driver back to re-upload after a rejection — existingMedia is deliberately
  // dropped for the old (rejected) batch (see the podStatus === "rejected" check below) so the
  // driver can't just hit Submit again with zero new files and silently resubmit the same
  // rejected photos.
  const handleReupload = () => setStep("upload");

  // Auto-fires the completion PATCH once this step is reached with a client-verified POD —
  // settlement/total_trips side effects live entirely in the existing PATCH /trips/:id/status
  // handler, untouched here. Keyed on podStatus too (not just step) since verification usually
  // arrives asynchronously, via the socket listener above, while the driver is already sitting
  // on this screen watching the "waiting for review" state.
  useEffect(() => {
    if (step === "complete" && trip.podStatus === "verified" && !completing && !autoRunRef.current) {
      autoRunRef.current = true;
      runCompletion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, trip.podStatus]);

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 md:p-8 min-h-[520px] flex flex-col">
        <StepProgress current={step} includePayments={includePayments} />
        {step === "arrived" && <ArrivedStep trip={trip} onConfirm={handleConfirmArrival} loading={confirmingArrival} />}
        {step === "upload" && (
          <UploadPhotosStep
            // A rejected batch doesn't count toward the minimum anymore — hidden entirely so
            // the driver can't hit Submit with zero new files and silently resubmit the same
            // photos the customer just rejected.
            existingMedia={trip.podStatus === "rejected" ? [] : (trip.podMedia?.length ? trip.podMedia : (trip.podPhotos || []).map((url) => ({ url, type: "image" })))}
            onSubmit={handleSubmitPhotos}
            loading={uploadingPhotos}
            rejectionReason={trip.podStatus === "rejected" ? trip.podRejectionReason : null}
          />
        )}
        {step === "payments" && (
          <PaymentsStep
            trip={trip}
            onCollect={handleCollectPayment}
            collecting={collectingPayment}
            onVerifiedPaid={handleVerifiedPayment}
          />
        )}
        {step === "complete" && (
          <CompleteStep trip={trip} completing={completing} error={completeError} onRetry={runCompletion} onBack={onExit} onReupload={handleReupload} />
        )}
      </div>
    </div>
  );
}
