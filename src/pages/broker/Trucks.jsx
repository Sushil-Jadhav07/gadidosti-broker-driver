import { useEffect, useMemo, useState } from "react";
import { Plus, Edit2, Trash2, Truck } from "lucide-react";
import Badge from "../../components/broker/Badge";
import Modal from "../../components/broker/Modal";
import ConfirmDialog from "../../components/broker/ConfirmDialog";
import { useToast } from "../../hooks/useToast";
import { api, getToken } from "../../services/api";
import { formatDate } from "../../utils";

const STATUS_VARIANT = { available: "success", on_trip: "primary", maintenance: "warning" };
const TRUCK_TYPES = ["small", "medium", "large"];
const EMPTY_FORM = { registration: "", category: "small", capacity: "", make: "", year: "", insuranceExpiry: "" };

export default function Trucks() {
  const { addToast } = useToast();
  const [truckList, setTruckList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editTruck, setEditTruck] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState("");
  const [saveError, setSaveError] = useState("");

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
                  <td className="px-4 py-3 text-slate-600">{truck.driver_name || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(truck)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"><Edit2 size={14} /></button>
                      <button onClick={() => setDeleteId(truck.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 size={14} /></button>
                    </div>
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

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Remove Truck" message="Are you sure you want to remove this truck from your fleet?" confirmText="Remove" />
    </div>
  );
}
