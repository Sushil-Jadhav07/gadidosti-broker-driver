import { useEffect, useMemo, useState } from "react";
import { Plus, Edit2, Trash2, Truck } from "lucide-react";
import Badge from "../../components/broker/Badge";
import Modal from "../../components/broker/Modal";
import ConfirmDialog from "../../components/broker/ConfirmDialog";
import { api, getToken } from "../../services/api";
import { formatDate } from "../../utils";

const STATUS_VARIANT = { available: "success", on_trip: "primary", maintenance: "warning" };
const EMPTY_FORM = { registration: "", type: "", category: "small", capacity: "", make: "", year: "", insuranceExpiry: "" };

export default function Trucks() {
  const [truckList, setTruckList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editTruck, setEditTruck] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState("");

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

  const openAdd = () => { setEditTruck(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (truck) => {
    setEditTruck(truck);
    setForm({
      registration: truck.registration || "",
      type: truck.type || "",
      category: truck.category || "small",
      capacity: truck.capacity || "",
      make: truck.make || "",
      year: String(truck.year || ""),
      insuranceExpiry: truck.insuranceExpiry ? String(truck.insuranceExpiry).slice(0, 10) : "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    const token = getToken();
    const payload = {
      registration: form.registration,
      type: form.type,
      category: form.category,
      capacity: form.capacity,
      make: form.make,
      year: Number(form.year) || null,
      insuranceExpiry: form.insuranceExpiry || null,
    };
    if (editTruck) {
      await api.patch(`/api/vehicles/trucks/${editTruck.id}`, payload, token);
    } else {
      await api.post("/api/vehicles/trucks", payload, token);
    }
    setShowModal(false);
    loadTrucks().catch(() => {});
  };

  const handleDelete = async () => {
    await api.delete(`/api/vehicles/trucks/${deleteId}`, getToken());
    setDeleteId(null);
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
                  <td className="px-4 py-3 text-slate-600">{truck.type}</td>
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
          {[
            ["registration", "Registration Number"],
            ["type", "Truck Type"],
            ["capacity", "Capacity"],
            ["make", "Make / Model"],
            ["year", "Year"],
            ["insuranceExpiry", "Insurance Expiry"],
          ].map(([key, label]) => (
            <div key={key} className={key === "registration" ? "col-span-2" : ""}>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
              <input
                type={key === "insuranceExpiry" ? "date" : "text"}
                value={form[key]}
                onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                className="input-field px-3 py-2 w-full"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Category</label>
            <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="input-field px-3 py-2 w-full">
              {["small", "medium", "large", "part"].map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
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
