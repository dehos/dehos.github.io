import { isISODate, tanggalJakarta } from "./date.js";

/*
 * Perhitungan stok. Aturan sama persis dengan fungsi database
 * (catat_penjualan_atomic / catat_transaksi_stok_atomic / get_dashboard_summary):
 *   stok = stok_awal (hanya jika tanggal mulai barang <= tanggal acuan)
 *          + sum(masuk, adjust_masuk) - sum(laku, adjust_keluar)   untuk transaksi dengan tanggal <= acuan
 */

export const TIPE_MASUK = ["masuk", "adjust_masuk"];
export const TIPE_KELUAR = ["laku", "adjust_keluar"];

export function isStockIn(transaksi) {
  return transaksi?.type === "masuk" || transaksi?.type === "adjust_masuk";
}

export function isStockOut(transaksi) {
  return transaksi?.type === "laku" || transaksi?.type === "adjust_keluar";
}

/** Tanggal efektif stok awal: tanggal_mulai, atau tanggal created_at (zona Asia/Jakarta) untuk data lama. */
export function tanggalMulaiBarang(barang) {
  if (isISODate(barang?.tanggal_mulai)) return barang.tanggal_mulai;
  return tanggalJakarta(barang?.created_at);
}

/** Map barang_id -> daftar transaksi barang itu, supaya hitung stok tidak memindai semua transaksi. */
export function indexTransaksi(transaksi) {
  const index = new Map();
  for (const item of transaksi || []) {
    const key = Number(item.barang_id);
    const list = index.get(key);
    if (list) list.push(item);
    else index.set(key, [item]);
  }
  return index;
}

function daftarTransaksi(index, barang) {
  return index.get(Number(barang?.id)) || [];
}

/** Barang dianggap ada pada suatu tanggal bila sudah dimulai atau sudah punya transaksi pada/sebelum tanggal itu. */
export function barangAdaPadaTanggal(barang, tanggal, index) {
  const mulai = tanggalMulaiBarang(barang);
  if (!mulai || mulai <= tanggal) return true;
  return daftarTransaksi(index, barang).some((t) => t.tanggal && t.tanggal <= tanggal);
}

/** Stok mentah (bisa negatif) pada tanggal acuan; tanpa tanggal = seluruh transaksi. */
export function stokMentahPadaTanggal(barang, tanggal, index) {
  if (tanggal && !barangAdaPadaTanggal(barang, tanggal, index)) return 0;

  const mulai = tanggalMulaiBarang(barang);
  let stok = !tanggal || !mulai || mulai <= tanggal ? Number(barang?.stok_awal) || 0 : 0;

  for (const t of daftarTransaksi(index, barang)) {
    if (tanggal && t.tanggal && t.tanggal > tanggal) continue;
    const qty = Number(t.qty) || 0;
    if (isStockIn(t)) stok += qty;
    else if (isStockOut(t)) stok -= qty;
  }
  return stok;
}

/** Stok tampilan: tidak pernah di bawah nol. */
export function stokPadaTanggal(barang, tanggal, index) {
  return Math.max(0, stokMentahPadaTanggal(barang, tanggal, index));
}

/** Saldo sebelum tanggal mulai (transaksi dengan tanggal < tanggalMulai), dipakai rekap/export. */
export function stokSebelumTanggal(barang, tanggalMulai, index) {
  if (!barangAdaPadaTanggal(barang, tanggalMulai, index)) return 0;

  const awal = tanggalMulaiBarang(barang);
  let stok = !awal || awal <= tanggalMulai ? Number(barang?.stok_awal) || 0 : 0;

  for (const t of daftarTransaksi(index, barang)) {
    if (!t.tanggal || t.tanggal >= tanggalMulai) continue;
    const qty = Number(t.qty) || 0;
    if (isStockIn(t)) stok += qty;
    else if (isStockOut(t)) stok -= qty;
  }
  return stok;
}

/** Label jenis transaksi untuk tampilan. */
export function labelJenisTransaksi(type) {
  switch (type) {
    case "masuk":
      return "Masuk";
    case "laku":
      return "Keluar";
    case "adjust_masuk":
      return "Adjust (+)";
    case "adjust_keluar":
      return "Adjust (−)";
    case "adjust":
      return "Adjust";
    default:
      return String(type || "-");
  }
}
