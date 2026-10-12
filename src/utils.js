export const formatCurrency = (value) => `Rs ${Number(value || 0).toLocaleString("en-IN")}`;

// Shortens a UUID for display (e.g. "80000000-0000-0000-0000-000000000003" -> "#00000003").
// Only used as a fallback for records that predate the booking_number column.
export const shortId = (id) => (id ? `#${String(id).replace(/-/g, "").slice(-8).toUpperCase()}` : "-");

// Prefers the real "BKG-202412-003" style reference the backend generates; falls back to a
// shortened UUID for any older record that doesn't have one yet.
export const bookingRef = (obj) => (obj && (obj.bookingNumber || shortId(obj.bookingId || obj.id))) || "-";

// Shared by every chat surface that shows a counterpart avatar (ChatList, ChatDetail,
// ChatThreadList, ChatLauncher) so the initials logic isn't hand-copied into each one.
export const initials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
};

export const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// timeTakenMinutes (backend-computed, delivered_at - started_at) -> "2h 15m" / "45m" / "—".
export const formatDuration = (minutes) => {
  if (minutes == null || Number.isNaN(minutes)) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
};

export const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const BOOKING_STATUS = {
  pending: "Requested",
  countered: "Countered",
  confirmed: "Accepted",
  assigned: "Assigned",
  en_route_pickup: "En Route Pickup",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
  // Mutual-confirmation: one side already accepted, the other must now confirm or decline
  // (see the request/offer's pendingConfirmationBy field) — no more negotiating past here.
  awaiting_confirmation: "Awaiting Confirmation",
};

// buildTruckIcon moved to ./lib/truckIcon.js (needs a large embedded base64 constant that
// doesn't belong alongside this file's other unrelated helpers).

// Shares a PDF via the browser's native share sheet (attaches the actual file on phones where
// WhatsApp/etc. are registered share targets); falls back to a wa.me text-only link on desktop
// or browsers without file-sharing support. No backend WhatsApp API involved.
export const shareInvoicePdf = async ({ blob, filename, text }) => {
  const file = new File([blob], filename, { type: "application/pdf" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: "Invoice", text });
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }
};

// Trip/booking addresses come back from the API as one freeform string (no separate "place
// name" field) — a leading comma-separated segment reads as a place name in practice (e.g.
// "Warehouse Alpha, 124 Industrial Pkwy, Sector 4"), so split on the first comma rather than
// inventing data that isn't there. Used anywhere a long address needs a bold name + gray
// address line instead of one unbroken run of text.
// A real Indian address routinely starts with a bare house/plot number or a Google Plus Code
// before the actual locality name — "1, Vartak Nagar, Thane West..." or "6X96+7WJ, Unnathi
// Gardens...". Splitting on just the first comma took that leading fragment as "the name" ("1",
// "6X96+7WJ"), which is what a driver actually saw on trip cards instead of a real place name.
// Skip any number of leading segments that look like a bare code (short, alphanumeric, has a
// digit) and use the first segment that doesn't — falling back to the very first segment only if
// literally every one of them looks like a code (better than showing nothing at all).
const looksLikeBareCode = (segment) => segment.length <= 12 && /\d/.test(segment) && /^[A-Za-z0-9+\-/]+$/.test(segment);

export const splitLocationName = (value) => {
  if (!value) return { name: null, address: null };
  const parts = value.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return { name: value, address: null };

  let nameIdx = parts.findIndex((p) => !looksLikeBareCode(p));
  if (nameIdx === -1) nameIdx = 0;

  const name = parts[nameIdx];
  const address = parts.filter((_, i) => i !== nameIdx).join(", ") || null;
  return { name, address };
};

export const formatBookingStatus = (status) => BOOKING_STATUS[status] || status || "Requested";
export const formatKycStatus = (status) => status ? `${status.charAt(0).toUpperCase()}${status.slice(1)}` : "Pending";

// booking.paymentMode as collected by the driver's Payments step (see
// DeliveryCompletionFlow.jsx) — 'razorpay_qr' is new (verified via Razorpay's own QR Code API,
// not self-reported like the other two) and would otherwise render as the raw snake_case value
// wherever this gets shown (JobDetail.jsx, JobHistory.jsx).
const PAYMENT_MODE_LABEL = { upi: "UPI", cash: "Cash", razorpay_qr: "Razorpay QR" };
export const formatPaymentMode = (mode) => PAYMENT_MODE_LABEL[mode] || mode || null;

export const adaptJobRequest = (request) => ({
  ...request,
  status: formatBookingStatus(request.status),
  amount: Number(request.amount || 0),
  distance: Number(request.distance || 0),
});

// Driver <-> broker negotiation requests (/api/driver-requests). Same shape as a job request
// plus driverTimedOut, which flips to true 2 minutes after the driver stops responding and
// hands the turn to their broker.
export const adaptDriverRequest = (request) => ({
  ...request,
  status: formatBookingStatus(request.status),
  amount: Number(request.amount || 0),
  distance: Number(request.distance || 0),
  driverTimedOut: !!request.driverTimedOut,
});

export const adaptBooking = (booking) => ({
  ...booking,
  status: formatBookingStatus(booking.status),
  amount: Number(booking.amount || 0),
  distance: Number(booking.distance || 0),
  createdAtLabel: formatDate(booking.createdAt || booking.date),
  // Overage past the free halting window — already folded into `amount` above, kept as its
  // own field so it can be shown as a breakdown line (see booking.controller.js).
  haltingHours: Number(booking.haltingHours || 0),
  haltingCharge: Number(booking.haltingCharge || 0),
  // Distinct from halting above — the whole door-to-door delivery SLA (distance-tiered, tighter
  // when isExpress), sourced from the linked trip. slaOverageCharge is already folded into
  // `amount` above, kept as its own field so it can be shown as a breakdown line, same idea as
  // haltingCharge (see booking.controller.js).
  isExpress: !!booking.isExpress,
  expectedDeliveryHours: booking.expectedDeliveryHours != null ? Number(booking.expectedDeliveryHours) : null,
  slaOverageHours: Number(booking.slaOverageHours || 0),
  slaOverageCharge: Number(booking.slaOverageCharge || 0),
});

// Keeps the raw backend status (e.g. "confirmed", "en_route_pickup") on rawStatus for
// logic/comparisons, while status becomes the human label for display. Trips are created
// with status "confirmed" (not "assigned" — that's a booking-only status set before a trip
// row exists) and only move to "en_route_pickup" once the driver starts the trip.
export const adaptTrip = (trip) => ({
  ...trip,
  rawStatus: trip.status,
  status: formatBookingStatus(trip.status),
  earnings: Number(trip.earnings || 0),
  distance: Number(trip.distance || 0),
  // Overage past the free halting window, already folded into amountToCollect — kept as its
  // own field so it can be shown as a breakdown line, not just a bigger total (see trip.controller.js).
  haltingHours: Number(trip.haltingHours || 0),
  haltingCharge: Number(trip.haltingCharge || 0),
  // Distinct from halting above — the whole door-to-door delivery SLA (distance-tiered,
  // tighter when isExpress), fixed at trip creation so it stays stable even if the admin later
  // retunes the tiers. slaOverageCharge is already folded into amountToCollect/earnings, kept
  // as its own field so it can be shown as a breakdown line (see trip.controller.js).
  isExpress: !!trip.isExpress,
  expectedDeliveryHours: trip.expectedDeliveryHours != null ? Number(trip.expectedDeliveryHours) : null,
  slaOverageHours: Number(trip.slaOverageHours || 0),
  slaOverageCharge: Number(trip.slaOverageCharge || 0),
});

export const adaptSettlement = (settlement) => ({
  ...settlement,
  amount: Number(settlement.amount || 0),
  platformFee: Number(settlement.platformFee || settlement.platform_fee || 0),
  netEarnings: Number(settlement.netEarnings || settlement.net_earnings || 0),
  status: formatKycStatus(settlement.status),
});

export const DRIVER_STATUS_STEPS = [
  { key: "confirmed", label: "Assigned", icon: "clipboard-list" },
  { key: "en_route_pickup", label: "En Route Pickup", icon: "navigation" },
  { key: "picked_up", label: "Picked Up", icon: "package-check" },
  { key: "in_transit", label: "In Transit", icon: "route" },
  { key: "delivered", label: "Delivered", icon: "check-circle" },
  { key: "completed", label: "Completed", icon: "check-check" },
];
