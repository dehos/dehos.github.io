import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "../../lib/cn.js";

const UKURAN = {
  sm: "max-w-[380px]",
  md: "max-w-[460px]",
  lg: "max-w-[640px]",
  xl: "max-w-[860px]"
};

/**
 * Dialog modal umum.
 * - busy: selama true dialog tidak bisa ditutup (tombol X, Esc, klik luar) — dipakai saat menyimpan.
 * - footer: elemen (biasanya tombol Batal/Simpan) di bawah.
 * - onSubmit: bila diberikan, isi dibungkus <form> sehingga Enter menyimpan.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  size = "md",
  busy = false,
  footer,
  onSubmit,
  children,
  className,
  hideClose = false
}) {
  const body = (
    <>
      <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      {footer ? (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border-soft bg-surface-2 px-5 py-3">
          {footer}
        </div>
      ) : null}
    </>
  );

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && busy) return;
        onOpenChange?.(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="animate-overlay-in fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-[2px]" />
        <Dialog.Content
          onPointerDownOutside={(event) => busy && event.preventDefault()}
          onEscapeKeyDown={(event) => busy && event.preventDefault()}
          className={cn(
            "animate-pop-in fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-24px)] w-[calc(100vw-24px)] -translate-x-1/2 -translate-y-1/2 flex-col",
            "overflow-hidden rounded-2xl border border-border bg-surface shadow-pop focus:outline-none",
            UKURAN[size],
            className
          )}
        >
          <div className="flex items-start gap-3 border-b border-border-soft px-5 py-4">
            {Icon ? (
              <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-base font-bold leading-6 text-fg">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-0.5 text-sm text-muted">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            {hideClose ? null : (
              <Dialog.Close
                disabled={busy}
                aria-label="Tutup"
                className="-mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-primary-soft hover:text-fg disabled:opacity-40"
              >
                <X className="size-4" aria-hidden="true" />
              </Dialog.Close>
            )}
          </div>
          {onSubmit ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                onSubmit(event);
              }}
              className="flex min-h-0 flex-1 flex-col"
            >
              {body}
            </form>
          ) : (
            body
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
