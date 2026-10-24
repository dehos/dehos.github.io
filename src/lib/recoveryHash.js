/*
 * Fragmen URL (#...) dibaca SEKALI saat modul ini dievaluasi. Modul ini harus diimpor paling awal
 * di main.jsx, sebelum klien Supabase memproses dan menghapus token di fragmen tautan reset password.
 */
const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.hash.slice(1));

export const recoveryLinkRequested = params.get("type") === "recovery";
export const recoveryLinkError = params.get("error_description");

export const KUNCI_RECOVERY = "dhouse-password-recovery";

/** Hapus fragmen pemulihan/galat dari riwayat peramban (SDK sudah mengambil kredensialnya). */
export function cleanRecoveryUrl() {
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
}
