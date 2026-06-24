import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { vehicleData } from "../../data/driverMockData";
import {
  LayoutDashboard, Navigation, History, User,
  ChevronLeft, ChevronRight, LogOut, X,
} from "lucide-react";

const NAV = [
  { label: "MAIN", items: [{ label: "Dashboard", icon: LayoutDashboard, path: "/driver" }] },
  {
    label: "TRIPS", items: [
      { label: "My Trip", icon: Navigation, path: "/driver/my-trip", badge: 1 },
      { label: "Trip History", icon: History, path: "/driver/history" },
    ],
  },
  { label: "ACCOUNT", items: [{ label: "Profile", icon: User, path: "/driver/profile" }] },
];

export default function DriverSidebar({ isExpanded, toggleExpanded, mobileOpen, onMobileClose }) {
  const [hovered, setHovered] = useState(null);
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <aside
      className={`fixed left-0 top-0 h-screen z-50 flex flex-col overflow-hidden transition-all duration-300
        ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        ${isExpanded ? "w-[260px]" : "w-[260px] lg:w-[72px]"}
      `}
      style={{ background: "#111827", borderRight: "1px solid rgba(255,255,255,0.05)" }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex flex-col gap-1">
          <img src="/gadidost-logo.png" alt="GadiDost" className="h-8 w-auto"
            style={{ filter: "brightness(0) invert(1)" }} />
          <div className={`text-[11px] transition-all ${!isExpanded ? "lg:hidden" : ""}`}
            style={{ color: "rgba(255,255,255,0.35)" }}>
            Driver Portal
          </div>
        </div>
        <button onClick={onMobileClose} className="lg:hidden p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10">
          <X size={16} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-none px-2">
        {NAV.map((section) => (
          <div key={section.label} className="mb-5">
            <div className={`px-3 mb-2 ${!isExpanded ? "lg:hidden" : ""}`}>
              <span className="section-label" style={{ color: "rgba(255,255,255,0.25)" }}>{section.label}</span>
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <div key={item.path} className="relative"
                    onMouseEnter={() => setHovered(item.label)}
                    onMouseLeave={() => setHovered(null)}>
                    <NavLink to={item.path}
                      onClick={() => onMobileClose?.()}
                      className={({ isActive: a }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${a ? "" : "hover:bg-white/[0.04]"}`
                      }
                      style={({ isActive: a }) =>
                        a ? { background: "rgba(25,118,255,0.1)", borderLeft: "2px solid #1976FF" } : {}
                      }
                    >
                      <Icon size={18} className="flex-shrink-0"
                        style={{ color: isActive ? "#1976FF" : "rgba(255,255,255,0.45)" }} />
                      <span className={`text-[13px] font-medium whitespace-nowrap flex-1 ${!isExpanded ? "lg:hidden" : ""}`}
                        style={{ color: isActive ? "#1976FF" : "rgba(255,255,255,0.65)" }}>
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className={`text-[10px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none ${!isExpanded ? "lg:hidden" : ""}`}>
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                    {!isExpanded && hovered === item.label && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 pointer-events-none hidden lg:block">
                        <div className="bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-modal border border-white/10">
                          {item.label}
                          {item.badge && <span className="ml-2 bg-primary text-white text-[9px] px-1.5 py-0.5 rounded-full">{item.badge}</span>}
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

      {/* Driver info + Logout */}
      <div className="flex-shrink-0 px-2 pb-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className={`flex items-center gap-3 px-3 py-3 ${!isExpanded ? "lg:flex-col lg:items-center lg:gap-1" : ""}`}>
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-bold text-sm">{(user?.name || "R")[0]}</span>
          </div>
          <div className={`flex-1 min-w-0 ${!isExpanded ? "lg:hidden" : ""}`}>
            <div className="text-white text-[13px] font-medium truncate">{user?.name || "Ramesh Singh"}</div>
            <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
              Driver · {vehicleData.registration}
            </div>
          </div>
          <button onClick={logout} className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10" title="Sign out">
            <LogOut size={15} style={{ color: "rgba(255,255,255,0.35)" }} />
          </button>
        </div>
        <button onClick={toggleExpanded}
          className="hidden lg:flex w-full items-center justify-center py-2 rounded-lg hover:bg-white/[0.04] transition-all mt-1">
          {isExpanded
            ? <ChevronLeft size={15} style={{ color: "rgba(255,255,255,0.3)" }} />
            : <ChevronRight size={15} style={{ color: "rgba(255,255,255,0.3)" }} />}
        </button>
      </div>
    </aside>
  );
}
