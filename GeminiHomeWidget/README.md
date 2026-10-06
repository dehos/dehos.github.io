# Perintah Gemini — widget Perangkat rumah

Proyek Android native untuk Android 10 ke atas, termasuk Galaxy M30s yang menjalankan versi tersebut. Ini kode sumber, BUKAN APK. Belum dikompilasi atau diuji pada perangkat karena lingkungan pembuatan tidak menyediakan Android SDK/JDK compiler dan unduhan SDK gagal.

Perintah bawaan persis: `Tampilkan semua perangkat yang ada di google home`.

## Cara kerja

Ketuk widget untuk mencoba meneruskan perintah melalui ACTION_SEND text/plain ke aplikasi Gemini. Ini mekanisme berbagi Android, bukan API prefill resmi Gemini. Jika tidak ada penerima yang cocok, widget menyalin perintah dan membuka Gemini. Tekan Tempel lalu Kirim. Jika intent diterima tetapi teks diabaikan, matikan opsi “Coba kirim teks langsung ke Gemini” di aplikasi. Tidak mengirim perintah secara otomatis, tidak memakai API key, dan tidak meminta izin perangkat sensitif.

Daftar perangkat dihasilkan oleh Gemini, bukan widget. Hubungkan Google Home di Gemini dengan akun Google yang sesuai. Dukungan untuk mengontrol perangkat bukan jaminan bahwa perintah menampilkan seluruh daftar didukung.

## Membangun APK

1. Buka folder ini di Android Studio yang mendukung Android Gradle Plugin 8.7.3.
2. Gunakan Gradle 8.9, JDK 17, dan Android SDK 35. Gradle wrapper belum disertakan; dengan Gradle 8.9 yang terpasang jalankan `gradle wrapper --gradle-version 8.9`.
3. Sinkronkan proyek dan jalankan `./gradlew assembleDebug`, atau pilih Build APK(s) di Android Studio.
4. APK berada di `app/build/outputs/apk/debug/app-debug.apk`. Build debug ditandatangani otomatis untuk pengujian.
5. Instal di HP, buka Perintah Gemini, simpan perintah, dan pilih Tambahkan widget. Alternatif: tekan lama layar utama > Widget > Perintah Gemini.

## Verifikasi pada HP

- Ketuk widget dengan Gemini terpasang. Periksa apakah teks diteruskan dan belum dikirim.
- Jika teks tidak terisi, nonaktifkan mode kirim langsung; pastikan perintah ada di clipboard dan bisa ditempel.
- Coba tanpa Gemini; dialog harus menawarkan Play Store/web tanpa crash.
- Ubah perintah, tutup aplikasi, lalu ketuk widget. Pastikan teks terbaru dipakai.
- Restart HP dan uji widget lagi. Tidak ada polling atau layanan latar belakang.
- Aktifkan Google Home di Gemini dan kirim perintah untuk memeriksa dukungan daftar perangkat.

Referensi: https://developer.android.com/training/sharing/send dan https://support.google.com/gemini/answer/15335456?hl=id
