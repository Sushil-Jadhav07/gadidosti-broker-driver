import { ShieldCheck, FileText, Truck, CheckCircle, AlertTriangle } from "lucide-react";
import Badge from "../../components/broker/Badge";
import { brokerKycDocs, vehicleDocs } from "../../data/brokerMockData";

export default function KYCStatus() {
  const allVerified = brokerKycDocs.every((d) => d.status === "Verified");
  const vehicleIssues = vehicleDocs.filter((v) => v.overallStatus !== "Compliant");

  return (
    <div className="space-y-6">
      <div className={`rounded-xl p-5 flex items-center gap-4 ${allVerified && vehicleIssues.length === 0 ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"}`}>
        {allVerified && vehicleIssues.length === 0
          ? <ShieldCheck size={32} className="text-emerald-500 flex-shrink-0" />
          : <AlertTriangle size={32} className="text-amber-500 flex-shrink-0" />
        }
        <div>
          <h3 className={`font-bold text-[15px] ${allVerified && vehicleIssues.length === 0 ? "text-emerald-800" : "text-amber-800"}`}>
            {allVerified && vehicleIssues.length === 0 ? "KYC Fully Verified" : "Action Required"}
          </h3>
          <p className={`text-sm mt-0.5 ${allVerified && vehicleIssues.length === 0 ? "text-emerald-600" : "text-amber-600"}`}>
            {allVerified && vehicleIssues.length === 0
              ? "All documents verified. Your account is fully compliant."
              : `${vehicleIssues.length} vehicle(s) have compliance issues. Please renew expired documents.`
            }
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-card">
        <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-2">
          <FileText size={16} className="text-primary" />
          <h3 className="font-bold text-slate-900 text-[15px]">Business Documents</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {brokerKycDocs.map((doc) => (
            <div key={doc.name} className="px-5 py-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800 text-sm">{doc.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">Uploaded: {doc.uploadedDate}</p>
              </div>
              <div className="flex items-center gap-2">
                {doc.status === "Verified" && <CheckCircle size={14} className="text-emerald-500" />}
                <Badge variant={doc.status === "Verified" ? "success" : "warning"}>{doc.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-card">
        <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-2">
          <Truck size={16} className="text-primary" />
          <h3 className="font-bold text-slate-900 text-[15px]">Vehicle Compliance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Vehicle", "RC Book", "Insurance", "Fitness", "Permit", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehicleDocs.map((v) => (
                <tr key={v.truckReg} className="table-row">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-800">{v.truckReg}</td>
                  <td className="px-4 py-3"><Badge variant="success" size="sm">Valid</Badge></td>
                  <td className="px-4 py-3">
                    <div>
                      <Badge variant={v.insurance.status === "Valid" ? "success" : "danger"} size="sm">{v.insurance.status}</Badge>
                      <p className="text-[10px] text-slate-400 mt-0.5">{v.insurance.expiry}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge variant="success" size="sm">Valid</Badge></td>
                  <td className="px-4 py-3"><Badge variant="success" size="sm">Valid</Badge></td>
                  <td className="px-4 py-3">
                    <Badge variant={v.overallStatus === "Compliant" ? "success" : "danger"}>{v.overallStatus}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
