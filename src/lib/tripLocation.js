import { api, getToken } from "../services/api";

// One-shot, awaited fresh GPS fix pushed straight onto this trip's own location column
// (trips.current_lat/current_lng) — the exact field trip.controller.js's updateTripStatus
// proximity gate reads to decide "picked_up"/"delivered". useDriverLocationTracking.js's
// continuous watchPosition + 90s heartbeat normally keep that column fresh on their own, but
// there's a real gap right at the moment a driver actually taps Confirm: a trip that only just
// started (the first watchPosition fix, or the 60s active-trip-id refresh, hasn't landed yet) or
// a slow device location provider can both leave it null or stale — which is exactly what showed
// up as "Your current location is not available yet" even though the driver was genuinely
// standing at the pickup point. Best-effort and silent on failure by design: if this can't get a
// fix, the pickup/delivery PATCH right after it still runs and the backend's own check reports
// the real reason (missing location vs. too far away) — this call only ever helps, never blocks.
export async function pushFreshTripLocation(tripId) {
  if (!tripId || !navigator.geolocation) return;
  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      });
    });
    const { latitude: lat, longitude: lng, heading } = position.coords;
    const hasHeading = heading != null && !Number.isNaN(heading);
    const payload = hasHeading ? { lat, lng, heading } : { lat, lng };
    await api.patch(`/api/trips/${tripId}/location`, payload, getToken());
  } catch (err) {
    console.error("pushFreshTripLocation failed (non-fatal):", err);
  }
}
