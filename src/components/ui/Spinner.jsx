import { Loader2 } from "lucide-react";
import { cn } from "../../lib/cn.js";

export function Spinner({ className, label }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm text-muted", className)} role="status">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {label ? <span>{label}</span> : <span className="sr-only">Memuat…</span>}
    </span>
  );
}

export function LoadingBlock({ label = "Memuat data…", className }) {
  return (
    <div className={cn("flex items-center justify-center py-10", className)}>
      <Spinner label={label} />
    </div>
  );
}
