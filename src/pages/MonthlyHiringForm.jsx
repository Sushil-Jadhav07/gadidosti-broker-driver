import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, IndianRupee, FileText, Send } from "lucide-react";
import SelectDropdown from "../components/SelectDropdown";
import { api, getToken } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";

// Its own page (routed at /monthly-hiring/new for a broker, /driver/monthly-hiring/new for a
// driver) rather than inline on the list, same split as MonthlyHiring.jsx's list view. A broker
// picks from their fleet; a driver only ever has the one truck they're assigned to, so that half
// just renders as a fixed line instead of a dropdown.
export default function MonthlyHiringForm() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();
  const isBroker = user?.role === "broker";
  const basePath = isBroker ? "/monthly-hiring" : "/driver/monthly-hiring";
  const token = getToken();

  const [trucks, setTrucks] = useState([]);
  const [loadingTrucks, setLoadingTrucks] = useState(true);
  const [truckId, setTruckId] = useState("");
  const [pricingType, setPricingType] = useState("fixed");
  const [rateAmount, setRateAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingTrucks(true);
      try {
        if (isBroker) {
          const res = await api.get("/api/vehicles/trucks?limit=100", token);
          const list = res?.data?.trucks || [];
          setTrucks(list);
          if (list.length) setTruckId(list[0].id);
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
    })();
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
      navigate(basePath);
    } catch (err) {
      addToast(err.message || "Failed to list vehicle", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const truckOptions = trucks.map((t) => ({ value: t.id, label: `${t.registration} — ${t.category || t.type || "Truck"}` }));

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(basePath)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-100 shadow-card text-slate-500 hover:text-slate-700 transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">List Vehicle for Monthly Hire</h1>
          <p className="text-sm text-slate-400 mt-0.5">Set your rate — our team reaches out when a client enquires nearby.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 md:p-8">
        {loadingTrucks ? (
          <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
        ) : trucks.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-slate-400">
              {isBroker ? "Add a truck to your fleet first before listing it for monthly hire." : "You don't have a truck assigned yet — ask your broker to assign one."}
            </p>
            <button onClick={() => navigate(basePath)} className="mt-4 px-5 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">
              Back
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {isBroker ? (
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Truck</label>
                <SelectDropdown options={truckOptions} value={truckId} onChange={setTruckId} placeholder="Select a truck" />
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Truck</label>
                <div className="bg-slate-50 rounded-lg px-3 py-2.5 text-sm text-slate-700">
                  {trucks[0].registration} — {trucks[0].category || trucks[0].type || "Truck"}
                </div>
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
                rows={3}
                maxLength={1000}
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(basePath)}
                className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                <Send className="w-4 h-4" /> {submitting ? "Listing..." : "List for Monthly Hire"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
