import { cn } from "../../lib/cn.js";

export function EmptyState({ icon: Icon, title, description, className, children }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-4 py-10 text-center", className)}>
      {Icon ? (
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Icon className="size-6" aria-hidden="true" />
        </span>
      ) : null}
      <p className="text-sm font-semibold text-fg-soft">{title}</p>
      {description ? <p className="max-w-sm text-sm text-muted">{description}</p> : null}
      {children}
    </div>
  );
}
