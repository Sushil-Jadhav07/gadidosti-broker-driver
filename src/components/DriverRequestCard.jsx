import { MapPin, Clock, Phone, XCircle, IndianRupee, History, Lock, CheckCircle2 } from "lucide-react";
import Badge from "./driver/Badge";
import { formatCurrency, bookingRef } from "../utils";

// Shared by the driver and broker "driver requests" pages — both hit the exact same
// /api/driver-requests endpoints, the server just decides who's allowed to act (see
// driverTimedOut). `role` only changes what info is shown and whether the timeout lockout
// banner applies (a broker's list is pre-filtered to already-timed-out requests, so it never
// needs the lockout banner on its own cards).
export default function DriverRequestCard({ req, role, onAccept, onDecline, onCounter }) {
  const isDriver = role === "driver";
  const locked = isDriver && req.status === "Requested" && req.driverTimedOut;
  const canAct = req.status === "Requested" && !locked;

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5 flex flex-col">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-slate-400">{bookingRef(req)}</span>
            {req.truckType && <Badge status="Requested">{req.truckType}</Badge>}
          </div>
          <h3 className="font-bold text-slate-900 text-[15px]">{req.pickup?.split(" - ")[0]} to {req.drop?.split(" - ")[0]}</h3>
          {role === "broker" && (
            <p className="text-xs text-slate-400 mt-0.5">Driver: {req.driverName || req.driver?.name || "-"}</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xl font-bold text-slate-900 font-mono">{formatCurrency(req.amount)}</p>
          <div className="flex items-center gap-1 justify-end text-[11px] text-slate-400 mt-0.5">
            <Clock size={11} />{req.timestamp}
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-start gap-2">
          <MapPin size={13} className="text-emerald-500 mt-0.5 flex-shrink-0" />
          <div><p className="text-[11px] text-slate-400 font-semibold">PICKUP</p><p className="text-sm text-slate-700">{req.pickup}</p></div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin size={13} className="text-red-500 mt-0.5 flex-shrink-0" />
          <div><p className="text-[11px] text-slate-400 font-semibold">DROP</p><p className="text-sm text-slate-700">{req.drop}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[{ label: "Distance", value: req.distance ? `${req.distance} km` : "-" }, { label: "Weight", value: req.weight || "-" }, { label: "Client", value: req.clientName || "-" }].map(({ label, value }) => (
          <div key={label} className="bg-slate-50 rounded-lg px-3 py-2">
            <p className="text-[10px] text-slate-400 font-semibold uppercase">{label}</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {req.offerHistory?.length > 1 && (
        <div className="bg-slate-50 rounded-lg px-3 py-2.5 mb-4">
          <p className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1 mb-1.5"><History size={11} /> Negotiation History</p>
          <div className="space-y-1">
            {req.offerHistory.map((entry, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{entry.by === "client" ? "Client offered" : "You offered"}</span>
                <span className="font-semibold text-slate-700 flex items-center gap-0.5"><IndianRupee size={11} />{Number(entry.amount).toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto">
        {locked && (
          <div className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-center text-xs font-semibold text-slate-500 flex items-center justify-center gap-2">
            <Lock size={13} /> You didn&apos;t respond in time — your broker has taken over this request.
          </div>
        )}

        {canAct && (
          <>
            <div className="flex items-center gap-2">
              <button onClick={() => onAccept(req.id)} className="flex-1 py-2 text-xs rounded-lg font-semibold border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-all flex items-center justify-center gap-1.5"><CheckCircle2 size={14} /> Accept</button>
              <button onClick={() => onCounter(req)} className="flex-1 py-2 text-xs rounded-lg font-semibold border border-primary/30 text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-1.5"><IndianRupee size={14} /> Counter</button>
              <button onClick={() => onDecline(req.id)} className="flex-1 py-2 text-xs rounded-lg font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5"><XCircle size={14} /> Decline</button>
            </div>
            {role === "broker" && (
              <p className="text-[11px] text-amber-600 text-center mt-2">Driver timed out — you&apos;re responding on their behalf.</p>
            )}
          </>
        )}

        {req.status === "Countered" && (
          <div className="w-full bg-amber-50 border border-amber-200 rounded-lg py-2.5 px-3 text-center text-xs font-semibold text-amber-700 flex items-center justify-center gap-2">
            <Clock size={13} /> Waiting for the client&apos;s response to your {formatCurrency(req.amount)} offer
          </div>
        )}

        {req.status === "Accepted" && (
          <div className="w-full bg-emerald-50 border border-emerald-200 rounded-lg py-2.5 px-3 text-center text-xs font-semibold text-emerald-700 flex items-center justify-center gap-2">
            <CheckCircle2 size={13} /> Accepted — waiting for the client to confirm
          </div>
        )}

        {req.status === "Declined" && (
          <div className="w-full bg-red-50 border border-red-200 rounded-lg py-2.5 px-3 text-center text-xs font-semibold text-red-600 flex items-center justify-center gap-2">
            <XCircle size={13} /> Declined
          </div>
        )}

        {(req.clientName || req.clientPhone) && (
          <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-400">
            <Phone size={12} />{req.clientName}{req.clientPhone ? `: ${req.clientPhone}` : ""} - {req.timestamp}
          </div>
        )}
      </div>
    </div>
  );
}
