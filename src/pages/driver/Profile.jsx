import { Phone, MapPin, Calendar, Shield, CreditCard, FileText, Truck } from "lucide-react";
import Badge from "../../components/driver/Badge";
import { driverData, vehicleData, kycDocuments } from "../../data/driverMockData";

const iconMap = {
  "credit-card": CreditCard,
  "id-card": Shield,
  "file-text": FileText,
  truck: Truck,
  shield: Shield,
};

export default function DriverProfile() {
  return (
    <div className="space-y-5">
      {/* Driver card */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-6">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 bg-secondary rounded-xl flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
            {driverData.initials}
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-slate-900">{driverData.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge status={driverData.kycStatus} />
              <span className="text-xs text-slate-400">Since {driverData.joinDate}</span>
            </div>
          </div>
        </div>
        <div className="space-y-0">
          {[
            { icon: Phone,    label: "Phone",    value: driverData.phone },
            { icon: MapPin,   label: "Location", value: driverData.location },
            { icon: Calendar, label: "Member Since", value: driverData.joinDate },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
              <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{label}</p>
                <p className="text-sm font-semibold text-slate-800">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vehicle */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Truck className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-slate-900 text-[15px]">My Vehicle</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Registration",   value: vehicleData.registration },
            { label: "Type",           value: vehicleData.type },
            { label: "Capacity",       value: vehicleData.capacity },
            { label: "Broker",         value: vehicleData.broker },
            { label: "Insurance Valid",value: vehicleData.insuranceValidTill },
            { label: "Fitness Valid",  value: vehicleData.fitnessValidTill },
            { label: "Permit Type",    value: vehicleData.permitType },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-50 rounded-lg p-3">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{label}</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KYC Documents */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-slate-900 text-[15px]">KYC Documents</h3>
          <Badge status="Verified" className="ml-auto" />
        </div>
        <div className="space-y-2">
          {kycDocuments.map((doc) => {
            const Icon = iconMap[doc.icon] || FileText;
            return (
              <div key={doc.name} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{doc.name}</p>
                  <p className="text-xs text-slate-500 font-mono">{doc.number}</p>
                  <p className="text-[10px] text-slate-400">Expires: {doc.expiryDate}</p>
                </div>
                <Badge status={doc.status} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
