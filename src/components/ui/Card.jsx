import { cn } from "../../lib/cn.js";

export function Card({ className, children, ...props }) {
  return (
    <section
      className={cn("rounded-[var(--radius-card)] border border-border bg-surface shadow-card", className)}
      {...props}
    >
      {children}
    </section>
  );
}

/** Kepala halaman/bagian: ikon + judul + deskripsi di kiri, aksi di kanan. */
export function SectionHeader({ icon: Icon, title, description, actions, as: Tag = "h2", className }) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {Icon ? (
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </span>
        ) : null}
        <div className="min-w-0">
          <Tag className="truncate text-base font-bold leading-tight text-fg">{title}</Tag>
          {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
