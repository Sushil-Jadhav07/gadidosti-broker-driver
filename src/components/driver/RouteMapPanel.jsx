import MapView from "../MapView";

// Real embedded map for a single trip's pickup -> drop route (drawn via the Directions API),
// plus an optional live truck marker when currentLocation is available — sourced straight
// from the trip object's currentLocation field (trips.current_lat/current_lng, kept current
// via PATCH /api/trips/:id/location), no separate fetch needed.
export default function RouteMapPanel({ pickup, drop, currentLocation }) {
  const hasPickupCoords = pickup?.lat != null && pickup?.lng != null;
  const hasDropCoords = drop?.lat != null && drop?.lng != null;
  const hasLiveLocation = currentLocation?.lat != null && currentLocation?.lng != null;

  return (
    <div className="relative h-full min-h-[220px] rounded-xl overflow-hidden border border-slate-100">
      <MapView
        routes={[{
          id: "trip-route",
          origin: hasPickupCoords ? { lat: Number(pickup.lat), lng: Number(pickup.lng) } : pickup?.location,
          destination: hasDropCoords ? { lat: Number(drop.lat), lng: Number(drop.lng) } : drop?.location,
          originLabel: pickup?.location,
          destinationLabel: drop?.location,
        }]}
        markers={hasLiveLocation ? [{
          id: "truck",
          position: { lat: Number(currentLocation.lat), lng: Number(currentLocation.lng) },
          color: "red",
          title: "Current position",
        }] : []}
        height="100%"
        className="absolute inset-0"
      />
    </div>
  );
}
