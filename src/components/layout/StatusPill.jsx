import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useData } from "../../context/DataContext.jsx";
import { cn } from "../../lib/cn.js";

export function StatusPill({ className }) {
  const { dbStatus } = useData();
  const { message, type } = dbStatus;
  const Icon = type === "success" ? CheckCircle2 : type === "error" ? XCircle : Loader2;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={type !== "success" && type !== "error"}
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
        type === "success" && "border-success/25 bg-success-soft text-success",
        type === "error" && "border-danger/25 bg-danger-soft text-danger",
        !type && "border-border bg-surface text-muted",
        className
      )}
    >
      <Icon className={cn("size-3.5 shrink-0", !type && "animate-spin")} aria-hidden="true" />
      <span className="truncate">{message}</span>
    </div>
  );
}
