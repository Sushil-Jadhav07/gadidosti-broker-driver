import { useCallback, useEffect, useRef, useState } from "react";
import { api, getToken } from "../services/api";

const STORAGE_KEY = "ssk_driver_online";
const MIN_INTERVAL_MS = 8000; // don't send more than once per ~8s
const MIN_DISTANCE_M = 50;    // ...unless moved at least ~50m

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
export function useDriverLocationTracking() {
  const [online, setOnline] = useState(() => localStorage.getItem(STORAGE_KEY) === "1");
  const [locationError, setLocationError] = useState(null);
  const lastSentRef = useRef({ lat: null, lng: null, time: 0 });

  useEffect(() => {
    if (!online) return;
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
      },
      (err) => {
        setLocationError(
          err.code === 1
            ? "Enable location access to go online."
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
  }, [online]);

  const toggleOnline = useCallback(() => {
    setOnline((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      if (!next) setLocationError(null);
      return next;
    });
  }, []);

  return { online, toggleOnline, locationError };
}
