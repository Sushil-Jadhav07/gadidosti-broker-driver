export default function StatCard({ icon: Icon, iconBg, iconColor, label, value, subtext, trend, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-card flex flex-col gap-4 relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg }}
        >
          <Icon size={18} style={{ color: iconColor }} />
        </div>
        {trend !== undefined && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            trend >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
          }`}>
            {trend >= 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>

      <div>
        <p className="text-[13px] text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5 font-mono tracking-tight">{value}</p>
        {subtext && (
          <p className="text-[11px] text-slate-400 mt-1">{subtext}</p>
        )}
      </div>

      {children && <div className="mt-auto">{children}</div>}
    </div>
  );
}
