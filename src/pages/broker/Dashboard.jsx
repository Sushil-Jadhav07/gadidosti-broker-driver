import { Truck, Users, Inbox, ClipboardList } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import StatCard from "../../components/broker/StatCard";
import Badge from "../../components/broker/Badge";
import {
  trucks, drivers, jobRequests, activeJobs, dailyEarnings, fleetStatus,
} from "../../data/brokerMockData";

export default function Dashboard() {
  const availableTrucks = trucks.filter((t) => t.status === "Available").length;
  const onTripTrucks = trucks.filter((t) => t.status === "On Trip").length;
  const activeDrivers = drivers.filter((d) => d.status === "Active").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Truck} iconBg="#EBF3FF" iconColor="#1976FF" label="Total Fleet" value={trucks.length} subtext={`${availableTrucks} available`} trend={8} />
        <StatCard icon={Users} iconBg="#F0FDF4" iconColor="#17D86B" label="Active Drivers" value={activeDrivers} subtext={`Out of ${drivers.length} total`} trend={0} />
        <StatCard icon={Inbox} iconBg="#FFFBEB" iconColor="#F59E0B" label="Pending Requests" value={jobRequests.length} subtext="Need attention" />
        <StatCard icon={ClipboardList} iconBg="#EBF3FF" iconColor="#1976FF" label="Active Jobs" value={activeJobs.length} subtext={`${onTripTrucks} trucks on road`} trend={12} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5 lg:col-span-2">
          <h3 className="font-bold text-slate-900 text-[15px] mb-4">Weekly Revenue</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyEarnings} barSize={28}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 12 }} />
              <YAxis hide />
              <Tooltip formatter={(v) => [`Rs ${v.toLocaleString("en-IN")}`, ""]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }} />
              <Bar dataKey="revenue" fill="#1976FF" radius={[6,6,0,0]} name="Revenue" />
              <Bar dataKey="expenses" fill="#E2E8F0" radius={[6,6,0,0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
          <h3 className="font-bold text-slate-900 text-[15px] mb-4">Fleet Status</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={fleetStatus} innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                {fleetStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-3">
            {fleetStatus.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-slate-600">{s.name}</span>
                </div>
                <span className="font-bold text-slate-800">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-card">
        <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-[15px]">Recent Job Requests</h3>
          <Badge variant="warning">{jobRequests.length} Pending</Badge>
        </div>
        <div className="divide-y divide-slate-50">
          {jobRequests.map((req) => (
            <div key={req.id} className="px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-slate-400">{req.bookingId}</span>
                  <Badge variant="primary" size="sm">{req.truckType}</Badge>
                </div>
                <p className="text-sm font-semibold text-slate-900 truncate">{req.pickup} to {req.drop}</p>
                <p className="text-xs text-slate-400 mt-0.5">{req.clientName} - {req.distance} km - {req.weight}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-base font-bold text-slate-900 font-mono">Rs {req.amount.toLocaleString("en-IN")}</p>
                <p className="text-[11px] text-amber-500">Expires in {req.expiresIn} min</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-card">
        <div className="px-5 py-4 border-b border-slate-50">
          <h3 className="font-bold text-slate-900 text-[15px]">Active Jobs</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {activeJobs.slice(0, 3).map((job) => (
            <div key={job.id} className="px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-slate-400">{job.bookingId}</span>
                  <Badge variant={job.status === "In Transit" ? "primary" : job.status === "Loading" ? "warning" : "default"} size="sm">
                    {job.status}
                  </Badge>
                </div>
                <p className="text-sm font-semibold text-slate-900 truncate">{job.clientName}</p>
                <p className="text-xs text-slate-400 mt-0.5">{job.distance} km</p>
              </div>
              <p className="text-base font-bold text-slate-900 font-mono flex-shrink-0">
                Rs {job.amount.toLocaleString("en-IN")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
