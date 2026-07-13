import { useState, useRef, useEffect } from "react";
import { Bell, Lock, Globe, Mail, ChevronDown, Check } from "lucide-react";

const LANGUAGES = ["English", "Hindi", "Marathi"];

const Toggle = ({ checked, onChange }) => (
  <button onClick={() => onChange(!checked)}
    className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${checked ? "bg-primary" : "bg-slate-200"}`}>
    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${checked ? "left-6" : "left-1"}`} />
  </button>
);

// Custom div-based dropdown (no native <select>) so it matches the rest of the app.
function LanguageDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative w-36 flex-shrink-0" ref={wrapRef}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpen((v) => !v); }}
        className={`w-full flex items-center justify-between gap-2 bg-white border rounded-lg px-3 py-1.5 text-sm cursor-pointer outline-none transition-all ${
          open ? "border-primary ring-2 ring-primary/15" : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <span className="text-slate-800">{value}</span>
        <ChevronDown size={14} className={`text-slate-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </div>

      {open && (
        <div className="absolute z-20 top-full right-0 mt-1.5 bg-white border border-slate-100 rounded-lg shadow-modal py-1 min-w-full">
          {LANGUAGES.map((l) => (
            <div
              key={l}
              role="option"
              aria-selected={value === l}
              onClick={() => { onChange(l); setOpen(false); }}
              className={`flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer whitespace-nowrap transition-colors ${
                value === l ? "bg-primary-50 text-primary font-medium" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {l}
              {value === l && <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const [settings, setSettings] = useState({
    emailAlerts: true,
    smsAlerts: true,
    pushNotifications: false,
    newJobAlerts: true,
    paymentAlerts: true,
    kycAlerts: true,
    twoFactor: false,
    activityLog: true,
    language: "English",
  });

  const set = (key) => (val) => setSettings((s) => ({ ...s, [key]: val }));

  const Section = ({ icon: Icon, title, children }) => (
    <div className="bg-white rounded-xl border border-slate-100 shadow-card">
      <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon size={15} className="text-primary" />
        </div>
        <h3 className="font-bold text-slate-900 text-[15px]">{title}</h3>
      </div>
      <div className="divide-y divide-slate-50">{children}</div>
    </div>
  );

  const Row = ({ label, sub, checked, onChange }) => (
    <div className="px-5 py-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
      {/* Left column */}
      <div className="space-y-5">
        <Section icon={Bell} title="Notifications">
          <Row label="Email Alerts" sub="Receive booking updates via email" checked={settings.emailAlerts} onChange={set("emailAlerts")} />
          <Row label="SMS Alerts" sub="Receive SMS for critical updates" checked={settings.smsAlerts} onChange={set("smsAlerts")} />
          <Row label="Push Notifications" sub="Browser push notifications" checked={settings.pushNotifications} onChange={set("pushNotifications")} />
        </Section>

        <Section icon={Mail} title="Alert Preferences">
          <Row label="New Job Requests" sub="Alert when a new booking is available" checked={settings.newJobAlerts} onChange={set("newJobAlerts")} />
          <Row label="Payment Updates" sub="Alert on payments and settlements" checked={settings.paymentAlerts} onChange={set("paymentAlerts")} />
          <Row label="KYC & Document Alerts" sub="Alert when documents need renewal" checked={settings.kycAlerts} onChange={set("kycAlerts")} />
        </Section>
      </div>

      {/* Right column */}
      <div className="space-y-5">
        <Section icon={Lock} title="Security">
          <Row label="Two-Factor Authentication" sub="Extra security for your account" checked={settings.twoFactor} onChange={set("twoFactor")} />
          <Row label="Activity Log" sub="Track all login and action history" checked={settings.activityLog} onChange={set("activityLog")} />
        </Section>

        <Section icon={Globe} title="Preferences">
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Language</p>
              <p className="text-xs text-slate-400 mt-0.5">Display language for the portal</p>
            </div>
            <LanguageDropdown value={settings.language} onChange={set("language")} />
          </div>
        </Section>

        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <h3 className="font-bold text-red-800 text-sm mb-2">Danger Zone</h3>
          <p className="text-xs text-red-600 mb-3">Deleting your account is irreversible. All data will be permanently removed.</p>
          <button className="px-4 py-2 text-sm font-semibold text-red-600 border border-red-300 rounded-lg hover:bg-red-100 transition-all">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
