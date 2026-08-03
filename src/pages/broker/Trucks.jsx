import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Edit2, Trash2, Truck, MoreVertical, UserCog } from "lucide-react";
import Badge from "../../components/broker/Badge";
import Modal from "../../components/broker/Modal";
import ConfirmDialog from "../../components/broker/ConfirmDialog";
import DriverDropdown from "../../components/broker/DriverDropdown";
import { useToast } from "../../hooks/useToast";
import { api, getToken } from "../../services/api";
import { formatDate } from "../../utils";

const STATUS_VARIANT = { available: "success", on_trip: "primary", maintenance: "warning" };
const TRUCK_TYPES = ["small", "medium", "large"];
const EMPTY_FORM = { registration: "", category: "small", capacity: "", make: "", year: "", insuranceExpiry: "" };

// Kebab menu for a table row — panel is portaled to document.body and positioned via
// getBoundingClientRect so it isn't clipped by the table's overflow-x-auto container.
function TruckRowMenu({ onEdit, onAssignDriver, onDelete }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    const handler = (event) => {
      if (btnRef.current?.contains(event.target)) return;
      if (panelRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const updatePos = () => {
      const rect = btnRef.current?.getBoundingClientRect();
      if (rect) setPos({ top: rect.bottom + 6, left: rect.right - 176 });
    };
    updatePos();
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open]);

  const menuItem = (label, Icon, onClick, danger = false) => (
    <button
      onClick={() => { setOpen(false); onClick(); }}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
        danger ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      <Icon size={14} /> {label}
    </button>
  );

  return (
    <div className="relative inline-block">
      <button
        ref={btnRef}
        onClick={() => setOpen((value) => !value)}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
      >
        <MoreVertical size={16} />
      </button>
      {open && pos && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[10000] w-44 bg-white border border-slate-100 rounded-lg shadow-modal py-1"
          style={{ top: pos.top, left: pos.left }}
        >
          {menuItem("Edit", Edit2, onEdit)}
          {menuItem("Assign Driver", UserCog, onAssignDriver)}
          {menuItem("Delete", Trash2, onDelete, true)}
        </div>,
        document.body
      )}
    </div>
  );
}

export default function Trucks() {
  const { addToast } = useToast();
  const [truckList, setTruckList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editTruck, setEditTruck] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState("");
  const [saveError, setSaveError] = useState("");

  const [assignTruck, setAssignTruck] = useState(null);
  const [assignDriverId, setAssignDriverId] = useState("");
  const [assignError, setAssignError] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [activeDrivers, setActiveDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  const loadTrucks = async () => {
    const response = await api.get("/api/vehicles/trucks?limit=100", getToken());
    setTruckList(response.data?.trucks || []);
  };

  useEffect(() => {
    loadTrucks().catch(() => setTruckList([]));
  }, []);

  const filtered = useMemo(() => truckList.filter((truck) => (
    truck.registration?.toLowerCase().includes(search.toLowerCase()) ||
    String(truck.make || "").toLowerCase().includes(search.toLowerCase())
  )), [search, truckList]);

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
    setShowModal(true);
  };

  const REGISTRATION_REGEX = /^[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{1,4}$/i;

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
      <div className="flex items-center justify-between gap-3">
        <input type="text" placeholder="Search by registration or make..." value={search} onChange={(event) => setSearch(event.target.value)} className="input-field px-3 py-2 max-w-xs" />
        <button onClick={openAdd} className="btn-primary px-4 py-2 text-sm flex items-center gap-2"><Plus size={15} /> Add Truck</button>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Registration", "Type", "Capacity", "Make", "Year", "Insurance Expiry", "Status", "Driver", ""].map((heading) => (
                  <th key={heading} className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((truck) => (
                <tr key={truck.id} className="table-row">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-800">{truck.registration}</td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{truck.category || truck.type || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{truck.capacity}</td>
                  <td className="px-4 py-3 text-slate-600">{truck.make}</td>
                  <td className="px-4 py-3 text-slate-600">{truck.year || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(truck.insuranceExpiry)}</td>
                  <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[truck.status] || "default"}>{truck.status}</Badge></td>
                  <td className="px-4 py-3 text-slate-600">{truck.driver || "-"}</td>
                  <td className="px-4 py-3">
                    <TruckRowMenu
                      onEdit={() => openEdit(truck)}
                      onAssignDriver={() => openAssign(truck)}
                      onDelete={() => setDeleteId(truck.id)}
                    />
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400"><Truck size={32} className="mx-auto mb-2 opacity-30" />No trucks found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

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
