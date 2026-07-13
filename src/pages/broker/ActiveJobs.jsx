import { useEffect, useState } from "react";
import { MapPin, Truck, User, AlertTriangle } from "lucide-react";
import Badge from "../../components/broker/Badge";
import Modal from "../../components/broker/Modal";
import DriverDropdown from "../../components/broker/DriverDropdown";
import StatusTimeline from "../../components/driver/StatusTimeline";
import { useToast } from "../../hooks/useToast";
import { api, getToken } from "../../services/api";
import { adaptBooking, formatCurrency, DRIVER_STATUS_STEPS } from "../../utils";

const STATUS_VARIANT = { "In Transit": "primary", "Picked Up": "warning", Assigned: "default", Accepted: "success" };

const STATUS_KEY_MAP = {
  Assigned: "assigned",
  "En Route Pickup": "en_route_pickup",
  "Picked Up": "picked_up",
  "In Transit": "in_transit",
  Delivered: "delivered",
  Completed: "completed",
};

export default function ActiveJobs() {
  const { addToast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [incidentsByBooking, setIncidentsByBooking] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedJob, setSelectedJob] = useState(null);
  const [resolution, setResolution] = useState("");
  const [resolving, setResolving] = useState(false);
  const [reassignDriverId, setReassignDriverId] = useState("");
  const [reassigning, setReassigning] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const [bookingsRes, tripsRes, jobRequestsRes, driversRes] = await Promise.all([
        api.get("/api/bookings?status=confirmed,en_route_pickup,picked_up,in_transit&limit=100", token),
        api.get("/api/trips?limit=100", token),
        api.get("/api/jobs/requests?limit=100", token),
        api.get("/api/vehicles/drivers?limit=100", token),
      ]);

      const bookings = (bookingsRes.data?.bookings || []).map(adaptBooking);
      const trips = tripsRes.data?.trips || [];
      const jobRequests = jobRequestsRes.data?.requests || [];

      const tripByBooking = Object.fromEntries(trips.map((t) => [t.bookingId, t]));
      const jobRequestByBooking = Object.fromEntries(jobRequests.map((r) => [r.bookingId, r]));

      // Incidents are trip-scoped (GET /api/trips/:id/incidents), so each active job with a
      // trip gets its own lookup — the active-jobs list is small enough that N parallel calls
      // (same pattern as listBookings' Promise.all in booking.controller.js) is fine here.
      const incidentEntries = await Promise.all(
        bookings.map(async (job) => {
          const trip = tripByBooking[job.id];
          if (!trip) return [job.id, { tripId: null, incident: null }];
          try {
            const res = await api.get(`/api/trips/${trip.id}/incidents`, token);
            const unresolved = (res.data?.incidents || []).find((i) => i.status !== "resolved");
            return [job.id, { tripId: trip.id, incident: unresolved || null }];
          } catch {
            return [job.id, { tripId: trip.id, incident: null }];
          }
        })
      );

      setJobs(bookings.map((job) => ({
        ...job,
        tripId: tripByBooking[job.id]?.id || null,
        jobRequestId: jobRequestByBooking[job.id]?.id || null,
      })));
      setIncidentsByBooking(Object.fromEntries(incidentEntries));
      setDrivers(driversRes.data?.drivers || []);
    } catch {
      setError("Failed to load active jobs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openIncident = (job) => {
    setSelectedJob(job);
    setResolution("");
    setReassignDriverId("");
  };

  const handleResolve = async () => {
    if (!selectedJob) return;
    const entry = incidentsByBooking[selectedJob.id];
    if (!entry?.incident || !entry.tripId) return;

    setResolving(true);
    try {
      const response = await api.patch(
        `/api/trips/${entry.tripId}/incidents/${entry.incident.id}/resolve`,
        { resolution: resolution.trim() },
        getToken()
      );
      if (!response.success) throw new Error(response.message || "Failed to resolve incident");
      setIncidentsByBooking((current) => ({ ...current, [selectedJob.id]: { ...entry, incident: null } }));
      addToast("Incident marked resolved.", "success");
      setSelectedJob(null);
    } catch (err) {
      addToast(err.message || "Failed to resolve incident.", "error");
    } finally {
      setResolving(false);
    }
  };

  const handleReassign = async () => {
    if (!selectedJob || !reassignDriverId) return;
    if (!selectedJob.jobRequestId) {
      addToast("Can't find the original job request for this booking.", "error");
      return;
    }

    setReassigning(true);
    try {
      const response = await api.post(
        `/api/jobs/${selectedJob.jobRequestId}/assign-driver`,
        { driverId: reassignDriverId, truckId: selectedJob.truckId },
        getToken()
      );
      if (!response.success) throw new Error(response.message || "Failed to reassign driver");
      addToast("Driver reassigned.", "success");
      setSelectedJob(null);
      load();
    } catch (err) {
      addToast(err.message || "Failed to reassign driver.", "error");
    } finally {
      setReassigning(false);
    }
  };

  if (loading) {
    return <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-slate-400">Loading active jobs...</div>;
  }
  if (error) {
    return <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-red-500">{error}</div>;
  }
  if (!jobs.length) {
    return <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-slate-400">No active jobs found.</div>;
  }

  const selectedIncident = selectedJob ? incidentsByBooking[selectedJob.id]?.incident : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {jobs.map((job) => {
        const incident = incidentsByBooking[job.id]?.incident;
        return (
          <div key={job.id} className="bg-white rounded-xl border border-slate-100 shadow-card p-5 flex flex-col">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-mono text-slate-400">{job.id}</span>
                  <Badge variant={STATUS_VARIANT[job.status] || "default"}>{job.status}</Badge>
                  {incident && (
                    <button onClick={() => openIncident(job)} className="hover:opacity-80 transition-opacity">
                      <Badge variant="danger">Issue Reported</Badge>
                    </button>
                  )}
                </div>
                <h3 className="font-bold text-slate-900 text-[15px]">{job.pickup} to {job.drop}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{job.distance} km route</p>
              </div>
              <p className="text-xl font-bold text-slate-900 font-mono flex-shrink-0">{formatCurrency(job.amount)}</p>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-start gap-2">
                <MapPin size={13} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                <div><p className="text-[11px] text-slate-400 font-semibold">PICKUP</p><p className="text-sm text-slate-700">{job.pickup}</p></div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin size={13} className="text-red-500 mt-0.5 flex-shrink-0" />
                <div><p className="text-[11px] text-slate-400 font-semibold">DROP</p><p className="text-sm text-slate-700">{job.drop}</p></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2">
                <Truck size={15} className="text-primary flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Truck</p>
                  <p className="text-sm font-semibold text-slate-800">{job.truckReg || "Not Assigned"}</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2">
                <User size={15} className="text-primary flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Driver</p>
                  <p className="text-sm font-semibold text-slate-800">{job.driver?.name || "Not Assigned"}</p>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-3 border-t border-slate-100">
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-3">Trip Progress</p>
              <StatusTimeline steps={DRIVER_STATUS_STEPS} currentStatus={STATUS_KEY_MAP[job.status] || "assigned"} />
            </div>
          </div>
        );
      })}

      <Modal isOpen={!!selectedJob} onClose={() => setSelectedJob(null)} title="Incident Reported" size="sm">
        {selectedJob && (
          <div className="space-y-4">
            {selectedIncident ? (
              <>
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2.5">
                  <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-1">{selectedIncident.reason.replace(/_/g, " ")}</p>
                    <p className="text-sm text-red-700">{selectedIncident.notes || "No additional notes provided."}</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Resolution notes</label>
                  <textarea
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    rows={2}
                    placeholder="How was this resolved?"
                    className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
                  />
                  <button
                    onClick={handleResolve}
                    disabled={!resolution.trim() || resolving}
                    className="mt-2 w-full btn-primary py-2.5 text-sm disabled:opacity-50"
                  >
                    {resolving ? "Resolving..." : "Mark Resolved"}
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5"><User size={13} /> Reassign to a different driver</label>
                  <DriverDropdown drivers={drivers} value={reassignDriverId} onChange={setReassignDriverId} placeholder="Select driver" />
                  <button
                    onClick={handleReassign}
                    disabled={!reassignDriverId || reassigning}
                    className="mt-2 w-full py-2.5 text-sm rounded-lg font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {reassigning ? "Reassigning..." : "Reassign Driver"}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">This incident has already been resolved.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
