import { useEffect, useState } from "react";
import { CalendarClock, IndianRupee, FileText, Send, Power, Trash2 } from "lucide-react";
import { api, getToken } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";

const STATUS_CLASS = {
  active: "bg-emerald-50 text-emerald-600",
  inactive: "bg-slate-100 text-slate-500",
};

const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// Shared by both broker (/trucks-page nav) and driver (/driver/monthly-hiring) — a broker picks
// from their fleet, a driver only ever has the one truck they're assigned to. Deliberately NOT
// part of the booking/trip system — this just lists a truck as available; nothing here matches
// it to a client's enquiry automatically (see gadidosti-backend's monthlyHiring.controller.js).
export default function MonthlyHiring() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const isBroker = user?.role === "broker";
  const token = getToken();

  const [trucks, setTrucks] = useState([]);
  const [loadingTrucks, setLoadingTrucks] = useState(true);

  const [truckId, setTruckId] = useState("");
  const [pricingType, setPricingType] = useState("fixed");
  const [rateAmount, setRateAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [listings, setListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const loadTrucks = async () => {
    setLoadingTrucks(true);
    try {
      if (isBroker) {
        const res = await api.get("/api/vehicles/trucks?limit=100", token);
        const list = res?.data?.trucks || [];
        setTrucks(list);
        if (list.length && !truckId) setTruckId(list[0].id);
      } else {
        const res = await api.get("/api/vehicles/drivers/me/truck", token);
        const truck = res?.data?.truck;
        setTrucks(truck ? [truck] : []);
        if (truck) setTruckId(truck.id);
      }
    } catch {
      setTrucks([]);
    } finally {
      setLoadingTrucks(false);
    }
  };

  const loadListings = async () => {
    setLoadingListings(true);
    try {
      const res = await api.get("/api/monthly-hiring/listings/mine", token);
      if (res?.success) setListings(res.data?.listings || []);
    } catch {
      /* stays empty on failure */
    } finally {
      setLoadingListings(false);
    }
  };

  useEffect(() => {
    loadTrucks();
    loadListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (!truckId) return addToast(isBroker ? "Select a truck first" : "You need an assigned truck first", "error");
    if (!rateAmount || Number(rateAmount) <= 0) return addToast("Enter a valid rate", "error");
    setSubmitting(true);
    try {
      const res = await api.post("/api/monthly-hiring/listings", {
        truck_id: truckId,
        pricing_type: pricingType,
        rate_amount: Number(rateAmount),
        availability_notes: notes.trim() || undefined,
      }, token);
      if (!res?.success) throw new Error(res?.message || "Failed to list vehicle");
      addToast("Vehicle listed for monthly hire", "success");
      setRateAmount("");
      setNotes("");
      loadListings();
    } catch (err) {
      addToast(err.message || "Failed to list vehicle", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (listing) => {
    setActionLoading(listing.id);
    try {
      const nextStatus = listing.status === "active" ? "inactive" : "active";
      const res = await api.patch(`/api/monthly-hiring/listings/${listing.id}`, { status: nextStatus }, token);
      if (!res?.success) throw new Error(res?.message || "Failed to update listing");
      setListings((prev) => prev.map((l) => (l.id === listing.id ? { ...l, status: nextStatus } : l)));
    } catch (err) {
      addToast(err.message || "Failed to update listing", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const removeListing = async (listing) => {
    setActionLoading(listing.id);
    try {
      const res = await api.delete(`/api/monthly-hiring/listings/${listing.id}`, {}, token);
      if (!res?.success) throw new Error(res?.message || "Failed to remove listing");
      setListings((prev) => prev.filter((l) => l.id !== listing.id));
    } catch (err) {
      addToast(err.message || "Failed to remove listing", "error");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <CalendarClock className="w-5 h-5 text-primary" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Monthly Vehicle Hiring</h1>
          <p className="text-sm text-slate-400 mt-0.5">List your truck as available for monthly hire — our team will reach out when a client enquires.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 md:p-6">
        {loadingTrucks ? (
          <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
        ) : trucks.length === 0 ? (
          <p className="text-sm text-slate-400">
            {isBroker ? "Add a truck to your fleet first before listing it for monthly hire." : "You don't have a truck assigned yet — ask your broker to assign one."}
          </p>
        ) : (
          <div className="space-y-4">
            {isBroker && (
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Truck</label>
                <select
                  value={truckId}
                  onChange={(e) => setTruckId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {trucks.map((t) => (
                    <option key={t.id} value={t.id}>{t.registration} — {t.category || t.type || "Truck"}</option>
                  ))}
                </select>
              </div>
            )}
            {!isBroker && (
              <div className="bg-slate-50 rounded-lg px-3 py-2.5 text-sm text-slate-700">
                {trucks[0].registration} — {trucks[0].category || trucks[0].type || "Truck"}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Pricing</label>
              <div className="flex gap-2">
                {[{ value: "fixed", label: "Fixed Rate" }, { value: "per_km", label: "Per KM Rate" }].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPricingType(opt.value)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      pricingType === opt.value ? "bg-primary text-white border-primary" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                <IndianRupee className="w-3.5 h-3.5" /> {pricingType === "per_km" ? "Rate per KM (₹)" : "Monthly Rate (₹)"}
              </label>
              <input
                type="number"
                min="0"
                value={rateAmount}
                onChange={(e) => setRateAmount(e.target.value)}
                placeholder="Your rate"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                <FileText className="w-3.5 h-3.5" /> Availability Notes <span className="text-slate-300 font-normal">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Available across Maharashtra, driver included"
                rows={2}
                maxLength={1000}
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              <Send className="w-4 h-4" /> {submitting ? "Listing..." : "List for Monthly Hire"}
            </button>
          </div>
        )}
      </div>

      <h2 className="text-lg font-bold text-slate-900 mt-8 mb-3">My Listings</h2>
      {loadingListings ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : listings.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-8 text-center">
          <p className="text-sm text-slate-400">No monthly hiring listings yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((l) => (
            <div key={l.id} className="bg-white rounded-xl border border-slate-100 shadow-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{l.truckRegistration} <span className="text-slate-400 font-normal">· {l.truckCategory || l.truckType}</span></p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {l.pricingType === "per_km" ? "Per KM" : "Fixed Rate"} · ₹{l.rateAmount.toLocaleString("en-IN")}
                  </p>
                  {l.availabilityNotes && <p className="text-xs text-slate-400 mt-1">{l.availabilityNotes}</p>}
                  <p className="text-[11px] text-slate-300 mt-1.5">Listed {fmtDate(l.createdAt)}</p>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_CLASS[l.status]}`}>
                  {l.status === "active" ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => toggleStatus(l)}
                  disabled={actionLoading === l.id}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  <Power className="w-3.5 h-3.5" /> {l.status === "active" ? "Mark Inactive" : "Mark Active"}
                </button>
                <button
                  onClick={() => removeListing(l)}
                  disabled={actionLoading === l.id}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-danger border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
