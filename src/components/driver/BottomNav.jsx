import { useLocation, useNavigate } from "react-router-dom";
import { Home, Navigation, History, User } from "lucide-react";

const navItems = [
  { path: "/driver",         label: "Home",    icon: Home },
  { path: "/driver/my-trip", label: "My Trip", icon: Navigation },
  { path: "/driver/history", label: "History", icon: History },
  { path: "/driver/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white z-50 border-t border-slate-100"
      style={{ boxShadow: "0 -4px 16px rgba(0,0,0,0.06)" }}>
      <div className="flex items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button key={item.path} onClick={() => navigate(item.path)}
              className={`relative flex flex-col items-center justify-center py-2.5 px-4 min-w-[64px] transition-colors ${
                isActive ? "text-primary" : "text-slate-400"
              }`}>
              <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5px]" : "stroke-[1.5px]"}`} />
              <span className={`text-[10px] mt-1 font-medium ${isActive ? "text-primary" : "text-slate-400"}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-10 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
