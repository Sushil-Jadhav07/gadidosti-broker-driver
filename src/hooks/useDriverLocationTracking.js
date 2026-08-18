import { useCallback, useEffect, useRef, useState } from "react";
import { api, getToken } from "../services/api";

const STORAGE_KEY = "ssk_driver_online";
const MIN_INTERVAL_MS = 8000; // don't send more than once per ~8s
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
  const [online, setOnline] = useState(() => localStorage.getItem(STORAGE_KEY) === "1");
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

  const tracking = online || hasActiveTrip;

  useEffect(() => {
    if (!tracking) return;
    if (!navigator.geolocation) {
      setLocationError("This browser doesn't support location sharing.");
      return;
    }

    setLocationError(null);
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const now = Date.now();
        const last = lastSentRef.current;
        const moved = last.lat == null || haversineMeters(last.lat, last.lng, lat, lng) >= MIN_DISTANCE_M;
        if (now - last.time < MIN_INTERVAL_MS && !moved) return;

        lastSentRef.current = { lat, lng, time: now };
        api.patch("/api/vehicles/drivers/me/location", { lat, lng }, getToken()).catch((err) => {
          console.error("Failed to push location update:", err);
        });

        const tripId = activeTripIdRef.current;
        if (tripId) {
          api.patch(`/api/trips/${tripId}/location`, { lat, lng }, getToken()).catch((err) => {
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

  // Blocks turning Online off while a trip is active — going offline mid-delivery is exactly
  // the state a client/broker tracking screen can't afford (see the module comment above on
  // why trip presence already forces tracking regardless of this toggle; this additionally
  // stops the toggle itself from lying about it). Turning ON, or toggling at all with no active
  // trip, is unaffected. DriverTopHeader also disables the button outright in this state — this
  // guard is defense in depth in case anything else ever calls toggleOnline directly.
  const toggleOnline = useCallback(() => {
    setOnline((prev) => {
      if (prev && activeTripIdRef.current) return prev;
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      if (!next) setLocationError(null);
      return next;
    });
  }, []);

  return { online, toggleOnline, locationError, hasActiveTrip };
}
