import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, Plus, Truck as TruckIcon, Power, Trash2 } from "lucide-react";
import { api, getToken } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";

const STATUS_CLASS = {
  active: "bg-emerald-50 text-emerald-600",
  inactive: "bg-slate-100 text-slate-500",
};

const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// The list view — the actual listing form lives on its own page (see MonthlyHiringForm.jsx,
// routed at /monthly-hiring/new for a broker or /driver/monthly-hiring/new for a driver), same
// list-page/add-page split as gadidosti-client's SavedAddresses.jsx / AddressForm.jsx. Shared by
// both roles — a broker manages a fleet of listings, a driver only ever has the one truck
// they're assigned to, but the list/card UI itself is identical either way.
export default function MonthlyHiring() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();
  const isBroker = user?.role === "broker";
  const basePath = isBroker ? "/monthly-hiring" : "/driver/monthly-hiring";
  const token = getToken();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/monthly-hiring/listings/mine", token);
      if (res?.success) setListings(res.data?.listings || []);
    } catch {
      /* stays empty on failure */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const openNew = () => navigate(`${basePath}/new`);

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <CalendarClock className="w-5 h-5 text-primary" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Monthly Vehicle Hiring</h1>
            <p className="text-sm text-slate-400 mt-0.5">List your truck as available — our team reaches out when a client enquires.</p>
          </div>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all flex-shrink-0"
        >
          <Plus className="w-4 h-4" /> New Listing
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : listings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <TruckIcon className="w-7 h-7 text-primary" />
          </div>
          <h3 className="font-bold text-slate-900 mb-1">No monthly hiring listings yet</h3>
          <p className="text-sm text-slate-400 mb-5">
            {isBroker ? "List one of your trucks and our team will follow up when a client enquires." : "List your truck and our team will follow up when a client enquires."}
          </p>
          <button onClick={openNew} className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all">
            List Your First Vehicle
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((l) => (
            <div key={l.id} className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
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
