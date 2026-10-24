const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const JAKARTA = "Asia/Jakarta";

function pad(value, length = 2) {
  return String(value).padStart(length, "0");
}

/** Date lokal -> "yyyy-mm-dd" (tanpa konversi zona waktu). */
export function toISODate(date) {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayISO() {
  return toISODate(new Date());
}

export function isISODate(value) {
  const match = ISO_RE.exec(String(value || ""));
  if (!match) return false;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return (
    date.getFullYear() === Number(match[1]) &&
    date.getMonth() === Number(match[2]) - 1 &&
    date.getDate() === Number(match[3])
  );
}

/** "yyyy-mm-dd" -> Date lokal pukul 00:00 (null jika tidak valid). */
export function fromISODate(value) {
  if (!isISODate(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "2026-10-24" -> "24/10/2026" */
export function formatTanggalTampilan(value) {
  const match = ISO_RE.exec(String(value || ""));
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

/** "2026-10-04" -> "4/10" (ringkas untuk tabel sempit) */
export function formatTanggalRingkasTabel(value) {
  const match = ISO_RE.exec(String(value || ""));
  return match ? `${Number(match[3])}/${Number(match[2])}` : "";
}

/** "24/10/2026" -> "2026-10-24"; "" jika format atau tanggalnya tidak valid. */
export function parseTanggalTampilan(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(value || "").trim());
  if (!match) return "";
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return "";
  }
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

/** Masker ketikan: "24102026" -> "24/10/2026" */
export function formatKetikTanggal(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
  const parts = [];
  if (digits.length > 0) parts.push(digits.slice(0, 2));
  if (digits.length > 2) parts.push(digits.slice(2, 4));
  if (digits.length > 4) parts.push(digits.slice(4, 8));
  return parts.join("/");
}

/** Tanggal (yyyy-mm-dd) dari timestamp ISO, dihitung pada zona waktu Asia/Jakarta seperti di database. */
export function tanggalJakarta(timestamp) {
  const date = new Date(timestamp || "");
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Awal bulan (tanggal 1) dari sebuah Date. */
export function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + Number(amount), 1);
}

/** Date lokal ditambah n hari (n boleh negatif). */
export function addDays(date, amount) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + Number(amount));
  return result;
}

/** "yyyy-mm-dd" ditambah n hari -> "yyyy-mm-dd". */
export function addDaysISO(value, amount) {
  const date = fromISODate(value);
  return date ? toISODate(addDays(date, amount)) : "";
}

/** "Oktober 2026" */
export function formatBulan(date) {
  const text = date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Rentang bulan [start, endExclusive) dalam "yyyy-mm-dd", cocok untuk filter gte/lt. */
export function monthRangeISO(date) {
  const start = startOfMonth(date);
  return { start: toISODate(start), endExclusive: toISODate(addMonths(start, 1)) };
}

/** Bulan dari "yyyy-mm-dd" -> Date tanggal 1 bulan itu (null jika tidak valid). */
export function monthOfISO(value) {
  const date = fromISODate(value);
  return date ? startOfMonth(date) : null;
}
