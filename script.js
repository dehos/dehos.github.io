/*/*==================================
   KONFIGURASI SUPABASE
===================================================== */

const SUPABASE_URL =
    "https://lebwxqkbpjqqszzvmnas.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_-ZI4t9ZuLF9LuIee8W_7Fg_EUrgXFat";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


/*/*==================================
   DATA
===================================================== */

let dataBarang = [];
let transactions = [];

let tanggalDipilih = "";

let selectedProduct = null;
let selectedTransactionType = "";


/*/*==================================
   TOAST NOTIFICATION
===================================================== */

let toastTimer = null;

function showToast(message, type = "success") {

    const toast =
        document.getElementById("toast");

    const toastMessage =
        document.getElementById("toastMessage");

    if (!toast || !toastMessage) {
        return;
    }

    if (toastTimer) {
        clearTimeout(toastTimer);
    }

    toastMessage.textContent = message;

    toast.className = "toast";

    if (type) {
        toast.classList.add(type);
    }

    requestAnimationFrame(function() {
        toast.classList.add("show");
    });

    toastTimer = setTimeout(function() {
        toast.classList.remove("show");
    }, 2500);
}


/*/*==================================
   SORTING
===================================================== */

let sortMode = "nama";
let stockSortAsc = false;


/*/*==================================
   FORMAT ANGKA
===================================================== */

function formatNumber(number) {

    const value = Number(number);

    if (!Number.isFinite(value)) {
        return "-";
    }

    return new Intl.NumberFormat(
        "id-ID"
    ).format(value);
}
/*/*==================================
   FORMAT INPUT HARGA
===================================================== */

function formatHargaInput() {

    const input =
        document.getElementById(
            "penjualanHarga"
        );

    if (!input) {
        return;
    }

    const angka =
        input.value.replace(
            /\D/g,
            ""
        );

    if (!angka) {
        input.value = "";
        return;
    }

    input.value =
        new Intl.NumberFormat(
            "id-ID"
        ).format(
            Number(angka)
        );
}


const inputHarga =
    document.getElementById(
        "penjualanHarga"
    );

if (inputHarga) {

    inputHarga.addEventListener(
        "input",
        formatHargaInput
    );
}

/*/*==================================
   STATUS DATABASE
===================================================== */

function setDatabaseStatus(
    message,
    type = ""
) {

    const element =
        document.getElementById(
            "databaseStatus"
        );

    if (!element) {
        return;
    }

    element.textContent = message;

    element.className =
        "status " + type;
}


/*/*==================================
   TANGGAL HARI INI
===================================================== */

function getTodayDate() {

    const now = new Date();

    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            now.getDate()
        ).padStart(2, "0");

    return (
        year +
        "-" +
        month +
        "-" +
        day
    );
}


/*/*==================================
   LOAD BARANG
===================================================== */

async function loadBarang() {

    setDatabaseStatus(
        "⏳ Mengambil data barang..."
    );

    const {
        data,
        error
    } =
        await supabaseClient
            .from("barang")
            .select("*")
            .order(
                "nama",
                {
                    ascending: true
                }
            );

    if (error) {

        console.error(error);

        setDatabaseStatus(
            "❌ Gagal mengambil data barang: " +
            error.message,
            "error"
        );

        return;
    }

    dataBarang = data || [];

    setDatabaseStatus(
        "✅ Database terhubung, " +
        dataBarang.length +
        " item barang",
        "success"
    );

    updateTable();
}


/*/*==================================
   LOAD TRANSAKSI
===================================================== */

async function loadTransactions() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("transaksi")
            .select("*")
            .order(
                "tanggal",
                {
                    ascending: true
                }
            );

    if (error) {

        console.error(error);

        setDatabaseStatus(
            "❌ Gagal mengambil transaksi: " +
            error.message,
            "error"
        );

        return;
    }

    transactions = data || [];

    updateTable();
}


/*/*==================================
   TAMBAH BARANG
===================================================== */

async function tambahBarang() {

    const namaInput =
        document.getElementById(
            "namaBarang"
        );

    const stokInput =
        document.getElementById(
            "stokAwal"
        );

    const nama =
        namaInput.value.trim();

    const stokAwal =
        Number(
            stokInput.value
        );

    if (!nama) {

        alert(
            "Nama barang harus diisi."
        );

        namaInput.focus();

        return;
    }

    if (
        !Number.isFinite(stokAwal) ||
        stokAwal < 0
    ) {

        alert(
            "Stok awal tidak valid."
        );

        return;
    }

    const barangSudahAda =
        dataBarang.some(
            function(barang) {

                return (
                    String(barang.nama)
                        .toLowerCase()
                        .trim() ===
                    nama.toLowerCase()
                        .trim()
                );
            }
        );

    if (barangSudahAda) {

        alert(
            "Barang dengan nama tersebut sudah ada."
        );

        return;
    }

    setDatabaseStatus(
        "⏳ Menyimpan barang..."
    );

    const {
        error
    } =
        await supabaseClient
            .from("barang")
            .insert({

                nama: nama,

                stok_awal: stokAwal

            });

    if (error) {

        console.error(error);

        setDatabaseStatus(
            "❌ Gagal menyimpan barang: " +
            error.message,
            "error"
        );

        return;
    }

    namaInput.value = "";

    stokInput.value = "0";

    setDatabaseStatus(
        "✅ Barang berhasil ditambahkan.",
        "success"
    );

    await loadBarang();
    
}
// JS — script.js
// Buka modal Tambah Barang

function openTambahBarang() {
    const modal = document.getElementById("tambahBarangModal");

    if (modal) {
        modal.style.display = "flex";
    }

    document.getElementById("namaBarang")?.focus();
}


// Tutup modal Tambah Barang

function closeTambahBarang() {
    const modal = document.getElementById("tambahBarangModal");

    if (modal) {
        modal.style.display = "none";
    }
}
/*/*==================================
   HITUNG STOK
===================================================== */

function getCurrentStock(barang) {

    let stok =
        Number(
            barang.stok_awal
        ) || 0;

    transactions.forEach(
        function(transaction) {

            if (
                Number(
                    transaction.barang_id
                ) !==
                Number(
                    barang.id
                )
            ) {
                return;
            }

            /*
               Hanya hitung transaksi
               sampai tanggal yang dipilih
            */

            if (
                tanggalDipilih &&
                transaction.tanggal &&
                transaction.tanggal >
                tanggalDipilih
            ) {
                return;
            }

            if (
                transaction.type ===
                "masuk"
            ) {

                stok +=
                    Number(
                        transaction.qty
                    ) || 0;
            }

            if (
                transaction.type ===
                "laku"
            ) {

                stok -=
                    Number(
                        transaction.qty
                    ) || 0;
            }
        }
    );

    return stok;
}


/*/*==================================
   UPDATE TABEL STOK
===================================================== */

function updateTable() {

    const tbody =
        document.getElementById(
            "stockTable"
        );

    const searchElement =
        document.getElementById(
            "search"
        );

    if (!tbody || !searchElement) {
        return;
    }

    const search =
        searchElement.value
            .toLowerCase()
            .trim();

    if (
        dataBarang.length === 0
    ) {

        tbody.innerHTML =
            `
            <tr>
                <td
                    colspan="4"
                    class="empty"
                >
                    Belum ada barang.<br>
                    Silakan tambahkan barang.
                </td>
            </tr>
            `;

        updateStats();

        return;
    }

    const filtered =
        dataBarang.filter(
            function(barang) {

                return String(
                    barang.nama
                )
                    .toLowerCase()
                    .includes(search);
            }
        );


    /*/*==============================
       SORTING
   /*============================== */

    if (
        sortMode === "nama"
    ) {

        filtered.sort(
            function(a, b) {

                return String(
                    a.nama
                ).localeCompare(
                    String(b.nama),
                    "id",
                    {
                        sensitivity: "base"
                    }
                );
            }
        );

    } else {

        filtered.sort(
            function(a, b) {

                const stokA =
                    getCurrentStock(a);

                const stokB =
                    getCurrentStock(b);

                if (
                    stockSortAsc
                ) {

                    return (
                        stokA -
                        stokB
                    );
                }

                return (
                    stokB -
                    stokA
                );
            }
        );
    }


    /*/*==============================
       HASIL KOSONG
   /*============================== */

    if (
        filtered.length === 0
    ) {

        tbody.innerHTML =
            `
            <tr>
                <td
                    colspan="4"
                    class="empty"
                >
                    Barang tidak ditemukan.
                </td>
            </tr>
            `;

        updateStats();

        return;
    }


    /*/*==============================
       BERSIHKAN TABEL
   /*============================== */

    tbody.innerHTML = "";


    /*/*==============================
       TAMPILKAN DATA
   /*============================== */

    filtered
    .slice(0, 6)
    .forEach(
        function(barang, index) {
            const stok =
                getCurrentStock(
                    barang
                );

            let statusClass =
                "stock-aman";

            if (
                stok <= 0
            ) {

                statusClass =
                    "stock-habis";

            } else if (
                stok <= 5
            ) {

                statusClass =
                    "stock-menipis";
            }

            const tr =
                document.createElement(
                    "tr"
                );

            tr.innerHTML =
                `
                <td>
                    ${index + 1}
                </td>

                <td>
                    ${escapeHTML(
                        barang.nama
                    )}
                </td>

                <td
                    class="${statusClass}"
                >
                    ${formatNumber(
                        stok
                    )}
                </td>

                <td>
                    <button
                        type="button"
                        class="action-btn btn btn-success btn-sm"
                        onclick="openTransaction(${Number(barang.id)}, 'masuk')"
                    >
                        ↓ in
                    </button>
                </td>
                <td>
    <button
        type="button"
        class="action-btn btn btn-danger btn-sm"
        onclick="openTransaction(${Number(barang.id)}, 'laku')"
    >
        ↑ out
    </button>
</td>
                `;

            tbody.appendChild(
                tr
            );
        }
    );

    updateStats();
}


/*/*==================================
   SORTIR STOK
===================================================== */

function sortStock() {

    sortMode = "stok";

    stockSortAsc =
        !stockSortAsc;

    const header =
        document.getElementById(
            "stokHeader"
        );

    if (header) {

        header.textContent =
            stockSortAsc
                ? "↓"
                : "↑";
    }

    updateTable();
}


function sortNama() {

    sortMode = "nama";

    updateTable();
}


/*/*==================================
   STATISTIK
===================================================== */

function updateStats() {

    let totalStok = 0;

    dataBarang.forEach(
        function(barang) {

            totalStok +=
                getCurrentStock(
                    barang
                );
        }
    );


    /*/*==============================
       TRANSAKSI HARI INI
   /*============================== */

    const hariIni =
        getTodayDate();

    const transaksiHariIni =
        transactions.filter(
            function(transaction) {

                return (
                    transaction.tanggal ===
                    hariIni
                );
            }
        ).length;


    /*/*==============================
       ELEMENT
   /*============================== */

    const totalBarangElement =
        document.getElementById(
            "totalBarang"
        );

    const totalStokElement =
        document.getElementById(
            "totalStok"
        );

    const transaksiElement =
        document.getElementById(
            "transaksiHariIni"
        );


    /*/*==============================
       TAMPILKAN
   /*============================== */

    if (
        totalBarangElement
    ) {

        totalBarangElement.textContent =
            formatNumber(
                dataBarang.length
            );
    }

    if (
        totalStokElement
    ) {

        totalStokElement.textContent =
            formatNumber(
                totalStok
            );
    }

    if (
        transaksiElement
    ) {

        transaksiElement.textContent =
            formatNumber(
                transaksiHariIni
            );
    }

    renderHistory();
}


/*/*==================================
   BUKA MODAL TRANSAKSI
===================================================== */

function openTransaction(
    barangId,
    type
) {

    const barang =
        dataBarang.find(
            function(item) {

                return (
                    Number(item.id) ===
                    Number(barangId)
                );
            }
        );

    if (!barang) {

        alert(
            "Barang tidak ditemukan."
        );

        return;
    }

    selectedProduct =
        barang.id;

    selectedTransactionType =
        type;

    const modal =
        document.getElementById(
            "transactionModal"
        );

    const title =
        document.getElementById(
            "modalTitle"
        );

    const product =
        document.getElementById(
            "modalProduct"
        );

    if (!modal || !title || !product) {
        return;
    }

    title.textContent =
        type === "masuk"
            ? "Barang Masuk"
            : "Barang Keluar";

    product.textContent =
        barang.nama;

    const qtyInput =
        document.getElementById(
            "transactionQty"
        );

    if (qtyInput) {
        qtyInput.value = 1;
    }

    modal.style.display =
        "flex";
}


/*/*==================================
   TUTUP MODAL
===================================================== */

function closeModal() {

    const modal =
        document.getElementById(
            "transactionModal"
        );

    if (modal) {
        modal.style.display =
            "none";
    }
}


/*/*==================================
   SIMPAN TRANSAKSI
===================================================== */

async function confirmTransaction() {

    const input =
        document.getElementById("transactionQty");

    const qty =
        Number(input.value);

    if (
        !Number.isFinite(qty) ||
        qty <= 0
    ) {
        alert("Jumlah harus lebih dari 0.");
        return;
    }

    const barang =
        dataBarang.find(function(item) {
            return (
                Number(item.id) ===
                Number(selectedProduct)
            );
        });

    if (!barang) {
        alert("Barang tidak ditemukan.");
        return;
    }


    /*/*==============================
       CEK STOK UNTUK BARANG LAKU
   /*============================== */

    if (
        selectedTransactionType === "laku"
    ) {

        const stok =
            getCurrentStock(barang);

        if (qty > stok) {

            alert(
                "Jumlah barang laku melebihi stok.\n\n" +
                "Stok tersedia: " +
                formatNumber(stok)
            );

            return;
        }
    }


    /*/*==============================
       TANGGAL TRANSAKSI
   /*============================== */

    const tanggal =
        tanggalDipilih ||
        getTodayDate();


    /*/*==============================
       SIMPAN TRANSAKSI
   /*============================== */

    const {
        error
    } =
        await supabaseClient
            .from("transaksi")
            .insert({

                barang_id:
                    barang.id,

                tanggal:
                    tanggal,

                type:
                    selectedTransactionType,

                qty:
                    qty

            });


    if (error) {

        console.error(error);

        alert(
            "Gagal menyimpan transaksi:\n" +
            error.message
        );

        return;
    }


    /*/*==============================
       REFRESH
   /*============================== */

    closeModal();

    await loadTransactions();

    updateTable();


    /*/*==============================
       NOTIFIKASI
   /*============================== */

    const namaTransaksi =
        selectedTransactionType === "masuk"
            ? "Barang masuk"
            : "Barang keluar";

    showToast(
        `✅ ${namaTransaksi} ${formatNumber(qty)}`,
        "success"
    );
}

/*/*==================================
   RIWAYAT TRANSAKSI
===================================================== */

function renderHistory() {

    const tbody =
        document.getElementById(
            "historyTable"
        );

    if (!tbody) {
        return;
    }

    if (
        transactions.length === 0
    ) {

        tbody.innerHTML =
            `
            <tr>
                <td
                    colspan="6"
                    class="empty"
                >
                    Belum ada transaksi
                </td>
            </tr>
            `;

        return;
    }


    /*/*==============================
       URUTKAN
       Tanggal terbaru -> terlama
       Jika tanggal sama, ID terbaru -> terlama
   /*============================== */

    const history =
        [...transactions].sort(
            function(a, b) {

                const tanggalA =
                    String(
                        a.tanggal || ""
                    );

                const tanggalB =
                    String(
                        b.tanggal || ""
                    );

                if (
                    tanggalB !==
                    tanggalA
                ) {

                    return tanggalB.localeCompare(
                        tanggalA
                    );
                }

                return (
                    Number(b.id) -
                    Number(a.id)
                );
            }
        );


    tbody.innerHTML = "";


    /*/*==============================
       TAMPILKAN
   /*============================== */

    history.forEach(
        function(transaction) {

            const barang =
                dataBarang.find(
                    function(item) {

                        return (
                            Number(
                                item.id
                            ) ===
                            Number(
                                transaction.barang_id
                            )
                        );
                    }
                );

            const namaBarang =
                barang
                    ? barang.nama
                    : "Barang dihapus";


            const typeText =
                transaction.type ===
                "masuk"

                    ? "Masuk"

                    : "Keluar";


            const qtyText =
                transaction.type ===
                "masuk"

                    ? "+" +
                      formatNumber(
                          transaction.qty
                      )

                    : "-" +
                      formatNumber(
                          transaction.qty
                      );


            let stokAkhir =
                "-";

            if (barang) {

                stokAkhir =
                    getStockAfterTransaction(
                        barang,
                        transaction
                    );
            }


            const waktu =
                transaction.tanggal

                    ? new Date(
                        transaction.tanggal +
                        "T00:00:00"
                    ).toLocaleDateString(
                        "id-ID"
                    )

                    : "-";


            const tr =
                document.createElement(
                    "tr"
                );


            tr.innerHTML =
                `
                <td>
                    ${escapeHTML(
                        waktu
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        namaBarang
                    )}
                </td>

                <td
                    class="${
                        transaction.type === "masuk"
                            ? "history-masuk"
                            : "history-laku"
                    }"
                >
                    ${typeText}
                </td>

                <td>
                    ${qtyText}
                </td>

                <td>
                    ${formatNumber(
                        stokAkhir
                    )}
                </td>

                
                `;

            tbody.appendChild(
                tr
            );
        }
    );
}


/*/*==================================
   HAPUS TRANSAKSI
===================================================== */

async function hapusTransaksi(id) {

    const transaction =
        transactions.find(
            function(item) {

                return (
                    Number(item.id) ===
                    Number(id)
                );
            }
        );

    if (!transaction) {
        return;
    }

    const konfirmasi =
        confirm(
            "Hapus transaksi ini?\n\n" +
            "Data transaksi akan dihapus permanen."
        );

    if (!konfirmasi) {
        return;
    }

    const {
        error
    } =
        await supabaseClient
            .from("transaksi")
            .delete()
            .eq(
                "id",
                id
            );

    if (error) {

        console.error(error);

        showToast(
            "❌ Gagal menghapus transaksi",
            "error"
        );

        return;
    }

    await loadTransactions();

    showToast(
        "✅ Transaksi berhasil dihapus",
        "success"
    );
}


/*/*==================================
   STOK SETELAH TRANSAKSI
===================================================== */

function getStockAfterTransaction(
    barang,
    targetTransaction
) {

    let stok =
        Number(
            barang.stok_awal
        ) || 0;


    transactions.forEach(
        function(transaction) {

            if (
                Number(
                    transaction.barang_id
                ) !==
                Number(
                    barang.id
                )
            ) {

                return;
            }


            const tanggalTransaction =
                String(
                    transaction.tanggal || ""
                );

            const tanggalTarget =
                String(
                    targetTransaction.tanggal || ""
                );


            /*
               Transaksi setelah tanggal target
               tidak ikut dihitung
            */

            if (
                tanggalTransaction >
                tanggalTarget
            ) {

                return;
            }


            /*
               Jika tanggal sama,
               gunakan ID sebagai urutan.
            */

            if (
                tanggalTransaction ===
                tanggalTarget &&
                Number(transaction.id) >
                Number(targetTransaction.id)
            ) {

                return;
            }


            if (
                transaction.type ===
                "masuk"
            ) {

                stok +=
                    Number(
                        transaction.qty
                    ) || 0;
            }


            if (
                transaction.type ===
                "laku"
            ) {

                stok -=
                    Number(
                        transaction.qty
                    ) || 0;
            }
        }
    );


    return stok;
}


/*/*==================================
   ESCAPE HTML
===================================================== */

function escapeHTML(text) {

    return String(text)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );
}


/*/*==================================
   SEARCH
===================================================== */

const searchElement =
    document.getElementById(
        "search"
    );

if (searchElement) {

    searchElement.addEventListener(
        "input",
        updateTable
    );
}


/*/*==================================
   TOGGLE DAFTAR STOK
===================================================== */

function toggleStockList() {

    const content =
        document.getElementById(
            "stockListContent"
        );

    const button =
        document.getElementById(
            "toggleStockBtn"
        );

    if (
        !content ||
        !button
    ) {

        return;
    }

    const isOpen =
        content.classList.toggle(
            "show"
        );

    button.textContent =
        isOpen
            ? "Sembunyikan"
            : "Tampilkan";
}


/*/*==================================
   KLIK LUAR MODAL
===================================================== */

window.addEventListener(
    "click",
    function(event) {

        const modal =
            document.getElementById(
                "transactionModal"
            );

        if (
            event.target === modal
        ) {

            closeModal();
        }
    }
);


/*/*==================================
   ENTER TAMBAH BARANG
===================================================== */

const stokAwalElement =
    document.getElementById(
        "stokAwal"
    );

if (stokAwalElement) {

    stokAwalElement.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key === "Enter"
            ) {

                tambahBarang();
            }
        }
    );
}


/*/*==================================
   ESC UNTUK TUTUP MODAL
===================================================== */

document.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key === "Escape"
        ) {

            closeModal();
        }
    }
);


/*/*==================================
   PILIH TANGGAL
===================================================== */

const tanggalElement =
    document.getElementById(
        "tanggal"
    );

if (tanggalElement) {

    tanggalElement.addEventListener(
        "change",
        function() {

            tanggalDipilih =
                this.value;

            updateTable();
        }
    );
}


/*/*==================================
   INPUT PENJUALAN
===================================================== */

const inputPenjualanBarang =
    document.getElementById(
        "penjualanBarang"
    );

const saranBarang =
    document.getElementById(
        "saranBarang"
    );


if (
    inputPenjualanBarang &&
    saranBarang
) {

    inputPenjualanBarang.addEventListener(
        "input",
        function() {

            inputPenjualanBarang.dataset.id =
                "";

            const keyword =
                this.value
                    .trim()
                    .toLowerCase();

            saranBarang.innerHTML =
                "";

            if (!keyword) {
                return;
            }

            const hasil =
                dataBarang.filter(
                    function(item) {

                        return String(
                            item.nama
                        )
                            .toLowerCase()
                            .includes(
                                keyword
                            );
                    }
                );

            hasil
                .slice(0, 8)
                .forEach(
                    function(item) {

                        const div =
                            document.createElement(
                                "div"
                            );

                        div.className =
                            "saran-item";

                        div.textContent =
                            item.nama;

                        div.onclick =
                            function() {

                                inputPenjualanBarang.value =
                                    item.nama;

                                inputPenjualanBarang.dataset.id =
                                    item.id;

                                saranBarang.innerHTML =
                                    "";
                            };

                        saranBarang.appendChild(
                            div
                        );
                    }
                );
        }
    );
}

/* =====================================================
   DROPDOWN BRAND CATAT PENJUALAN
===================================================== */

const brandDropdown =
    document.getElementById("brandDropdown");

const brandDropdownButton =
    document.getElementById("brandDropdownButton");

const brandDropdownMenu =
    document.getElementById("brandDropdownMenu");

const brandDropdownText =
    document.getElementById("brandDropdownText");


if (
    brandDropdown &&
    brandDropdownButton &&
    brandDropdownMenu &&
    brandDropdownText
) {

    brandDropdownButton.addEventListener(
        "click",
        function() {

            brandDropdownMenu.classList.toggle(
                "show"
            );
        }
    );


    brandDropdownMenu
        .querySelectorAll("button")
        .forEach(
            function(button) {

                button.addEventListener(
                    "click",
                    function() {

                        const value =
                            this.dataset.value;

                        brandDropdownText.textContent =
                            value || "Pilih Brand";

                        brandDropdown.dataset.value =
                            value;

                        brandDropdownMenu.classList.remove(
                            "show"
                        );
                    }
                );
            }
        );
}
/*/*==================================
   SIMPAN PENJUALAN
===================================================== */

async function simpanPenjualan() {

    const barangId =
        inputPenjualanBarang.dataset.id;

    const brandDropdown =
    document.getElementById(
        "brandDropdown"
    );

const brand =
    brandDropdown?.dataset.value || "";

    const qty =
        Number(
            document.getElementById(
                "penjualanQty"
            ).value
        );

    const hargaInput =
        document.getElementById(
            "penjualanHarga"
        );

    const harga =
    Number(
        hargaInput.value.replace(
            /\./g,
            ""
        )
    );

    const tanggal =
        document.getElementById(
            "penjualanTanggal"
        ).value;


    /*/*==============================
       VALIDASI
   /*============================== */

    if (!barangId) {

        return alert(
            "Pilih barang dari daftar saran."
        );
    }

    if (!brand) {

        return alert(
            "Pilih brand."
        );
    }

    if (!qty || qty < 1) {

        return alert(
            "Quantity harus diisi."
        );
    }

    if (
        !hargaInput.value ||
        harga < 0
    ) {

        return alert(
            "Harga/Unit harus diisi."
        );
    }

    if (!tanggal) {

        return alert(
            "Pilih tanggal pembelian."
        );
    }


    /*/*==============================
       CEK BARANG
   /*============================== */

    const barang =
        dataBarang.find(
            function(item) {

                return (
                    String(item.id) ===
                    String(barangId)
                );
            }
        );

    if (!barang) {

        return alert(
            "Barang tidak ditemukan."
        );
    }


    /*/*==============================
       CEK STOK TERSEDIA
   /*============================== */

    const tanggalSebelumnya =
        tanggalDipilih;

    /*
       Gunakan stok pada tanggal
       penjualan yang dipilih.
    */

    tanggalDipilih =
        tanggal;

    const stokSekarang =
        getCurrentStock(
            barang
        );

    tanggalDipilih =
        tanggalSebelumnya;


    if (
        qty > stokSekarang
    ) {

        return alert(
            "Stok tidak mencukupi.\n\n" +
            "Stok tersedia: " +
            formatNumber(stokSekarang) +
            "\n" +
            "Jumlah penjualan: " +
            formatNumber(qty)
        );
    }


    /*/*==============================
       SIMPAN PENJUALAN
   /*============================== */

    const {
        data: penjualanBaru,
        error: errorPenjualan
    } =
        await supabaseClient
            .from("penjualan")
            .insert({

                barang_id:
                    barangId,

                brand:
                    brand,

                qty:
                    qty,

                harga:
                    harga,

                tanggal_pembelian:
                    tanggal
            })
            .select()
            .single();


    if (errorPenjualan) {

        console.error(
            "ERROR PENJUALAN:",
            errorPenjualan
        );

        return alert(
            "Gagal menyimpan penjualan:\n" +
            errorPenjualan.message
        );
    }


    /*/*==============================
       BUAT TRANSAKSI BARANG LAKU
   /*============================== */

    const {
        error: errorTransaksi
    } =
        await supabaseClient
            .from("transaksi")
            .insert({

                barang_id:
                    barangId,

                tanggal:
                    tanggal,

                type:
                    "laku",

                qty:
                    qty,

                penjualan_id:
                    penjualanBaru.id
            });


    /*/*==============================
       JIKA TRANSAKSI GAGAL
   /*============================== */

    if (errorTransaksi) {

        console.error(
            "ERROR TRANSAKSI STOK:",
            errorTransaksi
        );

        await supabaseClient
            .from("penjualan")
            .delete()
            .eq(
                "id",
                penjualanBaru.id
            );

        return alert(
            "Penjualan gagal mengurangi stok.\n\n" +
            errorTransaksi.message
        );
    }

/*/*==============================
   REFRESH DATA
================================================= */

await loadTransactions();

updateTable();

await initFilterPenjualan();
    /*/*==============================
       BERSIHKAN FORM
   /*============================== */

    inputPenjualanBarang.value = "";

    inputPenjualanBarang.dataset.id = "";

    document.getElementById(
    "penjualanBrand"
).value = "";

if (brandDropdown) {

    delete brandDropdown.dataset.value;
}

if (brandDropdownText) {

    document.getElementById(
    "penjualanBrand"
).value = "";

if (brandDropdown) {

    delete brandDropdown.dataset.value;
}

if (brandDropdownText) {

    brandDropdownText.textContent =
        "Pilih Brand";
}

document.getElementById(
    "penjualanQty"
).value = 1;
    document.getElementById(
        "penjualanHarga"
    ).value = "";

    document.getElementById(
        "saranBarang"
    ).innerHTML = "";
}

    /*/*==============================
       NOTIFIKASI
   /*============================== */

    showToast(
        "✅ Penjualan berhasil dicatat dan stok berkurang " +
        formatNumber(qty),
        "success"
    );
}


/*/*==================================
   LOAD PENJUALAN
===================================================== */

async function loadPenjualan() {
    const tbody =
        document.getElementById(
            "penjualanTable"
        );

    if (tbody) {

        tbody.innerHTML =
            `
            <tr>
                <td
                    colspan="7"
                    class="text-center"
                >
                    Memuat data penjualan...
                </td>
            </tr>
            `;
    }
    
    const {
        data,
        error
    } =
        await supabaseClient
            .from("penjualan")
            .select("*")
            .order(
                "tanggal_pembelian",
                {
                    ascending: false
                }
            );

    if (error) {
    console.error(
        "ERROR LOAD PENJUALAN:",
        error
    );

    const totalQtyEl =
        document.getElementById(
            "totalQtyPenjualan"
        );

    const totalPenjualanEl =
        document.getElementById(
            "totalPenjualan"
        );

    if (totalQtyEl) {
        totalQtyEl.textContent = "0";
    }

    if (totalPenjualanEl) {
        totalPenjualanEl.textContent = "Rp0";
    }

    window.dataPenjualan = [];

    return;
}

window.dataPenjualan = data || [];
window.dataPenjualan = data || [];
    const totalQtyEl =
        document.getElementById(
            "totalQtyPenjualan"
        );

    const totalPenjualanEl =
        document.getElementById(
            "totalPenjualan"
        );

    if (!tbody) {
        return;
    }


    /*/*==============================
       FILTER
   /*============================== */

    const bulan =
        document.getElementById(
            "filterBulan"
        )?.value || "";

    const brand =
        document.getElementById(
            "filterBrand"
        )?.value || "";


    const hasil =
        (data || []).filter(
            function(item) {

                if (
                    bulan &&
                    !String(
                        item.tanggal_pembelian ||
                        ""
                    ).startsWith(
                        bulan
                    )
                ) {

                    return false;
                }


                if (
                    brand &&
                    String(
                        item.brand || ""
                    )
                        .trim()
                        .toLowerCase() !==
                    String(
                        brand
                    )
                        .trim()
                        .toLowerCase()
                ) {

                    return false;
                }

                return true;
            }
        );


    /*/*==============================
       TABEL
   /*============================== */

    tbody.innerHTML = "";

    let totalQty = 0;

    let totalPenjualan = 0;


    hasil.forEach(
        function(item, index) {

            const barang =
                dataBarang.find(
                    function(b) {

                        return (
                            String(b.id) ===
                            String(item.barang_id)
                        );
                    }
                );


            const namaBarang =
                barang
                    ? barang.nama
                    : "Barang tidak ditemukan";


            const qty =
                Number(item.qty) || 0;

            const harga =
                Number(item.harga) || 0;

            const total =
                qty * harga;


            totalQty += qty;

            totalPenjualan += total;


            const tanggal =
                item.tanggal_pembelian

                    ? new Date(
                        item.tanggal_pembelian +
                        "T00:00:00"
                    ).toLocaleDateString(
                        "id-ID",
                        {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit"
                        }
                    )

                    : "-";


            tbody.innerHTML +=
                `

<tr>
    <td class="text-center">
        ${tanggal}
    </td>

    <td>
        ${escapeHTML(
            namaBarang
        )}
    </td>

    <td class="text-center">
        ${formatNumber(qty)}
    </td>

    <td class="text-end">
        Rp${formatNumber(harga)}
    </td>

    <td class="text-end">
        Rp${formatNumber(total)}
    </td>

    <td>
        ${escapeHTML(
            item.brand || "-"
        )}
    </td>

    <td class="text-center">
    <button
        type="button"
        class="edit-history-btn"
        onclick="editPenjualan(${item.id})"
        title="Edit penjualan"
    >
        ✏️
    </button>

    <button
        type="button"
        class="delete-history-btn"
        onclick="hapusPenjualan(${item.id})"
        title="Hapus penjualan"
    >
        ❌
    </button>
</td>
</tr>
                `;
        }
    );


    /*/*==============================
       KOSONG
   /*============================== */

    if (
        hasil.length === 0
    ) {

        tbody.innerHTML =
            `
            <tr>
                <td
                    colspan="7"
                    class="text-center"
                >
                    Tidak ada penjualan pada filter ini.
                </td>
            </tr>
            `;
    }


    /*/*==============================
       TOTAL
   /*============================== */

    if (totalQtyEl) {

        totalQtyEl.textContent =
            formatNumber(
                totalQty
            );
    }

    if (totalPenjualanEl) {

        totalPenjualanEl.textContent =
            "Rp" +
            formatNumber(
                totalPenjualan
            );
    }
}

/*/*==================================
   EDIT PENJUALAN
================================== */

function editPenjualan(id) {

    const penjualan =
        (window.dataPenjualan || []).find(
            function(item) {
                return Number(item.id) === Number(id);
            }
        );

    if (!penjualan) {
        alert("Data penjualan tidak ditemukan.");
        return;
    }

    const barang =
        dataBarang.find(
            function(item) {
                return String(item.id) ===
                    String(penjualan.barang_id);
            }
        );

    document.getElementById(
        "editPenjualanId"
    ).value = penjualan.id;

    document.getElementById(
        "editPenjualanBarang"
    ).value =
        barang
            ? barang.nama
            : "Barang tidak ditemukan";

    document.getElementById(
        "editPenjualanQty"
    ).value =
        Number(penjualan.qty) || 0;

    document.getElementById(
        "editPenjualanHarga"
    ).value =
        formatNumber(
            Number(penjualan.harga) || 0
        );

    document.getElementById(
        "editPenjualanBrand"
    ).value =
        penjualan.brand || "";

    document.getElementById(
        "editPenjualanTanggal"
    ).value =
        penjualan.tanggal_pembelian || "";

    document.getElementById(
        "editPenjualanModal"
    ).style.display = "flex";
}

function closeEditPenjualan() {

    const modal =
        document.getElementById(
            "editPenjualanModal"
        );

    if (modal) {
        modal.style.display = "none";
    }
}
async function simpanEditPenjualan() {

    const id =
        Number(
            document.getElementById(
                "editPenjualanId"
            ).value
        );

    const qty =
        Number(
            document.getElementById(
                "editPenjualanQty"
            ).value
        );

    const hargaInput =
        document.getElementById(
            "editPenjualanHarga"
        ).value;

    const harga =
        Number(
            hargaInput
                .replace(/\./g, "")
                .replace(/,/g, "")
        );

    const brand =
        document.getElementById(
            "editPenjualanBrand"
        ).value;

    const tanggal =
        document.getElementById(
            "editPenjualanTanggal"
        ).value;


    // ==============================
    // VALIDASI
    // ==============================

    if (!id) {
        showToast(
            "❌ Data penjualan tidak valid",
            "error"
        );
        return;
    }

    if (!qty || qty <= 0) {
        showToast(
            "❌ Quantity harus lebih dari 0",
            "error"
        );
        return;
    }

    if (!Number.isFinite(harga) || harga < 0) {
        showToast(
            "❌ Harga tidak valid",
            "error"
        );
        return;
    }

    if (!tanggal) {
        showToast(
            "❌ Tanggal harus diisi",
            "error"
        );
        return;
    }


    // ==============================
    // KONFIRMASI
    // ==============================

    const konfirmasi =
        confirm(
            "Simpan perubahan penjualan ini?"
        );

    if (!konfirmasi) {
        return;
    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient.rpc(
                "edit_penjualan_atomic",
                {
                    p_penjualan_id: id,
                    p_qty: qty,
                    p_harga: harga,
                    p_brand: brand,
                    p_tanggal: tanggal
                }
            );


        if (error) {

            console.error(
                "ERROR EDIT PENJUALAN:",
                error
            );

            showToast(
                "❌ Gagal mengubah penjualan: " +
                error.message,
                "error"
            );

            return;
        }


        console.log(
            "EDIT PENJUALAN BERHASIL:",
            data
        );


        // ==============================
        // AMBIL DATA TERBARU
        // ==============================

        await loadTransactions();
        await loadBarang();
        await loadPenjualan();

        updateTable();
        updateStats();
        renderHistory();


        // ==============================
        // TUTUP MODAL
        // ==============================

        closeEditPenjualan();


        showToast(
            "✅ Penjualan berhasil diperbarui",
            "success"
        );

    } catch (error) {

        console.error(
            "ERROR EDIT PENJUALAN:",
            error
        );

        showToast(
            "❌ Terjadi kesalahan saat mengedit penjualan",
            "error"
        );
    }
}
/*/*==================================
   HAPUS PENJUALAN
===================================================== */

async function hapusPenjualan(id) {

    if (window.sedangMenghapusPenjualan) {
        return;
    }

    window.sedangMenghapusPenjualan = true;

    try {

        const konfirmasi = confirm(
            "Hapus penjualan ini?\n\n" +
            "Data penjualan akan dihapus dan stok akan dikembalikan."
        );

        if (!konfirmasi) {
            return;
        }


        // =========================================
        // HAPUS SECARA ATOMIC MELALUI SUPABASE RPC
        // =========================================

        const { data, error } =
            await supabaseClient.rpc(
                "hapus_penjualan_atomic",
                {
                    p_penjualan_id: Number(id)
                }
            );


        // =========================================
        // JIKA GAGAL
        // =========================================

        if (error) {

            console.error(
                "ERROR HAPUS PENJUALAN:",
                error
            );

            showToast(
                "❌ Gagal menghapus penjualan: " +
                error.message,
                "error"
            );

            return;
        }


        // =========================================
        // BERHASIL
        // =========================================

        console.log(
            "PENJUALAN BERHASIL DIHAPUS:",
            data
        );


        // Ambil data terbaru dari database
        await loadTransactions();
        await loadBarang();
        await loadPenjualan();


        // Update tampilan
        updateTable();
        updateStats();
        renderHistory();


        showToast(
            "✅ Penjualan berhasil dihapus dan stok dikembalikan",
            "success"
        );

    } catch (error) {

        console.error(
            "ERROR HAPUS PENJUALAN:",
            error
        );

        showToast(
            "❌ Terjadi kesalahan saat menghapus penjualan",
            "error"
        );

    } finally {

        window.sedangMenghapusPenjualan = false;

    }
}
async function initFilterPenjualan() {

    const bulan =
        document.getElementById(
            "filterBulan"
        );

    const brand =
        document.getElementById(
            "filterBrand"
        );

    if (
        !bulan ||
        !brand
    ) {

        return;
    }
const bulanSaatIni =
    bulan.value;

const brandSaatIni =
    brand.value;

    /*/*==============================
       AMBIL DATA PENJUALAN
   /*============================== */

    const {
        data,
        error
    } =
        await supabaseClient
            .from("penjualan")
            .select(
                "tanggal_pembelian, brand"
            )
            .order(
                "tanggal_pembelian",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "ERROR FILTER PENJUALAN:",
            error
        );

        return;
    }


    /*/*==============================
       FILTER BULAN
   /*============================== */

    const bulanSet =
        new Set();

    bulanSet.add("");


    (data || []).forEach(
        function(item) {

            if (
                item.tanggal_pembelian
            ) {

                bulanSet.add(
                    String(
                        item.tanggal_pembelian
                    ).substring(
                        0,
                        7
                    )
                );
            }
        }
    );


    /*/*==============================
       BULAN SEKARANG
   /*============================== */

    const sekarang =
        new Date();

    const bulanSekarang =
        `${sekarang.getFullYear()}-${String(
            sekarang.getMonth() + 1
        ).padStart(2, "0")}`;


    bulanSet.add(
        bulanSekarang
    );


    const daftarBulan =
        [...bulanSet]
            .filter(
                function(value) {
                    return value !== "";
                }
            )
            .sort()
            .reverse();


    /*/*==============================
       ISI DROPDOWN BULAN
   /*============================== */

    bulan.innerHTML = "";


    const optionSemuaBulan =
        document.createElement(
            "option"
        );

    optionSemuaBulan.value =
        "";

    optionSemuaBulan.textContent =
        "Semua Bulan";

    bulan.appendChild(
        optionSemuaBulan
    );


    daftarBulan.forEach(
        function(value) {

            const tanggal =
                new Date(
                    value + "-01"
                );

            const label =
                tanggal.toLocaleDateString(
                    "id-ID",
                    {
                        month: "long",
                        year: "numeric"
                    }
                );


            const option =
                document.createElement(
                    "option"
                );

            option.value =
                value;

            option.textContent =
                label.charAt(0).toUpperCase() +
                label.slice(1);

            bulan.appendChild(
                option
            );
        }
    );


    
const daftarBrand = [
    ...new Set(
        (data || [])
            .map(function(item) {
                return String(item.brand || "").trim();
            })
            .filter(function(brand) {
                return brand !== "";
            })
    )
].sort(function(a, b) {
    return a.localeCompare(b, "id");
});

    /*/*==============================
       ISI DROPDOWN BRAND
   /*============================== */

    brand.innerHTML = "";


    const optionSemuaBrand =
        document.createElement(
            "option"
        );

    optionSemuaBrand.value =
        "";

    optionSemuaBrand.textContent =
        "Semua Brand";

    brand.appendChild(
        optionSemuaBrand
    );


    daftarBrand.forEach(
        function(namaBrand) {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                namaBrand;

            option.textContent =
                namaBrand;

            brand.appendChild(
                option
            );
        }
    );



if (bulanSaatIni) {

    bulan.value =
        bulanSaatIni;

} else {

    bulan.value =
        bulanSekarang;
}


if (brandSaatIni) {

    brand.value =
        brandSaatIni;

} else {

    brand.value =
        "";
}

    /*/*==============================
       TAMPILKAN DATA
   /*============================== */

    await loadPenjualan();
}

/*/*==================================
   EVENT FILTER PENJUALAN
===================================================== */

const filterBulanElement =
    document.getElementById(
        "filterBulan"
    );

const filterBrandElement =
    document.getElementById(
        "filterBrand"
    );

if (filterBulanElement) {

    filterBulanElement.addEventListener(
        "change",
        function() {

            loadPenjualan();
        }
    );
}

if (filterBrandElement) {

    filterBrandElement.addEventListener(
        "change",
        function() {

            loadPenjualan();
        }
    );
}
/*/*==================================
   EXPORT EXCEL
===================================================== */

async function exportExcel() {

    if (
        typeof XLSX ===
        "undefined"
    ) {

        alert(
            "Library Excel belum dimuat."
        );

        return;
    }


    const now =
        new Date();

    const tahun =
        now.getFullYear();

    const bulan =
        now.getMonth();

    const hariIni =
        now.getDate();


    const namaBulan = [
        "Januari",
        "Februari",
        "Maret",
        "April",
        "Mei",
        "Juni",
        "Juli",
        "Agustus",
        "September",
        "Oktober",
        "November",
        "Desember"
    ];


    const jumlahHari =
        new Date(
            tahun,
            bulan + 1,
            0
        ).getDate();


    /*/*==============================
       HEADER
   /*============================== */

    const header = [];

    header.push(
        `${namaBulan[bulan]}-${tahun}`
    );


    for (
        let hari = 1;
        hari <= jumlahHari;
        hari++
    ) {

        header.push(
            `${hari}/${bulan + 1}`
        );
    }


    const dataExcel =
        [header];


    /*/*==============================
       DATA BARANG
   /*============================== */

    dataBarang.forEach(
        function(barang) {

            let stok =
                Number(
                    barang.stok_awal
                ) || 0;


            const row = [
                barang.nama
            ];


            for (
                let hari = 1;
                hari <= jumlahHari;
                hari++
            ) {

                if (
                    hari > hariIni
                ) {

                    row.push("");

                    continue;
                }


                const tanggal =
                    `${tahun}-${String(
                        bulan + 1
                    ).padStart(
                        2,
                        "0"
                    )}-${String(
                        hari
                    ).padStart(
                        2,
                        "0"
                    )}`;


                const transaksiHari =
                    transactions.filter(
                        function(transaction) {

                            return (
                                Number(
                                    transaction.barang_id
                                ) ===
                                Number(
                                    barang.id
                                ) &&

                                transaction.tanggal ===
                                tanggal
                            );
                        }
                    );


                let perubahan = 0;

                let adaTransaksi =
                    false;


                transaksiHari.forEach(
                    function(transaction) {

                        const qty =
                            Number(
                                transaction.qty
                            ) || 0;


                        if (
                            transaction.type ===
                            "masuk"
                        ) {

                            perubahan +=
                                qty;

                            adaTransaksi =
                                true;
                        }


                        if (
                            transaction.type ===
                            "laku"
                        ) {

                            perubahan -=
                                qty;

                            adaTransaksi =
                                true;
                        }
                    }
                );


                if (
                    adaTransaksi
                ) {

                    if (
                        perubahan > 0
                    ) {

                        row.push(
                            `+${perubahan}`
                        );

                    } else {

                        row.push(
                            perubahan
                        );
                    }


                    stok +=
                        perubahan;

                } else {

                    row.push(
                        stok
                    );
                }
            }


            dataExcel.push(
                row
            );
        }
    );


    /*/*==============================
       BUAT EXCEL
   /*============================== */

    const worksheet =
        XLSX.utils.aoa_to_sheet(
            dataExcel
        );

    const workbook =
        XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Rekap Stok"
    );


    /*/*==============================
       LEBAR KOLOM
   /*============================== */

    const widths = [
        {
            wch: 38
        }
    ];


    for (
        let i = 0;
        i < jumlahHari;
        i++
    ) {

        widths.push({
            wch: 7
        });
    }


    worksheet["!cols"] =
        widths;


    /*/*==============================
       STYLE HEADER
   /*============================== */

    for (
        let c = 0;
        c <= jumlahHari;
        c++
    ) {

        const cell =
            worksheet[
                XLSX.utils.encode_cell({
                    r: 0,
                    c: c
                })
            ];


        if (!cell) {
            continue;
        }


        cell.s = {

            font: {
                bold: true
            },

            alignment: {
                horizontal: "center",
                vertical: "center"
            }
        };
    }


    /*/*==============================
       STYLE DATA
   /*============================== */

    for (
        let r = 1;
        r < dataExcel.length;
        r++
    ) {

        for (
            let c = 1;
            c <= jumlahHari;
            c++
        ) {

            const cellAddress =
                XLSX.utils.encode_cell({
                    r: r,
                    c: c
                });


            const cell =
                worksheet[cellAddress];


            if (!cell) {
                continue;
            }


            cell.s = {

                alignment: {
                    horizontal: "center",
                    vertical: "center"
                }
            };


            const barang =
                dataBarang[r - 1];


            const hari =
                c;


            const tanggal =
                `${tahun}-${String(
                    bulan + 1
                ).padStart(
                    2,
                    "0"
                )}-${String(
                    hari
                ).padStart(
                    2,
                    "0"
                )}`;


            const transaksiHari =
                transactions.filter(
                    function(transaction) {

                        return (
                            Number(
                                transaction.barang_id
                            ) ===
                            Number(
                                barang.id
                            ) &&

                            transaction.tanggal ===
                            tanggal
                        );
                    }
                );


            const adaLaku =
                transaksiHari.some(
                    function(transaction) {

                        return (
                            transaction.type ===
                            "laku"
                        );
                    }
                );


            const adaMasuk =
                transaksiHari.some(
                    function(transaction) {

                        return (
                            transaction.type ===
                            "masuk"
                        );
                    }
                );


            /*/*==============================
               LAKU
           /*============================== */

            if (
                adaLaku
            ) {

                cell.s = {

                    font: {
                        bold: true,
                        color: {
                            rgb: "FFFFFF"
                        }
                    },

                    fill: {
                        fgColor: {
                            rgb: "000000"
                        }
                    },

                    alignment: {
                        horizontal: "center",
                        vertical: "center"
                    }
                };
            }


            /*/*==============================
               MASUK
           /*============================== */

            else if (
                adaMasuk
            ) {

                cell.s = {

                    font: {
                        bold: true,
                        color: {
                            rgb: "FFFFFF"
                        }
                    },

                    fill: {
                        fgColor: {
                            rgb: "000000"
                        }
                    },

                    alignment: {
                        horizontal: "center",
                        vertical: "center"
                    }
                };
            }
        }
    }


    /*/*==============================
       EXPORT XLSX
   /*============================== */

    const excelData =
        XLSX.write(
            workbook,
            {
                bookType: "xlsx",
                type: "array"
            }
        );


    const blob =
        new Blob(
            [excelData],
            {
                type:
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;


    link.download =
        `Rekap-Stok-${namaBulan[bulan]}-${tahun}.xlsx`;


    document.body.appendChild(
        link
    );


    link.click();


    document.body.removeChild(
        link
    );


    URL.revokeObjectURL(
        url
    );
}
/*/*==================================
   EXPORT PENJUALAN
================================== */

async function exportPenjualanExcel() {

    if (typeof XLSX === "undefined") {
        alert("Library Excel belum dimuat.");
        return;
    }

    const bulan =
        document.getElementById(
            "filterBulan"
        )?.value || "";

    const brand =
        document.getElementById(
            "filterBrand"
        )?.value || "";

    const data =
        (window.dataPenjualan || []).filter(
            function(item) {

                if (
                    bulan &&
                    !String(
                        item.tanggal_pembelian || ""
                    ).startsWith(bulan)
                ) {
                    return false;
                }

                if (
                    brand &&
                    String(item.brand || "")
                        .trim()
                        .toLowerCase() !==
                    String(brand)
                        .trim()
                        .toLowerCase()
                ) {
                    return false;
                }

                return true;
            }
        );

    if (data.length === 0) {
        alert(
            "Tidak ada data penjualan untuk diekspor."
        );
        return;
    }


    const excelData = [
        [
            "No",
            "Tanggal",
            "Nama Barang",
            "Brand",
            "Qty",
            "Harga/Unit",
            "Total"
        ]
    ];

    let totalQty = 0;
    let totalPenjualan = 0;


    data.forEach(
        function(item, index) {

            const barang =
                dataBarang.find(
                    function(b) {
                        return (
                            String(b.id) ===
                            String(item.barang_id)
                        );
                    }
                );

            const namaBarang =
                barang
                    ? barang.nama
                    : "Barang tidak ditemukan";

            const qty =
                Number(item.qty) || 0;

            const harga =
                Number(item.harga) || 0;

            const total =
                qty * harga;

            totalQty += qty;
            totalPenjualan += total;


            const tanggal =
                item.tanggal_pembelian
                    ? new Date(
                        item.tanggal_pembelian +
                        "T00:00:00"
                    ).toLocaleDateString(
                        "id-ID",
                        {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit"
                        }
                    )
                    : "-";


            excelData.push([
                index + 1,
                tanggal,
                namaBarang,
                item.brand || "-",
                qty,
                harga,
                total
            ]);
        }
    );


    excelData.push([
        "",
        "",
        "",
        "TOTAL",
        totalQty,
        "",
        totalPenjualan
    ]);


    const worksheet =
        XLSX.utils.aoa_to_sheet(
            excelData
        );

    const workbook =
        XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Penjualan"
    );


    worksheet["!cols"] = [
        { wch: 6 },
        { wch: 12 },
        { wch: 35 },
        { wch: 15 },
        { wch: 10 },
        { wch: 16 },
        { wch: 18 }
    ];


    /* HEADER */
    for (
        let c = 0;
        c < 7;
        c++
    ) {

        const cell =
            worksheet[
                XLSX.utils.encode_cell({
                    r: 0,
                    c: c
                })
            ];

        if (cell) {
            cell.s = {
                font: {
                    bold: true
                },
                alignment: {
                    horizontal: "center",
                    vertical: "center"
                }
            };
        }
    }


    /* FORMAT HARGA & TOTAL */
    for (
        let r = 1;
        r < excelData.length;
        r++
    ) {

        const hargaCell =
            worksheet[
                XLSX.utils.encode_cell({
                    r: r,
                    c: 5
                })
            ];

        const totalCell =
            worksheet[
                XLSX.utils.encode_cell({
                    r: r,
                    c: 6
                })
            ];

        if (hargaCell) {
            hargaCell.z =
                '"Rp" #,##0';
        }

        if (totalCell) {
            totalCell.z =
                '"Rp" #,##0';
        }
    }


    /* FORMAT TOTAL */
    const totalRow =
        excelData.length - 1;

    for (
        let c = 0;
        c < 7;
        c++
    ) {

        const cell =
            worksheet[
                XLSX.utils.encode_cell({
                    r: totalRow,
                    c: c
                })
            ];

        if (cell) {
            cell.s = {
                font: {
                    bold: true
                }
            };
        }
    }


    const excelDataArray =
        XLSX.write(
            workbook,
            {
                bookType: "xlsx",
                type: "array"
            }
        );


    const blob =
        new Blob(
            [excelDataArray],
            {
                type:
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );

    const link =
        document.createElement("a");

    link.href = url;


    let namaFile =
        "Penjualan";

    if (brand) {
        namaFile +=
            "-" + brand;
    }

    if (bulan) {
        const tanggal =
            new Date(
                bulan + "-01"
            );

        const namaBulan =
            tanggal.toLocaleDateString(
                "id-ID",
                {
                    month: "long"
                }
            );

        const tahun =
            tanggal.getFullYear();

        namaFile +=
            "-" +
            namaBulan +
            "-" +
            tahun;
    }


    link.download =
        `${namaFile}.xlsx`;

    document.body.appendChild(
        link
    );

    link.click();

    document.body.removeChild(
        link
    );

    URL.revokeObjectURL(url);
}
/*/*==================================
   INIT
===================================================== */

async function init() {

    tanggalDipilih =
        getTodayDate();


    const tanggal =
        document.getElementById(
            "tanggal"
        );


    if (tanggal) {

        tanggal.value =
            tanggalDipilih;
            /* 
   TANGGAL PENJUALAN = HARI INI
 */

const tanggalPenjualan =
    document.getElementById(
        "penjualanTanggal"
    );

if (tanggalPenjualan) {

    const hariIni =
        new Date();

    const tahun =
        hariIni.getFullYear();

    const bulan =
        String(
            hariIni.getMonth() + 1
        ).padStart(2, "0");

    const hari =
        String(
            hariIni.getDate()
        ).padStart(2, "0");

    tanggalPenjualan.value =
        `${tahun}-${bulan}-${hari}`;
}
    }


    /*/*==============================
       LOAD DATA UTAMA
   /*============================== */

    await loadBarang();

    await loadTransactions();


    /*/*==============================
       FILTER PENJUALAN
   /*============================== */

    await initFilterPenjualan();
}


/*/*==================================
   JALANKAN APLIKASI
===================================================== */

init();
