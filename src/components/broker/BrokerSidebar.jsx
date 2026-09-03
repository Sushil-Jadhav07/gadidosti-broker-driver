import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useBrokerSidebarCounts } from "../../hooks/useBrokerSidebarCounts";
import NotificationBell from "../NotificationBell";
import ChatBell from "../ChatBell";
import {
  LayoutDashboard, Truck, Users, Inbox, UserCog, ClipboardList, History,
  IndianRupee, Wallet, ShieldCheck, User, Settings,
  LogOut, X,
} from "lucide-react";

const NAV = [
  { label: "MAIN", items: [{ label: "Dashboard", icon: LayoutDashboard, path: "/broker" }] },
  { label: "FLEET", items: [{ label: "My Trucks", icon: Truck, path: "/trucks" }, { label: "Drivers", icon: Users, path: "/drivers" }] },
  {
    label: "JOBS", items: [
      { label: "Job Requests", icon: Inbox, path: "/job-requests" },
      { label: "Driver Requests", icon: UserCog, path: "/driver-requests" },
      { label: "Active Jobs", icon: ClipboardList, path: "/active-jobs" },
      { label: "Job History", icon: History, path: "/job-history" },
    ],
  },
  {
    label: "FINANCE", items: [
      { label: "Earnings", icon: IndianRupee, path: "/earnings" },
      { label: "Earnings History", icon: History, path: "/earnings/history" },
      { label: "Settlements", icon: Wallet, path: "/settlements" },
    ],
  },
  {
    label: "ACCOUNT", items: [
      { label: "KYC Status", icon: ShieldCheck, path: "/kyc" },
      { label: "Profile", icon: User, path: "/profile" },
      { label: "Settings", icon: Settings, path: "/settings" },
    ],
  },
];

const KYC_DOT = {
  pending: "bg-amber-400",
  submitted: "bg-amber-400",
  rejected: "bg-red-500",
  verified: null,
};

// Dark-navy theme (bg-secondary), matching the client portal's sidebar — same white chip
// logo, white/50 muted nav text, solid-primary active pill, and a full-width Logout row
// instead of an icon-only sign-out button, so all three GadiDost apps read as one product.
export default function BrokerSidebar({ mobileOpen, onMobileClose }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const kycDot = KYC_DOT[user?.kyc_status || "pending"];
  const { jobRequests, activeJobs, driverRequests } = useBrokerSidebarCounts(!!user?.tokens?.access_token);
  const badges = {
    "/job-requests": jobRequests,
    "/driver-requests": driverRequests,
    "/active-jobs": activeJobs,
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen z-50 w-[260px] flex flex-col bg-secondary transition-transform duration-300
        ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
    >
      {/* Logo — the wordmark itself is dark text, unreadable straight on this dark sidebar
          (only the blue/green "GD" icon would show); a small white chip behind it keeps the
          real logo colors intact instead of forcing the whole thing white via a filter. */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-white/10 flex-shrink-0">
        <div className="bg-white rounded-md px-2 py-1 flex-shrink-0">
          <img src="/gadidost-logo.png" alt="GadiDost" className="h-6 w-auto" />
        </div>
        <p className="text-[11px] text-white/40 truncate">Broker Portal</p>
        {/* Mobile close button */}
        <button onClick={onMobileClose} className="lg:hidden ml-auto p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 flex-shrink-0">
          <X size={16} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-5 scrollbar-none px-3 space-y-5">
        {NAV.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-3 mb-3">{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                const badge = badges[item.path];
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group ${
                      isActive ? "bg-primary text-white shadow-md shadow-primary/20" : "text-white/50 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon
                      size={18}
                      strokeWidth={isActive ? 2.5 : 1.8}
                      className={`flex-shrink-0 transition-colors ${isActive ? "text-white" : "text-white/50 group-hover:text-white"}`}
                    />
                    <span className="text-sm font-medium flex-1">{item.label}</span>
                    {!!badge && (
                      <span className="text-[10px] font-bold bg-white text-primary px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none flex-shrink-0">
                        {badge > 9 ? "9+" : badge}
                      </span>
                    )}
                    {item.path === "/kyc" && kycDot && (
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${kycDot}`} />
                    )}
                    {isActive && !badge && !(item.path === "/kyc" && kycDot) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white/50 flex-shrink-0" />
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}

        {/* Chat/Notifications moved down here from the top bar — same full-width row style
            as the rest of the nav, unread badges included. */}
        <div className="space-y-0.5">
          <NotificationBell onNavigate={onMobileClose} />
          <ChatBell onNavigate={onMobileClose} />
        </div>
      </nav>

      {/* User + Logout */}
      {/* <div className="px-3 pb-4 border-t border-white/10 pt-3 flex-shrink-0 space-y-0.5">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-primary/25 border border-primary/40 flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] font-bold text-white">{(user?.name || "S")[0]}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate leading-tight">{user?.name || "Suresh Patel"}</p>
            <p className="text-[10px] text-white/40 truncate">Broker</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/50 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150"
        >
          <LogOut size={16} className="flex-shrink-0" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div> */}
    </aside>
  );
}
