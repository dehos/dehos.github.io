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

const positiveInteger = (value) => Number.isInteger(Number(value)) && Number(value) > 0 && String(value).trim() !== "";

function parseNumber(raw) {
  if (raw === null || raw === undefined || String(raw).trim() === "") return Number.NaN;
  return Number(raw);
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

  const qty = parseNumber(form?.qty);
  if (!Number.isInteger(qty) || qty < 1) return { ok: false, reason: "Quantity harus bilangan bulat minimal 1." };
  const harga = parseNumber(form?.harga);
  if (!Number.isFinite(harga) || harga < 0) return { ok: false, reason: "Harga tidak boleh kosong atau negatif." };
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
