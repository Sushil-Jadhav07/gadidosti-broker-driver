import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  LayoutDashboard, Truck, Users, Inbox, ClipboardList, History,
  IndianRupee, Wallet, ShieldCheck, User, Settings,
  ChevronLeft, ChevronRight, LogOut, X,
} from "lucide-react";

const NAV = [
  { label: "MAIN", items: [{ label: "Dashboard", icon: LayoutDashboard, path: "/broker" }] },
  { label: "FLEET", items: [{ label: "My Fleet", icon: Truck, path: "/trucks" }, { label: "Drivers", icon: Users, path: "/drivers" }] },
  {
    label: "JOBS", items: [
      { label: "Job Requests", icon: Inbox, path: "/job-requests", badge: 3 },
      { label: "Active Jobs", icon: ClipboardList, path: "/active-jobs", badge: 4 },
      { label: "Job History", icon: History, path: "/job-history" },
    ],
  },
  { label: "FINANCE", items: [{ label: "Earnings", icon: IndianRupee, path: "/earnings" }, { label: "Settlements", icon: Wallet, path: "/settlements" }] },
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

export default function BrokerSidebar({ isExpanded, toggleExpanded, mobileOpen, onMobileClose }) {
  const [hovered, setHovered] = useState(null);
  const location = useLocation();
  const { user, logout } = useAuth();
  const kycDot = KYC_DOT[user?.kyc_status || "pending"];

  return (
    <aside
      className={`fixed left-0 top-0 h-screen z-50 flex flex-col overflow-hidden bg-white border-r border-neutral-100 transition-all duration-300
        ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        ${isExpanded ? "w-[260px]" : "w-[260px] lg:w-[76px]"}
      `}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4 flex-shrink-0">
        <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
          <img src="/gadidost-logo.png" alt="GadiDost" className="w-5 h-5 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
        </div>
        <div className={`min-w-0 ${(!isExpanded) ? "lg:hidden" : ""}`}>
          <div className="font-bold text-neutral-900 text-[15px] leading-tight truncate">GadiDost</div>
          <div className="text-[11px] text-neutral-400 truncate">Broker Portal</div>
        </div>
        {/* Mobile close button */}
        <button onClick={onMobileClose} className="lg:hidden ml-auto p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 flex-shrink-0">
          <X size={16} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-none px-3">
        {NAV.map((section) => (
          <div key={section.label} className="mb-6">
            <div className={`px-3 mb-2 ${(!isExpanded) ? "lg:hidden" : ""}`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{section.label}</span>
            </div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <div key={item.path} className="relative"
                    onMouseEnter={() => setHovered(item.label)}
                    onMouseLeave={() => setHovered(null)}>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary" />
                    )}
                    <NavLink to={item.path}
                      className={`flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-xl transition-all relative ${
                        isActive ? "bg-primary-50 text-primary font-semibold" : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
                      }`}
                    >
                      <Icon className={`flex-shrink-0 transition-colors ${isActive ? "text-primary" : "text-neutral-400"}`} size={18} />
                      <span className={`text-[13px] whitespace-nowrap flex-1 ${(!isExpanded) ? "lg:hidden" : ""}`}>
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className={`text-[10px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none ${(!isExpanded) ? "lg:hidden" : ""}`}>
                          {item.badge}
                        </span>
                      )}
                      {item.path === "/kyc" && kycDot && (
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${kycDot} ${(!isExpanded) ? "lg:hidden" : ""}`} />
                      )}
                    </NavLink>
                    {/* Collapsed tooltip - desktop only */}
                    {!isExpanded && hovered === item.label && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 pointer-events-none hidden lg:block">
                        <div className="bg-neutral-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-modal">
                          {item.label}
                          {item.badge && <span className="ml-2 bg-primary text-white text-[9px] px-1.5 py-0.5 rounded-full">{item.badge}</span>}
                          {item.path === "/kyc" && kycDot && <span className={`ml-2 inline-block w-1.5 h-1.5 rounded-full ${kycDot}`} />}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="flex-shrink-0 px-3 pb-3 pt-2 border-t border-neutral-100">
        <div className={`flex items-center gap-3 rounded-xl bg-neutral-50 px-3 py-2.5 mb-1 ${(!isExpanded) ? "lg:flex-col lg:items-center lg:gap-1.5" : ""}`}>
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-bold text-sm">{(user?.name || "S")[0]}</span>
          </div>
          <div className={`flex-1 min-w-0 ${(!isExpanded) ? "lg:hidden" : ""}`}>
            <div className="text-neutral-800 text-[13px] font-medium truncate">{user?.name || "Suresh Patel"}</div>
            <div className="text-[11px] text-neutral-400 truncate">Broker</div>
          </div>
          <button onClick={logout} className="p-1.5 rounded-lg transition-colors text-neutral-400 hover:text-danger hover:bg-red-50 flex-shrink-0" title="Sign out">
            <LogOut size={15} />
          </button>
        </div>
        {/* Collapse toggle - desktop only */}
        <button onClick={toggleExpanded}
          className="hidden lg:flex w-full items-center justify-center py-2 rounded-lg text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600 transition-all">
          {isExpanded
            ? <ChevronLeft size={15} />
            : <ChevronRight size={15} />}
        </button>
      </div>
    </aside>
  );
}
