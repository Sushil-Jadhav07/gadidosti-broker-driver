import { useEffect, useState } from "react";
import { api, getToken } from "../services/api";
import { adaptDriverRequest, adaptTripJoinRequest } from "../utils";
import { useDriverRequestSocket } from "./useDriverRequestSocket";
import { useTripJoinRequestSocket } from "./useTripJoinRequestSocket";

const POLL_INTERVAL_MS = 20000;

// Sidebar badge counts for the driver portal.
export function useDriverSidebarCounts(enabled) {
  const [requests, setRequests] = useState(0);
  const [hasActiveTrip, setHasActiveTrip] = useState(false);

  const refreshTrip = async (token) => {
    const res = await api.get("/api/trips/active", token);
    setHasActiveTrip(!!res.data?.trip);
  };

  // "Requested" and not yet timed out — the driver's own actionable turn. A request that has
  // already timed out belongs to the broker now (see DriverRequestCard's locked state), so it
  // shouldn't count as something the driver still needs to do. Combines driver_requests and
  // trip_join_requests (part-load) counts — both show up on the same "Requests" page
  // (driver/Requests.jsx), so one badge covers both.
  const refreshRequests = async (token) => {
    const [driverRes, joinRes] = await Promise.all([
      api.get("/api/driver-requests?limit=100", token),
      api.get("/api/trip-join-requests?limit=100", token),
    ]);
    const driverCount = (driverRes.data?.requests || []).map(adaptDriverRequest).filter((r) => r.status === "Requested" && !r.driverTimedOut).length;
    const joinCount = (joinRes.data?.requests || []).map(adaptTripJoinRequest).filter((r) => r.status === "Requested" && !r.driverTimedOut).length;
    setRequests(driverCount + joinCount);
  };

  useEffect(() => {
    if (!enabled) return undefined;
    const token = getToken();
    if (!token) return undefined;
    const tick = () => {
      refreshTrip(token).catch(() => {});
      refreshRequests(token).catch(() => {});
    };
    tick();
    const interval = setInterval(tick, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useDriverRequestSocket((payload) => {
    if (!enabled || !payload?.id) return;
    const token = getToken();
    if (token) refreshRequests(token).catch(() => {});
  });

  useTripJoinRequestSocket((payload) => {
    if (!enabled || !payload?.id) return;
    const token = getToken();
    if (token) refreshRequests(token).catch(() => {});
  });

  return { requests, hasActiveTrip };
}
