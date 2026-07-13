import { MapPin, Navigation } from "lucide-react";

// Route-map preview panel: dotted-grid placeholder with pickup/drop pins
// connected by a dashed line, linking out to Google Maps directions.
export default function RouteMapPanel({ pickup, drop }) {
  const hasCoords = pickup?.lat && pickup?.lng && drop?.lat && drop?.lng;
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&origin=${pickup.lat},${pickup.lng}&destination=${drop.lat},${drop.lng}&travelmode=driving`
    : "https://www.google.com/maps";

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="relative block h-full min-h-[220px] rounded-xl overflow-hidden border border-slate-100 group"
      style={{
        backgroundColor: "#F8FAFC",
        backgroundImage: "radial-gradient(#CBD5E1 1px, transparent 1px)",
        backgroundSize: "16px 16px",
      }}
    >
      {/* Navigate badge */}
      <span className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 bg-white shadow-modal rounded-full px-3 py-1.5 text-[11px] font-semibold text-primary group-hover:bg-primary group-hover:text-white transition-colors">
        <Navigation size={12} /> Navigate
      </span>

      <div className="relative h-full flex flex-col items-center justify-center py-8">
        {/* Pickup pin */}
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/30">
            <MapPin size={16} className="text-white" />
          </div>
          <p className="text-[10px] font-semibold text-emerald-600 mt-1 uppercase tracking-wide">Pickup</p>
        </div>

        {/* Dashed connector with navigation icon */}
        <div className="relative flex-1 w-0.5 my-2" style={{ minHeight: 70, borderLeft: "2px dashed #CBD5E1" }}>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border border-slate-200 shadow flex items-center justify-center">
            <Navigation size={13} className="text-primary" />
          </div>
        </div>

        {/* Drop pin */}
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shadow-md shadow-red-500/30">
            <MapPin size={16} className="text-white" />
          </div>
          <p className="text-[10px] font-semibold text-red-600 mt-1 uppercase tracking-wide">Drop</p>
        </div>
      </div>
    </a>
  );
}
