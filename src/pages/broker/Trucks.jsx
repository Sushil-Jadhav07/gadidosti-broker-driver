import { useState } from "react";
import { Plus, Edit2, Trash2, Truck } from "lucide-react";
import Badge from "../../components/broker/Badge";
import Modal from "../../components/broker/Modal";
import ConfirmDialog from "../../components/broker/ConfirmDialog";
import { trucks as initialTrucks, getDriverById } from "../../data/brokerMockData";

const STATUS_VARIANT = { Available: "success", "On Trip": "primary", Maintenance: "warning" };
const EMPTY_FORM = { registration: "", type: "Medium", capacity: "", make: "", year: "", insuranceExpiry: "" };

export default function Trucks() {
  const [truckList, setTruckList] = useState(initialTrucks);
  const [showModal, setShowModal] = useState(false);
  const [editTruck, setEditTruck] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState("");

  const filtered = truckList.filter(
    (t) =>
      t.registration.toLowerCase().includes(search.toLowerCase()) ||
      t.make.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditTruck(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (truck) => {
    setEditTruck(truck);
    setForm({ registration: truck.registration, type: truck.type, capacity: truck.capacity, make: truck.make, year: String(truck.year), insuranceExpiry: truck.insuranceExpiry });
    setShowModal(true);
  };
  const handleSave = () => {
    if (editTruck) {
      setTruckList((prev) => prev.map((t) => t.id === editTruck.id ? { ...t, ...form, year: Number(form.year) } : t));
    } else {
      setTruckList((prev) => [...prev, { ...form, id: Date.now(), status: "Available", driverId: null, lastTrip: "-", year: Number(form.year) }]);
    }
    setShowModal(false);
  };
  const handleDelete = () => { setTruckList((prev) => prev.filter((t) => t.id !== deleteId)); setDeleteId(null); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <input type="text" placeholder="Search by registration or make..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field px-3 py-2 max-w-xs" />
        <button onClick={openAdd} className="btn-primary px-4 py-2 text-sm flex items-center gap-2">
          <Plus size={15} /> Add Truck
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Registration", "Type", "Capacity", "Make", "Year", "Insurance Expiry", "Status", "Driver", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((truck) => {
                const driver = truck.driverId ? getDriverById(truck.driverId) : null;
                const insExpired = new Date(truck.insuranceExpiry) < new Date();
                return (
                  <tr key={truck.id} className="table-row">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800">{truck.registration}</td>
                    <td className="px-4 py-3 text-slate-600">{truck.type}</td>
                    <td className="px-4 py-3 text-slate-600">{truck.capacity}</td>
                    <td className="px-4 py-3 text-slate-600">{truck.make}</td>
                    <td className="px-4 py-3 text-slate-600">{truck.year}</td>
                    <td className="px-4 py-3"><span className={insExpired ? "text-red-500 font-semibold" : "text-slate-600"}>{truck.insuranceExpiry}</span></td>
                    <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[truck.status] || "default"}>{truck.status}</Badge></td>
                    <td className="px-4 py-3 text-slate-600">{driver ? driver.name : "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(truck)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"><Edit2 size={14} /></button>
                        <button onClick={() => setDeleteId(truck.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400"><Truck size={32} className="mx-auto mb-2 opacity-30" />No trucks found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editTruck ? "Edit Truck" : "Add New Truck"}>
        <div className="space-y-4">
          {[
            { label: "Registration Number", key: "registration", placeholder: "MH-12-AB-1234" },
            { label: "Make / Model", key: "make", placeholder: "Tata 407" },
            { label: "Capacity", key: "capacity", placeholder: "5 Tons" },
            { label: "Year", key: "year", placeholder: "2022" },
            { label: "Insurance Expiry", key: "insuranceExpiry", type: "date" },
          ].map(({ label, key, placeholder, type }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
              <input type={type || "text"} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} className="input-field px-3 py-2" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Type</label>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="input-field px-3 py-2">
              {["Small", "Medium", "Large"].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="flex-1 btn-ghost px-4 py-2.5 text-sm border border-slate-200">Cancel</button>
            <button onClick={handleSave} className="flex-1 btn-primary px-4 py-2.5 text-sm">{editTruck ? "Save Changes" : "Add Truck"}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Remove Truck" message="Are you sure you want to remove this truck from your fleet?" confirmText="Remove" />
    </div>
  );
}
