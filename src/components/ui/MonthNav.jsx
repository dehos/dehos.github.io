import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn.js";

/** Navigasi bulan: [<] Oktober 2026 [>]. */
export function MonthNav({ label, onPrev, onNext, prevDisabled, nextDisabled, className, ariaLabel = "Navigasi bulan" }) {
  const tombol =
    "inline-flex size-9 items-center justify-center rounded-lg text-fg-soft transition-colors hover:bg-primary-soft disabled:pointer-events-none disabled:opacity-40";
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("inline-flex items-center gap-1 rounded-xl border border-border bg-surface p-1", className)}
    >
      <button type="button" className={tombol} onClick={onPrev} disabled={prevDisabled} aria-label="Lihat bulan sebelumnya">
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>
      <strong className="min-w-[8.5rem] px-2 text-center text-sm font-bold text-fg" aria-live="polite" aria-atomic="true">
        {label}
      </strong>
      <button type="button" className={tombol} onClick={onNext} disabled={nextDisabled} aria-label="Lihat bulan berikutnya">
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
