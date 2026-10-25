const SAFE_WRITE_ERRORS = Object.freeze({
  "23505": "Data serupa mungkin sudah tercatat. Muat ulang lalu periksa riwayat.",
  "23503": "Barang atau referensi terkait tidak ditemukan. Muat ulang data lalu coba lagi.",
  "42501": "Akses ditolak. Periksa izin akun atau hubungi administrator.",
  "P0001": "Transaksi ditolak oleh aturan bisnis. Muat ulang data dan periksa stok.",
});

/**
 * Map database/RPC failures to user-safe messages.
 * Never render provider-supplied error.message, details, or hint in the UI.
 */
export function safeWriteErrorMessage(error, fallback = "Operasi gagal. Silakan coba lagi.") {
  if (error && typeof error.code === "string" && SAFE_WRITE_ERRORS[error.code]) {
    return SAFE_WRITE_ERRORS[error.code];
  }
  return fallback;
}
