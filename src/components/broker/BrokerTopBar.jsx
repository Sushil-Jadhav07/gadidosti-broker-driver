import { useState, useRef, useEffect } from "react";
import { Menu, User, LogOut, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import NotificationBell from "../NotificationBell";

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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropRef = useRef(null);

  const info = PAGE[currentPath] || { title: "Dashboard", sub: "" };
  const firstName = (user?.name || "Suresh").split(" ")[0];
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "SB";
  const isHome = currentPath === "/broker";
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate("/login");
  };

  return (
    <header
      className="h-14 bg-white sticky top-0 z-40 flex items-center justify-between px-4 lg:px-6"
      style={{ borderBottom: "1px solid #E2E8F0" }}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-50 transition-all -ml-1"
        >
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
        <NotificationBell />

        <div className="w-px h-6 bg-slate-100 mx-1 hidden sm:block" />

        {/* Avatar + dropdown */}
        <div className="relative" ref={dropRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-semibold">{initials}</span>
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-[13px] font-semibold text-slate-800 leading-none">{firstName}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Broker</div>
            </div>
            <ChevronDown
              size={15}
              className={`text-slate-400 hidden sm:block transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
          </button>

          {/* Dropdown */}
          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div className="absolute right-0 top-12 w-52 bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] z-50 overflow-hidden">
                <div className="p-2">
                  <button
                    onClick={() => { setOpen(false); navigate("/profile"); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <User size={14} className="text-slate-500" />
                    </div>
                    My Profile
                  </button>

                  <div className="my-1.5 border-t border-slate-100" />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors font-medium"
                  >
                    <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                      <LogOut size={14} className="text-red-500" />
                    </div>
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
