import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, Users, Inbox, ClipboardList, ShieldAlert, ArrowRight, Sun, Sunset, Moon } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
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

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: "Good morning", Icon: Sun };
    if (hour < 17) return { text: "Good afternoon", Icon: Sun };
    if (hour < 21) return { text: "Good evening", Icon: Sunset };
    return { text: "Good night", Icon: Moon };
  }, []);

  const today = useMemo(() => new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long",
  }), []);

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
    return tripHistory.slice(-7).map((trip, index) => {
      const rawDate = trip.date || trip.created_at || trip.createdAt;
      const parsed = rawDate ? new Date(rawDate) : null;
      const day = parsed && !Number.isNaN(parsed.getTime())
        ? parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
        : trip.day || `D${index + 1}`;
      return {
        day,
        revenue: Number(trip.amount || 0),
        expenses: Number(trip.platformFee || 0),
      };
    });
  }, [analytics]);

  const fleetStatus = useMemo(() => ([
    { name: "Available", value: availableTrucks, color: "#17D86B" },
    { name: "On Trip", value: onTripTrucks, color: "#166534" },
    { name: "Maintenance", value: trucks.filter((truck) => truck.status === "maintenance").length, color: "#F59E0B" },
  ]), [availableTrucks, onTripTrucks, trucks]);

  const fleetTotal = fleetStatus.reduce((sum, s) => sum + s.value, 0);
  const weekRevenueTotal = dailyEarnings.reduce((sum, d) => sum + d.revenue, 0);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card px-5 py-4 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <greeting.Icon size={15} />
            <span className="text-[13px] font-medium">{greeting.text}</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-0.5">
            {user?.business_name || user?.name || "Broker"}
          </h2>
        </div>
        <p className="text-[12px] text-slate-400 font-medium whitespace-nowrap hidden sm:block">{today}</p>
      </div>

      {kycBanner && (
        <button
          onClick={() => navigate("/kyc")}
          className="w-full flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5 text-left hover:bg-amber-100 transition-colors"
        >
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="flex-1 text-sm font-medium text-amber-800">{kycBanner.text}</p>
          <span className="flex items-center gap-1 text-xs font-bold text-amber-700 whitespace-nowrap">
            {kycBanner.cta} <ArrowRight size={13} />
          </span>
        </button>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Truck} iconBg="#F0FDF4" iconColor="#166534" label="Total Fleet" value={trucks.length} subtext={`${availableTrucks} available`} trend={8} />
        <StatCard icon={Users} iconBg="#F0FDF4" iconColor="#17D86B" label="Active Drivers" value={activeDrivers} subtext={`Out of ${drivers.length} total`} trend={0} />
        <StatCard icon={Inbox} iconBg="#FFFBEB" iconColor="#F59E0B" label="Pending Requests" value={jobRequests.length} subtext="Need attention" />
        <StatCard icon={ClipboardList} iconBg="#F0FDF4" iconColor="#166534" label="Active Jobs" value={activeJobs.length} subtext={`${onTripTrucks} trucks on road`} trend={12} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4 lg:col-span-2">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="font-bold text-slate-900 text-[14px]">Weekly Revenue</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Last 7 trips</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-slate-900 font-mono leading-none">{formatCurrency(weekRevenueTotal)}</p>
              <div className="flex items-center justify-end gap-3 mt-1.5">
                <span className="flex items-center gap-1 text-[11px] text-slate-500">
                  <span className="w-2 h-2 rounded-sm bg-primary" /> Revenue
                </span>
                <span className="flex items-center gap-1 text-[11px] text-slate-500">
                  <span className="w-2 h-2 rounded-sm bg-slate-200" /> Expenses
                </span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={dailyEarnings} barSize={20} margin={{ left: -20 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#17D86B" />
                  <stop offset="100%" stopColor="#166534" />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#94A3B8", fontSize: 11 }} />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: "#F8FAFC" }}
                formatter={(value) => [formatCurrency(value), ""]}
                contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #E2E8F0" }}
              />
              <Bar dataKey="revenue" fill="url(#revenueFill)" radius={[6, 6, 0, 0]} name="Revenue" />
              <Bar dataKey="expenses" fill="#E2E8F0" radius={[6, 6, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4 flex flex-col">
          <h3 className="font-bold text-slate-900 text-[14px] mb-1">Fleet Status</h3>
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-[45%] flex-shrink-0">
              <ResponsiveContainer width="100%" height={110}>
                <PieChart>
                  <Pie data={fleetStatus} innerRadius={32} outerRadius={48} paddingAngle={3} dataKey="value" stroke="none">
                    {fleetStatus.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-bold text-slate-900 font-mono leading-none">{fleetTotal}</span>
                <span className="text-[9px] text-slate-400 font-medium">Trucks</span>
              </div>
            </div>
            <div className="space-y-2.5 flex-1">
              {fleetStatus.map((status) => (
                <div key={status.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: status.color }} />
                      <span className="text-slate-600">{status.name}</span>
                    </div>
                    <span className="font-bold text-slate-800">{status.value}</span>
                  </div>
                  <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: fleetTotal ? `${(status.value / fleetTotal) * 100}%` : "0%",
                        background: status.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card">
          <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-[14px]">Recent Job Requests</h3>
            <div className="flex items-center gap-2">
              <Badge variant="warning" size="sm">{jobRequests.length} Pending</Badge>
              <button
                onClick={() => navigate("/job-requests")}
                className="text-[11px] font-bold text-primary flex items-center gap-0.5 hover:underline"
              >
                View all <ArrowRight size={11} />
              </button>
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {jobRequests.slice(0, 4).map((req) => (
              <div key={req.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-mono text-slate-400">{bookingRef(req)}</span>
                    <Badge variant="primary" size="sm">{req.truckType}</Badge>
                  </div>
                  <p className="text-[13px] font-semibold text-slate-900 truncate">{req.pickup} to {req.drop}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">{req.clientName} - {req.distance} km</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-slate-900 font-mono">{formatCurrency(req.amount)}</p>
                  <p className="text-[10px] text-slate-400">{req.timestamp}</p>
                </div>
              </div>
            ))}
            {jobRequests.length === 0 && (
              <p className="px-4 py-6 text-sm text-slate-400">No pending requests.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-card">
          <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-[14px]">Active Jobs</h3>
            <button
              onClick={() => navigate("/active-jobs")}
              className="text-[11px] font-bold text-primary flex items-center gap-0.5 hover:underline"
            >
              View all <ArrowRight size={11} />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {activeJobs.slice(0, 4).map((job) => (
              <div key={job.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-mono text-slate-400">{job.id}</span>
                    <Badge
                      variant={job.status === "In Transit" ? "primary" : job.status === "Picked Up" ? "warning" : "default"}
                      size="sm"
                    >
                      {job.status}
                    </Badge>
                  </div>
                  <p className="text-[13px] font-semibold text-slate-900 truncate">{job.clientName || "Client Booking"}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{job.distance} km</p>
                </div>
                <p className="text-sm font-bold text-slate-900 font-mono flex-shrink-0">
                  {formatCurrency(job.amount)}
                </p>
              </div>
            ))}
            {activeJobs.length === 0 && (
              <p className="px-4 py-6 text-sm text-slate-400">No active jobs right now.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
