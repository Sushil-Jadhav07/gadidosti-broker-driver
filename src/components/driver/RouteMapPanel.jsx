import MapView from "../MapView";
import { buildTruckIcon } from "../../lib/truckIcon";

// Real embedded map for a single trip's route (drawn via the Directions API), plus an optional
// live truck marker when currentLocation is available — sourced straight from the trip object's
// currentLocation field (trips.current_lat/current_lng, kept current via
// PATCH /api/trips/:id/location), no separate fetch needed.
//
// isPrePickup (passed by the caller, since "pre-pickup" means something slightly different for
// a raw trip.rawStatus vs an already-adapted booking.status — see each call site) switches the
// drawn route from the default static pickup -> drop line to live position -> pickup, so the
// driver can actually see their own progress toward pickup instead of an overview line that
// never reflects where they are. Mirrors the identical fix on gadidosti-client's
// TrackShipment.jsx (PRE_PICKUP_LABELS) — same idea, same reasoning.
//
// `stops` (optional) is the trip's full pickup/loading/unloading/drop sequence
// (trips.stops) — any 'loading'/'unloading' entries become Directions waypoints between the
// pickup origin and drop destination, in the order they were added (never reordered). Only
// relevant once the cargo's actually picked up — skipped entirely during the pre-pickup leg.
export default function RouteMapPanel({ pickup, drop, currentLocation, stops = [], heading, isPrePickup = false }) {
  const hasPickupCoords = pickup?.lat != null && pickup?.lng != null;
  const hasDropCoords = drop?.lat != null && drop?.lng != null;
  const hasLiveLocation = currentLocation?.lat != null && currentLocation?.lng != null;

  const waypoints = stops
    .filter((s) => (s.type === "loading" || s.type === "unloading") && s.lat != null && s.lng != null)
    .map((s) => ({ location: { lat: Number(s.lat), lng: Number(s.lng) }, stopover: true }));

  const livePosition = hasLiveLocation ? { lat: Number(currentLocation.lat), lng: Number(currentLocation.lng) } : null;
  const origin = livePosition || (hasPickupCoords ? { lat: Number(pickup.lat), lng: Number(pickup.lng) } : pickup?.location);
  const destination = isPrePickup && hasPickupCoords
    ? { lat: Number(pickup.lat), lng: Number(pickup.lng) }
    : (hasDropCoords ? { lat: Number(drop.lat), lng: Number(drop.lng) } : drop?.location);

  return (
    <div className="relative h-full min-h-[220px] rounded-xl overflow-hidden border border-slate-100">
      <MapView
        routes={[{
          id: "trip-route",
          origin,
          destination,
          originLabel: livePosition ? "Current position" : pickup?.location,
          destinationLabel: isPrePickup ? pickup?.location : drop?.location,
          // Loading/unloading stops only apply once the cargo's on board — nothing to route
          // through yet while still on the way to pickup.
          waypoints: isPrePickup ? [] : waypoints,
        }]}
        markers={[
          ...(livePosition ? [{ id: "truck", position: livePosition, iconUrl: buildTruckIcon(heading), title: "Current position" }] : []),
          // The drop pin would otherwise disappear while pre-pickup, since the route itself
          // only spans live position -> pickup during that phase — keep it visible for context.
          ...(isPrePickup && hasDropCoords ? [{ id: "drop-pin", position: { lat: Number(drop.lat), lng: Number(drop.lng) }, color: "green", title: drop?.location }] : []),
        ]}
        height="100%"
        className="absolute inset-0"
      />
    </div>
  );
}
