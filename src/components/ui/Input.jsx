import { cn } from "../../lib/cn.js";

export const inputClass =
  "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg " +
  "placeholder:text-muted/80 transition-colors focus:border-primary focus:outline-none " +
  "focus:ring-2 focus:ring-primary-soft disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted " +
  "read-only:bg-surface-2 aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger-soft";

export function Input({ className, type = "text", ...props }) {
  return <input type={type} className={cn(inputClass, className)} {...props} />;
}
