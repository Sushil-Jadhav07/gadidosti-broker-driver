import { useEffect, useMemo, useState } from "react";
import { Eye, ShieldCheck, ShieldAlert, Users, Plus, Info, Search, CheckCircle2, XCircle } from "lucide-react";
import Badge from "../../components/broker/Badge";
import Modal from "../../components/broker/Modal";
import TruckDropdown from "../../components/broker/TruckDropdown";
import { useToast } from "../../hooks/useToast";
import { api, getToken } from "../../services/api";
import { formatKycStatus, formatDate } from "../../utils";

const KYC_VARIANT = { Verified: "success", Pending: "warning", Rejected: "danger", Submitted: "warning" };

const EMPTY_FORM = {
  lookupPhone: "",
  foundDriver: null,
  licenseNo: "",
  licenseExpiry: "",
  aadhaar: "",
  truckId: "",
};

const formatAadhaar = (raw, digits) => {
  // digits holds the true underlying digit string (up to 12); display masks all but the last 4.
  const groups = [];
  for (let i = 0; i < digits.length; i += 4) groups.push(digits.slice(i, i + 4));
  return groups.map((g, i) => (i === groups.length - 1 ? g : "X".repeat(g.length))).join("-");
};

export default function Drivers() {
  const { addToast } = useToast();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [aadhaarDigits, setAadhaarDigits] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState(null);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const [driverRes, truckRes] = await Promise.all([
        api.get("/api/vehicles/drivers?limit=100", token),
        api.get("/api/vehicles/trucks?limit=100", token),
      ]);
      setDrivers(driverRes.data?.drivers || []);
      setTrucks(truckRes.data?.trucks || []);
    } catch {
      setError("Failed to load drivers. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const filtered = useMemo(() => drivers.filter((driver) => {
    const kycStatus = formatKycStatus(driver.kycStatus || driver.kyc_status);
    const matchSearch = driver.name?.toLowerCase().includes(search.toLowerCase()) || driver.phone?.includes(search);
    const matchFilter = filter === "All" || kycStatus === filter;
    return matchSearch && matchFilter;
  }), [drivers, filter, search]);

  const unassignedTrucks = useMemo(
    () => trucks.filter((truck) => !truck.driverId && !truck.driver_id),
    [trucks],
  );

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setAadhaarDigits("");
    setErrors({});
    setLookupError(null);
    setShowAdd(true);
  };

  const handleLookup = async () => {
    const digits = form.lookupPhone.replace(/\D/g, "");
    if (digits.length !== 10) {
      setLookupError("Enter a valid 10-digit phone number.");
      return;
    }
    setLooking(true);
    setLookupError(null);
    try {
      const res = await api.get(`/api/vehicles/drivers/lookup?phone=${digits}`, getToken());
      if (!res.success) throw new Error(res.message || "Driver not found");
      setForm((f) => ({ ...f, foundDriver: res.data.driver }));
    } catch (err) {
      setForm((f) => ({ ...f, foundDriver: null }));
      setLookupError(err.message || "Driver not found.");
    } finally {
      setLooking(false);
    }
  };

  const changeDriver = () => setForm((f) => ({ ...f, foundDriver: null, lookupPhone: "" }));

  const validate = () => {
    const next = {};
    if (!form.foundDriver) {
      next.foundDriver = "Find a driver by phone number first.";
    }
    if (form.licenseNo.trim() && drivers.some((d) => (d.licenseNo || d.license_no)?.toLowerCase() === form.licenseNo.trim().toLowerCase())) {
      next.licenseNo = "This license number is already registered.";
    }
    if (form.licenseExpiry) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (new Date(form.licenseExpiry) < today) next.licenseExpiry = "License expiry cannot be in the past.";
    }
    if (aadhaarDigits && aadhaarDigits.length !== 12) {
      next.aadhaar = "Aadhaar must be 12 digits.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        user_id: form.foundDriver.id,
        license_no: form.licenseNo.trim() || undefined,
        license_expiry: form.licenseExpiry || undefined,
        aadhaar: aadhaarDigits.length === 12 ? aadhaarDigits : undefined,
        truck_id: form.truckId || undefined,
      };
      const res = await api.post("/api/vehicles/drivers", payload, getToken());
      if (!res.success) throw new Error(res.message || "Failed to add driver");
      addToast("Driver added. KYC status defaults to Pending until reviewed.", "success");
      setShowAdd(false);
      loadAll();
    } catch (err) {
      addToast(err.message || "Failed to add driver.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
        <Info size={16} className="flex-shrink-0 mt-0.5" />
        <span>Adding a driver links an <b>existing driver account</b> to your fleet — the driver must have already signed up on the app. Search by their phone number below.</span>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <input type="text" placeholder="Search by name or phone..." value={search} onChange={(event) => setSearch(event.target.value)} className="input-field px-3 py-2 max-w-xs" />
        <div className="flex items-center gap-2">
          {["All", "Verified", "Pending", "Submitted"].map((value) => (
            <button key={value} onClick={() => setFilter(value)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === value ? "bg-primary text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{value}</button>
          ))}
          <button onClick={openAdd} className="btn-primary px-4 py-2 text-sm flex items-center gap-2"><Plus size={15} /> Add Driver</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Driver", "Phone", "License No.", "KYC", "Assigned Truck", "Trips", "License Expiry", ""].map((heading) => (
                  <th key={heading} className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Loading drivers...</td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-red-500">{error}</td></tr>
              )}
              {!loading && !error && filtered.map((driver) => {
                const kycStatus = formatKycStatus(driver.kycStatus || driver.kyc_status);
                return (
                  <tr key={driver.id || driver.user_id} className="table-row">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><span className="text-primary font-bold text-xs">{driver.name?.[0] || "D"}</span></div>
                        <span className="font-semibold text-slate-800">{driver.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{driver.phone}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{driver.licenseNo || driver.license_no || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {kycStatus === "Verified" ? <ShieldCheck size={13} className="text-emerald-500" /> : <ShieldAlert size={13} className="text-amber-500" />}
                        <Badge variant={KYC_VARIANT[kycStatus] || "default"} size="sm">{kycStatus}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{driver.truckReg || driver.truck_reg || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{driver.totalTrips || driver.total_trips || 0}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(driver.licenseExpiry || driver.license_expiry)}</td>
                    <td className="px-4 py-3"><button onClick={() => setSelected(driver)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"><Eye size={14} /></button></td>
                  </tr>
                );
              })}
              {!loading && !error && !filtered.length && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400"><Users size={32} className="mx-auto mb-2 opacity-30" />No drivers found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Driver Details" size="sm">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Driver", selected.name],
                ["Phone", selected.phone],
                ["License No.", selected.licenseNo || selected.license_no],
                ["Aadhaar", selected.aadhaar],
                ["License Expiry", formatDate(selected.licenseExpiry || selected.license_expiry)],
                ["Assigned Truck", selected.truckReg || selected.truck_reg],
                ["Total Trips", selected.totalTrips || selected.total_trips],
                ["Status", selected.status],
              ].map(([label, value]) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[11px] text-slate-400 font-semibold mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-slate-800">{value || "-"}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Driver" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Driver Phone Number *</label>
            {form.foundDriver ? (
              <div className="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{form.foundDriver.name}</p>
                    <p className="text-xs text-slate-500">{form.foundDriver.phone} &middot; KYC {formatKycStatus(form.foundDriver.kycStatus)}</p>
                  </div>
                </div>
                <button onClick={changeDriver} className="text-xs font-semibold text-primary hover:underline flex-shrink-0">Change</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={form.lookupPhone}
                  onChange={(e) => setForm((f) => ({ ...f, lookupPhone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                  onKeyDown={(e) => { if (e.key === "Enter") handleLookup(); }}
                  placeholder="10-digit phone number"
                  className="input-field px-3 py-2 w-full font-mono text-sm"
                />
                <button
                  onClick={handleLookup}
                  disabled={looking}
                  className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5 flex-shrink-0 disabled:opacity-60"
                >
                  <Search size={14} /> {looking ? "Finding..." : "Find"}
                </button>
              </div>
            )}
            {lookupError && (
              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><XCircle size={12} /> {lookupError}</p>
            )}
            {errors.foundDriver && <p className="text-xs text-red-500 mt-1.5">{errors.foundDriver}</p>}
            <p className="text-[11px] text-slate-400 mt-1.5">The driver must already have an account on the driver app before you can add them.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">License No.</label>
              <input value={form.licenseNo} onChange={(e) => setForm((f) => ({ ...f, licenseNo: e.target.value }))} className="input-field px-3 py-2 w-full" placeholder="MH-2020123456789" />
              {errors.licenseNo && <p className="text-xs text-red-500 mt-1">{errors.licenseNo}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">License Expiry</label>
              <input type="date" value={form.licenseExpiry} onChange={(e) => setForm((f) => ({ ...f, licenseExpiry: e.target.value }))} className="input-field px-3 py-2 w-full" />
              {errors.licenseExpiry && <p className="text-xs text-red-500 mt-1">{errors.licenseExpiry}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Aadhaar</label>
              <input
                value={formatAadhaar(form.aadhaar, aadhaarDigits)}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
                  setAadhaarDigits(digits);
                }}
                className="input-field px-3 py-2 w-full font-mono"
                placeholder="XXXX-XXXX-1234"
              />
              {errors.aadhaar && <p className="text-xs text-red-500 mt-1">{errors.aadhaar}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Assign Truck</label>
              <TruckDropdown trucks={unassignedTrucks} value={form.truckId} onChange={(id) => setForm((f) => ({ ...f, truckId: id }))} />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={() => setShowAdd(false)} className="flex-1 btn-ghost px-4 py-2.5 text-sm border border-slate-200">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary px-4 py-2.5 text-sm disabled:opacity-60">{saving ? "Adding..." : "Add Driver"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
