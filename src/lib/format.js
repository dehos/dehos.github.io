/** Format angka gaya Indonesia: 1.234.567 */
export function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return new Intl.NumberFormat("id-ID").format(number);
}

/** Nominal ringkas untuk tabel: 1.500 -> 1,5K, 2.000.000 -> 2Jt. Di bawah 1.000 tidak disingkat. */
export function formatNominalTabel(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  if (number >= 1_000_000) {
    return (number / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "Jt";
  }
  if (number >= 1_000) {
    return (number / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "K";
  }
  return formatNumber(number);
}

/** Rp1.234.567 (tanpa spasi, sama seperti aplikasi lama). */
export function formatRupiah(value) {
  return "Rp" + formatNumber(value);
}

/** Memformat teks input harga: hanya digit, dipisah titik ribuan. "12500" -> "12.500". */
export function formatHargaInput(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("id-ID").format(Number(digits));
}

/** Kebalikan formatHargaInput: "12.500" -> 12500 (0 jika kosong). */
export function parseHarga(text) {
  const digits = String(text ?? "").replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

/** Mengamankan nama file dari karakter yang tidak boleh. */
export function safeFileName(name, fallback = "Stock-Barang") {
  return String(name || fallback).replace(/[\\/:*?"<>|]/g, "-");
}
