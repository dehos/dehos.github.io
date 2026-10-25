// Pure helpers for editing and deleting an existing sale through the reviewed atomic RPCs
// `edit_penjualan_atomic` (6-argument overload) and `hapus_penjualan_atomic`.
// The item (barang) and brand of a sale are never changed from the React UI.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isRealIsoDate(value) {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// Ids come from the database as numbers (or digit strings); reject booleans, arrays, hex, exponents and
// anything beyond the safe integer range, so a value can never be silently coerced to another row id.
const positiveInteger = (value) => {
  if (typeof value === "number") return Number.isSafeInteger(value) && value > 0;
  return typeof value === "string" && /^[0-9]+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
};

const MAX_QTY = 1_000_000;
const MAX_HARGA = 1_000_000_000_000;

// Plain decimal text only (no exponent, hex, sign or Infinity); surrounding whitespace is ignored.
function parseDecimal(raw) {
  if (typeof raw !== "string" && typeof raw !== "number") return Number.NaN;
  const text = String(raw).trim();
  return /^[0-9]+(\.[0-9]+)?$/.test(text) ? Number(text) : Number.NaN;
}

/**
 * Validate an edit form for an existing sale and build the RPC parameters.
 * Returns { ok: true, params, changed } or { ok: false, reason }.
 */
export function buildEditSaleParams(item, form) {
  if (!item || !positiveInteger(item.id)) return { ok: false, reason: "Data penjualan tidak valid." };
  if (!positiveInteger(item.barang_id)) return { ok: false, reason: "Barang pada penjualan ini tidak valid." };
  const brand = typeof item.brand === "string" ? item.brand.trim() : "";
  if (!brand) return { ok: false, reason: "Penjualan ini tidak memiliki brand, sehingga tidak dapat diubah dari sini." };

  const qty = parseDecimal(form?.qty);
  if (!Number.isSafeInteger(qty) || qty < 1 || qty > MAX_QTY) return { ok: false, reason: "Quantity harus bilangan bulat antara 1 dan 1.000.000." };
  const harga = parseDecimal(form?.harga);
  if (!Number.isFinite(harga) || harga < 0 || harga > MAX_HARGA) return { ok: false, reason: "Harga harus berupa angka nol atau lebih (maksimal 1 triliun)." };
  const tanggal = typeof form?.tanggal === "string" ? form.tanggal : "";
  if (!isRealIsoDate(tanggal)) return { ok: false, reason: "Tanggal pembelian tidak valid." };

  const params = {
    p_penjualan_id: Number(item.id),
    p_barang_id: Number(item.barang_id),
    p_brand: brand,
    p_qty: qty,
    p_harga: harga,
    p_tanggal_pembelian: tanggal,
  };
  const changed = qty !== Number(item.qty) || harga !== Number(item.harga) ||
    tanggal !== String(item.tanggal_pembelian || "").slice(0, 10);
  return { ok: true, params, changed };
}

/** Build the parameters for deleting a sale (and its linked stock transaction) atomically. */
export function buildDeleteSaleParams(item) {
  if (!item || !positiveInteger(item.id)) return { ok: false, reason: "Data penjualan tidak valid." };
  return { ok: true, params: { p_penjualan_id: Number(item.id) } };
}
