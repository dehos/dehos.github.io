import { Loader2 } from "lucide-react";
import { cn } from "../../lib/cn.js";

const VARIANTS = {
  primary: "bg-primary text-primary-fg hover:bg-primary-hover shadow-sm",
  secondary: "border border-border bg-surface text-fg-soft hover:bg-primary-soft",
  ghost: "text-fg-soft hover:bg-primary-soft",
  danger: "bg-danger text-white hover:brightness-90 shadow-sm",
  "danger-soft": "bg-danger-soft text-danger hover:brightness-95",
  "success-soft": "bg-success-soft text-success hover:brightness-95"
};

const SIZES = {
  sm: "h-9 gap-1.5 px-3 text-sm",
  md: "h-10 gap-2 px-4 text-sm",
  lg: "h-11 gap-2 px-5 text-base",
  icon: "size-10",
  "icon-sm": "size-8"
};

export function buttonClass({ variant = "primary", size = "md", className } = {}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg font-semibold transition-colors",
    "disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass({ variant, size, className })}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
