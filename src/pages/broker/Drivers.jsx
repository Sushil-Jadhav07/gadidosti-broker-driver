import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, ShieldCheck, ShieldAlert, Users, Plus, Info, Search, CheckCircle2, XCircle, Trash2, UserPlus, Copy, Edit2, ArrowUpRight } from "lucide-react";
import Badge from "../../components/broker/Badge";
import Modal from "../../components/broker/Modal";
import ConfirmDialog from "../../components/broker/ConfirmDialog";
import TruckDropdown from "../../components/broker/TruckDropdown";
import MapView from "../../components/MapView";
import TripHistoryList from "../../components/TripHistoryList";
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

const EMPTY_REGISTER_FORM = {
  name: "",
  phone: "",
  email: "",
  licenseNo: "",
  licenseExpiry: "",
  aadhaar: "",
  truckId: "",
};

const formatAadhaar = (digits) => {
  // digits holds the true underlying digit string (up to 12); display masks all but the last 4.
  const groups = [];
  for (let i = 0; i < digits.length; i += 4) groups.push(digits.slice(i, i + 4));
  return groups.map((g, i) => (i === groups.length - 1 ? g : "X".repeat(g.length))).join("-");
};

// The displayed value is masked (XXXX-XXXX-1234), so it can't be used to recover the real
// digit string on change — the X's aren't digits and get stripped along with everything they
// stand for. Keystrokes are captured directly instead, and the display is purely derived.
const handleAadhaarKeyDown = (setDigits) => (event) => {
  if (event.key === "Tab" || event.metaKey || event.ctrlKey) return;
  event.preventDefault();
  if (event.key === "Backspace" || event.key === "Delete") {
    setDigits((prev) => prev.slice(0, -1));
  } else if (/^[0-9]$/.test(event.key)) {
    setDigits((prev) => (prev.length < 12 ? prev + event.key : prev));
  }
};

const handleAadhaarPaste = (setDigits) => (event) => {
  event.preventDefault();
  setDigits(event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 12));
};

const isoToDdMmYyyy = (iso) => {
  const [y, m, d] = (iso || "").split("-");
  return y && m && d ? `${d}${m}${y}` : "";
};

const ddMmYyyyToIso = (digits) => {
  if (digits.length !== 8) return "";
  const d = digits.slice(0, 2);
  const m = digits.slice(2, 4);
  const y = digits.slice(4, 8);
  return `${y}-${m}-${d}`;
};

const formatDateDigits = (digits) => [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join("/");

// Plain text input formatted as dd/mm/yyyy. The native <input type="date"> renders its display
// format from the browser/OS locale rather than anything we control, so digits are captured
// directly here and converted to/from the yyyy-mm-dd string the API expects. Modal unmounts its
// children on close (see Modal.jsx), so the useState initializer is enough to pick up a fresh
// `value` each time this reopens — no sync effect needed while the user is mid-edit.
function DateInput({ value, onChange, placeholder = "dd/mm/yyyy" }) {
  const [digits, setDigits] = useState(() => isoToDdMmYyyy(value));

  const handleChange = (event) => {
    const nextDigits = event.target.value.replace(/\D/g, "").slice(0, 8);
    setDigits(nextDigits);
    onChange(ddMmYyyyToIso(nextDigits));
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={formatDateDigits(digits)}
      onChange={handleChange}
      placeholder={placeholder}
      className="input-field px-3 py-2 w-full font-mono"
    />
  );
}

export default function Drivers() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState("link"); // "link" | "register"
  const [form, setForm] = useState(EMPTY_FORM);
  const [aadhaarDigits, setAadhaarDigits] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ licenseNo: "", licenseExpiry: "", aadhaar: "", truckId: "", status: "available" });
  const [editAadhaarDigits, setEditAadhaarDigits] = useState("");
  const [editErrors, setEditErrors] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  const [registerForm, setRegisterForm] = useState(EMPTY_REGISTER_FORM);
  const [registerAadhaarDigits, setRegisterAadhaarDigits] = useState("");
  const [registerErrors, setRegisterErrors] = useState({});
  const [registering, setRegistering] = useState(false);
  const [tempPasswordResult, setTempPasswordResult] = useState(null);

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

  // Fleet map markers — only drivers with a known last-reported location (current_lat/lng,
  // kept fresh via PATCH /api/vehicles/drivers/me/location) show up on the map; the rest are
  // still visible in the table below, just without a pin.
  const fleetMarkers = useMemo(() => drivers
    .filter((driver) => driver.currentLat != null && driver.currentLng != null)
    .map((driver) => ({
      id: driver.id || driver.user_id,
      position: { lat: Number(driver.currentLat), lng: Number(driver.currentLng) },
      color: driver.status === "on_trip" ? "blue" : driver.status === "offline" ? "yellow" : "green",
      title: `${driver.name}${driver.truckReg ? ` — ${driver.truckReg}` : ""}`,
    })), [drivers]);

  const unassignedTrucks = useMemo(
    () => trucks.filter((truck) => !truck.driverId && !truck.driver_id),
    [trucks],
  );

  // For the edit form: unassigned trucks, plus whichever truck this driver already has —
  // otherwise their own current truck would vanish from the dropdown while editing.
  const trucksForEdit = useMemo(() => {
    if (!editTarget) return unassignedTrucks;
    const editingDriverId = editTarget.id || editTarget.user_id;
    return trucks.filter((truck) => {
      const truckDriverId = truck.driverId || truck.driver_id;
      return !truckDriverId || truckDriverId === editingDriverId;
    });
  }, [trucks, unassignedTrucks, editTarget]);

  const openAdd = () => {
    setAddMode("link");
    setForm(EMPTY_FORM);
    setAadhaarDigits("");
    setErrors({});
    setLookupError(null);
    setRegisterForm(EMPTY_REGISTER_FORM);
    setRegisterAadhaarDigits("");
    setRegisterErrors({});
    setTempPasswordResult(null);
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
      const message = err.message || "Failed to add driver.";
      setErrors((prev) => ({ ...prev, form: message }));
      addToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const validateRegister = () => {
    const next = {};
    if (!registerForm.name.trim()) next.name = "Name is required.";
    if (registerForm.phone.replace(/\D/g, "").length !== 10) next.phone = "Enter a valid 10-digit phone number.";
    if (!registerForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.email.trim())) {
      next.email = "Enter a valid email address — the driver logs in with email + password.";
    }
    if (registerForm.licenseExpiry) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (new Date(registerForm.licenseExpiry) < today) next.licenseExpiry = "License expiry cannot be in the past.";
    }
    if (registerAadhaarDigits && registerAadhaarDigits.length !== 12) {
      next.aadhaar = "Aadhaar must be 12 digits.";
    }
    setRegisterErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleRegister = async () => {
    if (!validateRegister()) return;
    setRegistering(true);
    try {
      const payload = {
        name: registerForm.name.trim(),
        phone: registerForm.phone.replace(/\D/g, ""),
        email: registerForm.email.trim(),
        license_no: registerForm.licenseNo.trim() || undefined,
        license_expiry: registerForm.licenseExpiry || undefined,
        aadhaar: registerAadhaarDigits.length === 12 ? registerAadhaarDigits : undefined,
        truck_id: registerForm.truckId || undefined,
      };
      const res = await api.post("/api/vehicles/drivers/register", payload, getToken());
      if (!res.success) throw new Error(res.message || "Failed to register driver");
      setTempPasswordResult({ name: payload.name, email: payload.email, tempPassword: res.data.tempPassword });
      loadAll();
    } catch (err) {
      const message = err.message || "Failed to register driver.";
      setRegisterErrors((prev) => ({ ...prev, form: message }));
      addToast(message, "error");
    } finally {
      setRegistering(false);
    }
  };

  const openEdit = (driver) => {
    setEditTarget(driver);
    setEditForm({
      licenseNo: driver.licenseNo || driver.license_no || "",
      licenseExpiry: (driver.licenseExpiry || driver.license_expiry) ? String(driver.licenseExpiry || driver.license_expiry).slice(0, 10) : "",
      aadhaar: "",
      truckId: driver.truckId || driver.truck_id || "",
      status: driver.status || "available",
    });
    setEditAadhaarDigits("");
    setEditErrors({});
    setSelected(null);
  };

  const validateEdit = () => {
    const next = {};
    if (editForm.licenseExpiry) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (new Date(editForm.licenseExpiry) < today) next.licenseExpiry = "License expiry cannot be in the past.";
    }
    if (editAadhaarDigits && editAadhaarDigits.length !== 12) {
      next.aadhaar = "Aadhaar must be 12 digits.";
    }
    setEditErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSaveEdit = async () => {
    if (!editTarget || !validateEdit()) return;
    setSavingEdit(true);
    try {
      const id = editTarget.id || editTarget.user_id;
      const payload = {
        license_no: editForm.licenseNo.trim() || undefined,
        license_expiry: editForm.licenseExpiry || undefined,
        aadhaar: editAadhaarDigits.length === 12 ? editAadhaarDigits : undefined,
        truck_id: editForm.truckId || undefined,
        status: editForm.status || undefined,
      };
      const res = await api.patch(`/api/vehicles/drivers/${id}`, payload, getToken());
      if (!res.success) throw new Error(res.message || "Failed to update driver");
      addToast("Driver details updated.", "success");
      setEditTarget(null);
      loadAll();
    } catch (err) {
      const message = err.message || "Failed to update driver.";
      setEditErrors((prev) => ({ ...prev, form: message }));
      addToast(message, "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const id = deleteTarget.id || deleteTarget.user_id;
      const res = await api.delete(`/api/vehicles/drivers/${id}`, null, getToken());
      if (!res.success) throw new Error(res.message || "Failed to remove driver");
      addToast("Driver removed from your fleet.", "success");
      setDeleteTarget(null);
      loadAll();
    } catch (err) {
      addToast(err.message || "Failed to remove driver.", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <input type="text" placeholder="Search by name or phone..." value={search} onChange={(event) => setSearch(event.target.value)} className="input-field px-3 py-2 max-w-xs" />
        <div className="flex items-center gap-2">
          {["All", "Verified", "Pending", "Submitted"].map((value) => (
            <button key={value} onClick={() => setFilter(value)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === value ? "bg-primary text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{value}</button>
          ))}
          <button onClick={openAdd} className="btn-primary px-4 py-2 text-sm flex items-center gap-2"><Plus size={15} /> Add Driver</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
        <h3 className="font-bold text-slate-900 text-[15px] mb-4">Fleet Map</h3>
        {loading ? (
          <div className="h-[320px] flex items-center justify-center text-slate-400 text-sm">Loading drivers...</div>
        ) : error ? (
          <div className="h-[320px] flex items-center justify-center text-red-500 text-sm">{error}</div>
        ) : fleetMarkers.length ? (
          <div className="relative h-[320px] rounded-xl overflow-hidden border border-slate-100">
            <MapView markers={fleetMarkers} height="100%" className="absolute inset-0" />
          </div>
        ) : (
          <div className="h-[320px] flex flex-col items-center justify-center text-slate-400 text-sm">
            <Users size={28} className="mb-2 opacity-30" />
            No drivers currently reporting a location
          </div>
        )}
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
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSelected(driver)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"><Eye size={14} /></button>
                        <button onClick={() => openEdit(driver)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"><Edit2 size={14} /></button>
                        <button onClick={() => setDeleteTarget(driver)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 size={14} /></button>
                      </div>
                    </td>
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
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Trip History</p>
                <button
                  onClick={() => navigate(`/drivers/${selected.id || selected.user_id}/history`)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                >
                  View full history <ArrowUpRight size={11} />
                </button>
              </div>
              <TripHistoryList driverId={selected.id || selected.user_id} />
            </div>
            <div className="flex justify-end">
              <button onClick={() => openEdit(selected)} className="btn-primary px-4 py-2 text-sm flex items-center gap-2"><Edit2 size={14} /> Edit</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Driver" size="md">
        {editTarget && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><span className="text-primary font-bold text-xs">{editTarget.name?.[0] || "D"}</span></div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{editTarget.name}</p>
                <p className="text-xs text-slate-500">{editTarget.phone}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">License No.</label>
                <input value={editForm.licenseNo} onChange={(e) => setEditForm((f) => ({ ...f, licenseNo: e.target.value }))} className="input-field px-3 py-2 w-full" placeholder="MH-2020123456789" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">License Expiry</label>
                <DateInput value={editForm.licenseExpiry} onChange={(iso) => setEditForm((f) => ({ ...f, licenseExpiry: iso }))} />
                {editErrors.licenseExpiry && <p className="text-xs text-red-500 mt-1">{editErrors.licenseExpiry}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Aadhaar</label>
                <input
                  value={formatAadhaar(editAadhaarDigits)}
                  onKeyDown={handleAadhaarKeyDown(setEditAadhaarDigits)}
                  onPaste={handleAadhaarPaste(setEditAadhaarDigits)}
                  onChange={() => {}}
                  className="input-field px-3 py-2 w-full font-mono"
                  placeholder={editTarget.aadhaar || "XXXX-XXXX-1234"}
                />
                {editErrors.aadhaar && <p className="text-xs text-red-500 mt-1">{editErrors.aadhaar}</p>}
                <p className="text-[11px] text-slate-400 mt-1">Leave blank to keep the current Aadhaar on file.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Assign Truck</label>
                <TruckDropdown trucks={trucksForEdit} value={editForm.truckId} onChange={(id) => setEditForm((f) => ({ ...f, truckId: id }))} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
              <select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))} className="input-field px-3 py-2 w-full">
                <option value="available">Available</option>
                <option value="on_trip">On Trip</option>
                <option value="offline">Offline</option>
              </select>
            </div>

            {editErrors.form && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{editErrors.form}</div>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditTarget(null)} className="flex-1 btn-ghost px-4 py-2.5 text-sm border border-slate-200">Cancel</button>
              <button onClick={handleSaveEdit} disabled={savingEdit} className="flex-1 btn-primary px-4 py-2.5 text-sm disabled:opacity-60">{savingEdit ? "Saving..." : "Save Changes"}</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Driver" size="md">
        {tempPasswordResult ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
              <span><b>{tempPasswordResult.name}</b> has been registered and added to your fleet.</span>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <p className="text-[11px] text-slate-400 font-semibold uppercase">Share these login details with the driver</p>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] text-slate-400">Email</p>
                  <p className="text-sm font-semibold text-slate-800">{tempPasswordResult.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] text-slate-400">Temporary Password</p>
                  <p className="text-sm font-mono font-semibold text-slate-800">{tempPasswordResult.tempPassword}</p>
                </div>
                <button
                  onClick={() => { navigator.clipboard?.writeText(tempPasswordResult.tempPassword); addToast("Password copied", "success"); }}
                  className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-all flex-shrink-0"
                >
                  <Copy size={14} />
                </button>
              </div>
              <p className="text-[11px] text-amber-600">This password is shown only once — the driver can change it from their profile after logging in.</p>
            </div>
            <button onClick={() => setShowAdd(false)} className="w-full btn-primary px-4 py-2.5 text-sm">Done</button>
          </div>
        ) : (
        <div className="space-y-4">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setAddMode("link")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${addMode === "link" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Link Existing Driver
            </button>
            <button
              onClick={() => setAddMode("register")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${addMode === "register" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              <UserPlus size={12} /> Register New Driver
            </button>
          </div>

          {addMode === "register" ? (
            <>
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                <Info size={16} className="flex-shrink-0 mt-0.5" />
                <span>This creates a brand-new driver account. The driver logs in with email + password, so a temporary password will be generated for you to share with them.</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name *</label>
                  <input value={registerForm.name} onChange={(e) => setRegisterForm((f) => ({ ...f, name: e.target.value }))} className="input-field px-3 py-2 w-full" placeholder="Ramesh Kumar" />
                  {registerErrors.name && <p className="text-xs text-red-500 mt-1">{registerErrors.name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone Number *</label>
                  <input
                    value={registerForm.phone}
                    onChange={(e) => setRegisterForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                    className="input-field px-3 py-2 w-full font-mono"
                    placeholder="10-digit phone number"
                  />
                  {registerErrors.phone && <p className="text-xs text-red-500 mt-1">{registerErrors.phone}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email *</label>
                  <input
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm((f) => ({ ...f, email: e.target.value }))}
                    className="input-field px-3 py-2 w-full"
                    placeholder="driver@example.com"
                  />
                  {registerErrors.email && <p className="text-xs text-red-500 mt-1">{registerErrors.email}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">License No.</label>
                  <input value={registerForm.licenseNo} onChange={(e) => setRegisterForm((f) => ({ ...f, licenseNo: e.target.value }))} className="input-field px-3 py-2 w-full" placeholder="MH-2020123456789" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">License Expiry</label>
                  <DateInput value={registerForm.licenseExpiry} onChange={(iso) => setRegisterForm((f) => ({ ...f, licenseExpiry: iso }))} />
                  {registerErrors.licenseExpiry && <p className="text-xs text-red-500 mt-1">{registerErrors.licenseExpiry}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Aadhaar</label>
                  <input
                    value={formatAadhaar(registerAadhaarDigits)}
                    onKeyDown={handleAadhaarKeyDown(setRegisterAadhaarDigits)}
                    onPaste={handleAadhaarPaste(setRegisterAadhaarDigits)}
                    onChange={() => {}}
                    className="input-field px-3 py-2 w-full font-mono"
                    placeholder="XXXX-XXXX-1234"
                  />
                  {registerErrors.aadhaar && <p className="text-xs text-red-500 mt-1">{registerErrors.aadhaar}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Assign Truck</label>
                  <TruckDropdown trucks={unassignedTrucks} value={registerForm.truckId} onChange={(id) => setRegisterForm((f) => ({ ...f, truckId: id }))} />
                </div>
              </div>

              {registerErrors.form && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{registerErrors.form}</div>}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowAdd(false)} className="flex-1 btn-ghost px-4 py-2.5 text-sm border border-slate-200">Cancel</button>
                <button onClick={handleRegister} disabled={registering} className="flex-1 btn-primary px-4 py-2.5 text-sm disabled:opacity-60">{registering ? "Registering..." : "Register Driver"}</button>
              </div>
            </>
          ) : (
          <>
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
              <DateInput value={form.licenseExpiry} onChange={(iso) => setForm((f) => ({ ...f, licenseExpiry: iso }))} />
              {errors.licenseExpiry && <p className="text-xs text-red-500 mt-1">{errors.licenseExpiry}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Aadhaar</label>
              <input
                value={formatAadhaar(aadhaarDigits)}
                onKeyDown={handleAadhaarKeyDown(setAadhaarDigits)}
                onPaste={handleAadhaarPaste(setAadhaarDigits)}
                onChange={() => {}}
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

          {errors.form && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{errors.form}</div>}
          <div className="flex gap-3 pt-1">
            <button onClick={() => setShowAdd(false)} className="flex-1 btn-ghost px-4 py-2.5 text-sm border border-slate-200">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary px-4 py-2.5 text-sm disabled:opacity-60">{saving ? "Adding..." : "Add Driver"}</button>
          </div>
          </>
          )}
        </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove Driver"
        message={`Remove ${deleteTarget?.name || "this driver"} from your fleet? Their driver account is not deleted — you can add them back later.`}
        confirmText={deleting ? "Removing..." : "Remove"}
      />
    </div>
  );
}
