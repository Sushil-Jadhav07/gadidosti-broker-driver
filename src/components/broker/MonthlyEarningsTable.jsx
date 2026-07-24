import { Fragment } from "react";
import { Calendar, Route as RouteIcon, Wallet } from "lucide-react";
import Badge from "./Badge";
import { formatCurrency, formatDate, bookingRef } from "../../utils";

const MONTH_FORMAT = { month: "long", year: "numeric" };
const STATUS_BADGE = { Paid: "success", Pending: "warning" };

function groupByMonth(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    const date = new Date(row.date || row.created_at || row.createdAt);
    const key = Number.isNaN(date.getTime())
      ? "Unknown"
      : `${date.getFullYear()}-${String(date.getMonth()).padStart(2, "0")}`;
    const label = Number.isNaN(date.getTime())
      ? "Unknown"
      : date.toLocaleDateString("en-IN", MONTH_FORMAT);
    if (!groups.has(key)) groups.set(key, { label, rows: [] });
    groups.get(key).rows.push(row);
  });
  return Array.from(groups.values());
}

export default function MonthlyEarningsTable({ rows = [] }) {
  const months = groupByMonth(rows);

  if (!rows.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-12 text-center text-slate-400">
        <Wallet size={32} className="mx-auto mb-2 opacity-30" />
        No earnings found.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              {["Booking", "Route", "Truck", "Driver", "Date", "Amount", "Platform Fee", "Net", "Status"].map((label) => (
                <th key={label} className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {months.map((group) => {
              const total = group.rows.reduce((sum, r) => sum + Number(r.netEarnings || 0), 0);
              return (
                <Fragment key={group.label}>
                  <tr className="bg-slate-50/80">
                    <td colSpan={9} className="px-4 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">{group.label}</span>
                          <span className="text-[11px] text-slate-400">&middot; {group.rows.length} trip{group.rows.length === 1 ? "" : "s"}</span>
                        </div>
                        <span className="text-xs font-bold text-emerald-700 whitespace-nowrap">{formatCurrency(total)}</span>
                      </div>
                    </td>
                  </tr>
                  {group.rows.map((row) => (
                    <tr key={row.id} className="table-row">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {bookingRef({ bookingNumber: row.bookingNumber, bookingId: row.booking_id || row.bookingId })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <RouteIcon className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <span className="font-semibold text-slate-800">{row.route || "-"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{row.truck || "-"}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row.driver || "-"}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(row.date || row.created_at || row.createdAt)}</td>
                      <td className="px-4 py-3 text-slate-800 font-semibold whitespace-nowrap">{formatCurrency(row.amount)}</td>
                      <td className="px-4 py-3 text-red-500 whitespace-nowrap">-{formatCurrency(row.platformFee)}</td>
                      <td className="px-4 py-3 text-emerald-700 font-bold whitespace-nowrap">{formatCurrency(row.netEarnings)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={STATUS_BADGE[row.status] || "default"} size="sm">{row.status || "-"}</Badge>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
