import { useParams, Link } from "react-router-dom";
import { FileText, Shield, UserX, Headphones, RotateCcw, ShieldAlert, ChevronRight } from "lucide-react";

// Public, unauthenticated — one URL an app-store listing can point to that fans out to every
// individual policy page for this audience ("driver" or "broker").
const PAGES = [
  { key: "privacy_policy", label: "Privacy Policy", icon: Shield },
  { key: "terms_conditions", label: "Terms & Conditions", icon: FileText },
  { key: "account_deletion", label: "Account Deletion Request", icon: UserX },
  { key: "contact_support", label: "Contact / Support", icon: Headphones },
  { key: "refund_policy", label: "Cancellation & Refund Policy", icon: RotateCcw },
  { key: "safety_policy", label: "Safety Policy", icon: ShieldAlert },
];

const AUDIENCE_LABELS = { driver: "Driver", broker: "Broker" };

export default function LegalIndex() {
  const { audience } = useParams();
  const audienceLabel = AUDIENCE_LABELS[audience] || audience;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-10">
        <h1 className="font-bold text-2xl text-slate-900 mb-1">Legal & Support</h1>
        <p className="text-sm text-slate-500 mb-6">Policies and support information for the GadiDosti {audienceLabel} app.</p>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-card divide-y divide-slate-50 overflow-hidden">
          {PAGES.map(({ key, label, icon: Icon }) => (
            <Link
              key={key}
              to={`/legal/${audience}/${key}`}
              className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors"
            >
              <span className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </span>
              <span className="flex-1 text-sm font-medium text-slate-800">{label}</span>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
