import { createClient } from "@supabase/supabase-js";

// Kunci "publishable" memang dirancang publik; keamanan data dijaga oleh RLS di Supabase.
export const SUPABASE_URL =
  import.meta.env?.VITE_SUPABASE_URL || "https://lebwxqkbpjqqszzvmnas.supabase.co";

export const SUPABASE_KEY =
  import.meta.env?.VITE_SUPABASE_KEY || "sb_publishable_-ZI4t9ZuLF9LuIee8W_7Fg_EUrgXFat";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Klien terpisah tanpa penyimpanan sesi. Dipakai hanya untuk memverifikasi
 * password lama tanpa menimpa sesi aplikasi yang sedang aktif.
 */
export function createVerifierClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

/** Membaca seluruh baris tabel per halaman 1000 (batas default PostgREST). */
export async function fetchAllRows(buildQuery, pageSize = 1000) {
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw error;
    const batch = data || [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}
