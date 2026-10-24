import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AlertDialog } from "radix-ui";
import { CheckCircle2, Info, OctagonAlert, TriangleAlert, X } from "lucide-react";
import { Button } from "./Button.jsx";
import { cn } from "../../lib/cn.js";

/*
 * Pengganti showAppAlert / showAppConfirm.
 *   const { alert, confirm } = useDialogs();
 *   await alert("Pesan", { title, type: "info|success|error|warning", confirmLabel });
 *   const ok = await confirm("Hapus?", { title, type: "danger", confirmLabel, cancelLabel });
 * Keduanya mengembalikan Promise; alert selalu resolve true, confirm true/false.
 */

const DialogsContext = createContext(null);

const POLA_GALAT = /gagal|tidak valid|harus|tidak ditemukan|tidak mencukupi|melebihi|belum dimulai|tidak ada/i;

const TAMPILAN = {
  info: { Icon: Info, wadah: "bg-info-soft text-info" },
  success: { Icon: CheckCircle2, wadah: "bg-success-soft text-success" },
  error: { Icon: OctagonAlert, wadah: "bg-danger-soft text-danger" },
  danger: { Icon: TriangleAlert, wadah: "bg-danger-soft text-danger" },
  warning: { Icon: TriangleAlert, wadah: "bg-warning-soft text-warning" }
};

export function DialogsProvider({ children }) {
  const [antrean, setAntrean] = useState([]);
  const penyelesai = useRef(new Map());
  const counter = useRef(0);

  const buka = useCallback((konfigurasi) => {
    return new Promise((resolve) => {
      const id = ++counter.current;
      penyelesai.current.set(id, resolve);
      setAntrean((lama) => [...lama, { id, ...konfigurasi }]);
    });
  }, []);

  const selesai = useCallback((id, hasil) => {
    const resolve = penyelesai.current.get(id);
    penyelesai.current.delete(id);
    setAntrean((lama) => lama.filter((item) => item.id !== id));
    resolve?.(hasil);
  }, []);

  const api = useMemo(
    () => ({
      alert(message, options = {}) {
        const teks = String(message || "");
        const type = options.type || (POLA_GALAT.test(teks) ? "error" : "info");
        return buka({
          kind: "alert",
          title: options.title || (type === "error" ? "Terjadi Kendala" : "Perhatian"),
          message: teks,
          type,
          confirmLabel: options.confirmLabel || "Mengerti"
        });
      },
      confirm(message, options = {}) {
        return buka({
          kind: "confirm",
          title: options.title || "Konfirmasi",
          message: String(message || ""),
          type: options.type || "danger",
          confirmLabel: options.confirmLabel || "Ya, Lanjutkan",
          cancelLabel: options.cancelLabel || "Batal"
        });
      }
    }),
    [buka]
  );

  const aktif = antrean[0];

  return (
    <DialogsContext.Provider value={api}>
      {children}
      {aktif ? <DialogAktif key={aktif.id} dialog={aktif} onSelesai={selesai} /> : null}
    </DialogsContext.Provider>
  );
}

function DialogAktif({ dialog, onSelesai }) {
  const { Icon, wadah } = TAMPILAN[dialog.type] || TAMPILAN.info;
  const konfirmasi = dialog.kind === "confirm";
  const berbahaya = dialog.type === "danger" || dialog.type === "error";

  return (
    <AlertDialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onSelesai(dialog.id, konfirmasi ? false : true);
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="animate-overlay-in fixed inset-0 z-[80] bg-slate-900/50 backdrop-blur-[2px]" />
        <AlertDialog.Content className="animate-pop-in fixed left-1/2 top-1/2 z-[80] w-[calc(100vw-32px)] max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-5 shadow-pop focus:outline-none">
          <div className="flex items-start gap-3">
            <span className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-full", wadah)}>
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <AlertDialog.Title className="text-base font-bold text-fg">{dialog.title}</AlertDialog.Title>
              <AlertDialog.Description className="mt-1 whitespace-pre-line text-sm leading-relaxed text-fg-soft">
                {dialog.message}
              </AlertDialog.Description>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            {konfirmasi ? (
              <AlertDialog.Cancel asChild>
                <Button variant="secondary">
                  <X className="size-4" aria-hidden="true" />
                  {dialog.cancelLabel}
                </Button>
              </AlertDialog.Cancel>
            ) : null}
            <AlertDialog.Action asChild>
              <Button
                variant={konfirmasi && berbahaya ? "danger" : "primary"}
                onClick={() => onSelesai(dialog.id, true)}
              >
                {dialog.confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export function useDialogs() {
  const context = useContext(DialogsContext);
  if (!context) throw new Error("useDialogs harus dipakai di dalam <DialogsProvider>");
  return context;
}
