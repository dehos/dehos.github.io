# Kuda-kuda 2D

Editor pemotongan dan penyusunan bahan kuda-kuda 2D. Semua koordinat dan panjang disimpan dalam sentimeter sehingga proporsi objek konsisten pada skala dunia nyata.

Mendukung pinch-to-zoom, pan pada area kosong, area kerja layar penuh, hit-area objek yang lebar, serta magnet lembut yang dapat dimatikan.

Versi 2.2 menambahkan pengukur jarak dinamis saat objek diseret, pengaturan urutan layer, pemilihan objek di bawah, dan Undo Potong.

Versi 2.3 memakai label potongan A1/B1, motif baja ringan seragam, rotasi tekan-tahan yang halus, dan penguncian ujung ke objek yang bertindihan.

Versi 2.4 menampilkan profil C75 setinggi 7,5 cm dengan motif rusuk pengaku, label di dalam bahan, kontrol ikon ringkas, putaran 1° per ketukan, serta sambungan pada titik perpotongan mana pun. Sambungan terkunci ditandai empat kepala skrup dan dapat dibuka langsung dari titik sambungannya.

Versi 2.5 menambahkan multi-lock untuk beberapa titik sentuh pada satu objek, Undo/Redo untuk proses desain, serta laporan lengkap dalam PDF A4 landscape melalui layanan cetak Android.

Versi 2.6 memindahkan Undo/Redo ke toolbar ikon SVG di bawah kanvas, menampilkan referensi panjang/sudut/posisi saat objek dipilih, menambahkan meteran dua titik sambungan, dan menonaktifkan seleksi teks antarmuka yang mengganggu.

Versi 2.7 menempatkan garis dan label pengukuran pada layer di atas objek agar angka jarak tidak lagi tertutup material.

Versi 2.8 mengubah aplikasi menjadi editor kanvas luas dengan toolbar objek kontekstual, menghapus panel Objek Terpilih dan panduan kesamaan objek, serta mengganti meteran menjadi pembuat titik magnet berjarak manual dari ujung bahan.

Versi 2.9 mengaktifkan kembali rotasi halus dengan tekan-tahan pada toolbar kanvas. Ujung meteran dapat ditarik bebas dengan angka yang mengikuti jarak secara langsung, sedangkan titik magnet yang sudah dibuat dapat dipilih, digeser, atau diperbarui melalui input ukuran manual.

Versi 3.0 mengganti nama aplikasi menjadi Aplikasi Meteran dan menggunakan ikon vektor modern bertema meteran. Titik meteran kini dapat dihapus dari panel edit, sementara input jarak manual ditampilkan dengan label yang lebih jelas.

Versi 3.1 menambahkan Undo Potong langsung pada objek terpilih untuk menyatukan pasangan potongannya tanpa membatalkan desain lain. Penanda meteran diperkecil mengikuti profil objek dan ujung pengukuran kini memakai tanda ×.

Versi 3.2 menambahkan Smart Move untuk mendeteksi objek terdekat pada empat arah dan mengatur jarak tepi secara presisi melalui input sentimeter. Kunci Posisi mencegah objek terseret, diputar, dipotong, atau dipindahkan presisi hingga kunci dibuka, dan seluruh tindakan mendukung Undo/Redo.

Versi 3.3 memperbaiki pemilihan acuan Smart Move menggunakan jarak geometris terpendek antar-batang, bukan jarak kotak pembungkus. Objek acuan disorot dan dihubungkan garis ukur, sedangkan pemindahan melakukan koreksi iteratif sampai jarak fisik sesuai input.

Versi 3.4 membuat acuan Smart Move dapat dipilih sendiri melalui daftar yang diurutkan berdasarkan jarak nyata atau dengan mengetuk langsung objek pada kanvas. Empat tombol arah tetap tersedia sebagai saran cepat tanpa membatasi pilihan acuan pengguna.

Versi 3.5 menambahkan bahan baru ke proyek aktif berdasarkan jumlah dan panjang dalam sentimeter. Proyek lengkap kini dapat disimpan sebagai file `.meteran` melalui penyimpanan dokumen Android dan diimpor kembali beserta posisi, sudut, potongan, meteran, sambungan, layer, serta riwayat Undo/Redo.

Versi 3.6 menambahkan tombol Magic untuk mengenali batang bawah sebagai sumbu, memasangkan objek kiri–kanan, memusatkan batang tengah, meratakan jarak pengaku, melindungi sambungan yang terkunci, dan menampilkan rencana pengelompokan potongan dengan perkiraan efisiensi serta sisa bahan. Penerapan Magic dapat dibatalkan melalui Undo.

Versi 3.7 memperbaiki perilaku sambungan baut agar bekerja sebagai poros tetap dari kedua sisi. Saat salah satu objek pada sambungan ditarik, hanya objek tersebut yang berputar pada titik baut dan objek pasangannya tidak ikut bergeser; objek dengan dua sambungan atau lebih tetap tertahan.

Versi 3.8 merevisi Magic dengan pemilihan sumbu manual, pilihan simetri/sudut/pemusatan/jarak yang terpisah, preview sebelum diterapkan, perlindungan objek yang dibaut, serta rencana potong sesuai bahan yang benar-benar tersedia. Output PDF kini memakai halaman gambar A4 landscape khusus dengan objek dan label lebih besar, lalu halaman rincian bahan dan potongan yang lebih mudah dibaca.

Versi 3.9 menambahkan pusat baut bersama untuk menyatukan tiga objek atau lebih pada satu koordinat presisi, tetap mendukung sambungan ujung-ke-ujung, ujung-ke-badan, dan badan-ke-badan. Meteran kini memiliki panduan langkah, input jarak dan sudut, tombol koreksi 1 cm/1°, serta titik magnet yang selalu dapat diketuk kembali meskipun sedang dipakai sebagai sambungan.

Versi 3.10 memindahkan seluruh form bantuan dan edit titik meteran ke panel khusus di luar kanvas. Titik dan objek tetap terlihat penuh ketika jarak atau sudut dimasukkan, termasuk saat aplikasi digunakan dalam mode kanvas diperluas.
