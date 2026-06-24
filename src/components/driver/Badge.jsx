const S = {
  "In Transit":           "bg-blue-50 text-blue-600 border-blue-200",
  "Assigned":             "bg-amber-50 text-amber-700 border-amber-200",
  "En Route Pickup":      "bg-blue-50 text-blue-700 border-blue-200",
  "Picked Up":            "bg-purple-50 text-purple-700 border-purple-200",
  "Delivered":            "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Completed":            "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Cancelled":            "bg-red-50 text-red-600 border-red-200",
  "Pending Confirmation": "bg-amber-50 text-amber-700 border-amber-200",
  "Requested":            "bg-slate-100 text-slate-600 border-slate-200",
  "Accepted":             "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Available":            "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Online":               "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Offline":              "bg-slate-100 text-slate-500 border-slate-200",
  "Verified":             "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Pending":              "bg-amber-50 text-amber-700 border-amber-200",
  "Expired":              "bg-red-50 text-red-600 border-red-200",
};

export default function Badge({ status, children, className = "" }) {
  const style = S[status] || "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${style} ${className}`}>
      {children || status}
    </span>
  );
}
