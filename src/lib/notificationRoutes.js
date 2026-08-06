// Maps a notification's { type, meta } (see backend's NotificationModel.create / push `data`
// payload) to a page in this app — used both for in-app NotificationBell clicks and for
// deep-linking a background/killed-app push tap (see the "notification-click" message + the
// ?ntype=... query params read in App.jsx's FcmBridge). Role-aware because broker and driver
// are separate route trees here, and the same notification `type` means a different screen
// for each.
export function routeForNotification({ type, meta = {}, role }) {
  const isDriver = role === "driver";

  switch (type) {
    case "booking":
      if (meta.driver_request_id) return isDriver ? "/driver/requests" : "/driver-requests";
      if (meta.job_request_id) return isDriver ? "/driver/requests" : "/job-requests";
      if (meta.trip_id) return isDriver ? "/driver/my-trip" : "/active-jobs";
      return isDriver ? "/driver" : "/job-requests";
    case "incident":
      return isDriver ? "/driver/my-trip" : "/active-jobs";
    case "payment":
      return isDriver ? "/driver/earnings" : "/earnings";
    case "kyc":
      return isDriver ? "/driver/kyc" : "/kyc";
    default:
      return null;
  }
}
