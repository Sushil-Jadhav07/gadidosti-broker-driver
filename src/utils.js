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

export const formatBookingStatus = (status) => BOOKING_STATUS[status] || status || "Requested";
export const formatKycStatus = (status) => status ? `${status.charAt(0).toUpperCase()}${status.slice(1)}` : "Pending";

export const adaptJobRequest = (request) => ({
  ...request,
  status: formatBookingStatus(request.status),
  amount: Number(request.amount || 0),
  distance: Number(request.distance || 0),
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
