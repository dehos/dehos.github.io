import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Toast as RadixToast } from "radix-ui";
import { CheckCircle2, OctagonAlert } from "lucide-react";
import { cn } from "../../lib/cn.js";

/*
 * Pengganti showToast(message, type).
 *   const toast = useToast();
 *   toast("Tersimpan");              // sukses, 3 detik
 *   toast("Gagal menyimpan", "error"); // galat, 4 detik
 */

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [daftar, setDaftar] = useState([]);
  const counter = useRef(0);

  const toast = useCallback((message, type = "success") => {
    const teks = String(message || "").trim();
    if (!teks) return;
    const id = ++counter.current;
    setDaftar((lama) => [...lama.slice(-2), { id, teks, type }]);
  }, []);

  const hapus = useCallback((id) => {
    setDaftar((lama) => lama.filter((item) => item.id !== id));
  }, []);

  const api = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={api}>
      <RadixToast.Provider swipeDirection="down" label="Notifikasi">
        {children}
        {daftar.map((item) => {
          const galat = item.type === "error";
          const Icon = galat ? OctagonAlert : CheckCircle2;
          return (
            <RadixToast.Root
              key={item.id}
              type={galat ? "foreground" : "background"}
              duration={galat ? 4000 : 3000}
              onOpenChange={(open) => {
                if (!open) hapus(item.id);
              }}
              className={cn(
                "animate-toast-in flex items-center gap-3 rounded-xl border bg-surface px-4 py-3 shadow-pop",
                galat ? "border-danger/40" : "border-success/30"
              )}
            >
              <Icon
                className={cn("size-5 shrink-0", galat ? "text-danger" : "text-success")}
                aria-hidden="true"
              />
              <RadixToast.Description className="text-sm font-medium text-fg">{item.teks}</RadixToast.Description>
            </RadixToast.Root>
          );
        })}
        <RadixToast.Viewport className="fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[90] mx-auto flex w-[calc(100vw-24px)] max-w-[420px] list-none flex-col gap-2 outline-none md:bottom-6" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast harus dipakai di dalam <ToastProvider>");
  return context;
}
