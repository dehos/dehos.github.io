import { cn } from "../../lib/cn.js";

const TONE = {
  neutral: "bg-surface-2 text-fg-soft border border-border-soft",
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info"
};

export function Badge({ tone = "neutral", className, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold",
        TONE[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
