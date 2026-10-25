const SAFE_WRITE_ERRORS = Object.freeze({
  "23505": "Data serupa mungkin sudah tercatat. Muat ulang lalu periksa riwayat.",
  "23503": "Barang atau referensi terkait tidak ditemukan. Muat ulang data lalu coba lagi.",
  "42501": "Akses ditolak. Periksa izin akun atau hubungi administrator.",
  "P0001": "Transaksi ditolak oleh aturan bisnis. Muat ulang data dan periksa stok.",
});

// Known business-rule failures raised by the database (SQLSTATE P0001). The provider text is
// only matched, never rendered; the user sees the fixed message below. These patterns are coupled to
// the database message wording: if it changes, the generic P0001 message below is used (still safe).
const KNOWN_BUSINESS_RULES = Object.freeze([
  [/belum memiliki brand aktif/i, "Barang ini belum memiliki brand aktif. Lengkapi brand barang terlebih dahulu."],
  [/stok berubah menjadi/i, "Stok barang berubah. Muat ulang data lalu periksa stok sebelum menyimpan."],
]);

/**
 * Map database/RPC failures to user-safe messages.
 * Never render provider-supplied error.message, details, or hint in the UI.
 */
export function safeWriteErrorMessage(error, fallback = "Operasi gagal. Silakan coba lagi.") {
  if (error && error.code === "P0001" && typeof error.message === "string") {
    const known = KNOWN_BUSINESS_RULES.find(([pattern]) => pattern.test(error.message));
    if (known) return known[1];
  }
  if (error && typeof error.code === "string" && SAFE_WRITE_ERRORS[error.code]) {
    return SAFE_WRITE_ERRORS[error.code];
  }
  return fallback;
}
