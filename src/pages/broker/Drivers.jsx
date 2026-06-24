import { useState } from "react";
import { Eye, ShieldCheck, ShieldAlert, Users } from "lucide-react";
import Badge from "../../components/broker/Badge";
import Modal from "../../components/broker/Modal";
import { drivers, getTruckById } from "../../data/brokerMockData";

const KYC_VARIANT = { Verified: "success", Pending: "warning", Rejected: "danger" };

export default function Drivers() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);

  const filtered = drivers.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.phone.includes(search);
    const matchFilter = filter === "All" || d.kycStatus === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <input type="text" placeholder="Search by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field px-3 py-2 max-w-xs" />
        <div className="flex items-center gap-2">
          {["All", "Verified", "Pending"].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === f ? "bg-primary text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Driver", "Phone", "License No.", "KYC", "Assigned Truck", "Trips", "License Expiry", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                const truck = d.truckId ? getTruckById(d.truckId) : null;
                const licExpired = new Date(d.licenseExpiry) < new Date();
                return (
                  <tr key={d.id} className="table-row">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-bold text-xs">{d.name[0]}</span>
                        </div>
                        <span className="font-semibold text-slate-800">{d.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{d.phone}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{d.licenseNo}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {d.kycStatus === "Verified" ? <ShieldCheck size={13} className="text-emerald-500" /> : <ShieldAlert size={13} className="text-amber-500" />}
                        <Badge variant={KYC_VARIANT[d.kycStatus] || "default"} size="sm">{d.kycStatus}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{truck ? truck.registration : "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{d.totalTrips}</td>
                    <td className="px-4 py-3"><span className={licExpired ? "text-red-500 font-semibold" : "text-slate-600"}>{d.licenseExpiry}</span></td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(d)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-all">
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400"><Users size={32} className="mx-auto mb-2 opacity-30" />No drivers found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Driver Details" size="sm">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold text-xl">{selected.name[0]}</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-[15px]">{selected.name}</h3>
                <p className="text-sm text-slate-500">{selected.phone}</p>
                <Badge variant={KYC_VARIANT[selected.kycStatus] || "default"} size="sm" className="mt-1">{selected.kycStatus}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "License No.", value: selected.licenseNo },
                { label: "Aadhaar", value: selected.aadhaar },
                { label: "License Expiry", value: selected.licenseExpiry },
                { label: "Total Trips", value: selected.totalTrips },
                { label: "Assigned Truck", value: selected.truckId ? (getTruckById(selected.truckId) ? getTruckById(selected.truckId).registration : "-") : "-" },
                { label: "Status", value: selected.status },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[11px] text-slate-400 font-semibold mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-slate-800">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
