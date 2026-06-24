import { Bell, Menu } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const PAGE = {
  "/broker":       { title: null,               sub: null },
  "/trucks":       { title: "My Fleet",          sub: "Manage and monitor your trucks" },
  "/drivers":      { title: "My Drivers",        sub: "Driver roster and KYC management" },
  "/job-requests": { title: "Incoming Requests", sub: "New booking requests from clients" },
  "/active-jobs":  { title: "Active Jobs",       sub: "Jobs currently in progress" },
  "/job-history":  { title: "Job History",       sub: "Completed and cancelled bookings" },
  "/earnings":     { title: "Earnings",          sub: "Revenue breakdown and analytics" },
  "/settlements":  { title: "Settlements",       sub: "Payouts and settlement history" },
  "/kyc":          { title: "KYC Status",        sub: "Document verification status" },
  "/profile":      { title: "Profile",           sub: "Your business and bank details" },
  "/settings":     { title: "Settings",          sub: "Account preferences" },
};

export default function BrokerTopBar({ currentPath, onMenuClick }) {
  const { user } = useAuth();
  const info = PAGE[currentPath] || { title: "Dashboard", sub: "" };
  const firstName = (user?.name || "Suresh").split(" ")[0];
  const isHome = currentPath === "/broker";
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <header className="h-14 bg-white sticky top-0 z-40 flex items-center justify-between px-4 lg:px-6"
      style={{ borderBottom: "1px solid #E2E8F0" }}>

      {/* Left: hamburger (mobile) + title */}
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-50 transition-all -ml-1">
          <Menu size={20} />
        </button>
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900 leading-none">
            {isHome ? `Good morning, ${firstName}` : info.title}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
            {isHome ? today : info.sub}
          </p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <button className="relative w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
        </button>
        <div className="w-px h-6 bg-slate-100 mx-1 hidden sm:block" />
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-white text-sm font-semibold">{(user?.name || "S")[0]}</span>
          </div>
          <div className="hidden sm:block">
            <div className="text-[13px] font-semibold text-slate-800 leading-none">{firstName}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Broker</div>
          </div>
        </div>
      </div>
    </header>
  );
}
