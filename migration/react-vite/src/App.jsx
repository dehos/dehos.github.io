import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase.js";
import { calculateStockBalance } from "./lib/stock-balance.js";
import { normalizeBrandTargets } from "./lib/brand-targets.js";
import { serializeCsv } from "./lib/csv-export.js";
import { safeWriteErrorMessage } from "./lib/safe-write-error.js";
import { paginateItems } from "./lib/pagination.js";
import { matchesStockTransactionSearch } from "./lib/stock-search.js";
import { buildEditSaleParams, buildDeleteSaleParams } from "./lib/sale-edit.js";
import {
  Boxes, ChartNoAxesCombined, ShoppingCart, Package, ArrowDownUp,
  RefreshCw, AlertTriangle, CircleCheck, Database, CalendarDays,
  TrendingUp, ChevronDown, ExternalLink, Settings2
} from "lucide-react";

const formatNumber = (value) => (Number(value) || 0).toLocaleString("id-ID");
const formatMoney = (value) => new Intl.NumberFormat("id-ID", {
  style: "currency", currency: "IDR", maximumFractionDigits: 0,
}).format(Number(value) || 0);
const localDateKey = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, "0"),
  String(date.getDate()).padStart(2, "0"),
].join("-");
const todayKey = () => localDateKey(new Date());
const daysAgoKey = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return localDateKey(date);
};
const dateLabel = (value, options = { day: "numeric", month: "short" }) => {
  if (!value) return "—";
  const parts = String(value).slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some((part) => !part)) return "—";
  return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString("id-ID", options);
};
const salesValue = (item) => (Number(item.qty) || 0) * (Number(item.harga) || 0);

async function fetchAll(queryFactory, pageSize = 1000) {
  const rows = [];
  for (let start = 0; ; start += pageSize) {
    const { data, error } = await queryFactory(start, start + pageSize - 1);
    if (error) throw error;
    const page = data || [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

function stockForToday(item, transactions, today) {
  const created = String(item.tanggal_mulai || item.created_at || "").slice(0, 10);
  if (created && created > today) return 0;
  let stock = Number(item.stok_awal) || 0;
  for (const transaction of transactions) {
    if (Number(transaction.barang_id) !== Number(item.id)) continue;
    if (transaction.tanggal && String(transaction.tanggal).slice(0, 10) > today) continue;
    const type = String(transaction.type || "").toLowerCase();
    const qty = Number(transaction.qty) || 0;
    if (type === "masuk" || type === "adjust_masuk") stock += qty;
    if (type === "laku" || type === "adjust_keluar") stock -= qty;
    if (type === "adjust") stock += qty;
  }
  return stock;
}

function StatCard({ icon: Icon, label, value, hint, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`rounded-xl p-2 ${tones[tone] || tones.slate}`}><Icon size={18} /></span>
    </div>
    <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{value}</p>
    <p className="mt-1 text-xs text-slate-500">{hint}</p>
  </article>;
}

function SalesChart({ sales, period, setPeriod }) {
  const chart = useMemo(() => {
    const end = new Date();
    const count = period;
    const dates = Array.from({ length: count }, (_, index) => {
      const date = new Date(end.getFullYear(), end.getMonth(), end.getDate() - count + 1 + index);
      return { key: localDateKey(date), label: date.toLocaleDateString("id-ID", period === 7 ? { weekday: "short" } : { day: "numeric", month: "short" }) };
    });
    const totals = new Map(dates.map((date) => [date.key, 0]));
    sales.forEach((sale) => {
      const key = String(sale.tanggal_pembelian || "").slice(0, 10);
      if (totals.has(key)) totals.set(key, totals.get(key) + salesValue(sale));
    });
    const values = dates.map((date) => totals.get(date.key) || 0);
    const max = Math.max(1, ...values);
    const points = values.map((value, index) => ({
      x: dates.length > 1 ? (index / (dates.length - 1)) * 600 : 300,
      y: 154 - (value / max) * 132,
    }));
    const path = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
    return { dates, values, points, path, total: values.reduce((sum, value) => sum + value, 0) };
  }, [sales, period]);

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="flex items-center gap-2"><ChartNoAxesCombined size={19} className="text-slate-700" /><h2 className="font-semibold">Ringkasan Penjualan</h2></div><p className="mt-1 text-sm text-slate-500">Omzet harian dari data penjualan</p></div>
      <select aria-label="Periode grafik penjualan" value={period} onChange={(event) => setPeriod(Number(event.target.value))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400">
        <option value={7}>7 hari terakhir</option><option value={30}>30 hari terakhir</option>
      </select>
    </div>
    <div className="mt-5"><p className="text-2xl font-semibold">{formatMoney(chart.total)}</p><p className="mt-1 text-xs text-slate-500">Total periode yang ditampilkan</p></div>
    <div className="mt-4 w-full">
      <svg viewBox="0 0 600 170" role="img" aria-label={`Grafik omzet ${period} hari terakhir`} className="h-44 w-full overflow-visible">
        {[22, 55, 88, 121, 154].map((y) => <line key={y} x1="0" x2="600" y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 5" />)}
        <path d={chart.path} fill="none" stroke="#334155" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {chart.points.length > 0 && <circle cx={chart.points[chart.points.length - 1].x} cy={chart.points[chart.points.length - 1].y} r="3.5" fill="#334155" />}
      </svg>
      <div className="mt-1 flex justify-between gap-1 text-[11px] text-slate-500">
        {chart.dates.filter((_, index) => period === 7 || index === 0 || index === period - 1 || index % 5 === 0).map((date) => <span key={date.key}>{date.label}</span>)}
      </div>
    </div>
  </section>;
}

function LoadingPanel({ message }) {
  return <div className="flex min-h-24 items-center gap-3 rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-500"><RefreshCw size={16} className="animate-spin" />{message}</div>;
}


function PaginationControls({ pagination, onPageChange, label }) {
  if (pagination.pageCount <= 1) return null;
  return <nav aria-label={label} className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
    <span>Menampilkan {pagination.start}–{pagination.end} dari {pagination.total} catatan</span>
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onPageChange(pagination.page - 1)} disabled={pagination.page <= 1} className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium disabled:cursor-not-allowed disabled:opacity-40">Sebelumnya</button>
      <span aria-live="polite">Halaman {pagination.page} dari {pagination.pageCount}</span>
      <button type="button" onClick={() => onPageChange(pagination.page + 1)} disabled={pagination.page >= pagination.pageCount} className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium disabled:cursor-not-allowed disabled:opacity-40">Berikutnya</button>
    </div>
  </nav>;
}

function SalesPage({ onSaved, onBack }) {
  const [items, setItems] = useState([]);
  const [goods, setGoods] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [month, setMonth] = useState(todayKey().slice(0, 7));
  const [brandFilter, setBrandFilter] = useState("");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(todayKey());
  const [barangId, setBarangId] = useState("");
  const [qty, setQty] = useState("1");
  const [harga, setHarga] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [salesPage, setSalesPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ qty: "", harga: "", tanggal: "" });
  const [busyId, setBusyId] = useState(null);

  async function loadSales() {
    if (!supabase) {
      setStatus("config");
      setError("Koneksi Supabase belum dikonfigurasi.");
      return;
    }
    setStatus("loading");
    setError("");
    try {
      const [salesRows, goodsResult] = await Promise.all([
        fetchAll((start, end) => {
          let query = supabase.from("penjualan").select("id, barang_id, brand, qty, harga, tanggal_pembelian")
            .order("tanggal_pembelian", { ascending: false }).order("id", { ascending: false });
          if (/^\d{4}-\d{2}$/.test(month)) {
            const [year, monthNumber] = month.split("-").map(Number);
            const nextMonth = new Date(year, monthNumber, 1);
            const nextKey = localDateKey(nextMonth);
            query = query.gte("tanggal_pembelian", month + "-01").lt("tanggal_pembelian", nextKey);
          }
          return query.range(start, end);
        }),
        fetchAll((start, end) => supabase.from("barang")
          .select("id, nama, stok_awal, created_at, tanggal_mulai, brand:brand!barang_brand_id_fkey(id, nama, aktif)")
          .order("nama", { ascending: true }).order("id", { ascending: true }).range(start, end)),
      ]);
      setItems(salesRows);
      setGoods(goodsResult.filter((item) => item.brand?.nama && item.brand?.aktif !== false));
      setStatus("ready");
    } catch (loadError) {
      console.error("DEHOS sales page load error:", loadError);
      setError("Data penjualan gagal dimuat. Periksa izin baca Supabase dan struktur tabel.");
      setStatus("error");
    }
  }

  useEffect(() => { void loadSales(); }, [month]);
  useEffect(() => { setSalesPage(1); }, [month, brandFilter, search]);

  const brands = useMemo(() => [...new Set(items.map((item) => item.brand).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "id")), [items]);
  const visibleItems = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("id-ID");
    return items.filter((item) => {
      const good = goods.find((row) => Number(row.id) === Number(item.barang_id));
      return (!brandFilter || item.brand === brandFilter) &&
        (!term || String(good?.nama || "").toLocaleLowerCase("id-ID").includes(term) ||
          String(item.brand || "").toLocaleLowerCase("id-ID").includes(term));
    });
  }, [items, goods, brandFilter, search]);
  const salesPageRows = useMemo(() => paginateItems(visibleItems, salesPage, 25), [visibleItems, salesPage]);
  const selectedGood = goods.find((item) => String(item.id) === barangId);
  const parsedQty = Number(qty);
  const parsedPrice = Number(harga);
  const validSale = Boolean(selectedGood?.brand?.nama) && Number.isInteger(parsedQty) && parsedQty > 0 &&
    Number.isFinite(parsedPrice) && parsedPrice >= 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);

  async function submitSale(event) {
    event.preventDefault();
    if (!supabase || saving || !validSale) return;
    const total = parsedQty * parsedPrice;
    const confirmed = window.confirm(
      "Catat penjualan ini?\n\nBarang: " + selectedGood.nama +
      "\nBrand: " + selectedGood.brand.nama +
      "\nQuantity: " + formatNumber(parsedQty) +
      "\nTotal: " + formatMoney(total) +
      "\n\nStok dan pre-order akan dihitung oleh proses database yang sudah digunakan aplikasi lama."
    );
    if (!confirmed) return;
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const { data: result, error: saveError } = await supabase.rpc("catat_penjualan_atomic", {
        p_barang_id: Number(barangId),
        p_brand: selectedGood.brand.nama,
        p_qty: parsedQty,
        p_harga: parsedPrice,
        p_tanggal_pembelian: date,
      });
      if (saveError) throw saveError;
      setNotice(Number(result?.preorder_setelah) > 0
        ? "Penjualan tersimpan. Pre-order setelah transaksi: " + formatNumber(Number(result.preorder_setelah)) + " unit."
        : "Penjualan berhasil dicatat.");
      setBarangId("");
      setQty("1");
      setHarga("");
      await loadSales();
      if (onSaved) onSaved();
    } catch (saveError) {
      console.error("DEHOS save sale error:", saveError);
      setError("Penjualan gagal disimpan: " + safeWriteErrorMessage(saveError, "Silakan coba lagi."));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item) {
    if (busyId !== null) return;
    setNotice("");
    setError("");
    setEditing(item);
    setEditForm({ qty: String(item.qty ?? ""), harga: String(item.harga ?? ""), tanggal: String(item.tanggal_pembelian || "").slice(0, 10) });
  }

  async function submitEdit(event) {
    event.preventDefault();
    if (!supabase || busyId !== null || !editing) return;
    const built = buildEditSaleParams(editing, editForm);
    if (!built.ok) { setError(built.reason); return; }
    if (!built.changed) { setNotice("Tidak ada perubahan untuk disimpan."); setEditing(null); return; }
    const good = goods.find((row) => Number(row.id) === Number(editing.barang_id));
    const confirmed = window.confirm(
      "Simpan perubahan penjualan ini?\n\nBarang: " + (good?.nama || ("Barang #" + editing.barang_id)) +
      "\nQuantity: " + formatNumber(editing.qty) + " -> " + formatNumber(built.params.p_qty) +
      "\nTotal: " + formatMoney(built.params.p_qty * built.params.p_harga) +
      "\n\nStok dan pre-order dihitung ulang oleh proses database."
    );
    if (!confirmed) return;
    setBusyId(editing.id);
    setNotice("");
    setError("");
    try {
      const { data: result, error: saveError } = await supabase.rpc("edit_penjualan_atomic", built.params);
      if (saveError) throw saveError;
      setNotice(Number(result?.preorder_after) > 0
        ? "Penjualan diperbarui. Pre-order setelah perubahan: " + formatNumber(Number(result.preorder_after)) + " unit."
        : "Penjualan berhasil diperbarui.");
      setEditing(null);
      await loadSales();
      if (onSaved) onSaved();
    } catch (saveError) {
      console.error("DEHOS edit sale error:", saveError);
      setError("Penjualan gagal diperbarui: " + safeWriteErrorMessage(saveError, "Silakan muat ulang dan coba lagi."));
    } finally {
      setBusyId(null);
    }
  }

  async function deleteSale(item) {
    if (!supabase || busyId !== null) return;
    const built = buildDeleteSaleParams(item);
    if (!built.ok) { setError(built.reason); return; }
    const good = goods.find((row) => Number(row.id) === Number(item.barang_id));
    const confirmed = window.confirm(
      "Hapus penjualan ini?\n\nBarang: " + (good?.nama || ("Barang #" + item.barang_id)) +
      "\nQuantity: " + formatNumber(item.qty) + "\nTotal: " + formatMoney(salesValue(item)) +
      "\n\nCatatan penjualan dan transaksi stok terkait akan dihapus, sehingga stok dikembalikan. Tindakan ini tidak dapat dibatalkan."
    );
    if (!confirmed) return;
    setBusyId(item.id);
    setNotice("");
    setError("");
    try {
      const { error: deleteError } = await supabase.rpc("hapus_penjualan_atomic", built.params);
      if (deleteError) throw deleteError;
      setNotice("Penjualan berhasil dihapus dan stok dikembalikan.");
      if (editing && editing.id === item.id) setEditing(null);
      await loadSales();
      if (onSaved) onSaved();
    } catch (deleteError) {
      console.error("DEHOS delete sale error:", deleteError);
      setError("Penjualan gagal dihapus: " + safeWriteErrorMessage(deleteError, "Silakan muat ulang dan coba lagi."));
    } finally {
      setBusyId(null);
    }
  }

  function exportCsv() {
    const rows = [
      ["Tanggal", "Nama Barang", "Brand", "Quantity", "Harga", "Total"],
      ...visibleItems.map((item) => {
        const good = goods.find((row) => Number(row.id) === Number(item.barang_id));
        return [String(item.tanggal_pembelian || "").slice(0, 10), good?.nama || ("Barang #" + item.barang_id),
          item.brand || "", item.qty, item.harga, salesValue(item)];
      }),
    ];
    const csv = serializeCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "dehos-penjualan-" + month + ".csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
      <div><p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Workspace / DEHOS</p><h1 className="mt-1 text-xl font-semibold tracking-tight">Penjualan</h1><p className="mt-1 text-sm text-slate-500">Pencatatan penjualan dan riwayat transaksi</p></div>
      <div className="flex gap-2"><button type="button" onClick={onBack} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50">Dashboard</button><button type="button" onClick={() => void loadSales()} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50">Muat ulang</button><button type="button" onClick={exportCsv} disabled={status !== "ready" || visibleItems.length === 0} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40">Ekspor CSV</button></div>
    </header>
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
      {(error || status === "config") && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="mb-5"><h2 className="font-semibold">Catat penjualan</h2><p className="mt-1 text-sm text-slate-500">Penyimpanan memakai RPC atomik aplikasi lama agar pengurangan stok dan pre-order tetap mengikuti aturan database.</p></div>
        <form onSubmit={submitSale} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <label className="grid gap-1.5 text-sm font-medium">Tanggal pembelian<input type="date" value={date} onChange={(event) => setDate(event.target.value)} required className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-slate-500"/></label>
          <label className="grid gap-1.5 text-sm font-medium">Nama barang<select value={barangId} onChange={(event) => setBarangId(event.target.value)} required className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-slate-500"><option value="">Pilih barang...</option>{goods.map((item) => <option key={item.id} value={item.id}>{item.nama} · {item.brand?.nama}</option>)}</select></label>
          <label className="grid gap-1.5 text-sm font-medium">Brand<input readOnly value={selectedGood?.brand?.nama || ""} placeholder="Otomatis dari barang" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 font-normal"/></label>
          <label className="grid gap-1.5 text-sm font-medium">Quantity<input type="number" min="1" step="1" inputMode="numeric" value={qty} onChange={(event) => setQty(event.target.value)} required className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-slate-500"/></label>
          <label className="grid gap-1.5 text-sm font-medium">Harga per unit (Rp)<input type="number" min="0" step="1" inputMode="numeric" value={harga} onChange={(event) => setHarga(event.target.value)} required placeholder="Masukkan harga" className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-slate-500"/></label>
          <div className="flex flex-col justify-end rounded-xl bg-slate-50 p-3"><span className="text-xs text-slate-500">Total penjualan</span><strong className="mt-1 text-lg">{formatMoney(validSale ? parsedQty * parsedPrice : 0)}</strong></div>
          <div className="sm:col-span-2 xl:col-span-3 flex justify-end"><button type="submit" disabled={!validSale || saving || status === "loading"} className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{saving ? "Menyimpan..." : "Catat penjualan"}</button></div>
        </form>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Riwayat penjualan</h2><p className="mt-1 text-sm text-slate-500">{status === "ready" ? formatNumber(visibleItems.length) + " catatan ditampilkan" : "Memuat catatan..."}</p></div><div className="grid w-full gap-2 sm:w-auto sm:grid-cols-3">
          <label className="grid gap-1 text-xs text-slate-500">Bulan<input type="month" value={month} onChange={(event) => setMonth(event.target.value || todayKey().slice(0, 7))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"/></label>
          <label className="grid gap-1 text-xs text-slate-500">Brand<select value={brandFilter} onChange={(event) => setBrandFilter(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"><option value="">Semua brand</option>{brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}</select></label>
          <label className="grid gap-1 text-xs text-slate-500">Cari barang<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nama barang..." className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"/></label>
        </div></div>
        {editing && <form onSubmit={submitEdit} className="mt-5 grid gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ubah penjualan">
          <div className="sm:col-span-2 xl:col-span-4 text-sm"><strong>Ubah penjualan #{editing.id}</strong><span className="ml-2 text-slate-600">{(goods.find((row) => Number(row.id) === Number(editing.barang_id))?.nama) || ("Barang #" + editing.barang_id)} · {editing.brand || "—"} (barang dan brand tidak dapat diubah dari sini)</span></div>
          <label className="grid gap-1.5 text-sm font-medium">Tanggal pembelian<input type="date" value={editForm.tanggal} onChange={(event) => setEditForm({ ...editForm, tanggal: event.target.value })} required className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-slate-500"/></label>
          <label className="grid gap-1.5 text-sm font-medium">Quantity<input type="number" min="1" step="1" inputMode="numeric" value={editForm.qty} onChange={(event) => setEditForm({ ...editForm, qty: event.target.value })} required className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-slate-500"/></label>
          <label className="grid gap-1.5 text-sm font-medium">Harga per unit (Rp)<input type="number" min="0" step="1" inputMode="numeric" value={editForm.harga} onChange={(event) => setEditForm({ ...editForm, harga: event.target.value })} required className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-slate-500"/></label>
          <div className="flex items-end justify-end gap-2"><button type="button" onClick={() => setEditing(null)} disabled={busyId !== null} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium disabled:opacity-40">Batal</button><button type="submit" disabled={busyId !== null} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{busyId === editing.id ? "Menyimpan..." : "Simpan perubahan"}</button></div>
        </form>}
        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">Nama Barang</th><th className="px-4 py-3">Brand</th><th className="px-4 py-3 text-right">Quantity</th><th className="px-4 py-3 text-right">Harga</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{status === "loading" ? <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-500">Memuat riwayat penjualan...</td></tr> : visibleItems.length ? salesPageRows.items.map((item) => { const good = goods.find((row) => Number(row.id) === Number(item.barang_id)); return <tr key={item.id}><td className="whitespace-nowrap px-4 py-3">{dateLabel(item.tanggal_pembelian, { day: "2-digit", month: "2-digit", year: "2-digit" })}</td><td className="px-4 py-3 font-medium">{good?.nama || ("Barang #" + item.barang_id)}</td><td className="px-4 py-3">{item.brand || "—"}</td><td className="px-4 py-3 text-right tabular-nums">{formatNumber(item.qty)}</td><td className="px-4 py-3 text-right tabular-nums">{formatMoney(item.harga)}</td><td className="px-4 py-3 text-right font-medium tabular-nums">{formatMoney(salesValue(item))}</td><td className="whitespace-nowrap px-4 py-3 text-right"><button type="button" onClick={() => startEdit(item)} disabled={busyId !== null} className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-40" aria-label={"Ubah penjualan " + item.id}>Ubah</button><button type="button" onClick={() => void deleteSale(item)} disabled={busyId !== null} className="ml-2 rounded-md border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-40" aria-label={"Hapus penjualan " + item.id}>{busyId === item.id ? "..." : "Hapus"}</button></td></tr>; }) : <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-500">Tidak ada catatan untuk filter ini.</td></tr>}</tbody>
          </table>
        </div>
        <PaginationControls pagination={salesPageRows} onPageChange={setSalesPage} label="Halaman riwayat penjualan" />
        <p className="mt-3 text-xs text-slate-400">Riwayat lama tetap dibaca dari Supabase. Ekspor Excel/PDF belum termasuk tahap ini.</p>
      </section>
      <footer className="border-t border-slate-200 py-4 text-xs text-slate-400">DEHOS · Modul Penjualan migrasi React · terpisah dari website produksi</footer>
    </div>
  </main>;
}




function StockPage({ onBack, onSaved }) {
  const [goods, setGoods] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(todayKey().slice(0, 7));
  const [barangId, setBarangId] = useState("");
  const [type, setType] = useState("masuk");
  const [date, setDate] = useState(todayKey());
  const [qty, setQty] = useState("1");
  const [saving, setSaving] = useState(false);
  const [goodsPage, setGoodsPage] = useState(1);
  const [transactionsPage, setTransactionsPage] = useState(1);

  async function loadStock() {
    if (!supabase) {
      setStatus("config");
      setError("Koneksi Supabase belum dikonfigurasi.");
      return;
    }
    setStatus("loading");
    setError("");
    try {
      const [goodsRows, transactionRows] = await Promise.all([
        fetchAll((start, end) => supabase.from("barang")
          .select("id, nama, stok_awal, created_at, tanggal_mulai, brand:brand!barang_brand_id_fkey(id, nama, aktif)")
          .order("nama", { ascending: true }).order("id", { ascending: true }).range(start, end)),
        fetchAll((start, end) => supabase.from("transaksi")
          .select("id, barang_id, tanggal, type, qty, created_at, penjualan_id")
          .order("tanggal", { ascending: true }).order("id", { ascending: true }).range(start, end)),
      ]);
      setGoods(goodsRows.filter((item) => item.brand?.nama && item.brand?.aktif !== false));
      setTransactions(transactionRows);
      setStatus("ready");
    } catch (loadError) {
      console.error("DEHOS stock page load error:", loadError);
      setError("Data stok/riwayat gagal dimuat. Periksa izin baca Supabase dan struktur tabel.");
      setStatus("error");
    }
  }

  useEffect(() => { void loadStock(); }, []);
  const selectedGood = goods.find((item) => String(item.id) === barangId);
  const currentBalance = selectedGood ? calculateStockBalance(selectedGood, transactions, date) : null;
  const parsedQty = Number(qty);
  const validQty = Number.isInteger(parsedQty) && (type === "adjust" ? parsedQty >= 0 : parsedQty >= 1);
  const canSave = status === "ready" && Boolean(selectedGood) && validQty && /^\d{4}-\d{2}-\d{2}$/.test(date) && !saving &&
    !(type === "adjust" && currentBalance === parsedQty) &&
    !(type === "laku" && parsedQty > Math.max(0, currentBalance ?? 0));

  const visibleGoods = goods.filter((item) => {
    const term = search.trim().toLocaleLowerCase("id-ID");
    return !term || String(item.nama || "").toLocaleLowerCase("id-ID").includes(term) ||
      String(item.brand?.nama || "").toLocaleLowerCase("id-ID").includes(term);
  });
  const visibleTransactions = transactions.filter((row) => {
    const monthMatch = !/^\d{4}-\d{2}$/.test(month) || String(row.tanggal || "").slice(0, 7) === month;
    const good = goods.find((item) => Number(item.id) === Number(row.barang_id));
    const term = search.trim().toLocaleLowerCase("id-ID");
    return monthMatch && matchesStockTransactionSearch(row, good, term);
  }).slice().reverse();
  const goodsPageRows = useMemo(() => paginateItems(visibleGoods, goodsPage, 25), [visibleGoods, goodsPage]);
  const transactionPageRows = useMemo(() => paginateItems(visibleTransactions, transactionsPage, 25), [visibleTransactions, transactionsPage]);
  useEffect(() => { setGoodsPage(1); setTransactionsPage(1); }, [search, month]);

  async function submitTransaction(event) {
    event.preventDefault();
    if (!supabase || !canSave) return;
    const actionName = type === "masuk" ? "Barang masuk" : type === "laku" ? "Barang keluar" : "Adjust stok";
    const summary = type === "adjust"
      ? "Stok tercatat: " + formatNumber(currentBalance) + " unit. Stok fisik baru: " + formatNumber(parsedQty) + " unit."
      : actionName + ": " + formatNumber(parsedQty) + " unit.";
    if (!window.confirm("Konfirmasi " + actionName.toLocaleLowerCase("id-ID") + "?\n\nBarang: " + selectedGood.nama +
      "\n" + summary + "\nTanggal: " + date +
      "\n\nTransaksi akan disimpan melalui proses atomik database yang sudah digunakan aplikasi lama.")) return;

    setSaving(true);
    setError("");
    setNotice("");
    try {
      const { error: saveError } = await supabase.rpc("catat_transaksi_stok_atomic", {
        p_barang_id: Number(barangId),
        p_tanggal: date,
        p_type: type,
        p_qty: parsedQty,
        p_expected_stock: currentBalance,
      });
      if (saveError) throw saveError;
      setNotice(actionName + " berhasil dicatat.");
      setQty(type === "adjust" ? String(parsedQty) : "1");
      await loadStock();
      if (onSaved) onSaved();
    } catch (saveError) {
      console.error("DEHOS stock transaction error:", saveError);
      setError("Transaksi gagal disimpan: " + safeWriteErrorMessage(saveError, "Silakan muat ulang dan periksa stok."));
    } finally {
      setSaving(false);
    }
  }

  function downloadCsv(rows, filename) {
    const csv = serializeCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportStockCsv() {
    const rows = [
      ["ID Barang", "Nama Barang", "Brand", "Stok Awal", "Stok Saat Ini", "Status"],
      ...visibleGoods.map((item) => {
        const balance = calculateStockBalance(item, transactions, todayKey());
        return [item.id, item.nama || "", item.brand?.nama || "", Number(item.stok_awal) || 0,
          balance, balance < 0 ? "Minus / PO" : balance === 0 ? "Habis" : "Tersedia"];
      }),
    ];
    downloadCsv(rows, "dehos-stok-" + todayKey() + ".csv");
  }

  function exportStockHistoryCsv() {
    const rows = [
      ["ID Transaksi", "Tanggal", "ID Barang", "Nama Barang", "Jenis", "Quantity", "Sumber"],
      ...visibleTransactions.map((row) => {
        const item = goods.find((good) => Number(good.id) === Number(row.barang_id));
        return [row.id, String(row.tanggal || "").slice(0, 10), row.barang_id,
          item?.nama || ("Barang #" + row.barang_id), typeLabel(row.type), Number(row.qty) || 0,
          row.penjualan_id ? "Penjualan" : row.type === "laku" ? "Keluar manual" : "Manual"];
      }),
    ];
    downloadCsv(rows, "dehos-riwayat-stok-" + month + ".csv");
  }

  const typeLabel = (value) => value === "masuk" ? "Masuk" : value === "laku" ? "Keluar (penjualan)" :
    value === "adjust" || value === "adjust_masuk" || value === "adjust_keluar" ? "Adjust" : value || "—";

  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
      <div><p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Workspace / DEHOS</p><h1 className="mt-1 text-xl font-semibold tracking-tight">Stock & In Out</h1><p className="mt-1 text-sm text-slate-500">Saldo stok, barang masuk/keluar, penyesuaian, dan riwayat</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={onBack} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50">Dashboard</button><button type="button" onClick={() => void loadStock()} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50">Muat ulang</button><button type="button" onClick={exportStockCsv} disabled={status !== "ready" || visibleGoods.length === 0} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40">Ekspor stok CSV</button><button type="button" onClick={exportStockHistoryCsv} disabled={status !== "ready" || visibleTransactions.length === 0} className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-40">Ekspor riwayat CSV</button></div>
    </header>
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="mb-5"><h2 className="font-semibold">Catat In / Out / Adjust</h2><p className="mt-1 text-sm text-slate-500">Stok dihitung dari stok awal dan riwayat transaksi sampai tanggal yang dipilih. Penjualan lebih dari stok tetap mengikuti aturan pre-order pada modul Penjualan.</p></div>
        <form onSubmit={submitTransaction} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <label className="grid gap-1.5 text-sm font-medium">Jenis transaksi<select value={type} onChange={(event) => { const nextType = event.target.value; setType(nextType); if (nextType !== "masuk") setDate(todayKey()); setQty(nextType === "adjust" && currentBalance !== null ? String(Math.max(0, currentBalance)) : "1"); }} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"><option value="masuk">Barang masuk</option><option value="laku">Barang keluar</option><option value="adjust">Adjust stok fisik</option></select></label>
          {type === "masuk" ? <label className="grid gap-1.5 text-sm font-medium">Tanggal barang masuk<input type="date" value={date} onChange={(event) => setDate(event.target.value)} required className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal"/></label> : <div className="rounded-xl bg-slate-50 p-3"><span className="text-xs text-slate-500">Tanggal transaksi</span><p className="mt-1 text-sm font-medium">{dateLabel(todayKey(), { day: "2-digit", month: "2-digit", year: "numeric" })} (hari ini)</p></div>}
          <label className="grid gap-1.5 text-sm font-medium">Nama barang<select value={barangId} onChange={(event) => { setBarangId(event.target.value); if (type === "adjust") { const item = goods.find((row) => String(row.id) === event.target.value); setQty(item ? String(Math.max(0, calculateStockBalance(item, transactions, date))) : "0"); } }} required className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"><option value="">Pilih barang...</option>{goods.map((item) => <option key={item.id} value={item.id}>{item.nama} · {item.brand?.nama}</option>)}</select></label>
          <label className="grid gap-1.5 text-sm font-medium">{type === "adjust" ? "Stok fisik yang benar" : "Quantity"}<input type="number" min={type === "adjust" ? "0" : "1"} step="1" inputMode="numeric" value={qty} onChange={(event) => setQty(event.target.value)} required className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal"/></label>
          <div className="rounded-xl bg-slate-50 p-3"><span className="text-xs text-slate-500">Saldo stok pada tanggal transaksi</span><p className={"mt-1 text-lg font-semibold " + (currentBalance !== null && currentBalance < 0 ? "text-rose-700" : "text-slate-900")}>{currentBalance === null ? "Pilih barang" : formatNumber(currentBalance) + " unit"}</p><p className="mt-1 text-xs text-slate-500">Saldo sebelum transaksi baru disimpan.</p></div>
          <div className="flex items-end"><button type="submit" disabled={!canSave} className="w-full rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{saving ? "Menyimpan..." : "Simpan transaksi"}</button></div>
        </form>
        {type === "laku" && selectedGood && parsedQty > Math.max(0, currentBalance ?? 0) && <p className="mt-3 text-sm text-rose-700">Jumlah keluar melebihi stok tersedia. Untuk penjualan yang menimbulkan pre-order, gunakan halaman Penjualan.</p>}
        {type === "adjust" && selectedGood && currentBalance === parsedQty && <p className="mt-3 text-sm text-amber-700">Stok sudah sesuai; tidak ada perubahan yang perlu dicatat.</p>}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-semibold">Daftar stok</h2><p className="mt-1 text-sm text-slate-500">{status === "ready" ? formatNumber(visibleGoods.length) + " barang" : "Memuat data..."}</p></div><label className="grid gap-1 text-xs text-slate-500">Cari barang / brand<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ketik nama barang..." className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"/></label></div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Nama Barang</th><th className="px-4 py-3">Brand</th><th className="px-4 py-3 text-right">Stok Awal</th><th className="px-4 py-3 text-right">Stok Saat Ini</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{status === "loading" ? <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">Memuat stok...</td></tr> : status !== "ready" ? <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">Data stok belum tersedia.</td></tr> : visibleGoods.length ? goodsPageRows.items.map((item) => { const balance = calculateStockBalance(item, transactions, todayKey()); return <tr key={item.id}><td className="px-4 py-3 font-medium">{item.nama}</td><td className="px-4 py-3">{item.brand?.nama || "—"}</td><td className="px-4 py-3 text-right tabular-nums">{formatNumber(item.stok_awal)}</td><td className={"px-4 py-3 text-right font-semibold tabular-nums " + (balance < 0 ? "text-rose-700" : "text-slate-900")}>{formatNumber(balance)}</td><td className="px-4 py-3">{balance < 0 ? <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">Minus / PO</span> : balance === 0 ? <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">Habis</span> : <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">Tersedia</span>}</td></tr>; }) : <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">Barang tidak ditemukan.</td></tr>}</tbody></table></div>
        <PaginationControls pagination={goodsPageRows} onPageChange={setGoodsPage} label="Halaman daftar stok" />
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-semibold">Riwayat transaksi stok</h2><p className="mt-1 text-sm text-slate-500">Termasuk transaksi penjualan yang memengaruhi saldo stok</p></div><label className="grid gap-1 text-xs text-slate-500">Bulan<input type="month" value={month} onChange={(event) => setMonth(event.target.value || todayKey().slice(0, 7))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"/></label></div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">Nama Barang</th><th className="px-4 py-3">Jenis</th><th className="px-4 py-3 text-right">Quantity</th><th className="px-4 py-3">Sumber</th></tr></thead><tbody className="divide-y divide-slate-100">{status === "loading" ? <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">Memuat riwayat...</td></tr> : visibleTransactions.length ? transactionPageRows.items.map((row) => { const item = goods.find((good) => Number(good.id) === Number(row.barang_id)); return <tr key={row.id}><td className="whitespace-nowrap px-4 py-3">{dateLabel(row.tanggal, { day: "2-digit", month: "2-digit", year: "2-digit" })}</td><td className="px-4 py-3 font-medium">{item?.nama || ("Barang #" + row.barang_id)}</td><td className="px-4 py-3">{typeLabel(row.type)}</td><td className="px-4 py-3 text-right tabular-nums">{formatNumber(row.qty)}</td><td className="px-4 py-3">{row.penjualan_id ? "Penjualan" : row.type === "laku" ? "Keluar manual" : "Manual"}</td></tr>; }) : <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">Tidak ada transaksi untuk bulan ini.</td></tr>}</tbody></table></div>
        <PaginationControls pagination={transactionPageRows} onPageChange={setTransactionsPage} label="Halaman riwayat transaksi stok" />
      </section>
      <footer className="border-t border-slate-200 py-4 text-xs text-slate-400">DEHOS · Modul Stock & In Out · terpisah dari website produksi</footer>
    </div>
  </main>;
}

export default function App() {
  const [period, setPeriod] = useState(7);
  const [activePage, setActivePage] = useState("dashboard");
  const [data, setData] = useState({ status: "loading", summary: null, sales: [], recent: [], goods: [], transactions: [], error: "" });
  const [refreshedAt, setRefreshedAt] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [brandTargets, setBrandTargets] = useState({});
  const [targetDraft, setTargetDraft] = useState({});
  const [targetMessage, setTargetMessage] = useState("");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("dehos.dashboard.brandTargets.v1");
      if (!saved) return;
      const parsed = JSON.parse(saved);
      const valid = normalizeBrandTargets(parsed);
      setBrandTargets(valid);
      setTargetDraft(Object.fromEntries(Object.entries(valid).map(([name, value]) => [name, String(value)])));
    } catch {
      setTargetMessage("Pengaturan target tersimpan tidak dapat dibaca. Target lama tidak diubah.");
    }
  }, []);

  async function loadDashboard() {
    if (!supabase) {
      setData((current) => ({ ...current, status: "config", error: "Koneksi belum diatur. Tambahkan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY pada environment lokal/hosting migrasi." }));
      return;
    }
    setData((current) => ({ ...current, status: "loading", error: "" }));
    try {
      const [summaryResult, salesRows, recentRows, goodsRows, transactionRows] = await Promise.all([
        supabase.rpc("get_dashboard_summary", {
          p_today: todayKey(),
          p_month_start: `${todayKey().slice(0, 7)}-01`,
          p_month_end: (() => { const now = new Date(); return localDateKey(new Date(now.getFullYear(), now.getMonth() + 1, 1)); })(),
        }),
        fetchAll((start, end) => supabase.from("penjualan").select("id, barang_id, brand, qty, harga, tanggal_pembelian").gte("tanggal_pembelian", daysAgoKey(59)).order("tanggal_pembelian", { ascending: false }).order("id", { ascending: false }).range(start, end)),
        supabase.from("penjualan").select("id, barang_id, brand, qty, harga, tanggal_pembelian").order("tanggal_pembelian", { ascending: false }).order("id", { ascending: false }).limit(5),
        fetchAll((start, end) => supabase.from("barang").select("id, nama, stok_awal, created_at, tanggal_mulai, brand_id, brand:brand!barang_brand_id_fkey(id, nama, aktif)").order("nama", { ascending: true }).order("id", { ascending: true }).range(start, end)),
        fetchAll((start, end) => supabase.from("transaksi").select("*").order("tanggal", { ascending: true }).order("id", { ascending: true }).range(start, end)),
      ]);
      if (summaryResult.error) throw summaryResult.error;
      if (recentRows.error) throw recentRows.error;
      setData({ status: "ready", summary: summaryResult.data || {}, sales: salesRows, recent: recentRows.data || [], goods: goodsRows, transactions: transactionRows, error: "" });
      setRefreshedAt(new Date());
    } catch (error) {
      console.error("DEHOS dashboard load error:", error);
      setData((current) => ({ ...current, status: "error", error: "Data Dashboard gagal dimuat. Periksa koneksi, izin baca Supabase, dan nama fungsi/tabel yang digunakan." }));
    }
  }

  useEffect(() => { void loadDashboard(); }, []);

  const today = todayKey();
  const omzetToday = data.sales.filter((item) => String(item.tanggal_pembelian || "").slice(0, 10) === today).reduce((sum, item) => sum + salesValue(item), 0);
  const stockRows = useMemo(() => data.goods.map((item) => ({
    ...item,
    currentStock: stockForToday(item, data.transactions, today),
  })), [data.goods, data.transactions, today]);
  const totalStock = stockRows.reduce((sum, item) => sum + Math.max(0, item.currentStock), 0); // same rule as get_dashboard_summary (negatives excluded)
  const negativeStock = stockRows.filter((item) => item.currentStock < 0).sort((a, b) => a.currentStock - b.currentStock || String(a.nama || "").localeCompare(String(b.nama || ""), "id"));
  const lowStock = stockRows.filter((item) => item.currentStock >= 0 && item.currentStock <= 5).sort((a, b) => a.currentStock - b.currentStock).slice(0, 5);
  const brandNames = useMemo(() => {
    const names = new Set();
    data.goods.forEach((item) => {
      if (item.brand?.nama) names.add(item.brand.nama);
    });
    data.sales.forEach((item) => {
      if (item.brand) names.add(item.brand);
    });
    return [...names].sort((a, b) => a.localeCompare(b, "id"));
  }, [data.goods, data.sales]);
  const brandSales = useMemo(() => {
    const grouped = new Map();
    data.sales.filter((item) => String(item.tanggal_pembelian || "").slice(0, 7) === today.slice(0, 7)).forEach((item) => {
      const name = item.brand || "Tanpa Brand";
      grouped.set(name, (grouped.get(name) || 0) + salesValue(item));
    });
    return brandNames.map((name) => ({ name, total: grouped.get(name) || 0 })).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "id"));
  }, [data.sales, today, brandNames]);
  const totalBrandSales = brandSales.reduce((sum, item) => sum + item.total, 0);
  function openTargetSettings() {
    setTargetDraft(Object.fromEntries(brandNames.map((name) => [name, brandTargets[name] == null ? "" : String(brandTargets[name])])));
    setTargetMessage("");
    setSettingsOpen(true);
  }
  function saveTargetSettings(event) {
    event.preventDefault();
    const next = {};
    for (const name of brandNames) {
      const raw = String(targetDraft[name] ?? "").trim();
      if (!raw) continue;
      const amount = Number(raw);
      if (!Number.isFinite(amount) || amount < 0) {
        setTargetMessage("Target harus berupa angka nol atau lebih. Periksa kembali input.");
        return;
      }
      if (amount > 0) next[name] = amount;
    }
    try {
      window.localStorage.setItem("dehos.dashboard.brandTargets.v1", JSON.stringify(next));
      setBrandTargets(next);
      setTargetMessage("");
      setSettingsOpen(false);
    } catch {
      setTargetMessage("Pengaturan gagal disimpan di perangkat ini. Periksa ruang penyimpanan browser.");
    }
  }
  const summary = data.summary || {};

  if (activePage === "sales") return <SalesPage onSaved={() => void loadDashboard()} onBack={() => setActivePage("dashboard")} />;
  if (activePage === "stock") return <StockPage onSaved={() => void loadDashboard()} onBack={() => setActivePage("dashboard")} />;

  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-slate-200 bg-white p-5 lg:block">
      <div className="flex items-center gap-3 px-1 py-3"><div className="rounded-xl bg-slate-900 p-2 text-white"><Boxes size={22} /></div><div><p className="font-semibold tracking-tight">DEHOS</p><p className="text-xs text-slate-500">Pencatatan stok & penjualan</p></div></div>
      <nav className="mt-8 space-y-1 text-sm">
        <a href="#dashboard" onClick={(event) => { event.preventDefault(); setActivePage("dashboard"); }} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${activePage === "dashboard" ? "bg-slate-100 font-medium text-slate-900" : "text-slate-500"}`}><ChartNoAxesCombined size={17} />Dashboard</a>
        <a href="#penjualan" onClick={(event) => { event.preventDefault(); setActivePage("sales"); }} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${activePage === "sales" ? "bg-slate-100 font-medium text-slate-900" : "text-slate-500"}`}><ShoppingCart size={17} />Penjualan</a>
        <a href="#stock" onClick={(event) => { event.preventDefault(); setActivePage("stock"); }} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${activePage === "stock" ? "bg-slate-100 font-medium text-slate-900" : "text-slate-500"}`}><Package size={17} />Stock</a>
        <a href="#in-out" onClick={(event) => { event.preventDefault(); setActivePage("stock"); }} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${activePage === "stock" ? "bg-slate-100 font-medium text-slate-900" : "text-slate-500"}`}><ArrowDownUp size={17} />In Out</a>
      </nav>
      <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-slate-200 p-3 text-xs text-slate-500"><div className="mb-1 flex items-center gap-2 font-medium text-slate-700"><Database size={15} />Status koneksi</div>{data.status === "ready" ? "Database aktif · hanya baca" : data.status === "loading" ? "Menghubungkan..." : "Belum terhubung"}</div>
    </aside>
    <section id="dashboard" className="lg:ml-60">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
        <div><p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Workspace / DEHOS</p><h1 className="mt-1 text-xl font-semibold tracking-tight">Dashboard</h1><p className="mt-1 text-sm text-slate-500">Ringkasan stok dan aktivitas penjualan</p></div>
        <div className="flex items-center gap-2"><span className="hidden text-xs text-slate-500 sm:inline">{refreshedAt ? `Diperbarui ${refreshedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}` : "Mode migrasi terpisah"}</span><button onClick={() => void loadDashboard()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"><RefreshCw size={15} />Muat ulang</button></div>
      </header>
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
        {data.status === "config" && <div role="status" className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle size={19} className="mt-0.5 shrink-0" /><div><p className="font-semibold">Dashboard belum terhubung ke Supabase</p><p className="mt-1">{data.error} Tidak ada data contoh yang ditampilkan agar angka tidak menyesatkan.</p></div></div>}
        {data.status === "error" && <div role="alert" className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertTriangle size={19} className="mt-0.5 shrink-0" /><div><p className="font-semibold">Gagal memuat Dashboard</p><p className="mt-1">{data.error}</p><button onClick={() => void loadDashboard()} className="mt-3 rounded-lg border border-rose-200 bg-white px-3 py-1.5 font-medium">Coba lagi</button></div></div>}
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-base font-semibold">Statistik Utama</h2><p className="mt-1 text-sm text-slate-500">Pantau stok dan omzet dalam satu tampilan.</p></div><span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs text-slate-500 ring-1 ring-slate-200"><CalendarDays size={14}/>{dateLabel(today, { day: "numeric", month: "long", year: "numeric" })}</span></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard icon={Boxes} label="Total Barang" value={data.status === "ready" ? formatNumber(summary.total_barang ?? data.goods.length) : "—"} hint="Jumlah jenis barang" />
          <StatCard icon={Package} label="Total Stok" value={data.status === "ready" ? formatNumber(summary.total_stok ?? totalStock) : "—"} hint="Stok negatif tidak dihitung" tone="blue" />
          <StatCard icon={TrendingUp} label="Omzet Hari Ini" value={data.status === "ready" ? formatMoney(omzetToday) : "—"} hint="Berdasarkan catatan penjualan" tone="green" />
        </div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,1fr)]">
          {data.status === "loading" ? <LoadingPanel message="Memuat ringkasan penjualan..." /> : <SalesChart sales={data.sales} period={period} setPeriod={setPeriod} />}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><TrendingUp size={18}/><h2 className="font-semibold">Performa Brand</h2></div><p className="mt-1 text-sm text-slate-500">Omzet bulan ini dibandingkan target brand</p></div><button type="button" onClick={openTargetSettings} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50" aria-label="Atur target per brand"><Settings2 size={16}/>Atur target</button></div>
            {data.status === "loading" ? <LoadingPanel message="Memuat performa brand..." /> : brandSales.length ? <div className="mt-5 space-y-4">{brandSales.map((item) => { const target = Number(brandTargets[item.name]) || 0; const progress = target > 0 ? Math.min(100, (item.total / target) * 100) : (totalBrandSales ? (item.total / totalBrandSales) * 100 : 0); return <div key={item.name}><div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="truncate font-medium">{item.name}</span><span className="shrink-0 text-right text-slate-600">{formatMoney(item.total)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${target > 0 && item.total >= target ? "bg-emerald-600" : "bg-slate-700"}`} style={{ width: `${progress}%` }} /></div><p className="mt-1 text-xs text-slate-500">{target > 0 ? `${Math.floor((item.total / target) * 100)}% dari target ${formatMoney(target)}` : `Belum ada target · ${totalBrandSales ? Math.round((item.total / totalBrandSales) * 100) : 0}% kontribusi omzet brand`}</p></div>; })}</div> : <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Belum ada penjualan brand pada bulan ini.</p>}
            <p className="mt-4 text-xs text-slate-400">Target disimpan hanya di browser/perangkat ini dan tidak mengubah database Supabase.</p>
          </section>
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Barang Stok Minus</h2><p className="mt-1 text-sm text-slate-500">Barang yang perlu diperhatikan / PO</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${negativeStock.length ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{data.status === "ready" ? formatNumber(negativeStock.length) : "—"} barang</span></div>
            {data.status === "loading" ? <LoadingPanel message="Memuat stok..." /> : data.status !== "ready" ? <p className="mt-4 text-sm text-slate-500">Data stok belum tersedia.</p> : negativeStock.length ? <div className="mt-4 divide-y divide-slate-100">{negativeStock.slice(0, 8).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-3"><div className="flex min-w-0 items-center gap-2"><span className="text-rose-600">•</span><div className="min-w-0"><p className="truncate text-sm font-medium">{item.nama || "—"}</p><p className="text-xs text-slate-500">{item.brand?.nama || "Tanpa Brand"}</p></div></div><strong className="shrink-0 text-sm text-rose-700">{formatNumber(item.currentStock)} unit</strong></div>)}</div> : <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"><CircleCheck size={17}/>Tidak ada barang dengan stok minus.</div>}
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Transaksi Terbaru</h2><p className="mt-1 text-sm text-slate-500">Lima catatan penjualan terakhir</p></div><ShoppingCart size={18} className="text-slate-400"/></div>
            {data.status === "loading" ? <LoadingPanel message="Memuat transaksi..." /> : data.status !== "ready" ? <p className="mt-4 text-sm text-slate-500">Data penjualan belum tersedia.</p> : data.recent.length ? <div className="mt-4 divide-y divide-slate-100">{data.recent.map((item) => { const good = data.goods.find((row) => Number(row.id) === Number(item.barang_id)); return <div key={item.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{good?.nama || `Barang #${item.barang_id}`}</p><p className="mt-1 text-xs text-slate-500">{item.brand || "Tanpa Brand"} · {dateLabel(item.tanggal_pembelian)}</p></div><div className="shrink-0 text-right"><p className="text-sm font-semibold">{formatMoney(salesValue(item))}</p><p className="mt-1 text-xs text-slate-500">{formatNumber(item.qty)} unit</p></div></div>})}</div> : <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Belum ada catatan penjualan.</p>}
          </section>
        </div>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Stok Menipis</h2><p className="mt-1 text-sm text-slate-500">Barang dengan stok tersedia 0–5 unit</p></div><Package size={18} className="text-slate-400"/></div>
          {data.status === "loading" ? <LoadingPanel message="Memuat daftar stok..." /> : data.status !== "ready" ? <p className="mt-4 text-sm text-slate-500">Data stok belum tersedia.</p> : lowStock.length ? <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{lowStock.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{item.nama || "—"}</p><p className="text-xs text-slate-500">{item.brand?.nama || "Tanpa Brand"}</p></div><span className="shrink-0 rounded-lg bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">{item.currentStock === 0 ? "Habis" : `${formatNumber(item.currentStock)} unit`}</span></div>)}</div> : <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">Tidak ada barang dengan stok menipis.</p>}
        </section>
        {settingsOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="brand-target-title" className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
            <div className="flex items-start justify-between gap-3"><div><h2 id="brand-target-title" className="text-lg font-semibold">Target omzet per brand</h2><p className="mt-1 text-sm text-slate-500">Target bulanan dalam rupiah. Kosongkan atau isi 0 untuk menghapus target.</p></div><button type="button" onClick={() => setSettingsOpen(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm">Tutup</button></div>
            {targetMessage && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{targetMessage}</p>}
            <form onSubmit={saveTargetSettings} className="mt-5 space-y-3">
              {brandNames.length ? brandNames.map((name) => <label key={name} className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_190px] sm:items-center"><span className="text-sm font-medium">{name}</span><input type="number" min="0" step="1000" inputMode="numeric" value={targetDraft[name] ?? ""} onChange={(event) => setTargetDraft((current) => ({ ...current, [name]: event.target.value }))} placeholder="Contoh: 10000000" aria-label={`Target omzet ${name} dalam rupiah`} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"/></label>) : <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Nama brand belum tersedia dari data yang dimuat.</p>}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setSettingsOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium">Batal</button><button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Simpan target</button></div>
            </form>
          </section>
        </div>}
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 py-4 text-xs text-slate-400"><span>DEHOS · Workspace migrasi React</span><span className="inline-flex items-center gap-1"><ExternalLink size={12}/>Terpisah dari website produksi</span></footer>
      </div>
    </section>
  </main>;
}
