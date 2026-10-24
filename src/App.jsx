import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { DataProvider } from "./context/DataContext.jsx";
import { DialogsProvider, ToastProvider, LoadingBlock } from "./components/ui/index.js";
import { LoginScreen } from "./features/auth/LoginScreen.jsx";
import { AppShell } from "./components/layout/AppShell.jsx";
import { useRoute } from "./hooks/useRoute.js";

// Tiap halaman dimuat saat dibuka agar paket awal kecil (export Excel/PDF paling berat).
const DashboardPage = lazy(() => import("./features/dashboard/DashboardPage.jsx"));
const PenjualanPage = lazy(() => import("./features/penjualan/PenjualanPage.jsx"));
const StokPage = lazy(() => import("./features/stok/StokPage.jsx"));
const RekapStokPage = lazy(() => import("./features/rekap/RekapStokPage.jsx"));
const CatatanPage = lazy(() => import("./features/catatan/CatatanPage.jsx"));
const RiwayatPage = lazy(() => import("./features/riwayat/RiwayatPage.jsx"));

const PAGES = {
  dashboard: DashboardPage,
  penjualan: PenjualanPage,
  "stok-barang": StokPage,
  "rekap-stok": RekapStokPage,
  "catatan-penjualan": CatatanPage,
  "riwayat-transaksi": RiwayatPage
};

function Pages() {
  const [route] = useRoute();
  const Page = PAGES[route] || DashboardPage;
  return (
    <Suspense fallback={<LoadingBlock />}>
      <Page key={route} />
    </Suspense>
  );
}

function Gate() {
  const { status } = useAuth();

  if (status === "checking") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg text-muted" role="status">
        <Loader2 className="size-6 animate-spin" aria-hidden="true" />
        <span className="sr-only">Memeriksa sesi…</span>
      </div>
    );
  }

  if (status !== "ready") return <LoginScreen />;

  return (
    <DataProvider>
      <AppShell>
        <Pages />
      </AppShell>
    </DataProvider>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <DialogsProvider>
          <AuthProvider>
            <Gate />
          </AuthProvider>
        </DialogsProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
