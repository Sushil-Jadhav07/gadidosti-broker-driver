import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Truck, Search, LayoutGrid, List, ChevronLeft, ChevronRight,
  CheckCircle2, Navigation, Wrench, Edit2, UserCog, History, Trash2,
} from "lucide-react";
import Badge from "../../components/broker/Badge";
import Modal from "../../components/broker/Modal";
import ConfirmDialog from "../../components/broker/ConfirmDialog";
import DriverDropdown from "../../components/broker/DriverDropdown";
import { useToast } from "../../hooks/useToast";
import { api, getToken } from "../../services/api";
import { formatDate } from "../../utils";

const STATUS_META = {
  available: { label: "Available", variant: "success", color: "#17D86B", icon: CheckCircle2 },
  on_trip: { label: "On Trip", variant: "primary", color: "#166534", icon: Navigation },
  maintenance: { label: "Maintenance", variant: "warning", color: "#F59E0B", icon: Wrench },
};
const STATUS_OPTIONS = Object.keys(STATUS_META);
const TRUCK_TYPES = ["small", "medium", "large"];
const EMPTY_FORM = { registration: "", category: "small", capacity: "", make: "", year: "", insuranceExpiry: "" };
const ITEMS_PER_PAGE = 9;
const REGISTRATION_REGEX = /^[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{1,4}$/i;

function isInsuranceExpiring(dateStr) {
  if (!dateStr) return false;
  const daysLeft = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24);
  return daysLeft < 60;
}

function MiniBars({ ratio, color }) {
  const total = 20;
  const filled = Math.round(Math.max(0, Math.min(1, ratio || 0)) * total);
  return (
    <div className="flex items-end gap-[3px] h-6 mt-3">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className="flex-1 rounded-full" style={{ height: "100%", backgroundColor: i < filled ? color : "#E2E8F0" }} />
      ))}
    </div>
  );
}

export default function Trucks() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [truckList, setTruckList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("All");
  const [viewMode, setViewMode] = useState("grid");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedTruck, setSelectedTruck] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editTruck, setEditTruck] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState(null);
  const [saveError, setSaveError] = useState("");

  const [assignTruck, setAssignTruck] = useState(null);
  const [assignDriverId, setAssignDriverId] = useState("");
  const [assignError, setAssignError] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [activeDrivers, setActiveDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  const loadTrucks = async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/vehicles/trucks?limit=100", getToken());
      setTruckList(response.data?.trucks || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrucks().catch(() => setTruckList([]));
  }, []);

  const statusCounts = useMemo(() => {
    const counts = { available: 0, on_trip: 0, maintenance: 0 };
    truckList.forEach((truck) => { if (counts[truck.status] !== undefined) counts[truck.status] += 1; });
    return counts;
  }, [truckList]);

  const filtered = useMemo(() => truckList.filter((truck) => {
    const matchStatus = statusTab === "All" || truck.status === statusTab;
    const term = search.toLowerCase();
    const matchSearch = !term
      || truck.registration?.toLowerCase().includes(term)
      || String(truck.make || "").toLowerCase().includes(term)
      || String(truck.driver || "").toLowerCase().includes(term);
    return matchStatus && matchSearch;
  }), [truckList, statusTab, search]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginated = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const openAdd = () => { setEditTruck(null); setForm(EMPTY_FORM); setSaveError(""); setShowModal(true); };
  const openEdit = (truck) => {
    setEditTruck(truck);
    setSaveError("");
    setForm({
      registration: truck.registration || "",
      category: truck.category || truck.type || "small",
      capacity: truck.capacity || "",
      make: truck.make || "",
      year: String(truck.year || ""),
      insuranceExpiry: truck.insuranceExpiry ? String(truck.insuranceExpiry).slice(0, 10) : "",
    });
    setSelectedTruck(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.registration.trim()) {
      setSaveError("Registration number is required.");
      return;
    }
    if (!editTruck && !REGISTRATION_REGEX.test(form.registration.trim())) {
      setSaveError("Registration number looks invalid, e.g. MH-12-AB-1234.");
      return;
    }
    if (!form.capacity.trim()) {
      setSaveError("Capacity is required.");
      return;
    }
    setSaveError("");
    const token = getToken();
    const payload = {
      registration: form.registration,
      type: form.category,
      category: form.category,
      capacity: form.capacity,
      make: form.make,
      year: Number(form.year) || null,
      insurance_expiry: form.insuranceExpiry || null,
    };
    const response = editTruck
      ? await api.patch(`/api/vehicles/trucks/${editTruck.id}`, payload, token)
      : await api.post("/api/vehicles/trucks", payload, token);
    if (!response?.success) {
      setSaveError(response?.message || "Failed to save truck. Please try again.");
      return;
    }
    setShowModal(false);
    loadTrucks().catch(() => {});
  };

  const openAssign = async (truck) => {
    setAssignTruck(truck);
    setAssignDriverId("");
    setAssignError("");
    setSelectedTruck(null);
    setLoadingDrivers(true);
    try {
      const response = await api.get("/api/vehicles/drivers?limit=100", getToken());
      setActiveDrivers((response.data?.drivers || []).filter((driver) => driver.status === "available"));
    } catch {
      setActiveDrivers([]);
    } finally {
      setLoadingDrivers(false);
    }
  };

  const handleAssignDriver = async () => {
    if (!assignDriverId) {
      setAssignError("Select a driver to assign.");
      return;
    }
    setAssigning(true);
    setAssignError("");
    const response = await api.post(`/api/vehicles/trucks/${assignTruck.id}/assign-driver`, { driver_id: assignDriverId }, getToken());
    setAssigning(false);
    if (!response?.success) {
      setAssignError(response?.message || "Failed to assign driver. Please try again.");
      return;
    }
    addToast(response.message || "Driver assigned to truck.", "success");
    setAssignTruck(null);
    loadTrucks().catch(() => {});
  };

  const handleDelete = async () => {
    const response = await api.delete(`/api/vehicles/trucks/${deleteId}`, null, getToken());
    setDeleteId(null);
    if (!response?.success) {
      addToast(response?.message || "Failed to remove truck. Please try again.", "error");
      return;
    }
    loadTrucks().catch(() => {});
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Trucks</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your fleet and track truck availability</p>
        </div>
        <button onClick={openAdd} className="btn-primary px-4 py-2 text-sm flex items-center gap-2 flex-shrink-0"><Plus size={16} /> Add Truck</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
          <div className="flex items-center gap-2 text-[13px] text-slate-500"><Truck size={15} className="text-slate-400" /> Total Fleet</div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono tracking-tight">{truckList.length}</p>
          <p className="text-[11px] text-slate-400 mt-1">Registered trucks</p>
          <MiniBars ratio={1} color="#166534" />
        </div>
        {STATUS_OPTIONS.map((key) => {
          const meta = STATUS_META[key];
          const Icon = meta.icon;
          return (
            <div key={key} className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
              <div className="flex items-center gap-2 text-[13px] text-slate-500"><Icon size={15} className="text-slate-400" /> {meta.label}</div>
              <p className="text-2xl font-bold text-slate-900 mt-2 font-mono tracking-tight">
                {statusCounts[key]}<span className="text-sm text-slate-400 font-medium">/{truckList.length}</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {key === "available" ? "Ready to dispatch" : key === "on_trip" ? "Currently on the road" : "Out of service"}
              </p>
              <MiniBars ratio={truckList.length ? statusCounts[key] / truckList.length : 0} color={meta.color} />
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by registration, make, driver..."
              value={search}
              onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }}
              className="input-field pl-9 pr-3 py-2 w-full"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["All", ...STATUS_OPTIONS].map((tab) => (
              <button
                key={tab}
                onClick={() => { setStatusTab(tab); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusTab === tab ? "bg-primary/10 text-primary border border-primary/20" : "text-slate-500 border border-transparent hover:bg-slate-50"
                }`}
              >
                {tab === "All" ? "All" : STATUS_META[tab].label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 flex-shrink-0">
            <button onClick={() => setViewMode("grid")} aria-label="Grid view" className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"}`}><LayoutGrid size={16} /></button>
            <button onClick={() => setViewMode("list")} aria-label="List view" className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"}`}><List size={16} /></button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-10 flex justify-center">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {paginated.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-12 text-center text-slate-400 sm:col-span-2 xl:col-span-3">
                  <Truck size={32} className="mx-auto mb-2 opacity-30" />No trucks found
                </div>
              ) : paginated.map((truck) => {
                const meta = STATUS_META[truck.status] || {};
                return (
                  <button
                    key={truck.id}
                    onClick={() => setSelectedTruck(truck)}
                    className="bg-white rounded-2xl border border-slate-100 shadow-card p-4 text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 truncate font-mono">{truck.registration}</h3>
                        <p className="text-xs text-slate-400 mt-0.5 truncate capitalize">{truck.make || "-"} &middot; {truck.category || truck.type || "-"}</p>
                      </div>
                      <Badge variant={meta.variant} size="sm">{meta.label || truck.status}</Badge>
                    </div>

                    <div className="h-20 flex items-center justify-center my-3 bg-slate-50 rounded-xl">
                      <Truck size={30} className="text-slate-300" />
                    </div>

                    <div className="space-y-2 text-sm border-t border-slate-100 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Driver</span>
                        {truck.driver ? (
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold flex-shrink-0">{truck.driver[0]}</span>
                            <span className="font-medium text-slate-700 truncate">{truck.driver}</span>
                          </span>
                        ) : <span className="text-slate-400">Unassigned</span>}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Capacity</span>
                        <span className="font-medium text-slate-700">{truck.capacity || "-"}</span>
                      </div>
                      {isInsuranceExpiring(truck.insuranceExpiry) && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400">Insurance</span>
                          <span className="font-semibold text-red-500">Expires {formatDate(truck.insuranceExpiry)}</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {["Registration", "Type", "Capacity", "Make", "Year", "Insurance Expiry", "Status", "Driver"].map((heading) => (
                        <th key={heading} className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400"><Truck size={32} className="mx-auto mb-2 opacity-30" />No trucks found</td></tr>
                    ) : paginated.map((truck) => (
                      <tr key={truck.id} onClick={() => setSelectedTruck(truck)} className="table-row cursor-pointer">
                        <td className="px-4 py-3 font-mono font-semibold text-slate-800">{truck.registration}</td>
                        <td className="px-4 py-3 text-slate-600 capitalize">{truck.category || truck.type || "-"}</td>
                        <td className="px-4 py-3 text-slate-600">{truck.capacity}</td>
                        <td className="px-4 py-3 text-slate-600">{truck.make}</td>
                        <td className="px-4 py-3 text-slate-600">{truck.year || "-"}</td>
                        <td className={`px-4 py-3 whitespace-nowrap ${isInsuranceExpiring(truck.insuranceExpiry) ? "text-red-500 font-semibold" : "text-slate-600"}`}>{formatDate(truck.insuranceExpiry)}</td>
                        <td className="px-4 py-3"><Badge variant={STATUS_META[truck.status]?.variant}>{STATUS_META[truck.status]?.label || truck.status}</Badge></td>
                        <td className="px-4 py-3 text-slate-600">{truck.driver || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1 py-1 flex-wrap gap-3">
              <p className="text-sm text-slate-500">Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)} of {filtered.length} trucks</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"><ChevronLeft size={16} /></button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-100"}`}>{page}</button>
                ))}
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal isOpen={!!selectedTruck} onClose={() => setSelectedTruck(null)} title="Truck Details" size="sm">
        {selectedTruck && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Truck size={24} className="text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-mono">{selectedTruck.registration}</h3>
                <Badge variant={STATUS_META[selectedTruck.status]?.variant} size="sm">{STATUS_META[selectedTruck.status]?.label || selectedTruck.status}</Badge>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="font-medium capitalize">{selectedTruck.category || selectedTruck.type || "-"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Make</span><span className="font-medium">{selectedTruck.make || "-"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Year</span><span className="font-medium">{selectedTruck.year || "-"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Capacity</span><span className="font-medium">{selectedTruck.capacity || "-"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Driver</span><span className="font-medium">{selectedTruck.driver || "Unassigned"}</span></div>
              <div className="flex justify-between">
                <span className="text-slate-500">Insurance Expiry</span>
                <span className={`font-medium ${isInsuranceExpiring(selectedTruck.insuranceExpiry) ? "text-red-500" : ""}`}>{formatDate(selectedTruck.insuranceExpiry)}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => openEdit(selectedTruck)} className="flex flex-col items-center gap-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"><Edit2 size={15} /><span className="text-[11px] font-semibold">Edit</span></button>
              <button onClick={() => openAssign(selectedTruck)} className="flex flex-col items-center gap-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"><UserCog size={15} /><span className="text-[11px] font-semibold">Assign</span></button>
              <button onClick={() => navigate(`/trucks/${selectedTruck.id}/history`)} className="flex flex-col items-center gap-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"><History size={15} /><span className="text-[11px] font-semibold">History</span></button>
            </div>
            <button
              onClick={() => { setDeleteId(selectedTruck.id); setSelectedTruck(null); }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors text-sm font-semibold"
            >
              <Trash2 size={14} /> Remove Truck
            </button>
          </div>
        )}
      </Modal>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editTruck ? "Edit Truck" : "Add New Truck"} size="lg">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Registration Number</label>
            <input
              type="text"
              value={form.registration}
              onChange={(event) => setForm((current) => ({ ...current, registration: event.target.value }))}
              className="input-field px-3 py-2 w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Truck Type</label>
            <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="input-field px-3 py-2 w-full">
              {TRUCK_TYPES.map((truckType) => <option key={truckType} value={truckType}>{truckType[0].toUpperCase() + truckType.slice(1)}</option>)}
            </select>
          </div>
          {[
            ["capacity", "Capacity"],
            ["make", "Make / Model"],
            ["year", "Year"],
            ["insuranceExpiry", "Insurance Expiry"],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
              <input
                type={key === "insuranceExpiry" ? "date" : "text"}
                value={form[key]}
                onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                className="input-field px-3 py-2 w-full"
              />
            </div>
          ))}
          {saveError && <div className="col-span-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{saveError}</div>}
          <div className="col-span-2 flex gap-3 pt-1">
            <button onClick={() => setShowModal(false)} className="flex-1 btn-ghost px-4 py-2.5 text-sm border border-slate-200">Cancel</button>
            <button onClick={handleSave} className="flex-1 btn-primary px-4 py-2.5 text-sm">{editTruck ? "Save Changes" : "Add Truck"}</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!assignTruck} onClose={() => setAssignTruck(null)} title="Assign Driver" size="sm">
        {assignTruck && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[11px] text-slate-400 font-semibold mb-0.5">Truck</p>
              <p className="text-sm font-mono font-semibold text-slate-800">{assignTruck.registration}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Driver</label>
              {loadingDrivers ? (
                <div className="text-sm text-slate-400 py-2">Loading active drivers...</div>
              ) : (
                <DriverDropdown drivers={activeDrivers} value={assignDriverId} onChange={setAssignDriverId} placeholder="Select an active driver" />
              )}
              {assignError && <p className="text-xs text-red-500 mt-1.5">{assignError}</p>}
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setAssignTruck(null)} className="flex-1 btn-ghost px-4 py-2.5 text-sm border border-slate-200">Cancel</button>
              <button onClick={handleAssignDriver} disabled={assigning} className="flex-1 btn-primary px-4 py-2.5 text-sm disabled:opacity-60">{assigning ? "Assigning..." : "Assign Driver"}</button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Remove Truck" message="Are you sure you want to remove this truck from your fleet?" confirmText="Remove" />
    </div>
  );
}
