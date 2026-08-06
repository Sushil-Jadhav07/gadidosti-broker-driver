import { useEffect, useState } from "react";
import { api, getToken } from "../services/api";
import { adaptJobRequest, adaptDriverRequest } from "../utils";
import { useDriverRequestSocket } from "./useDriverRequestSocket";

const POLL_INTERVAL_MS = 20000;

// Sidebar badge counts for the broker portal — "items actually needing the broker's
// attention right now", not raw list sizes. Job requests and driver requests don't support
// server-side status filtering, so each poll fetches a page and counts client-side; active
// jobs does support status filtering, so a 1-row fetch is enough to read `total` back off
// the pagination metadata without pulling every row.
export function useBrokerSidebarCounts(enabled) {
  const [jobRequests, setJobRequests] = useState(0);
  const [activeJobs, setActiveJobs] = useState(0);
  const [driverRequests, setDriverRequests] = useState(0);

  const refreshJobsAndActive = async (token) => {
    const [jobRes, activeRes] = await Promise.all([
      api.get("/api/jobs/requests?limit=100", token),
      api.get("/api/bookings?status=confirmed,en_route_pickup,picked_up,in_transit&limit=1", token),
    ]);
    setJobRequests((jobRes.data?.requests || []).map(adaptJobRequest).filter((r) => ["Requested", "Accepted"].includes(r.status)).length);
    setActiveJobs(activeRes.data?.total ?? 0);
  };

  // Only requests where the driver has already timed out are ever shown to a broker (see
  // driverRequest.model.js's findTimedOutByBroker), but that list still includes ones the
  // broker has already responded to — "Requested" is the actionable subset.
  const refreshDriverRequests = async (token) => {
    const res = await api.get("/api/driver-requests?limit=100", token);
    setDriverRequests((res.data?.requests || []).map(adaptDriverRequest).filter((r) => r.status === "Requested").length);
  };

  useEffect(() => {
    if (!enabled) return undefined;
    const token = getToken();
    if (!token) return undefined;
    const tick = () => {
      refreshJobsAndActive(token).catch(() => {});
      refreshDriverRequests(token).catch(() => {});
    };
    tick();
    const interval = setInterval(tick, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Live driver-request updates (accept/decline/counter/timeout) land here immediately instead
  // of waiting for the next poll — cheaper than re-fetching all three lists, so only the
  // driver-requests count refreshes on a socket event.
  useDriverRequestSocket((payload) => {
    if (!enabled || !payload?.id) return;
    const token = getToken();
    if (token) refreshDriverRequests(token).catch(() => {});
  });

  return { jobRequests, activeJobs, driverRequests };
}
