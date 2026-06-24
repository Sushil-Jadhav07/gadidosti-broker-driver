import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ToastProvider } from "./hooks/useToast";

// Broker
import BrokerSidebar  from "./components/broker/BrokerSidebar";
import BrokerTopBar   from "./components/broker/BrokerTopBar";
import Dashboard      from "./pages/broker/Dashboard";
import Trucks         from "./pages/broker/Trucks";
import Drivers        from "./pages/broker/Drivers";
import JobRequests    from "./pages/broker/JobRequests";
import ActiveJobs     from "./pages/broker/ActiveJobs";
import JobHistory     from "./pages/broker/JobHistory";
import Earnings       from "./pages/broker/Earnings";
import Settlements    from "./pages/broker/Settlements";
import KYCStatus      from "./pages/broker/KYCStatus";
import BrokerProfile  from "./pages/broker/Profile";
import Settings       from "./pages/broker/Settings";

// Driver
import DriverSidebar    from "./components/driver/DriverSidebar";
import DriverTopHeader  from "./components/driver/DriverTopHeader";
import BottomNav        from "./components/driver/BottomNav";
import DriverHome       from "./pages/driver/Home";
import MyTrip           from "./pages/driver/MyTrip";
import TripHistory      from "./pages/driver/TripHistory";
import DriverProfile    from "./pages/driver/Profile";

// Shared
import Login    from "./pages/Login";
import Register from "./pages/Register";

// ────── Broker Layout ──────
function BrokerAppLayout({ children }) {
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <BrokerSidebar
        isExpanded={expanded}
        toggleExpanded={() => setExpanded((e) => !e)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className={`min-h-screen flex flex-col transition-all duration-300 ${expanded ? "lg:ml-[260px]" : "lg:ml-[72px]"}`}>
        <BrokerTopBar currentPath={location.pathname} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 lg:p-6">
          <div key={location.pathname} className="page-content">{children}</div>
        </main>
      </div>
    </div>
  );
}

// ────── Driver Layout ──────
function DriverAppLayout() {
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { window.scrollTo(0, 0); setMobileOpen(false); }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <DriverSidebar
        isExpanded={expanded}
        toggleExpanded={() => setExpanded((e) => !e)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className={`min-h-screen flex flex-col transition-all duration-300 ${expanded ? "lg:ml-[260px]" : "lg:ml-[72px]"}`}>
        <DriverTopHeader currentPath={location.pathname} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
        <div className="lg:hidden">
          <BottomNav />
        </div>
      </div>
    </div>
  );
}

// ────── Route guards ──────
function PrivateRoute({ children, role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user } = useAuth();
  if (!user) return children;
  return <Navigate to="/" replace />;
}

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "driver") return <Navigate to="/driver" replace />;
  return <Navigate to="/broker" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public */}
            <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/"         element={<RootRedirect />} />

            {/* Broker routes */}
            <Route path="/broker"       element={<PrivateRoute role="broker"><BrokerAppLayout><Dashboard /></BrokerAppLayout></PrivateRoute>} />
            <Route path="/trucks"       element={<PrivateRoute role="broker"><BrokerAppLayout><Trucks /></BrokerAppLayout></PrivateRoute>} />
            <Route path="/drivers"      element={<PrivateRoute role="broker"><BrokerAppLayout><Drivers /></BrokerAppLayout></PrivateRoute>} />
            <Route path="/job-requests" element={<PrivateRoute role="broker"><BrokerAppLayout><JobRequests /></BrokerAppLayout></PrivateRoute>} />
            <Route path="/active-jobs"  element={<PrivateRoute role="broker"><BrokerAppLayout><ActiveJobs /></BrokerAppLayout></PrivateRoute>} />
            <Route path="/job-history"  element={<PrivateRoute role="broker"><BrokerAppLayout><JobHistory /></BrokerAppLayout></PrivateRoute>} />
            <Route path="/earnings"     element={<PrivateRoute role="broker"><BrokerAppLayout><Earnings /></BrokerAppLayout></PrivateRoute>} />
            <Route path="/settlements"  element={<PrivateRoute role="broker"><BrokerAppLayout><Settlements /></BrokerAppLayout></PrivateRoute>} />
            <Route path="/kyc"          element={<PrivateRoute role="broker"><BrokerAppLayout><KYCStatus /></BrokerAppLayout></PrivateRoute>} />
            <Route path="/profile"      element={<PrivateRoute role="broker"><BrokerAppLayout><BrokerProfile /></BrokerAppLayout></PrivateRoute>} />
            <Route path="/settings"     element={<PrivateRoute role="broker"><BrokerAppLayout><Settings /></BrokerAppLayout></PrivateRoute>} />

            {/* Driver routes — all under /driver/* */}
            <Route element={<PrivateRoute role="driver"><DriverAppLayout /></PrivateRoute>}>
              <Route path="/driver"          element={<DriverHome />} />
              <Route path="/driver/my-trip"  element={<MyTrip />} />
              <Route path="/driver/history"  element={<TripHistory />} />
              <Route path="/driver/profile"  element={<DriverProfile />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
