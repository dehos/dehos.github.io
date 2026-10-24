import { useId } from "react";
import { Label } from "radix-ui";
import { cn } from "../../lib/cn.js";

/**
 * Label + kontrol + teks bantuan/galat.
 * children dapat berupa fungsi ({ id, describedBy }) => elemen agar id terhubung ke label.
 */
export function Field({ label, hint, error, className, labelClassName, children, action }) {
  const id = useId();
  const hintId = hint || error ? `${id}-hint` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <div className="flex items-center justify-between gap-2">
          <Label.Root htmlFor={id} className={cn("text-sm font-semibold text-fg-soft", labelClassName)}>
            {label}
          </Label.Root>
          {action}
        </div>
      ) : null}
      {typeof children === "function" ? children({ id, describedBy: hintId }) : children}
      {error ? (
        <p id={hintId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
