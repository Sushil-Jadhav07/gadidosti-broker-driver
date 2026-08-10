export const formatCurrency = (value) => `Rs ${Number(value || 0).toLocaleString("en-IN")}`;

// Shortens a UUID for display (e.g. "80000000-0000-0000-0000-000000000003" -> "#00000003").
// Only used as a fallback for records that predate the booking_number column.
export const shortId = (id) => (id ? `#${String(id).replace(/-/g, "").slice(-8).toUpperCase()}` : "-");

// Prefers the real "BKG-202412-003" style reference the backend generates; falls back to a
// shortened UUID for any older record that doesn't have one yet.
export const bookingRef = (obj) => (obj && (obj.bookingNumber || shortId(obj.bookingId || obj.id))) || "-";

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
};

// Builds a rotated truck marker icon for live-position markers — a plain <Marker icon="..."/>
// URL can't rotate a PNG, but wrapping it in an inline SVG <image> with a rotate() transform
// can. headingDeg comes from the GPS device's course/bearing field; defaults to 0 (pointing
// up/north) when unknown rather than skipping rotation entirely.
export const buildTruckIcon = (headingDeg) => {
  const angle = Number.isFinite(headingDeg) ? headingDeg : 0;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">` +
    `<g transform="rotate(${angle} 20 20)"><image href="/truck/truck-marker.png" x="4" y="4" width="32" height="32" /></g>` +
    `</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

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

export const formatBookingStatus = (status) => BOOKING_STATUS[status] || status || "Requested";
export const formatKycStatus = (status) => status ? `${status.charAt(0).toUpperCase()}${status.slice(1)}` : "Pending";

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
