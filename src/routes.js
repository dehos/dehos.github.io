import { LayoutDashboard, ShoppingBag, Boxes, Table2, NotebookText, ArrowLeftRight } from "lucide-react";

/** Daftar halaman. `id` = fragmen URL (#id) sehingga tautan lama tetap berlaku. */
export const ROUTES = [
  { id: "dashboard", label: "Dashboard", mobileLabel: "Dashboard", title: "Dashboard", subtitle: "Ringkasan stok dan aktivitas penjualan", icon: LayoutDashboard, mobile: true },
  { id: "penjualan", label: "Penjualan", mobileLabel: "Jual", title: "Penjualan", subtitle: "Catat transaksi penjualan baru", icon: ShoppingBag, mobile: true },
  { id: "stok-barang", label: "Stok Barang", mobileLabel: "Stok", title: "Stok Barang", subtitle: "Kelola persediaan dan pergerakan stok", icon: Boxes, mobile: true },
  { id: "rekap-stok", label: "Rekap Stok", mobileLabel: "Rekap", title: "Rekap Stok", subtitle: "Lihat stok harian seperti hasil export", icon: Table2, mobile: false },
  { id: "catatan-penjualan", label: "Catatan Penjualan", mobileLabel: "Catatan", title: "Catatan Penjualan", subtitle: "Lihat transaksi penjualan per bulan", icon: NotebookText, mobile: true },
  { id: "riwayat-transaksi", label: "Riwayat In/Out", mobileLabel: "In/Out", title: "Riwayat In/Out", subtitle: "Pantau seluruh pergerakan barang", icon: ArrowLeftRight, mobile: true }
];

export const ROUTE_IDS = ROUTES.map((route) => route.id);
export const DEFAULT_ROUTE = "dashboard";

export function routeFromHash(hash) {
  const id = String(hash || "").replace(/^#/, "");
  return ROUTE_IDS.includes(id) ? id : DEFAULT_ROUTE;
}
