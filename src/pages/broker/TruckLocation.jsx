import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Truck, Clock } from "lucide-react";
import MapView from "../../components/MapView";
import { buildTruckIcon } from "../../lib/truckIcon";
import { api, getToken } from "../../services/api";
import { formatDateTime } from "../../utils";

const POLL_MS = 10000;

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
  // Same vehicle marker the driver's own route map (RouteMapPanel.jsx) already uses — kept
  // identical rather than a bespoke icon, so a truck looks the same on every screen it shows up
  // on. Rotates to face truck.heading, same as there.
  const markers = hasLocation
    ? [{
        id: truck.id,
        position: { lat: Number(truck.currentLat), lng: Number(truck.currentLng) },
        iconUrl: buildTruckIcon(truck.heading),
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
