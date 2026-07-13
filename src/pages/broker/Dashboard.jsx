import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, Users, Inbox, ClipboardList, ShieldAlert, ArrowRight } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import StatCard from "../../components/broker/StatCard";
import Badge from "../../components/broker/Badge";
import { useAuth } from "../../hooks/useAuth";
import { api, getToken } from "../../services/api";
import { adaptBooking, adaptJobRequest, formatCurrency, bookingRef } from "../../utils";

const KYC_BANNER = {
  pending: { text: "Complete your KYC to start accepting job requests.", cta: "Complete KYC" },
  submitted: { text: "Your KYC documents are under review. We'll notify you once verified.", cta: "View Status" },
  rejected: { text: "Your KYC submission was rejected. Please review and resubmit.", cta: "Resubmit KYC" },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trucks, setTrucks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [jobRequests, setJobRequests] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [analytics, setAnalytics] = useState({ tripHistory: [] });

  const kycBanner = KYC_BANNER[user?.kyc_status || "pending"];

  useEffect(() => {
    const load = async () => {
      const token = getToken();
      const [truckRes, driverRes, requestRes, jobsRes, analyticsRes] = await Promise.all([
        api.get("/api/vehicles/trucks?limit=100", token),
        api.get("/api/vehicles/drivers?limit=100", token),
        api.get("/api/jobs/requests?limit=20", token),
        api.get("/api/bookings?status=assigned,en_route_pickup,picked_up,in_transit&limit=20", token),
        api.get("/api/analytics/broker", token),
      ]);

      setTrucks(truckRes.data?.trucks || []);
      setDrivers(driverRes.data?.drivers || []);
      setJobRequests((requestRes.data?.requests || []).map(adaptJobRequest));
      setActiveJobs((jobsRes.data?.bookings || []).map(adaptBooking));
      setAnalytics(analyticsRes.data || { tripHistory: [] });
    };

    load().catch(() => {});
  }, []);

  const availableTrucks = trucks.filter((truck) => truck.status === "available").length;
  const onTripTrucks = trucks.filter((truck) => truck.status === "on_trip").length;
  const activeDrivers = drivers.filter((driver) => driver.status === "available" || driver.status === "on_trip").length;

  const dailyEarnings = useMemo(() => {
    const tripHistory = analytics.tripHistory || [];
    return tripHistory.slice(-7).map((trip, index) => ({
      day: trip.date || trip.day || `D${index + 1}`,
      revenue: Number(trip.earnings || 0),
      expenses: Number(trip.platformFee || 0),
    }));
  }, [analytics]);

  const fleetStatus = useMemo(() => ([
    { name: "Available", value: availableTrucks, color: "#17D86B" },
    { name: "On Trip", value: onTripTrucks, color: "#1976FF" },
    { name: "Maintenance", value: trucks.filter((truck) => truck.status === "maintenance").length, color: "#F59E0B" },
  ]), [availableTrucks, onTripTrucks, trucks]);

  return (
    <div className="space-y-6">
      {kycBanner && (
        <button
          onClick={() => navigate("/kyc")}
          className="w-full flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-left hover:bg-amber-100 transition-colors"
        >
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="flex-1 text-sm font-medium text-amber-800">{kycBanner.text}</p>
          <span className="flex items-center gap-1 text-xs font-bold text-amber-700 whitespace-nowrap">
            {kycBanner.cta} <ArrowRight size={13} />
          </span>
        </button>
      )}

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
              <Tooltip
                formatter={(value) => [formatCurrency(value), ""]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
              />
              <Bar dataKey="revenue" fill="#1976FF" radius={[6, 6, 0, 0]} name="Revenue" />
              <Bar dataKey="expenses" fill="#E2E8F0" radius={[6, 6, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
          <h3 className="font-bold text-slate-900 text-[15px] mb-4">Fleet Status</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={fleetStatus} innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                {fleetStatus.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-3">
            {fleetStatus.map((status) => (
              <div key={status.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: status.color }} />
                  <span className="text-slate-600">{status.name}</span>
                </div>
                <span className="font-bold text-slate-800">{status.value}</span>
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
                  <span className="text-xs font-mono text-slate-400">{bookingRef(req)}</span>
                  <Badge variant="primary" size="sm">{req.truckType}</Badge>
                </div>
                <p className="text-sm font-semibold text-slate-900 truncate">{req.pickup} to {req.drop}</p>
                <p className="text-xs text-slate-400 mt-0.5">{req.clientName} - {req.distance} km - {req.weight || "-"}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-base font-bold text-slate-900 font-mono">{formatCurrency(req.amount)}</p>
                <p className="text-[11px] text-amber-500">Expires in {req.expiresIn} min</p>
              </div>
            </div>
          ))}
          {jobRequests.length === 0 && (
            <p className="px-5 py-8 text-sm text-slate-400">No pending requests.</p>
          )}
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
                  <span className="text-xs font-mono text-slate-400">{job.id}</span>
                  <Badge
                    variant={job.status === "In Transit" ? "primary" : job.status === "Picked Up" ? "warning" : "default"}
                    size="sm"
                  >
                    {job.status}
                  </Badge>
                </div>
                <p className="text-sm font-semibold text-slate-900 truncate">{job.clientName || "Client Booking"}</p>
                <p className="text-xs text-slate-400 mt-0.5">{job.distance} km</p>
              </div>
              <p className="text-base font-bold text-slate-900 font-mono flex-shrink-0">
                {formatCurrency(job.amount)}
              </p>
            </div>
          ))}
          {activeJobs.length === 0 && (
            <p className="px-5 py-8 text-sm text-slate-400">No active jobs right now.</p>
          )}
        </div>
      </div>
    </div>
  );
}
