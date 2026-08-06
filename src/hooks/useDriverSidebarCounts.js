import { useEffect, useState } from "react";
import { api, getToken } from "../services/api";
import { adaptDriverRequest } from "../utils";
import { useDriverRequestSocket } from "./useDriverRequestSocket";

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
  // shouldn't count as something the driver still needs to do.
  const refreshRequests = async (token) => {
    const res = await api.get("/api/driver-requests?limit=100", token);
    setRequests((res.data?.requests || []).map(adaptDriverRequest).filter((r) => r.status === "Requested" && !r.driverTimedOut).length);
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

  return { requests, hasActiveTrip };
}
