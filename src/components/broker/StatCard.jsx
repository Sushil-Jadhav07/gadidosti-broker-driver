import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatCard({ icon: Icon, iconBg, iconColor, label, value, subtext, trend, children }) {
  return (
    <div className="group bg-white rounded-2xl border border-slate-100 p-4 shadow-card flex flex-col gap-3 relative overflow-hidden transition-shadow hover:shadow-md">
      <div
        className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-[0.06] transition-transform group-hover:scale-110"
        style={{ background: iconColor }}
      />

      <div className="flex items-start justify-between relative">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg }}
        >
          <Icon size={18} style={{ color: iconColor }} />
        </div>
        {trend !== undefined && (
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            trend >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
          }`}>
            {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {trend >= 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>

      <div className="relative">
        <p className="text-[13px] text-slate-500 font-medium">{label}</p>
        <p className="text-[26px] font-bold text-slate-900 mt-0.5 font-mono tracking-tight leading-none">{value}</p>
        {subtext && (
          <p className="text-[11px] text-slate-400 mt-1.5">{subtext}</p>
        )}
      </div>

      {children && <div className="mt-auto relative">{children}</div>}
    </div>
  );
}
