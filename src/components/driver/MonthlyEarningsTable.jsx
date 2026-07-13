import { Fragment } from "react";
import { formatCurrency, formatDate, bookingRef } from "../../utils";

const MONTH_FORMAT = { month: "long", year: "numeric" };

function groupByMonth(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    const date = new Date(row.date || row.createdAt);
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

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {["Trip", "Date", "Status", "Distance", "Earnings"].map((label) => (
              <th key={label} className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {months.map((group) => {
            const total = group.rows.reduce((sum, r) => sum + Number(r.earnings || 0), 0);
            return (
              <Fragment key={group.label}>
                <tr className="bg-slate-50">
                  <td colSpan={5} className="px-4 py-2 text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                    {group.label} &middot; {group.rows.length} trip{group.rows.length === 1 ? "" : "s"} &middot; {formatCurrency(total)}
                  </td>
                </tr>
                {group.rows.map((row) => (
                  <tr key={row.id} className="table-row">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{bookingRef(row)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(row.date || row.createdAt)}</td>
                    <td className="px-4 py-3 text-slate-800">{row.status}</td>
                    <td className="px-4 py-3 text-slate-600">{row.distance} km</td>
                    <td className="px-4 py-3 text-emerald-700 font-semibold">{formatCurrency(row.earnings)}</td>
                  </tr>
                ))}
              </Fragment>
            );
          })}
          {!rows.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No trips found.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
