# Stock Barang

Aplikasi web stok dan penjualan D'house.

## Login admin

Login menerima email admin atau username yang dikonfigurasi pada `public.app_admins.username`. Email tetap tersimpan pada Supabase Auth dan `app_admins`; password diverifikasi oleh Supabase Auth. Pendaftaran akun baru tetap memerlukan email.

Username login menggunakan Edge Function `login-username`. Fungsi mencari email di sisi server, membatasi 10 percobaan per username dalam 15 menit, lalu mengembalikan sesi hanya setelah password valid. Deploy fungsi dengan `verify_jwt = false` sebagaimana tercatat dalam `supabase/config.toml`; fungsi tersebut menerapkan pemeriksaan password sendiri. Jangan menaruh email admin atau password dalam kode frontend.

Sesudah migrasi diterapkan, administrator dapat memberi alias dengan mengganti placeholder menggunakan email akun yang sudah ada:

```sql
update public.app_admins
set username = 'Toni'
where lower(email) = lower('<email-admin-yang-sudah-ada>');
```

Password akun tidak diubah oleh konfigurasi username.
