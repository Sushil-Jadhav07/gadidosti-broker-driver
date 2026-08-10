import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Truck, User, AlertTriangle, Flag, Wrench, MessageCircle, Navigation } from "lucide-react";
import Badge from "../../components/broker/Badge";
import Modal from "../../components/broker/Modal";
import DriverDropdown from "../../components/broker/DriverDropdown";
import StatusTimeline from "../../components/driver/StatusTimeline";
import ChatWindow from "../../components/ChatWindow";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { api, getToken } from "../../services/api";
import { adaptBooking, formatCurrency, DRIVER_STATUS_STEPS } from "../../utils";

const STATUS_VARIANT = { "In Transit": "primary", "Picked Up": "warning", Assigned: "default", Accepted: "success" };

const ISSUE_TYPES = [
  { value: "damaged_goods", label: "Damaged Goods" },
  { value: "payment_delay", label: "Payment Delay" },
  { value: "cancellation_fee", label: "Cancellation Fee" },
  { value: "route_dispute", label: "Route Dispute" },
  { value: "late_delivery", label: "Late Delivery" },
  { value: "fuel_surcharge", label: "Fuel Surcharge" },
  { value: "wrong_items", label: "Wrong Items" },
  { value: "weight_discrepancy", label: "Weight Discrepancy" },
];

const STATUS_KEY_MAP = {
  Assigned: "assigned",
  "En Route Pickup": "en_route_pickup",
  "Picked Up": "picked_up",
  "In Transit": "in_transit",
  Delivered: "delivered",
  Completed: "completed",
};

const MECHANIC_STATUS_OPTIONS = [
  { value: "requested", label: "Requested" },
  { value: "mechanic_assigned", label: "Mechanic Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

export default function ActiveJobs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [incidentsByBooking, setIncidentsByBooking] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [chatJob, setChatJob] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [resolution, setResolution] = useState("");
  const [resolving, setResolving] = useState(false);
  const [reassignDriverId, setReassignDriverId] = useState("");
  const [reassigning, setReassigning] = useState(false);
  const [mechanicForm, setMechanicForm] = useState({ status: "", mechanicName: "", mechanicPhone: "", notes: "" });
  const [updatingMechanic, setUpdatingMechanic] = useState(false);

  const [disputeJob, setDisputeJob] = useState(null);
  const [disputeIssueType, setDisputeIssueType] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);

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
    const incident = incidentsByBooking[job.id]?.incident;
    const mr = incident?.mechanicRequest;
    setMechanicForm({ status: mr?.status || "", mechanicName: mr?.mechanicName || "", mechanicPhone: mr?.mechanicPhone || "", notes: "" });
  };

  const openDispute = (job) => {
    setDisputeJob(job);
    setDisputeIssueType("");
    setDisputeDescription("");
  };

  const handleSubmitDispute = async () => {
    if (!disputeJob) return;
    if (!disputeIssueType) {
      addToast("Please select an issue type.", "error");
      return;
    }
    if (!disputeDescription.trim()) {
      addToast("Please describe the issue.", "error");
      return;
    }
    setSubmittingDispute(true);
    try {
      const response = await api.post("/api/disputes", {
        booking_id: disputeJob.id,
        issue_type: disputeIssueType,
        description: disputeDescription.trim(),
      }, getToken());
      if (!response.success) throw new Error(response.message || "Failed to raise dispute");
      addToast("Dispute raised — our team will review it shortly.", "success");
      setDisputeJob(null);
    } catch (err) {
      addToast(err.message || "Failed to raise dispute.", "error");
    } finally {
      setSubmittingDispute(false);
    }
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

  // Breakdown dispatch workflow — updates the linked mechanic_requests row without necessarily
  // closing out the incident (unless status is set to "Resolved").
  const handleUpdateMechanic = async () => {
    if (!selectedJob) return;
    const entry = incidentsByBooking[selectedJob.id];
    if (!entry?.incident || !entry.tripId) return;

    setUpdatingMechanic(true);
    try {
      const response = await api.patch(
        `/api/trips/${entry.tripId}/incidents/${entry.incident.id}/mechanic`,
        {
          status: mechanicForm.status || undefined,
          mechanicName: mechanicForm.mechanicName.trim() || undefined,
          mechanicPhone: mechanicForm.mechanicPhone.trim() || undefined,
          notes: mechanicForm.notes.trim() || undefined,
        },
        getToken()
      );
      if (!response.success) throw new Error(response.message || "Failed to update mechanic status");
      const updatedIncident = response.data?.incident;
      const stillOpen = updatedIncident && updatedIncident.status !== "resolved";
      setIncidentsByBooking((current) => ({ ...current, [selectedJob.id]: { ...entry, incident: stillOpen ? updatedIncident : null } }));
      addToast(stillOpen ? "Mechanic status updated." : "Breakdown marked resolved.", "success");
      if (!stillOpen) setSelectedJob(null);
    } catch (err) {
      addToast(err.message || "Failed to update mechanic status.", "error");
    } finally {
      setUpdatingMechanic(false);
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
                      <Badge variant={incident.reason === "breakdown" ? "warning" : "danger"}>
                        {incident.reason === "breakdown" ? "Breakdown Reported" : "Issue Reported"}
                      </Badge>
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

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
              <button
                onClick={() => openDispute(job)}
                className="flex items-center gap-1.5 text-xs font-semibold text-danger hover:underline"
              >
                <Flag size={12} /> Report a Problem
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(`/job-history/${job.id}`)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <Navigation size={12} /> Track Live
                </button>
                <button
                  onClick={() => setChatJob(job)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <MessageCircle size={12} /> Chat
                </button>
              </div>
            </div>
          </div>
        );
      })}

      <Modal isOpen={!!selectedJob} onClose={() => setSelectedJob(null)} title={selectedIncident?.reason === "breakdown" ? "Breakdown Reported" : "Incident Reported"} size="sm">
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

                {selectedIncident.reason === "breakdown" && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-3">
                    <label className="text-xs font-semibold text-amber-800 flex items-center gap-1.5"><Wrench size={13} /> Mechanic Dispatch</label>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Status</label>
                      <select
                        value={mechanicForm.status}
                        onChange={(e) => setMechanicForm((f) => ({ ...f, status: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary transition-colors bg-white"
                      >
                        <option value="">Unchanged</option>
                        {MECHANIC_STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Mechanic Name</label>
                        <input
                          type="text"
                          value={mechanicForm.mechanicName}
                          onChange={(e) => setMechanicForm((f) => ({ ...f, mechanicName: e.target.value }))}
                          placeholder="e.g. Ramesh Auto Works"
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none focus:border-primary transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Mechanic Phone</label>
                        <input
                          type="tel"
                          value={mechanicForm.mechanicPhone}
                          onChange={(e) => setMechanicForm((f) => ({ ...f, mechanicPhone: e.target.value }))}
                          placeholder="10-digit number"
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none focus:border-primary transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Dispatch notes (optional)</label>
                      <textarea
                        value={mechanicForm.notes}
                        onChange={(e) => setMechanicForm((f) => ({ ...f, notes: e.target.value }))}
                        rows={2}
                        placeholder="e.g. ETA 30 mins, ordered a replacement tyre"
                        className="w-full resize-none rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none focus:border-primary transition-colors"
                      />
                    </div>

                    <button
                      onClick={handleUpdateMechanic}
                      disabled={updatingMechanic}
                      className="w-full py-2.5 text-sm rounded-lg font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
                    >
                      {updatingMechanic ? "Updating..." : "Update Mechanic Status"}
                    </button>
                  </div>
                )}

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

      <Modal isOpen={!!disputeJob} onClose={() => setDisputeJob(null)} title="Report a Problem" size="sm">
        {disputeJob && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">{disputeJob.pickup} to {disputeJob.drop}</p>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Issue Type</label>
              <select
                value={disputeIssueType}
                onChange={(e) => setDisputeIssueType(e.target.value)}
                className="input-field px-3 py-2 w-full"
              >
                <option value="">Select an issue...</option>
                {ISSUE_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Description</label>
              <textarea
                value={disputeDescription}
                onChange={(e) => setDisputeDescription(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Describe what went wrong..."
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setDisputeJob(null)} className="flex-1 btn-ghost px-4 py-2.5 text-sm border border-slate-200">Cancel</button>
              <button
                onClick={handleSubmitDispute}
                disabled={submittingDispute}
                className="flex-1 py-2.5 text-sm rounded-lg font-semibold text-white bg-danger hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submittingDispute ? "Submitting..." : "Submit Dispute"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!chatJob} onClose={() => setChatJob(null)} title="Chat" size="sm">
        {chatJob && <ChatWindow bookingId={chatJob.id} currentUserId={user?.id} />}
      </Modal>
    </div>
  );
}
