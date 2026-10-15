import { useState, useRef, useEffect } from "react";
import { Bell, Lock, Globe, Mail, ChevronDown, Check, UserX } from "lucide-react";
import { useToast } from "../../hooks/useToast";
import { api, getToken } from "../../services/api";
import Modal from "../../components/broker/Modal";

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
  const { addToast } = useToast();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteRequested, setDeleteRequested] = useState(false);

  // Name/email/phone aren't sent here — the backend reads the verified account straight off the
  // auth token (POST /api/account-deletion-requests/me), so there's nothing to type except,
  // optionally, why. Only ever logs a request for an admin to review; nothing here deletes or
  // touches any account data itself — the "irreversible, permanently removed" copy below is
  // aspirational/future-facing, not what this actually does today.
  const handleRequestDeletion = async () => {
    setDeletingAccount(true);
    try {
      const res = await api.post("/api/account-deletion-requests/me", { reason: deleteReason.trim() || undefined }, getToken());
      if (!res?.success) throw new Error(res?.message || "Failed to submit request");
      setDeleteRequested(true);
      addToast("Request received — our team will follow up shortly.", "success");
    } catch (err) {
      addToast(err?.message || "Failed to submit request", "error");
    } finally {
      setDeletingAccount(false);
    }
  };

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
          <p className="text-xs text-red-600 mb-3">Request deletion of your account — our team reviews and completes it after verifying it's you.</p>
          <button
            onClick={() => { setDeleteReason(""); setDeleteRequested(false); setShowDeleteModal(true); }}
            className="px-4 py-2 text-sm font-semibold text-red-600 border border-red-300 rounded-lg hover:bg-red-100 transition-all"
          >
            Delete Account
          </button>
        </div>
      </div>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Request Account Deletion" size="sm">
        {deleteRequested ? (
          <div className="text-center py-2">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <UserX className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Request Received</h3>
            <p className="text-sm text-slate-400 mb-6">Our team will follow up by email or phone to verify and complete your request.</p>
            <button onClick={() => setShowDeleteModal(false)} className="w-full bg-white border border-slate-200 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition-colors">
              Close
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-slate-500 mb-4">
              This sends a request to our team — your account isn't deleted immediately. See our{" "}
              <a href="/legal/broker/account_deletion" target="_blank" rel="noreferrer" className="text-primary hover:underline">Account Deletion policy</a> for what's retained and why.
            </p>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Reason (optional)</label>
            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value.slice(0, 2000))}
              rows={3}
              placeholder="Let us know why you're leaving (optional)..."
              className="w-full resize-none rounded-lg border border-slate-200 p-3 text-sm text-slate-700 placeholder:text-slate-300 outline-none focus:border-primary mb-5"
            />
            <div className="flex gap-2.5">
              <button onClick={() => setShowDeleteModal(false)} disabled={deletingAccount} className="flex-1 bg-white border border-slate-200 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-60">
                Cancel
              </button>
              <button onClick={handleRequestDeletion} disabled={deletingAccount} className="flex-1 bg-danger text-white font-medium py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60">
                {deletingAccount ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
