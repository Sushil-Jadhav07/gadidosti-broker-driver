import { useState } from "react";
import { Plus, Edit2, Trash2, Truck, Check } from "lucide-react";
import Badge from "../../components/broker/Badge";
import Modal from "../../components/broker/Modal";
import ConfirmDialog from "../../components/broker/ConfirmDialog";
import { trucks as initialTrucks, getDriverById } from "../../data/brokerMockData";

const STATUS_VARIANT = { Available: "success", "On Trip": "primary", Maintenance: "warning" };
const EMPTY_FORM = { registration: "", type: "Mini Truck", capacity: "", make: "", year: "", insuranceExpiry: "" };

const TRUCK_TYPES = [
  { value: "Mini Truck",   capacity: "Up to 1 Ton",  examples: "Tata Ace · Mahindra Jeeto",  color: "bg-violet-100 text-violet-600",  size: 18 },
  { value: "Small Truck",  capacity: "1 – 3 Ton",    examples: "Tata 407 · Eicher 10.90",    color: "bg-blue-100 text-blue-600",      size: 22 },
  { value: "Medium Truck", capacity: "3 – 7 Ton",    examples: "Tata 709 · Eicher Pro 1095", color: "bg-cyan-100 text-cyan-600",      size: 26 },
  { value: "Large Truck",  capacity: "7 – 15 Ton",   examples: "Tata 1109 · Ashok Leyland",  color: "bg-emerald-100 text-emerald-600",size: 30 },
  { value: "Heavy Truck",  capacity: "15 – 25 Ton",  examples: "Tata Prima · Volvo FH",      color: "bg-orange-100 text-orange-600",  size: 34 },
  { value: "Trailer",      capacity: "25 Ton+",       examples: "Multi-axle · Container",     color: "bg-red-100 text-red-600",        size: 38 },
];

function TruckTypeCard({ t, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1.5 py-4 px-2 rounded-2xl border-2 text-center transition-all duration-150 ${
        selected
          ? "border-primary bg-primary shadow-md shadow-primary/20 scale-[1.02]"
          : "border-slate-200 bg-white hover:border-primary/40 hover:bg-slate-50"
      }`}
    >
      {selected && (
        <span className="absolute top-2 right-2 w-4 h-4 bg-white rounded-full flex items-center justify-center">
          <Check size={10} className="text-primary" strokeWidth={3} />
        </span>
      )}
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selected ? "bg-white/20" : t.color}`}>
        <Truck size={t.size} className={selected ? "text-white" : ""} />
      </div>
      <p className={`text-[11px] font-bold leading-tight ${selected ? "text-white" : "text-slate-800"}`}>{t.value}</p>
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${selected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
        {t.capacity}
      </span>
      <p className={`text-[9px] leading-tight ${selected ? "text-white/70" : "text-slate-400"}`}>{t.examples}</p>
    </button>
  );
}

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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editTruck ? "Edit Truck" : "Add New Truck"} size="lg">
        <div className="space-y-5">

          {/* Truck Type — pick first like Uber/Ola */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Select Truck Type</label>
            <div className="grid grid-cols-3 gap-2.5">
              {TRUCK_TYPES.map((t) => (
                <TruckTypeCard
                  key={t.value}
                  t={t}
                  selected={form.type === t.value}
                  onClick={() => setForm((f) => ({ ...f, type: t.value }))}
                />
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Details */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Truck Details</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Registration Number", key: "registration", placeholder: "MH-12-AB-1234", col: 2 },
                { label: "Make / Model",         key: "make",         placeholder: "Tata 407" },
                { label: "Capacity",             key: "capacity",     placeholder: "5 Tons" },
                { label: "Year",                 key: "year",         placeholder: "2022" },
                { label: "Insurance Expiry",     key: "insuranceExpiry", type: "date" },
              ].map(({ label, key, placeholder, type, col }) => (
                <div key={key} className={col === 2 ? "col-span-2" : ""}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
                  <input
                    type={type || "text"}
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: key === "registration" ? e.target.value.toUpperCase() : e.target.value }))}
                    placeholder={placeholder}
                    className="input-field px-3 py-2 w-full"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
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
