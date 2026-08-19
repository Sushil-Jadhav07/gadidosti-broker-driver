import { useCallback, useEffect, useRef, useState } from "react";
import { api, getToken } from "../services/api";

const STORAGE_KEY = "ssk_driver_online";
// 3s floor — matches MapView.jsx's ANIM_MS tween duration on the client (kept in sync
// intentionally: a fix arrives right as the previous fix's eased tween finishes, instead of the
// marker sitting still for several seconds between each smooth hop). The backend's dedicated
// driverLocationRateLimit (60 req/min, driver-keyed) comfortably covers this: this floor alone
// caps stationary pings at 20/min, and even sustained highway speed (~90-100 km/h, needing
// ~1.8-2s to cover MIN_DISTANCE_M) tops out around 30-33/min via the distance trigger below —
// both well under the 60/min budget.
const MIN_INTERVAL_MS = 3000;
const MIN_DISTANCE_M = 50;    // ...unless moved at least ~50m
const ACTIVE_TRIP_REFRESH_MS = 60000; // re-check which trip (if any) is active every ~60s

const haversineMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Drives the driver's "online" toggle: while on, streams browser geolocation to the backend
// (throttled so a stationary driver isn't pinging every couple seconds), which broadcasts it
// over Socket.IO to anyone tracking this driver's truck. Called once from DriverAppLayout
// (not a single page) so tracking survives navigating between driver pages instead of
// restarting watchPosition on every route change. The "online" flag persists to localStorage
// so it resumes automatically if the driver reloads the tab while still online.
//
// "Online" means "available for new job offers" — it's a separate concept from "currently on
// a trip a client is tracking." A driver mid-delivery who never toggled Online (or toggled it
// off once assigned, since they're not looking for more work) would otherwise never push a
// location at all, leaving driver_profiles.current_lat/lng permanently null and the client's
// tracking page with no truck marker to show. So location sharing runs whenever EITHER online
// is on OR there's an active trip — trip presence forces sharing regardless of the toggle.
export function useDriverLocationTracking() {
  // The raw toggle preference — what the driver last explicitly chose, persisted to
  // localStorage. NOT what's shown in the UI or returned as `online` below — see `tracking`.
  const [rawOnline, setRawOnline] = useState(() => localStorage.getItem(STORAGE_KEY) === "1");
  const [locationError, setLocationError] = useState(null);
  const [hasActiveTrip, setHasActiveTrip] = useState(false);
  const lastSentRef = useRef({ lat: null, lng: null, time: 0 });
  // trips.current_lat/current_lng — read by the backend's pickup/delivery proximity gate
  // (trip.controller.js's updateTripStatus) — is a completely different column from
  // driver_profiles.current_lat/current_lng (patched below); nothing else in this app ever
  // called PATCH /api/trips/:id/location, so that column was always null and the proximity
  // gate would reject every pickup/delivery. Track the active trip id here too so each
  // watchPosition tick can push to both places.
  const activeTripIdRef = useRef(null);

  // Runs regardless of the online toggle — this is what lets a trip force tracking on even
  // when the driver is (or goes) "offline" for new-job purposes.
  useEffect(() => {
    let cancelled = false;
    const refreshActiveTrip = async () => {
      try {
        const res = await api.get("/api/trips/active", getToken());
        const tripId = res?.data?.trip?.id || null;
        if (!cancelled) {
          activeTripIdRef.current = tripId;
          setHasActiveTrip(!!tripId);
        }
      } catch {
        /* keep the last-known trip id — next refresh retries */
      }
    };
    refreshActiveTrip();
    const tripRefreshInterval = setInterval(refreshActiveTrip, ACTIVE_TRIP_REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(tripRefreshInterval);
    };
  }, []);

  // The EFFECTIVE state — this, not rawOnline, is what gets shown in the UI (returned below as
  // `online`) and what drives the geolocation watch. Without this, a driver who was never
  // toggled Online before a trip landed on them could sit there showing "Offline" for the
  // entire trip, which is confusing/wrong even though location was quietly being tracked
  // anyway — the toggle shouldn't be able to lie about whether they're effectively online.
  const tracking = rawOnline || hasActiveTrip;

  useEffect(() => {
    if (!tracking) return;
    if (!navigator.geolocation) {
      setLocationError("This browser doesn't support location sharing.");
      return;
    }

    setLocationError(null);
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, heading } = pos.coords;
        const now = Date.now();
        const last = lastSentRef.current;
        const moved = last.lat == null || haversineMeters(last.lat, last.lng, lat, lng) >= MIN_DISTANCE_M;
        if (now - last.time < MIN_INTERVAL_MS && !moved) return;

        lastSentRef.current = { lat, lng, time: now };
        // GPS reports heading as null while stationary (or on some devices, always) — omit the
        // field entirely rather than sending null, so the backend keeps whatever valid heading
        // it last stored instead of it being overwritten with "unknown."
        const hasHeading = heading != null && !Number.isNaN(heading);
        const payload = hasHeading ? { lat, lng, heading } : { lat, lng };

        api.patch("/api/vehicles/drivers/me/location", payload, getToken()).catch((err) => {
          console.error("Failed to push location update:", err);
        });

        const tripId = activeTripIdRef.current;
        if (tripId) {
          api.patch(`/api/trips/${tripId}/location`, payload, getToken()).catch((err) => {
            console.error("Failed to push trip location update:", err);
          });
        }
      },
      (err) => {
        setLocationError(
          err.code === 1
            ? "Enable location access so your trip can be tracked."
            : "Couldn't get your location. Check your device's location settings."
        );
        console.error("watchPosition error:", err);
      },
      // maximumAge: 0 — never accept a cached fix. Some browsers/OS location providers will
      // keep re-delivering the same cached position to watchPosition callbacks for a surprisingly
      // long time when a nonzero maximumAge lets them; this is what caused location to appear
      // "frozen" at whatever value was first captured instead of tracking movement.
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [tracking]);

  // Fully locked while a trip is active — not just "can't turn off", nothing to toggle at all,
  // since the effective state (`tracking` above) is already forced to "online" by the trip
  // regardless of what's clicked. Going offline mid-delivery is exactly the state a client/
  // broker tracking screen can't afford. DriverTopHeader also disables the button outright in
  // this state (via `hasActiveTrip` below) — this guard is defense in depth in case anything
  // else ever calls toggleOnline directly. Once the trip ends, the toggle goes back to
  // reflecting/controlling the raw preference normally.
  const toggleOnline = useCallback(() => {
    if (activeTripIdRef.current) return;
    setRawOnline((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      if (!next) setLocationError(null);
      return next;
    });
  }, []);

  return { online: tracking, toggleOnline, locationError, hasActiveTrip };
}
