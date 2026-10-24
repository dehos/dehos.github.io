import { useEffect, useState } from "react";
import { Database } from "lucide-react";
import { ROUTES } from "../../routes.js";
import { useRoute } from "../../hooks/useRoute.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useDialogs } from "../ui/index.js";
import { AccountMenu } from "./AccountMenu.jsx";
import { StatusPill } from "./StatusPill.jsx";
import { PasswordDialog } from "../../features/auth/PasswordDialog.jsx";
import { cn } from "../../lib/cn.js";

function NavLinkItem({ route, active, onNavigate, variant }) {
  const Icon = route.icon;
  const href = `#${route.id}`;
  const klik = (event) => {
    // Biarkan klik dengan tombol modifier (tab baru) berjalan normal.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return;
    event.preventDefault();
    onNavigate(route.id);
  };

  if (variant === "mobile") {
    return (
      <a
        href={href}
        onClick={klik}
        aria-label={route.label}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-semibold transition-colors",
          active ? "bg-primary-soft text-primary" : "text-muted hover:text-fg-soft"
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
        <span className="max-w-full truncate">{route.mobileLabel}</span>
      </a>
    );
  }

  return (
    <a
      href={href}
      onClick={klik}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
        active
          ? "bg-primary text-primary-fg shadow-sm"
          : "text-sidebar-fg hover:bg-sidebar-hover"
      )}
    >
      <Icon className="size-[18px] shrink-0" aria-hidden="true" />
      <span className="truncate">{route.label}</span>
    </a>
  );
}

export function AppShell({ children }) {
  const [route, navigate] = useRoute();
  const { signOut } = useAuth();
  const { confirm } = useDialogs();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const aktif = ROUTES.find((item) => item.id === route) || ROUTES[0];

  useEffect(() => {
    document.title = `${aktif.title} · Stock Barang`;
  }, [aktif.title]);

  async function keluar() {
    const setuju = await confirm("Keluar dari aplikasi sekarang?", { title: "Keluar", confirmLabel: "Ya, Keluar" });
    if (setuju) await signOut();
  }

  const mobileRoutes = ROUTES.filter((item) => item.mobile);

  return (
    <div className="min-h-dvh bg-bg text-fg md:flex">
      <a
        href="#mainContent"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-fg"
      >
        Lewati ke konten utama
      </a>

      {/* Sidebar desktop */}
      <aside
        aria-label="Navigasi aplikasi"
        className="sticky top-0 hidden h-dvh w-[250px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex"
      >
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
          <img src="/logo.png" alt="Logo perusahaan" width="32" height="32" className="size-8 rounded-lg object-contain" />
          <div className="min-w-0 leading-tight">
            <h1 className="truncate text-base font-extrabold text-sidebar-fg [[data-theme=adminlte]_&]:text-white">
              Stock Barang
            </h1>
            <p className="truncate text-xs text-sidebar-fg/70">Rekap stok dan transaksi</p>
          </div>
        </div>
        <nav aria-label="Menu utama" className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {ROUTES.map((item) => (
            <NavLinkItem key={item.id} route={item} active={item.id === route} onNavigate={navigate} variant="desktop" />
          ))}
        </nav>
        <div className="m-3 flex items-center gap-2 rounded-lg border border-sidebar-border px-3 py-2.5 text-xs font-medium text-sidebar-fg/80">
          <Database className="size-4 shrink-0" aria-hidden="true" />
          <span>Data tersimpan aman</span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/logo.png" alt="" width="28" height="28" className="size-7 rounded-md object-contain md:hidden" />
            <div className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-primary">Solusi Rumah Idaman</span>
              <h2 aria-live="polite" aria-atomic="true" className="truncate text-lg font-extrabold leading-tight text-fg md:text-xl">
                {aktif.title}
              </h2>
              <p className="hidden truncate text-sm text-muted sm:block">{aktif.subtitle}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StatusPill className="hidden sm:inline-flex" />
            <AccountMenu onChangePassword={() => setPasswordOpen(true)} onSignOut={keluar} />
          </div>
        </header>

        <div className="px-4 pt-3 sm:hidden">
          <StatusPill />
        </div>

        <main id="mainContent" tabIndex={-1} className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-5 pb-28 focus:outline-none md:px-8 md:pb-10">
          {children}
        </main>

        <footer className="hidden border-t border-border px-8 py-4 text-xs text-muted md:flex md:items-center md:justify-between">
          <div>
            <strong className="text-fg-soft">D'house</strong>
            <span> · Solusi Rumah Idaman · Sistem rekap stok dan transaksi</span>
          </div>
          <small>© 2026 Tony. All rights reserved.</small>
        </footer>
      </div>

      {/* Navigasi mobile */}
      <nav
        aria-label="Navigasi mobile"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 flex gap-1 border-t border-border bg-surface/95 px-2 pt-1.5 pb-1.5 backdrop-blur md:hidden"
      >
        {mobileRoutes.map((item) => (
          <NavLinkItem key={item.id} route={item} active={item.id === route} onNavigate={navigate} variant="mobile" />
        ))}
      </nav>

      <PasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </div>
  );
}
