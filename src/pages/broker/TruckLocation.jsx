import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Truck, Clock } from "lucide-react";
import MapView from "../../components/MapView";
import { api, getToken } from "../../services/api";
import { formatDateTime } from "../../utils";

const POLL_MS = 10000;

const STATUS_COLOR = { available: "#17D86B", on_trip: "#166534", maintenance: "#F59E0B" };

// A small truck glyph, not a generic map pin — rendered as a data-URI SVG so MapView's
// Marker can use it as a custom icon without needing an image asset. Colored to match the
// same status palette as Trucks.jsx's STATUS_META.
const truckIconUrl = (color) => `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 48 48">
  <g transform="translate(3,12)">
    <rect x="0" y="0" width="26" height="16" rx="2" fill="${color}" stroke="white" stroke-width="1.5"/>
    <path d="M26 4h8l7 7v5h-15V4z" fill="${color}" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
    <rect x="29" y="7" width="7" height="6" fill="white" opacity="0.9"/>
    <circle cx="9" cy="18" r="3.2" fill="#1f2937" stroke="white" stroke-width="1"/>
    <circle cx="33" cy="18" r="3.2" fill="#1f2937" stroke="white" stroke-width="1"/>
  </g>
</svg>`)}`;

// Live single-truck location — replaces the old all-trucks-at-once map on the Trucks list
// page. Polls the truck's own detail endpoint (currentLat/currentLng come from its assigned
// driver's live GPS, same source as everywhere else) so the marker keeps moving as the
// driver's position updates, instead of showing a one-time snapshot.
export default function TruckLocation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [truck, setTruck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/api/vehicles/trucks/${id}`, getToken());
      if (!res.success) throw new Error(res.message || "Failed to load truck");
      setTruck(res.data?.truck || null);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to load truck location.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  const hasLocation = truck?.currentLat != null && truck?.currentLng != null;
  const markers = hasLocation
    ? [{
        id: truck.id,
        position: { lat: Number(truck.currentLat), lng: Number(truck.currentLng) },
        iconUrl: truckIconUrl(STATUS_COLOR[truck.status] || STATUS_COLOR.available),
        title: truck.registration,
      }]
    : [];

  return (
    <div className="space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700">
        <ArrowLeft size={16} /> Back
      </button>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-10 flex justify-center">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : error || !truck ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-10 text-center text-red-500 text-sm">
          {error || "Truck not found."}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Truck size={22} className="text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 font-mono">{truck.registration}</h1>
                <p className="text-xs text-slate-400">{truck.driver ? `Driver: ${truck.driver}` : "Unassigned"}</p>
              </div>
            </div>
            {truck.lastLocationAt && (
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <Clock size={13} /> Last updated {formatDateTime(truck.lastLocationAt)}
              </p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
            {hasLocation ? (
              <div className="relative h-[440px] rounded-xl overflow-hidden border border-slate-100">
                <MapView markers={markers} height="100%" className="absolute inset-0" zoom={14} />
              </div>
            ) : (
              <div className="h-[280px] flex flex-col items-center justify-center text-slate-400 text-sm">
                <Truck size={32} className="mb-2 opacity-30" />
                This truck hasn&apos;t reported a location yet.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
