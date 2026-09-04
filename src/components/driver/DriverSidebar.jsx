import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useDriverSidebarCounts } from "../../hooks/useDriverSidebarCounts";
import NotificationBell from "../NotificationBell";
import ChatBell from "../ChatBell";
import {
  LayoutDashboard, Inbox, Navigation, History, User, ShieldCheck, IndianRupee,
  LogOut, X,
} from "lucide-react";

const NAV = [
  { label: "MAIN", items: [{ label: "Dashboard", icon: LayoutDashboard, path: "/driver" }] },
  {
    label: "TRIPS", items: [
      { label: "Requests", icon: Inbox, path: "/driver/requests" },
      { label: "My Trip", icon: Navigation, path: "/driver/my-trip" },
      { label: "Trip History", icon: History, path: "/driver/history" },
      { label: "Earnings", icon: IndianRupee, path: "/driver/earnings" },
    ],
  },
  {
    label: "ACCOUNT", items: [
      { label: "KYC", icon: ShieldCheck, path: "/driver/kyc" },
      // { label: "Profile", icon: User, path: "/driver/profile" },
    ],
  },
];

const KYC_DOT = {
  pending: "bg-amber-400",
  submitted: "bg-amber-400",
  rejected: "bg-red-500",
  verified: null,
};

// Solid brand-green sidebar (bg-primary) — muted white nav text by default, and every
// interactive row (hover or active) flips to a solid white pill with green text/icon instead
// of a subtle tint, so the hover/active state reads clearly against the colored background.
export default function DriverSidebar({ mobileOpen, onMobileClose }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const kycDot = KYC_DOT[user?.kyc_status || "pending"];
  const { requests, hasActiveTrip } = useDriverSidebarCounts(!!user?.tokens?.access_token);
  const badges = {
    "/driver/requests": requests,
    "/driver/my-trip": hasActiveTrip ? 1 : 0,
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen z-50 w-[260px] flex flex-col bg-primary transition-transform duration-300
        ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
    >
      {/* Logo — a small white chip behind it keeps the real logo colors intact instead of
          forcing the whole thing white via a filter. */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-white/15 flex-shrink-0">
        <div className="bg-white rounded-md px-2 py-1 flex-shrink-0">
          <img src="/gadidost-logo.png" alt="GadiDost" className="h-6 w-auto" />
        </div>
        <p className="text-[11px] text-white/70 truncate">Driver Portal</p>
        <button onClick={onMobileClose} className="lg:hidden ml-auto p-1.5 rounded-lg text-white/70 hover:text-primary hover:bg-white flex-shrink-0">
          <X size={16} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-5 scrollbar-none px-3 space-y-5">
        {NAV.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-semibold text-white/60 uppercase tracking-widest px-3 mb-3">{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                const badge = badges[item.path];
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => onMobileClose?.()}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group ${
                      isActive ? "bg-white text-primary font-semibold shadow-md shadow-black/10" : "text-white/85 hover:bg-white hover:text-primary"
                    }`}
                  >
                    <Icon
                      size={18}
                      strokeWidth={isActive ? 2.5 : 1.8}
                      className={`flex-shrink-0 transition-colors ${isActive ? "text-primary" : "text-white/85 group-hover:text-primary"}`}
                    />
                    <span className="text-sm font-medium flex-1">{item.label}</span>
                    {!!badge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none flex-shrink-0 transition-colors ${
                        isActive ? "bg-primary text-white" : "bg-white text-primary group-hover:bg-primary group-hover:text-white"
                      }`}>
                        {badge > 9 ? "9+" : badge}
                      </span>
                    )}
                    {item.path === "/driver/kyc" && kycDot && (
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${kycDot}`} />
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
            <span className="text-[11px] font-bold text-white">{(user?.name || "R")[0]}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate leading-tight">{user?.name || "Ramesh Singh"}</p>
            <p className="text-[10px] text-white/40 truncate">Driver</p>
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
