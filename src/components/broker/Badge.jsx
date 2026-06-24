const VARIANTS = {
  default:          "bg-slate-100 text-slate-600",
  primary:          "bg-blue-50 text-blue-600",
  success:          "bg-emerald-50 text-emerald-700",
  warning:          "bg-amber-50 text-amber-700",
  danger:           "bg-red-50 text-red-600",
  info:             "bg-sky-50 text-sky-600",
  navy:             "bg-slate-800 text-white",
  outline:          "border border-slate-200 text-slate-600 bg-white",
  "outline-success":"border border-emerald-200 text-emerald-700 bg-white",
  "outline-danger": "border border-red-200 text-red-600 bg-white",
  "outline-primary":"border border-blue-200 text-blue-600 bg-white",
};

const DOT = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger:  "bg-red-500",
  primary: "bg-blue-500",
};

const SIZES = {
  sm: "text-[10px] px-1.5 py-0.5",
  md: "text-[11px] px-2 py-0.5",
  lg: "text-xs px-2.5 py-1",
};

export default function Badge({ children, variant = "default", size = "md", dot = false, className = "" }) {
  const showDot = dot || ["success", "warning", "danger", "primary"].includes(variant);

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap
      ${VARIANTS[variant] || VARIANTS.default}
      ${SIZES[size] || SIZES.md}
      ${className}`}>
      {showDot && DOT[variant] && (
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT[variant]}`} />
      )}
      {children}
    </span>
  );
}
