import { useState, useRef } from "react";
import { UploadCloud, X, CheckCircle2 } from "lucide-react";

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function KycDocumentUpload({ label, hint, icon: Icon, file, onChange, onRemove }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (f) => {
    if (f) onChange(f);
  };

  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-2">
        {Icon && <Icon size={13} className="text-slate-400" />} {label}
      </label>

      {file ? (
        <div className="flex items-center gap-3 border border-emerald-200 bg-emerald-50 rounded-2xl px-4 py-3.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={18} className="text-emerald-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800 truncate">{file.name}</p>
            <p className="text-xs text-slate-400">{formatSize(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-white transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
          className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl px-4 py-7 cursor-pointer transition-colors ${
            dragOver ? "border-primary bg-primary-50" : "border-slate-200 hover:border-primary/40 hover:bg-slate-50"
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
            <UploadCloud size={18} className="text-primary" />
          </div>
          <p className="text-sm font-medium text-slate-700 text-center">
            <span className="text-primary font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-[11px] text-slate-400">{hint || "PNG, JPG or PDF, up to 10MB"}</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }}
          />
        </div>
      )}
    </div>
  );
}
