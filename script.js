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

let bulanRiwayat =
    new Date();

bulanRiwayat =
    new Date(
        bulanRiwayat.getFullYear(),
        bulanRiwayat.getMonth(),
        1
    );

let bulanPenjualanTertua =
    "";


/*/*==================================
   TOAST NOTIFICATION
===================================================== */

const UI_ICON_PATHS = {
    plus:
        '<path d="M12 5v14M5 12h14"></path>',
    minus:
        '<path d="M5 12h14"></path>',
    chevronLeft:
        '<path d="m15 18-6-6 6-6"></path>',
    chevronRight:
        '<path d="m9 18 6-6-6-6"></path>',
    success:
        '<circle cx="12" cy="12" r="9"></circle>' +
        '<path d="m8 12 2.6 2.6L16.5 9"></path>',
    error:
        '<circle cx="12" cy="12" r="9"></circle>' +
        '<path d="m9 9 6 6M15 9l-6 6"></path>'
};

function getUiIconSvg(
    name,
    className = ""
) {
    const paths =
        UI_ICON_PATHS[name] || "";

    return (
        '<svg class="ui-svg-icon ' +
        className +
        '" viewBox="0 0 24 24" aria-hidden="true">' +
        paths +
        "</svg>"
    );
}

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

    const toastIconName =
        type === "error"
            ? "error"
            : "success";

    toastMessage.innerHTML =
        getUiIconSvg(
            toastIconName,
            "toast-status-icon"
        );

    const toastText =
        document.createElement("span");

    toastText.textContent =
        String(message || "").trim();

    toastMessage.appendChild(
        toastText
    );

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
let halamanStok = 1;
const jumlahPerHalamanStok = 6;
const jumlahTombolHalaman = 5;

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

    const statusType =
        type === "success" ||
        type === "error"
            ? type
            : "loading";

    const icon =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg"
        );

    icon.setAttribute(
        "viewBox",
        "0 0 24 24"
    );

    icon.setAttribute(
        "aria-hidden",
        "true"
    );

    icon.classList.add(
        "database-status-icon",
        "database-status-icon-" +
            statusType
    );

    if (statusType === "success") {
        icon.innerHTML =
            '<circle cx="12" cy="12" r="9"></circle>' +
            '<path d="m8 12 2.6 2.6L16.5 9"></path>';
    } else if (statusType === "error") {
        icon.innerHTML =
            '<circle cx="12" cy="12" r="9"></circle>' +
            '<path d="m9 9 6 6M15 9l-6 6"></path>';
    } else {
        icon.innerHTML =
            '<circle cx="12" cy="12" r="8"></circle>' +
            '<path d="M12 4a8 8 0 0 1 8 8"></path>';
    }

    const text =
        document.createElement("span");

    text.textContent =
        String(message || "")
            .trim();

    element.replaceChildren(
        icon,
        text
    );

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
   LOAD BRAND BARANG BARU
===================================================== */

async function loadBrandBarangBaru() {

    const selectBrand =
        document.getElementById(
            "brandBarangBaru"
        );

    if (!selectBrand) {
        return;
    }

    selectBrand.innerHTML =
        '<option value="">Memuat daftar brand...</option>';

    const {
        data,
        error
    } =
        await supabaseClient
            .from("brand")
            .select("id, nama")
            .eq("aktif", true)
            .order(
                "nama",
                {
                    ascending: true
                }
            );

    if (error) {

        console.error(
            "ERROR LOAD BRAND:",
            error
        );

        selectBrand.innerHTML =
            '<option value="">Gagal memuat brand</option>';

        return;
    }

    selectBrand.innerHTML =
        '<option value="">Pilih Brand</option>';

    (data || []).forEach(
        function(item) {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                String(item.id);

            option.textContent =
                item.nama;

            selectBrand.appendChild(
                option
            );
        }
    );
}
/*/*==================================
   LOAD BARANG
===================================================== */
async function loadBarang() {
    setDatabaseStatus(
        "Mengambil data barang..."
    );

    const batasPerHalaman = 1000;

    let posisiAwal = 0;
    let semuaBarang = [];

    while (true) {
        const posisiAkhir =
            posisiAwal +
            batasPerHalaman -
            1;

        const { data, error } =
            await supabaseClient
                .from("barang")
                .select(
    "id, nama, stok_awal, created_at, brand_id, brand:brand!barang_brand_id_fkey(id, nama, aktif)"
)
                .order(
                    "nama",
                    {
                        ascending: true
                    }
                )
                .order(
                    "id",
                    {
                        ascending: true
                    }
                )
                .range(
                    posisiAwal,
                    posisiAkhir
                );

        if (error) {
            console.error(
                "ERROR LOAD BARANG:",
                error
            );

            setDatabaseStatus(
                "Gagal mengambil data barang: " +
                    error.message,
                "error"
            );
            return;
        }

        const hasil =
            data || [];

        semuaBarang.push(
            ...hasil
        );

        if (
            hasil.length <
            batasPerHalaman
        ) {
            break;
        }

        posisiAwal +=
            batasPerHalaman;
    }

    dataBarang =
        semuaBarang;

    setDatabaseStatus(
        "Database aktif " +
            dataBarang.length +
            "· barang",
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
            "Gagal mengambil transaksi: " +
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

    const brandInput =
        document.getElementById(
            "brandBarangBaru"
        );

    const nama =
        namaInput.value.trim();

    const stokAwal =
        Number(
            stokInput.value
        );

    const brandId =
        Number(
            brandInput?.value
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

        stokInput.focus();

        return;
    }

    if (
        !Number.isInteger(brandId) ||
        brandId < 1
    ) {

        alert(
            "Pilih brand barang."
        );

        brandInput?.focus();

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
        "Menyimpan barang..."
    );

    const {
        error
    } =
        await supabaseClient
            .from("barang")
            .insert({

                nama: nama,

                stok_awal: stokAwal,

                brand_id: brandId

            });

    if (error) {

        console.error(
            "ERROR TAMBAH BARANG:",
            error
        );

        setDatabaseStatus(
            "Gagal menyimpan barang: " +
                error.message,
            "error"
        );

        return;
    }

    namaInput.value = "";

    stokInput.value = "0";

    if (brandInput) {
        brandInput.value = "";
    }

    setDatabaseStatus(
        "Barang berhasil ditambahkan.",
        "success"
    );

    await loadBarang();
}


/*/*==================================
   BUKA MODAL TAMBAH BARANG
===================================================== */

function openTambahBarang() {

    const modal =
        document.getElementById(
            "tambahBarangModal"
        );

    if (modal) {
        modal.style.display = "flex";
    }

    document.getElementById(
        "namaBarang"
    )?.focus();
}


/*/*==================================
   TUTUP MODAL TAMBAH BARANG
===================================================== */

function closeTambahBarang() {

    const modal =
        document.getElementById(
            "tambahBarangModal"
        );

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


/* =====================================================
   PENCARIAN BARANG BERDASARKAN RELEVANSI
===================================================== */

function normalizeSearchValue(value) {

    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("id-ID")
        .trim();
}

function getBarangSearchScore(
    barang,
    keyword
) {

    const query =
        normalizeSearchValue(keyword);

    if (!query) {
        return 0;
    }

    const nama =
        normalizeSearchValue(
            barang?.nama
        );

    const brand =
        normalizeSearchValue(
            barang?.brand?.nama
        );

    const namaWords =
        nama.split(/[\s\-_/]+/);

    const brandWords =
        brand.split(/[\s\-_/]+/);

    if (brand === query) {
        return 0;
    }

    if (brand.startsWith(query)) {
        return 1;
    }

    if (nama === query) {
        return 2;
    }

    if (nama.startsWith(query)) {
        return 3;
    }

    if (
        brandWords.some(
            word => word.startsWith(query)
        )
    ) {
        return 4;
    }

    if (
        namaWords.some(
            word => word.startsWith(query)
        )
    ) {
        return 5;
    }

    if (brand.includes(query)) {
        return 6;
    }

    if (nama.includes(query)) {
        return 7;
    }

    return Number.POSITIVE_INFINITY;
}

function compareBarangSearchResults(
    a,
    b,
    keyword
) {

    const scoreDifference =
        getBarangSearchScore(a, keyword) -
        getBarangSearchScore(b, keyword);

    if (scoreDifference !== 0) {
        return scoreDifference;
    }

    const brandComparison =
        String(a?.brand?.nama || "")
            .localeCompare(
                String(b?.brand?.nama || ""),
                "id",
                {
                    sensitivity: "base"
                }
            );

    if (brandComparison !== 0) {
        return brandComparison;
    }

    return String(a?.nama || "")
        .localeCompare(
            String(b?.nama || ""),
            "id",
            {
                sensitivity: "base"
            }
        );
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
renderPaginationStok(0);
        return;
    }

    const filtered =
        dataBarang.filter(
            function(barang) {

                return (
                    getBarangSearchScore(
                        barang,
                        search
                    ) <
                    Number.POSITIVE_INFINITY
                );
            }
        );


    if (search) {

        filtered.sort(
            function(a, b) {

                return compareBarangSearchResults(
                    a,
                    b,
                    search
                );
            }
        );

    } else if (
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
renderPaginationStok(0);
        return;
    }

tbody.innerHTML = "";

const totalHalaman =
    Math.max(
        1,
        Math.ceil(
            filtered.length /
            jumlahPerHalamanStok
        )
    );

if (halamanStok > totalHalaman) {
    halamanStok = totalHalaman;
}

if (halamanStok < 1) {
    halamanStok = 1;
}

const indeksAwal =
    (halamanStok - 1) *
    jumlahPerHalamanStok;

const indeksAkhir =
    indeksAwal +
    jumlahPerHalamanStok;

const dataHalaman =
    filtered.slice(
        indeksAwal,
        indeksAkhir
    );

dataHalaman.forEach(
    function(barang, index) {

        const stok =
            getCurrentStock(
                barang
            );

        let statusClass =
            "stock-aman";

        if (stok <= 0) {

            statusClass =
                "stock-habis";

        } else if (stok <= 5) {

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
                ${indeksAwal + index + 1}
            </td>

            <td>
                ${escapeHTML(
                    barang.nama
                )}
            </td>

            <td class="stock-cell">
                <span class="stock-badge ${statusClass}">
                    ${formatNumber(
                        stok
                    )}
                </span>
            </td>

            <td class="stock-actions-cell">
                <div class="stock-action-group">
                    <button
                        type="button"
                        class="action-btn stock-in-btn"
                        onclick="openTransaction(${Number(barang.id)}, 'masuk')"
                        aria-label="Tambah stok ${escapeHTML(barang.nama)}"
                        title="Barang masuk"
                    >
                        ${getUiIconSvg("plus", "stock-action-icon")}
                        <span>Masuk</span>
                    </button>

                    <button
                        type="button"
                        class="action-btn stock-out-btn"
                        onclick="openTransaction(${Number(barang.id)}, 'laku')"
                        aria-label="Kurangi stok ${escapeHTML(barang.nama)}"
                        title="Barang keluar"
                    >
                        ${getUiIconSvg("minus", "stock-action-icon")}
                        <span>Keluar</span>
                    </button>
                </div>
            </td>
            `;

        tbody.appendChild(tr);
    }
);

renderPaginationStok(
    filtered.length
);

updateStats();
}

function renderPaginationStok(totalData) {

    const pagination =
        document.getElementById(
            "stockPagination"
        );

    const informasi =
        document.getElementById(
            "stockPaginationInfo"
        );

    if (!pagination || !informasi) {
        return;
    }

    pagination.innerHTML = "";

    if (totalData === 0) {
        informasi.textContent = "";
        return;
    }

    const totalHalaman =
        Math.ceil(
            totalData /
            jumlahPerHalamanStok
        );

    const dataPertama =
        (halamanStok - 1) *
        jumlahPerHalamanStok + 1;

    const dataTerakhir =
        Math.min(
            halamanStok *
            jumlahPerHalamanStok,
            totalData
        );

    informasi.textContent =
        "Menampilkan " +
        dataPertama +
        "–" +
        dataTerakhir +
        " dari " +
        formatNumber(totalData) +
        " barang";

    const tombolSebelumnya =
        document.createElement(
            "button"
        );

    tombolSebelumnya.type =
        "button";

    tombolSebelumnya.innerHTML =
        getUiIconSvg(
            "chevronLeft",
            "pagination-icon"
        );

    tombolSebelumnya.disabled =
        halamanStok === 1;

    tombolSebelumnya.addEventListener(
        "click",
        function() {
            ubahHalamanStok(
                halamanStok - 1,
                totalHalaman
            );
        }
    );

    pagination.appendChild(
        tombolSebelumnya
    );

    const awalKelompok =
        Math.floor(
            (halamanStok - 1) /
            jumlahTombolHalaman
        ) *
        jumlahTombolHalaman + 1;

    const akhirKelompok =
        Math.min(
            awalKelompok +
            jumlahTombolHalaman - 1,
            totalHalaman
        );

    if (awalKelompok > 1) {

        const titikAwal =
            document.createElement(
                "span"
            );

        titikAwal.className =
            "pagination-dots";

        titikAwal.textContent =
            "…";

        pagination.appendChild(
            titikAwal
        );
    }

    for (
        let halaman = awalKelompok;
        halaman <= akhirKelompok;
        halaman++
    ) {

        const tombol =
            document.createElement(
                "button"
            );

        tombol.type =
            "button";

        tombol.textContent =
            halaman;

        if (
            halaman ===
            halamanStok
        ) {
            tombol.classList.add(
                "active"
            );
        }

        tombol.addEventListener(
            "click",
            function() {
                ubahHalamanStok(
                    halaman,
                    totalHalaman
                );
            }
        );

        pagination.appendChild(
            tombol
        );
    }

    if (
        akhirKelompok <
        totalHalaman
    ) {

        const titikAkhir =
            document.createElement(
                "span"
            );

        titikAkhir.className =
            "pagination-dots";

        titikAkhir.textContent =
            "…";

        pagination.appendChild(
            titikAkhir
        );
    }

    const tombolBerikutnya =
        document.createElement(
            "button"
        );

    tombolBerikutnya.type =
        "button";

    tombolBerikutnya.innerHTML =
        getUiIconSvg(
            "chevronRight",
            "pagination-icon"
        );

    tombolBerikutnya.disabled =
        halamanStok ===
        totalHalaman;

    tombolBerikutnya.addEventListener(
        "click",
        function() {
            ubahHalamanStok(
                halamanStok + 1,
                totalHalaman
            );
        }
    );

    pagination.appendChild(
        tombolBerikutnya
    );
}


function ubahHalamanStok(
    halaman,
    totalHalaman
) {

    halamanStok =
        Math.min(
            Math.max(
                halaman,
                1
            ),
            totalHalaman
        );

    updateTable();

    const tabel =
        document.querySelector(
            "#stockListContent .table-wrapper"
        );

    if (tabel) {
        tabel.scrollTop = 0;
    }
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
                    Number(
                        item.id
                    ) ===
                    Number(
                        barangId
                    )
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
        document.getElementById(
            "transactionQty"
        );

    const qty =
        Number(
            input.value
        );

    if (
        !Number.isFinite(qty) ||
        qty <= 0
    ) {

        alert(
            "Jumlah harus lebih dari 0."
        );

        return;
    }

    const barang =
        dataBarang.find(
            function(item) {

                return (
                    Number(
                        item.id
                    ) ===
                    Number(
                        selectedProduct
                    )
                );
            }
        );

    if (!barang) {

        alert(
            "Barang tidak ditemukan."
        );

        return;
    }


    if (
        selectedTransactionType ===
        "laku"
    ) {

        const stok =
            getCurrentStock(
                barang
            );

        if (
            qty > stok
        ) {

            alert(
                "Jumlah barang laku melebihi stok.\n\n" +
                "Stok tersedia: " +
                formatNumber(stok)
            );

            return;
        }
    }


    const tanggal =
        tanggalDipilih ||
        getTodayDate();


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

        console.error(
            error
        );

        alert(
            "Gagal menyimpan transaksi:\n" +
            error.message
        );

        return;
    }


    closeModal();

    await loadTransactions();

    updateTable();


    const namaTransaksi =
        selectedTransactionType ===
        "masuk"
            ? "Barang masuk"
            : "Barang keluar";

    showToast(
        `${namaTransaksi} ${formatNumber(qty)}`,
        "success"
    );
}
/*/*==================================
   RIWAYAT TRANSAKSI
===================================================== */

function getAwalBulanSekarang() {

    const sekarang =
        new Date();

    return new Date(
        sekarang.getFullYear(),
        sekarang.getMonth(),
        1
    );
}


function getBulanTransaksiTertua() {

    const tanggalValid =
        transactions
            .map(
                function(transaction) {
                    return String(
                        transaction.tanggal || ""
                    );
                }
            )
            .filter(
                function(tanggal) {
                    return /^\d{4}-\d{2}-\d{2}$/.test(
                        tanggal
                    );
                }
            )
            .sort();

    if (tanggalValid.length === 0) {
        return null;
    }

    const bagian =
        tanggalValid[0].split("-");

    return new Date(
        Number(bagian[0]),
        Number(bagian[1]) - 1,
        1
    );
}


function formatBulanRiwayat(tanggal) {

    const teks =
        tanggal.toLocaleDateString(
            "id-ID",
            {
                month: "long",
                year: "numeric"
            }
        );

    return (
        teks.charAt(0).toUpperCase() +
        teks.slice(1)
    );
}


function updateNavigasiBulanRiwayat() {

    const label =
        document.getElementById(
            "historyMonthLabel"
        );

    const tombolSebelumnya =
        document.getElementById(
            "historyPrevMonth"
        );

    const tombolBerikutnya =
        document.getElementById(
            "historyNextMonth"
        );

    const bulanSekarang =
        getAwalBulanSekarang();

    const bulanTertua =
        getBulanTransaksiTertua();

    if (label) {
        label.textContent =
            formatBulanRiwayat(
                bulanRiwayat
            );
    }

    if (tombolSebelumnya) {
        tombolSebelumnya.disabled =
            !bulanTertua ||
            bulanRiwayat <=
                bulanTertua;
    }

    if (tombolBerikutnya) {
        tombolBerikutnya.disabled =
            bulanRiwayat >=
                bulanSekarang;
    }
}


function ubahBulanRiwayat(perubahan) {

    const bulanTujuan =
        new Date(
            bulanRiwayat.getFullYear(),
            bulanRiwayat.getMonth() +
                Number(perubahan),
            1
        );

    const bulanSekarang =
        getAwalBulanSekarang();

    const bulanTertua =
        getBulanTransaksiTertua();

    if (
        bulanTujuan >
        bulanSekarang
    ) {
        return;
    }

    if (
        Number(perubahan) < 0 &&
        (
            !bulanTertua ||
            bulanTujuan <
                bulanTertua
        )
    ) {
        return;
    }

    bulanRiwayat =
        bulanTujuan;

    renderHistory();
}


function renderHistory() {

    const tbody =
        document.getElementById(
            "historyTable"
        );

    if (!tbody) {
        return;
    }

    updateNavigasiBulanRiwayat();

    const tahun =
        bulanRiwayat.getFullYear();

    const bulan =
        String(
            bulanRiwayat.getMonth() + 1
        ).padStart(2, "0");

    const awalanTanggal =
        tahun + "-" + bulan;

    const history =
        transactions
            .filter(
                function(transaction) {

                    return String(
                        transaction.tanggal ||
                        ""
                    ).startsWith(
                        awalanTanggal
                    );
                }
            )
            .sort(
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

    if (history.length === 0) {

        tbody.innerHTML =
            `
            <tr>
                <td
                    colspan="5"
                    class="empty"
                >
                    Tidak ada transaksi pada
                    ${escapeHTML(
                        formatBulanRiwayat(
                            bulanRiwayat
                        )
                    )}
                </td>
            </tr>
            `;

        return;
    }

    tbody.innerHTML = "";

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
            "Gagal menghapus transaksi",
            "error"
        );

        return;
    }

    await loadTransactions();

    showToast(
        "Transaksi berhasil dihapus",
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


            if (
                tanggalTransaction >
                tanggalTarget
            ) {

                return;
            }


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
    function() {

        halamanStok = 1;

        updateTable();
    }
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
const inputPenjualanBrand =
    document.getElementById(
        "penjualanBrand"
    );

const inputPenjualanQty =
    document.getElementById("penjualanQty");

const inputPenjualanHarga =
    document.getElementById("penjualanHarga");

const inputPenjualanTanggal =
    document.getElementById("penjualanTanggal");

const simpanPenjualanButton =
    document.getElementById("simpanPenjualanButton");

let penjualanSedangDisimpan = false;

function getPenjualanStock(
    barang,
    tanggal
) {
    if (!barang) return 0;

    const tanggalSebelumnya =
        tanggalDipilih;

    tanggalDipilih =
        tanggal || tanggalSebelumnya;

    const stok =
        getCurrentStock(barang);

    tanggalDipilih =
        tanggalSebelumnya;

    return stok;
}

function getSelectedPenjualanBarang() {
    const barangId =
        inputPenjualanBarang?.dataset.id;

    return dataBarang.find(
        function(item) {
            return String(item.id) ===
                String(barangId);
        }
    );
}

function setPenjualanSaving(saving) {
    penjualanSedangDisimpan = saving;

    if (!simpanPenjualanButton) return;

    simpanPenjualanButton.textContent =
        saving
            ? "Menyimpan..."
            : "Catat Penjualan";

    simpanPenjualanButton.disabled =
        saving;
}

function updatePenjualanSummary() {
    const barang =
        getSelectedPenjualanBarang();

    const qty =
        Math.max(
            Number(inputPenjualanQty?.value) || 0,
            0
        );

    const harga =
        Number(
            String(inputPenjualanHarga?.value || "")
                .replace(/\./g, "")
        ) || 0;

    const stok =
        getPenjualanStock(
            barang,
            inputPenjualanTanggal?.value
        );

    const total =
        qty * harga;

    const totalElement =
        document.getElementById(
            "penjualanTotalPreview"
        );

    const calculationElement =
        document.getElementById(
            "penjualanCalculation"
        );

    const stockElement =
        document.getElementById(
            "penjualanStockInfo"
        );

    if (totalElement) {
        totalElement.textContent =
            "Rp" + formatNumber(total);
    }

    if (calculationElement) {
        calculationElement.textContent =
            formatNumber(qty) +
            " × Rp" +
            formatNumber(harga);
    }

    const stokTidakCukup =
        Boolean(barang) &&
        qty > stok;

    if (stockElement) {
        stockElement.classList.toggle(
            "is-error",
            stokTidakCukup
        );

        stockElement.textContent =
            barang
                ? (
                    stokTidakCukup
                        ? "⚠ Quantity melebihi stok. Tersedia: " +
                          formatNumber(stok)
                        : "Stok tersedia: " +
                          formatNumber(stok)
                  )
                : "Pilih barang untuk melihat stok.";
    }

    if (simpanPenjualanButton) {
        simpanPenjualanButton.disabled =
            penjualanSedangDisimpan ||
            !barang ||
            !inputPenjualanBrand?.value.trim() ||
            qty < 1 ||
            !inputPenjualanHarga?.value ||
            !inputPenjualanTanggal?.value ||
            stokTidakCukup;
    }
}

if (
    inputPenjualanBarang &&
    saranBarang
) {

    inputPenjualanBarang.addEventListener(
        "input",
        function() {

            inputPenjualanBarang.dataset.id =
                "";
if (inputPenjualanBrand) {
    inputPenjualanBrand.value = "";
}
            updatePenjualanSummary();

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
                dataBarang
                    .filter(
                        function(item) {

                            return (
                                getBarangSearchScore(
                                    item,
                                    keyword
                                ) <
                                Number.POSITIVE_INFINITY
                            );
                        }
                    )
                    .sort(
                        function(a, b) {

                            return compareBarangSearchResults(
                                a,
                                b,
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

                        const stokSaran =
                            getPenjualanStock(
                                item,
                                inputPenjualanTanggal?.value
                            );

                        div.innerHTML =
                            "<strong>" +
                            escapeHTML(item.nama) +
                            "</strong><small>" +
                            escapeHTML(
                                item.brand?.nama ||
                                "Tanpa brand"
                            ) +
                            " · Stok " +
                            formatNumber(stokSaran) +
                            "</small>";

                        div.onclick =
                            function() {

                                inputPenjualanBarang.value =
                                    item.nama;

                                inputPenjualanBarang.dataset.id =
                                    item.id;
if (inputPenjualanBrand) {
    inputPenjualanBrand.value =
        item.brand?.nama || "";
}
                                saranBarang.innerHTML =
                                    "";

                                updatePenjualanSummary();
                                inputPenjualanQty?.focus();
                            };

                        saranBarang.appendChild(
                            div
                        );
                    }
                );
        }
    );
}


[inputPenjualanQty, inputPenjualanHarga, inputPenjualanTanggal]
    .filter(Boolean)
    .forEach(
        function(input) {
            input.addEventListener(
                "input",
                updatePenjualanSummary
            );
            input.addEventListener(
                "change",
                updatePenjualanSummary
            );
        }
    );

[inputPenjualanBarang, inputPenjualanQty, inputPenjualanHarga]
    .filter(Boolean)
    .forEach(
        function(input) {
            input.addEventListener(
                "keydown",
                function(event) {
                    if (
                        event.key === "Enter" &&
                        !simpanPenjualanButton?.disabled
                    ) {
                        event.preventDefault();
                        simpanPenjualan();
                    }
                }
            );
        }
    );

/* =====================================================
   DROPDOWN BRAND CATAT PENJUALAN
===================================================== */

const brandDropdown =
    document.getElementById(
        "brandDropdown"
    );

const brandDropdownButton =
    document.getElementById(
        "brandDropdownButton"
    );

const brandDropdownMenu =
    document.getElementById(
        "brandDropdownMenu"
    );

const brandDropdownText =
    document.getElementById(
        "brandDropdownText"
    );


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

    if (penjualanSedangDisimpan) {
        return;
    }

    const barangId =
        inputPenjualanBarang.dataset.id;

    const brand =
    inputPenjualanBrand?.value.trim() || "";
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


    if (!barangId) {

        return alert(
            "Pilih barang dari daftar saran."
        );
    }

    if (!brand) {

    return alert(
        "Barang belum memiliki brand."
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


    const tanggalSebelumnya =
        tanggalDipilih;

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


    const dikonfirmasi =
        window.confirm(
            "Catat penjualan ini?\n\n" +
            "Barang: " + barang.nama + "\n" +
            "Quantity: " + formatNumber(qty) + "\n" +
            "Total: Rp" +
            formatNumber(qty * harga)
        );

    if (!dikonfirmasi) {
        return;
    }

    setPenjualanSaving(true);

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

        setPenjualanSaving(false);
        updatePenjualanSummary();

        return alert(
            "Gagal menyimpan penjualan:\n" +
            errorPenjualan.message
        );
    }


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

        setPenjualanSaving(false);
        updatePenjualanSummary();

        return alert(
            "Penjualan gagal mengurangi stok.\n\n" +
            errorTransaksi.message
        );
    }


    await loadTransactions();

    updateTable();

    await initFilterPenjualan();


    inputPenjualanBarang.value = "";

    inputPenjualanBarang.dataset.id = "";

    document.getElementById(
        "penjualanBrand"
    ).value = "";

    document.getElementById(
        "penjualanQty"
    ).value = 1;

    document.getElementById(
        "penjualanHarga"
    ).value = "";

    document.getElementById(
        "saranBarang"
    ).innerHTML = "";


    setPenjualanSaving(false);
    updatePenjualanSummary();

    showToast(
        "Penjualan berhasil dicatat dan stok berkurang " +
        formatNumber(qty),
        "success"
    );
}


/* =====================================================
   TARGET PENJUALAN BULANAN PER BRAND
===================================================== */

const TARGET_PENJUALAN_BRAND =
    Object.freeze([
        {
            nama: "Belleza",
            target: 15000000
        },
        {
            nama: "Solid",
            target: 15000000
        },
        {
            nama: "Dekkson",
            target: 15000000
        },
        {
            nama: "PJS Handle",
            target: null
        },
        {
            nama: "Rona",
            target: 20000000
        },
        {
            nama: "Vapely/Wepe",
            target: 15000000
        },
        {
            nama: "Tsunami",
            target: 15000000
        },
        {
            nama: "Trisensa",
            target: 10000000
        },
        {
            nama: "Violet",
            target: 15000000
        }
    ]);

const TARGET_BRAND_COLORS =
    Object.freeze({
        Belleza: "#86cfa5",
        Solid: "#b58a16",
        Dekkson: "#7cb8d8",
        Violet: "#a78bca",
        "Vapely/Wepe": "#8b5e3c",
        Tsunami: "#ef8354",
        Trisensa: "#176b45",
        Rona: "#9ca3af"
    });

function getCanonicalTargetBrand(
    brandName
) {

    const normalized =
        normalizeSearchValue(
            brandName
        );

    if (normalized === "bellezza") {
        return "Belleza";
    }

    if (
        [
            "vapely",
            "wepe",
            "vapely/wepe",
            "wepe/vapely"
        ].includes(
            normalized
        )
    ) {
        return "Vapely/Wepe";
    }

    const match =
        TARGET_PENJUALAN_BRAND.find(
            function(item) {

                return (
                    normalizeSearchValue(
                        item.nama
                    ) ===
                    normalized
                );
            }
        );

    return match
        ? match.nama
        : "";
}

function renderTargetPenjualan(
    penjualan,
    bulan
) {

    const list =
        document.getElementById(
            "targetPenjualanList"
        );

    const monthLabel =
        document.getElementById(
            "targetPenjualanMonthLabel"
        );

    const totalTargetElement =
        document.getElementById(
            "targetPenjualanTotal"
        );

    const achievementElement =
        document.getElementById(
            "targetPenjualanAchievement"
        );

    if (
        !list ||
        !monthLabel ||
        !totalTargetElement ||
        !achievementElement
    ) {
        return;
    }

    const periode =
        bulan ||
        getBulanPenjualanSekarang();

    monthLabel.textContent =
        formatBulanPenjualan(
            periode
        );

    const totals = {};

    TARGET_PENJUALAN_BRAND.forEach(
        function(item) {
            totals[item.nama] = 0;
        }
    );

    (penjualan || []).forEach(
        function(item) {

            if (
                periode &&
                !String(
                    item.tanggal_pembelian || ""
                ).startsWith(
                    periode
                )
            ) {
                return;
            }

            const canonicalBrand =
                getCanonicalTargetBrand(
                    item.brand
                );

            if (!canonicalBrand) {
                return;
            }

            const qty =
                Number(item.qty) || 0;

            const harga =
                Number(item.harga) || 0;

            totals[canonicalBrand] +=
                qty * harga;
        }
    );

    const targetedBrands =
        TARGET_PENJUALAN_BRAND
            .filter(
                function(item) {
                    return item.target !== null;
                }
            )
            .map(
                function(item) {

                    const actual =
                        totals[item.nama] || 0;

                    const percentage =
                        item.target > 0
                            ? (
                                actual /
                                item.target
                              ) * 100
                            : 0;

                    return {
                        ...item,
                        actual,
                        percentage
                    };
                }
            )
            .sort(
                function(a, b) {

                    if (
                        b.percentage !==
                        a.percentage
                    ) {
                        return (
                            b.percentage -
                            a.percentage
                        );
                    }

                    return a.nama.localeCompare(
                        b.nama,
                        "id",
                        {
                            sensitivity: "base"
                        }
                    );
                }
            );

    const totalTarget =
        targetedBrands.reduce(
            function(total, item) {
                return total + item.target;
            },
            0
        );

    const totalActual =
        targetedBrands.reduce(
            function(total, item) {
                return total + item.actual;
            },
            0
        );

    const totalPercentage =
        totalTarget > 0
            ? (
                totalActual /
                totalTarget
              ) * 100
            : 0;

    totalTargetElement.textContent =
        "Rp" +
        formatNumber(
            totalTarget
        );

    achievementElement.textContent =
        "Pencapaian " +
        formatNumber(
            Math.round(
                totalPercentage
            )
        ) +
        "% · Rp" +
        formatNumber(
            totalActual
        );

    list.innerHTML = "";

    targetedBrands.forEach(
        function(item, index) {
            const percentageRounded =
                Math.round(item.percentage);

            const progressValue =
                Math.min(
                    Math.max(item.percentage, 0),
                    100
                );

            const brandColor =
                TARGET_BRAND_COLORS[item.nama] ||
                "#64748b";

            const card =
                document.createElement("article");

            card.className =
                "target-brand-card";

            card.style.setProperty(
                "--brand-color",
                brandColor
            );

            card.style.setProperty(
                "--progress",
                progressValue
            );

            card.innerHTML =
                `
                <div class="target-card-header">
                    <span class="target-card-rank">
                        ${String(index + 1).padStart(2, "0")}
                    </span>
                    <strong>${escapeHTML(item.nama)}</strong>
                </div>

                <div
                    class="target-donut"
                    role="progressbar"
                    aria-label="Pencapaian ${escapeHTML(item.nama)}"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow="${Math.round(progressValue)}"
                >
                    <div class="target-donut-center">
                        <strong>
                            ${formatNumber(percentageRounded)}%
                        </strong>
                    </div>
                </div>

                <div class="target-card-values">
                    <strong>
                        Rp${formatNumber(item.actual)}
                    </strong>
                    <span>
                        dari Rp${formatNumber(item.target)}
                    </span>
                </div>
                `;

            list.appendChild(card);
        }
    );

    const pjsTarget =
        TARGET_PENJUALAN_BRAND.find(
            function(item) {
                return item.nama ===
                    "PJS Handle";
            }
        );

    if (pjsTarget) {
        const pjsCard =
            document.createElement("article");

        pjsCard.className =
            "target-brand-card target-brand-rainbow";

        pjsCard.innerHTML =
            `
            <div class="target-card-header">
                <span class="target-card-rank">—</span>
                <strong>PJS Handle</strong>
            </div>

            <div
                class="target-donut target-donut-rainbow"
                aria-label="PJS Handle tanpa target"
            >
                <div class="target-donut-center">
                    <small>TOTAL</small>
                </div>
            </div>

            <div class="target-card-values">
                <strong>
                    Rp${formatNumber(
                        totals["PJS Handle"] || 0
                    )}
                </strong>
                <span>Tanpa target</span>
            </div>
            `;

        list.appendChild(pjsCard);
    }

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

        renderTargetPenjualan(
            [],
            document.getElementById(
                "filterBulan"
            )?.value || ""
        );

        return;
    }


    window.dataPenjualan =
        data || [];


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


    const bulan =
        document.getElementById(
            "filterBulan"
        )?.value || "";

    const brand =
        document.getElementById(
            "filterBrand"
        )?.value || "";

    updateNavigasiBulanPenjualan();

    renderTargetPenjualan(
        data || [],
        bulan
    );


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


    tbody.innerHTML = "";

    let totalQty = 0;

    let totalPenjualan = 0;

    if (hasil.length === 0) {

        tbody.innerHTML =
            `
            <tr>
                <td
                    colspan="7"
                    class="text-center"
                >
                    Tidak ada penjualan pada
                    ${escapeHTML(
                        formatBulanPenjualan(
                            bulan
                        )
                    )}
                </td>
            </tr>
            `;
    }


    hasil.forEach(
        function(item) {

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
                        <div
                            class="sales-name-marquee"
                            title="${escapeHTML(namaBarang)}"
                        >
                            <span class="sales-name-track">
                                <span>${escapeHTML(namaBarang)}</span>
                                <span aria-hidden="true">${escapeHTML(namaBarang)}</span>
                            </span>
                        </div>
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
                            aria-label="Edit penjualan"
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M12 20h9"/>
                                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>
                            </svg>
                        </button>

                        <button
                            type="button"
                            class="delete-history-btn"
                            onclick="hapusPenjualan(${item.id})"
                            title="Hapus penjualan"
                            aria-label="Hapus penjualan"
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M3 6h18"/>
                                <path d="M8 6V4h8v2"/>
                                <path d="M19 6l-1 14H6L5 6"/>
                                <path d="M10 11v5M14 11v5"/>
                            </svg>
                        </button>
                    </td>
                </tr>
                `;
        }
    );


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
/* ==================================
   EDIT PENJUALAN
================================== */

function editPenjualan(id) {
    const penjualan = (window.dataPenjualan || []).find(
        function(item) {
            return Number(item.id) === Number(id);
        }
    );

    if (!penjualan) {
        alert("Data penjualan tidak ditemukan.");
        return;
    }

    const barang = dataBarang.find(
        function(item) {
            return String(item.id) === String(penjualan.barang_id);
        }
    );

    document.getElementById("editPenjualanId").value =
        penjualan.id;

    document.getElementById("editPenjualanBarang").value =
        barang ? barang.nama : "Barang tidak ditemukan";

    document.getElementById("editPenjualanQty").value =
        Number(penjualan.qty) || 0;

    document.getElementById("editPenjualanHarga").value =
        formatNumber(Number(penjualan.harga) || 0);

    document.getElementById("editPenjualanBrand").value =
        penjualan.brand || "";

    document.getElementById("editPenjualanTanggal").value =
        penjualan.tanggal_pembelian || "";

    document.getElementById("editPenjualanModal").style.display =
        "flex";
}

function closeEditPenjualan() {
    const modal = document.getElementById(
        "editPenjualanModal"
    );

    if (modal) {
        modal.style.display = "none";
    }
}

async function simpanEditPenjualan() {
    const id = Number(
        document.getElementById(
            "editPenjualanId"
        ).value
    );

    /*
     * Cari data penjualan untuk mendapatkan
     * barang_id yang dibutuhkan database.
     */
    const penjualan =
        (window.dataPenjualan || []).find(
            function(item) {
                return (
                    Number(item.id) === id
                );
            }
        );

    if (!penjualan) {
        showToast(
            "Data penjualan tidak ditemukan",
            "error"
        );
        return;
    }

    const barangId =
        Number(
            penjualan.barang_id
        );

    const qty = Number(
        document.getElementById(
            "editPenjualanQty"
        ).value
    );

    const hargaInput =
        document.getElementById(
            "editPenjualanHarga"
        ).value;

    const harga = Number(
        hargaInput
            .replace(/\./g, "")
            .replace(/,/g, "")
    );

    const brand =
        document.getElementById(
            "editPenjualanBrand"
        ).value.trim();

    const tanggal =
        document.getElementById(
            "editPenjualanTanggal"
        ).value;

    if (!id) {
        showToast(
            "Data penjualan tidak valid",
            "error"
        );
        return;
    }

    if (!barangId) {
        showToast(
            "Barang penjualan tidak valid",
            "error"
        );
        return;
    }

    if (!qty || qty <= 0) {
        showToast(
            "Quantity harus lebih dari 0",
            "error"
        );
        return;
    }

    if (
        !Number.isFinite(harga) ||
        harga < 0
    ) {
        showToast(
            "Harga tidak valid",
            "error"
        );
        return;
    }

    if (!brand) {
        showToast(
            "Brand harus dipilih",
            "error"
        );
        return;
    }

    if (!tanggal) {
        showToast(
            "Tanggal harus diisi",
            "error"
        );
        return;
    }

    const konfirmasi = confirm(
        "Simpan perubahan penjualan ini?"
    );

    if (!konfirmasi) {
        return;
    }

    try {
        const { data, error } =
            await supabaseClient.rpc(
                "edit_penjualan_atomic",
                {
                    p_penjualan_id: id,
                    p_barang_id: barangId,
                    p_brand: brand,
                    p_qty: qty,
                    p_harga: harga,
                    p_tanggal_pembelian:
                        tanggal
                }
            );

        if (error) {
            console.error(
                "ERROR EDIT PENJUALAN:",
                error
            );

            showToast(
                "Gagal mengubah penjualan: " +
                    error.message,
                "error"
            );
            return;
        }

        console.log(
            "EDIT PENJUALAN BERHASIL:",
            data
        );

        await loadTransactions();
        await loadBarang();
        await loadPenjualan();

        updateTable();
        updateStats();
        renderHistory();

        closeEditPenjualan();

        showToast(
            "Penjualan berhasil diperbarui",
            "success"
        );
    } catch (error) {
        console.error(
            "ERROR EDIT PENJUALAN:",
            error
        );

        showToast(
            "Terjadi kesalahan saat mengedit penjualan",
            "error"
        );
    }
}

/* ==================================
   HAPUS PENJUALAN
================================== */

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

        const { data, error } =
            await supabaseClient.rpc(
                "hapus_penjualan_atomic",
                {
                    p_penjualan_id: Number(id)
                }
            );

        if (error) {
            console.error(
                "ERROR HAPUS PENJUALAN:",
                error
            );

            showToast(
                "Gagal menghapus penjualan: " +
                    error.message,
                "error"
            );
            return;
        }

        console.log(
            "PENJUALAN BERHASIL DIHAPUS:",
            data
        );

        await loadTransactions();
        await loadBarang();
        await loadPenjualan();

        updateTable();
        updateStats();
        renderHistory();

        showToast(
            "Penjualan berhasil dihapus dan stok dikembalikan",
            "success"
        );
    } catch (error) {
        console.error(
            "ERROR HAPUS PENJUALAN:",
            error
        );

        showToast(
            "Terjadi kesalahan saat menghapus penjualan",
            "error"
        );
    } finally {
        window.sedangMenghapusPenjualan = false;
    }
}


/* ==================================
   NAVIGASI BULAN PENJUALAN
================================== */

function getBulanPenjualanSekarang() {

    const sekarang =
        new Date();

    return (
        sekarang.getFullYear() +
        "-" +
        String(
            sekarang.getMonth() + 1
        ).padStart(2, "0")
    );
}


function formatBulanPenjualan(value) {

    if (
        !/^\d{4}-\d{2}$/.test(
            String(value || "")
        )
    ) {
        return "-";
    }

    const bagian =
        String(value).split("-");

    const tanggal =
        new Date(
            Number(bagian[0]),
            Number(bagian[1]) - 1,
            1
        );

    const teks =
        tanggal.toLocaleDateString(
            "id-ID",
            {
                month: "long",
                year: "numeric"
            }
        );

    return (
        teks.charAt(0).toUpperCase() +
        teks.slice(1)
    );
}


function updateNavigasiBulanPenjualan() {

    const bulanInput =
        document.getElementById(
            "filterBulan"
        );

    const label =
        document.getElementById(
            "penjualanMonthLabel"
        );

    const tombolSebelumnya =
        document.getElementById(
            "penjualanPrevMonth"
        );

    const tombolBerikutnya =
        document.getElementById(
            "penjualanNextMonth"
        );

    if (!bulanInput) {
        return;
    }

    const bulanSekarang =
        getBulanPenjualanSekarang();

    const bulanAktif =
        bulanInput.value ||
        bulanSekarang;

    bulanInput.value =
        bulanAktif;

    if (label) {
        label.textContent =
            formatBulanPenjualan(
                bulanAktif
            );
    }

    if (tombolSebelumnya) {
        tombolSebelumnya.disabled =
            !bulanPenjualanTertua ||
            bulanAktif <=
                bulanPenjualanTertua;
    }

    if (tombolBerikutnya) {
        tombolBerikutnya.disabled =
            bulanAktif >=
                bulanSekarang;
    }
}


async function ubahBulanPenjualan(
    perubahan
) {

    const bulanInput =
        document.getElementById(
            "filterBulan"
        );

    if (!bulanInput) {
        return;
    }

    const bulanAktif =
        bulanInput.value ||
        getBulanPenjualanSekarang();

    const bagian =
        bulanAktif.split("-");

    const bulanTujuanDate =
        new Date(
            Number(bagian[0]),
            Number(bagian[1]) - 1 +
                Number(perubahan),
            1
        );

    const bulanTujuan =
        bulanTujuanDate.getFullYear() +
        "-" +
        String(
            bulanTujuanDate.getMonth() + 1
        ).padStart(2, "0");

    const bulanSekarang =
        getBulanPenjualanSekarang();

    if (
        bulanTujuan >
        bulanSekarang
    ) {
        return;
    }

    if (
        Number(perubahan) < 0 &&
        (
            !bulanPenjualanTertua ||
            bulanTujuan <
                bulanPenjualanTertua
        )
    ) {
        return;
    }

    bulanInput.value =
        bulanTujuan;

    updateNavigasiBulanPenjualan();

    await loadPenjualan();
}


/* ==================================
   FILTER PENJUALAN
================================== */

async function initFilterPenjualan() {

    const bulan =
        document.getElementById(
            "filterBulan"
        );

    const brand =
        document.getElementById(
            "filterBrand"
        );

    if (!bulan || !brand) {
        return;
    }

    const bulanSaatIni =
        bulan.value;

    const brandSaatIni =
        brand.value;

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

    const daftarBulan =
        (data || [])
            .map(
                function(item) {

                    return String(
                        item.tanggal_pembelian ||
                        ""
                    ).substring(0, 7);
                }
            )
            .filter(
                function(value) {

                    return /^\d{4}-\d{2}$/.test(
                        value
                    );
                }
            )
            .sort();

    bulanPenjualanTertua =
        daftarBulan.length > 0
            ? daftarBulan[0]
            : "";

    const bulanSekarang =
        getBulanPenjualanSekarang();

    let bulanTerpilih =
        /^\d{4}-\d{2}$/.test(
            bulanSaatIni
        )
            ? bulanSaatIni
            : bulanSekarang;

    if (
        bulanTerpilih >
        bulanSekarang
    ) {
        bulanTerpilih =
            bulanSekarang;
    }

    if (
        bulanPenjualanTertua &&
        bulanTerpilih <
            bulanPenjualanTertua
    ) {
        bulanTerpilih =
            bulanPenjualanTertua;
    }

    bulan.value =
        bulanTerpilih;

    const brandSet =
        new Set();

    (data || []).forEach(
        function(item) {

            const namaBrand =
                String(
                    item.brand || ""
                ).trim();

            if (namaBrand) {
                brandSet.add(
                    namaBrand
                );
            }
        }
    );

    const daftarBrand =
        [...brandSet].sort(
            function(a, b) {

                return a.localeCompare(
                    b,
                    "id"
                );
            }
        );

    brand.innerHTML = "";

    const optionSemuaBrand =
        document.createElement(
            "option"
        );

    optionSemuaBrand.value = "";

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

    brand.value =
        daftarBrand.includes(
            brandSaatIni
        )
            ? brandSaatIni
            : "";

    updateNavigasiBulanPenjualan();

    await loadPenjualan();
}


/* ==================================
   EVENT FILTER PENJUALAN
================================== */

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


/* ==================================
   XLSX LANDSCAPE
================================== */

let jsZipLoadPromise = null;

function loadJsZipLibrary() {
    if (typeof JSZip !== "undefined") {
        return Promise.resolve();
    }

    if (jsZipLoadPromise) {
        return jsZipLoadPromise;
    }

    jsZipLoadPromise = new Promise(
        function(resolve, reject) {
            const script =
                document.createElement(
                    "script"
                );

            script.src =
                "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";

            script.onload = function() {
                resolve();
            };

            script.onerror = function() {
                jsZipLoadPromise = null;

                reject(
                    new Error(
                        "Library JSZip gagal dimuat."
                    )
                );
            };

            document.head.appendChild(
                script
            );
        }
    );

    return jsZipLoadPromise;
}

async function createLandscapeExcelBlob(
    excelData
) {
    await loadJsZipLibrary();

    const zip =
        await JSZip.loadAsync(
            excelData
        );

    const worksheetFiles =
        Object.keys(zip.files).filter(
            function(path) {
                return /^xl\/worksheets\/sheet\d+\.xml$/.test(
                    path
                );
            }
        );

    await Promise.all(
        worksheetFiles.map(
            async function(path) {
                let xml =
                    await zip
                        .file(path)
                        .async("string");


                /*
                 * HAPUS PENGATURAN HALAMAN LAMA
                 */

                xml = xml.replace(
                    /<printOptions\b[^>]*\/>/g,
                    ""
                );

                xml = xml.replace(
                    /<pageMargins\b[^>]*\/>/g,
                    ""
                );

                xml = xml.replace(
                    /<pageSetup\b[^>]*\/>/g,
                    ""
                );

                xml = xml.replace(
                    /<pageSetUpPr\b[^>]*\/>/g,
                    ""
                );


                /*
                 * AKTIFKAN FIT TO PAGE
                 */

                if (
                    /<sheetPr\b[^>]*\/>/.test(
                        xml
                    )
                ) {
                    xml = xml.replace(
                        /<sheetPr\b([^>]*)\/>/,
                        function(
                            element,
                            attributes
                        ) {
                            return (
                                `<sheetPr${attributes}>` +
                                '<pageSetUpPr fitToPage="1"/>' +
                                "</sheetPr>"
                            );
                        }
                    );
                } else if (
                    /<sheetPr\b[^>]*>/.test(
                        xml
                    )
                ) {
                    xml = xml.replace(
                        "</sheetPr>",
                        '<pageSetUpPr fitToPage="1"/>' +
                        "</sheetPr>"
                    );
                } else {
                    xml = xml.replace(
                        /(<worksheet\b[^>]*>)/,
                        '$1<sheetPr>' +
                        '<pageSetUpPr fitToPage="1"/>' +
                        "</sheetPr>"
                    );
                }


                /*
                 * PENGATURAN CETAK:
                 *
                 * Paper: A4
                 * Orientation: Landscape
                 * Fit: 1 halaman lebar dan tinggi
                 * Page order: Down, then over
                 * Center horizontal dan vertical
                 */

                const pageLayoutXml =
    '<printOptions ' +
    'horizontalCentered="1" ' +
    'verticalCentered="1"/>' +

    '<pageMargins ' +
    'left="0.2" ' +
    'right="0.2" ' +
    'top="0.5" ' +
    'bottom="0.15" ' +
    'header="0.3" ' +
    'footer="0.1"/>' +

    '<pageSetup ' +
    'paperSize="9" ' +
    'orientation="landscape" ' +
    'pageOrder="downThenOver" ' +
    'fitToWidth="1" ' +
    'fitToHeight="0"/>';

                /*
                 * Masukkan pengaturan halaman ke XML.
                 */

                xml = xml.replace(
                    /(<headerFooter\b|<rowBreaks\b|<colBreaks\b|<ignoredErrors\b|<drawing\b|<legacyDrawing\b|<extLst\b|<\/worksheet>)/,
                    pageLayoutXml + "$1"
                );

                zip.file(
                    path,
                    xml
                );
            }
        )
    );

    const landscapeExcelData =
        await zip.generateAsync({
            type: "arraybuffer",
            compression: "DEFLATE"
        });

    return new Blob(
        [landscapeExcelData],
        {
            type:
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
    );
}
/* ==================================
   STOK AKTUAL UNTUK EXPORT
================================== */

function getStockAktualUntukExport(
    barang
) {
    let stok =
        Number(
            barang.stok_awal
        ) || 0;

    const tanggalHariIni =
        getTodayDate();

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
             * Transaksi masa depan
             * tidak ikut dihitung.
             */
            if (
                transaction.tanggal &&
                transaction.tanggal >
                    tanggalHariIni
            ) {
                return;
            }

            const qty =
                Number(
                    transaction.qty
                ) || 0;

            if (
                transaction.type ===
                "masuk"
            ) {
                stok += qty;
            }

            if (
                transaction.type ===
                "laku"
            ) {
                stok -= qty;
            }
        }
    );

    return stok;
}
/* ==================================
   EXPORT EXCEL STOK
================================== */

let penyelesaiKonfirmasiExport = null;

function mintaKonfirmasiExport(message) {
    const dialog =
        document.getElementById("exportConfirmDialog");

    const messageElement =
        document.getElementById("exportConfirmMessage");

    if (!dialog) {
        return Promise.resolve(
            window.confirm(message)
        );
    }

    if (messageElement) {
        messageElement.textContent = message;
    }

    if (dialog.open) {
        dialog.close();
    }

    dialog.showModal();

    return new Promise(
        function(resolve) {
            penyelesaiKonfirmasiExport = resolve;
        }
    );
}

function selesaikanKonfirmasiExport(disetujui) {
    const dialog =
        document.getElementById("exportConfirmDialog");

    if (dialog?.open) {
        dialog.close();
    }

    if (penyelesaiKonfirmasiExport) {
        penyelesaiKonfirmasiExport(
            Boolean(disetujui)
        );
        penyelesaiKonfirmasiExport = null;
    }
}

document.getElementById("exportConfirmDialog")
    ?.addEventListener(
        "cancel",
        function(event) {
            event.preventDefault();
            selesaikanKonfirmasiExport(false);
        }
    );


function kelompokkanBarangExport(items) {
    const kelompok = new Map();

    (items || []).forEach(
        function(barang) {
            const namaBrand =
                String(
                    barang.brand?.nama ||
                    "Tanpa Brand"
                ).trim() ||
                "Tanpa Brand";

            if (!kelompok.has(namaBrand)) {
                kelompok.set(namaBrand, []);
            }

            kelompok.get(namaBrand).push(barang);
        }
    );

    return Array.from(
        kelompok.entries()
    )
        .sort(
            function(a, b) {
                return a[0].localeCompare(
                    b[0],
                    "id",
                    { sensitivity: "base" }
                );
            }
        )
        .map(
            function([brand, barang]) {
                return {
                    brand,
                    barang: barang.sort(
                        function(a, b) {
                            return String(a.nama)
                                .localeCompare(
                                    String(b.nama),
                                    "id",
                                    { sensitivity: "base" }
                                );
                        }
                    )
                };
            }
        );
}


function formatNamaBarangExport(namaBarang) {
    let nama = String(namaBarang || "").trim().replace(/\s+/g, " ");
    const awalanDihapus = [
        /^BELLEZ{1,2}A\b[\s:.-]*/i,
        /^SOLID\b[\s:.-]*/i,
        /^DEKKSON\b[\s:.-]*/i,
        /^RONA\b[\s:.-]*/i,
        /^TRISENSA\b[\s:.-]*/i,
        /^VIOLET\s+PINTU\s+ALUMUNIUM\b[\s:.-]*/i
    ];

    for (const pola of awalanDihapus) {
        if (pola.test(nama)) {
            nama = nama.replace(pola, "");
            break;
        }
    }

    if (/^VAPELY\b/i.test(nama)) {
        nama = nama.replace(
            /^VAPELY\b[\s:.-]*/i,
            "VPLY "
        );
    }

    return nama.trim();
}


const SUPERSCRIPT_EXPORT = {
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
    "+": "⁺",
    "-": "⁻"
};


function formatPerubahanSuperscriptExport(perubahan) {
    const nilai = Number(perubahan) || 0;
    const teks =
        nilai > 0
            ? `+${nilai}`
            : String(nilai);

    return Array.from(teks)
        .map(
            function(karakter) {
                return (
                    SUPERSCRIPT_EXPORT[karakter] ||
                    karakter
                );
            }
        )
        .join("");
}


function formatStokTransaksiExport(
    stokSebelum,
    totalMasuk,
    totalKeluar
) {
    const stok =
        Number(stokSebelum) || 0;

    let hasil =
        `${stok}`;

    if (Number(totalMasuk) > 0) {
        hasil +=
            formatPerubahanSuperscriptExport(
                Number(totalMasuk)
            );
    }

    if (Number(totalKeluar) > 0) {
        hasil +=
            formatPerubahanSuperscriptExport(
                -Number(totalKeluar)
            );
    }

    return hasil;
}


const KETERANGAN_EXPORT =
    "Keterangan: angka utama = stok sebelum transaksi | " +
    "+ pangkat = barang masuk | - pangkat = barang keluar | " +
    "sel hitam = terdapat transaksi";


function getStokTanggalSatuExport(barang, tahun, bulan) {
    let stok = Number(barang?.stok_awal) || 0;

    const tanggalSatu =
        `${tahun}-${String(
            bulan + 1
        ).padStart(2, "0")}-01`;

    transactions.forEach(
        function(transaction) {
            if (
                Number(transaction.barang_id) !==
                    Number(barang?.id) ||
                transaction.tanggal !== tanggalSatu
            ) {
                return;
            }

            const qty = Number(transaction.qty) || 0;

            if (transaction.type === "masuk") {
                stok += qty;
            }

            if (transaction.type === "laku") {
                stok -= qty;
            }
        }
    );

    return stok;
}


async function exportExcel() {
    if (typeof XLSX === "undefined") {
        alert("Library Excel belum dimuat.");
        return;
    }

    const disetujui =
        await mintaKonfirmasiExport(
            "Export rekap stok ke Excel?"
        );

    if (!disetujui) {
        return;
    }

    const now = new Date();
    const tahun = now.getFullYear();
    const bulan = now.getMonth();
    const hariIni = now.getDate();

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

    const jumlahHari = new Date(
        tahun,
        bulan + 1,
        0
    ).getDate();


    /* HEADER EXCEL */

    const header = [];

    header.push(
        `${namaBulan[bulan]}-${tahun}`
    );

    for (
        let hari = 1;
        hari <= jumlahHari;
        hari++
    ) {
        header.push(hari);
    }

    const dataExcel = [header];

const dataBarangExport =
    dataBarang.filter(
        function(barang) {
            return (
                getStokTanggalSatuExport(
                    barang,
                    tahun,
                    bulan
                ) !== 0
            );
        }
    );

if (dataBarangExport.length === 0) {
    alert(
        "Tidak ada barang dengan stok pada tanggal 1."
    );
    return;
}

const kelompokBarangExport =
    kelompokkanBarangExport(
        dataBarangExport
    );

const metadataBarisExcel = [
    { type: "header" }
];


kelompokBarangExport.forEach(
    function(kelompok) {
        dataExcel.push([
            kelompok.brand.toLocaleUpperCase(
                "id-ID"
            )
        ]);

        metadataBarisExcel.push({
            type: "brand",
            brand: kelompok.brand
        });

        kelompok.barang.forEach(
            function(barang) {
                let stok =
                    Number(
                        barang.stok_awal
                    ) || 0;

                const row = [
                        formatNamaBarangExport(
                            barang.nama
                        )
                    ];

                for (
                    let hari = 1;
                    hari <= jumlahHari;
                    hari++
                ) {
                    if (hari > hariIni) {
                        row.push("");
                        continue;
                    }

                    const tanggal =
                        `${tahun}-${String(
                            bulan + 1
                        ).padStart(2, "0")}-${String(
                            hari
                        ).padStart(2, "0")}`;

                    const transaksiHari =
                        transactions.filter(
                            function(transaction) {
                                return (
                                    Number(
                                        transaction.barang_id
                                    ) ===
                                        Number(barang.id) &&
                                    transaction.tanggal ===
                                        tanggal
                                );
                            }
                        );

                    let perubahan = 0;
                    let totalMasuk = 0;
                    let totalKeluar = 0;
                    let adaTransaksi = false;

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
                                perubahan += qty;
                                totalMasuk += qty;
                                adaTransaksi = true;
                            }

                            if (
                                transaction.type ===
                                "laku"
                            ) {
                                perubahan -= qty;
                                totalKeluar += qty;
                                adaTransaksi = true;
                            }
                        }
                    );

                    if (adaTransaksi) {
                        row.push(
                            formatStokTransaksiExport(
                                stok,
                                totalMasuk,
                                totalKeluar
                            )
                        );
                        stok += perubahan;
                    } else {
                        row.push(stok);
                    }
                }

                dataExcel.push(row);
                metadataBarisExcel.push({
                    type: "barang",
                    barang
                });
            }
        );
    }
);


    const jumlahBarangExcel = [
        "JUMLAH BARANG",
        dataBarangExport.length
    ];

    while (jumlahBarangExcel.length <= jumlahHari) {
        jumlahBarangExcel.push("");
    }

    dataExcel.push(jumlahBarangExcel);
    metadataBarisExcel.push({ type: "jumlah" });

    const legendaExcel = [
        KETERANGAN_EXPORT
    ];

    while (legendaExcel.length <= jumlahHari) {
        legendaExcel.push("");
    }

    dataExcel.push(legendaExcel);
    metadataBarisExcel.push({ type: "legenda" });


    /* BUAT WORKBOOK EXCEL */

    const worksheet =
        XLSX.utils.aoa_to_sheet(
            dataExcel
        );

    const barisLegendaExcel =
        dataExcel.length - 1;

    worksheet["!merges"] =
        worksheet["!merges"] || [];

    worksheet["!merges"].push({
        s: {
            r: barisLegendaExcel,
            c: 0
        },
        e: {
            r: barisLegendaExcel,
            c: jumlahHari
        }
    });

    const workbook =
        XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Rekap Stok"
    );

/* PRINT TITLE: ULANGI BARIS 1 */

workbook.Workbook =
    workbook.Workbook || {};

workbook.Workbook.Names =
    workbook.Workbook.Names || [];

/*
 * Hapus Print Title lama agar
 * tidak terjadi duplikasi.
 */
workbook.Workbook.Names =
    workbook.Workbook.Names.filter(
        function(item) {
            return !(
                item.Name ===
                    "_xlnm.Print_Titles" &&
                Number(item.Sheet) === 0
            );
        }
    );

workbook.Workbook.Names.push({
    Name: "_xlnm.Print_Titles",
    Sheet: 0,
    Ref: "'Rekap Stok'!$1:$1"
});
/* ==================================
   PRINT AREA REKAP STOK
================================== */

const kolomTanggalTerakhir =
    XLSX.utils.encode_col(
        jumlahHari
    );

const barisDataTerakhir =
    dataExcel.length;

/*
 * Hapus Print Area lama agar
 * tidak terjadi duplikasi.
 */
workbook.Workbook.Names =
    workbook.Workbook.Names.filter(
        function(item) {
            return !(
                item.Name ===
                    "_xlnm.Print_Area" &&
                Number(item.Sheet) === 0
            );
        }
    );

workbook.Workbook.Names.push({
    Name: "_xlnm.Print_Area",
    Sheet: 0,
    Ref:
        `'Rekap Stok'!$A$1:$${kolomTanggalTerakhir}$${barisDataTerakhir}`
});
    /* LEBAR KOLOM */

const widths = [
    {
        // Kolom A
        wch: 30
    }
];

for (
    let i = 0;
    i < jumlahHari;
    i++
) {
    widths.push({
        // Kolom B sampai tanggal terakhir
        wch: 3
    });
}

worksheet["!cols"] = widths;
   
    /* STYLE HEADER */

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
            name: "Aptos",
            sz: 8,
            bold: true,
            color: {
                rgb: "FFFFFF"
            }
        },

        fill: {
            patternType: "solid",
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
    /* STYLE DATA DAN HEADER BRAND */

    for (
        let r = 1;
        r < dataExcel.length;
        r++
    ) {
        const metadata =
            metadataBarisExcel[r];

        if (
            metadata?.type ===
            "brand"
        ) {
            const brandCell =
                worksheet[
                    XLSX.utils.encode_cell({
                        r,
                        c: 0
                    })
                ];

            if (brandCell) {
                brandCell.s = {
                    font: {
                        name: "Aptos",
                        sz: 9,
                        bold: true,
                        color: {
                            rgb: "FFFFFF"
                        }
                    },
                    fill: {
                        patternType: "solid",
                        fgColor: {
                            rgb: "808080"
                        }
                    },
                    alignment: {
                        horizontal: "center",
                        vertical: "center"
                    }
                };
            }

            continue;
        }

        if (metadata?.type === "legenda") {
            const legendaCell =
                worksheet[
                    XLSX.utils.encode_cell({
                        r,
                        c: 0
                    })
                ];

            if (legendaCell) {
                legendaCell.s = {
                    font: {
                        name: "Aptos",
                        sz: 7,
                        italic: true,
                        color: {
                            rgb: "4B5563"
                        }
                    },
                    alignment: {
                        horizontal: "left",
                        vertical: "center"
                    }
                };
            }

            continue;
        }

        if (metadata?.type === "jumlah") {
            for (let c = 0; c <= jumlahHari; c++) {
                const totalCell = worksheet[
                    XLSX.utils.encode_cell({ r, c })
                ];

                if (!totalCell) {
                    continue;
                }

                totalCell.s = {
                    font: {
                        name: "Aptos",
                        sz: 8,
                        bold: true
                    },
                    fill: {
                        patternType: "solid",
                        fgColor: { rgb: "E5E7EB" }
                    },
                    alignment: {
                        horizontal: c === 0 ? "left" : "center",
                        vertical: "center"
                    }
                };
            }

            continue;
        }

        const barang =
            metadata?.barang;

        if (!barang) {
            continue;
        }

        for (
            let c = 1;
            c <= jumlahHari;
            c++
        ) {
            const cellAddress =
                XLSX.utils.encode_cell({
                    r,
                    c
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

            const tanggal =
                `${tahun}-${String(
                    bulan + 1
                ).padStart(2, "0")}-${String(
                    c
                ).padStart(2, "0")}`;

            const adaTransaksi =
                transactions.some(
                    function(transaction) {
                        return (
                            Number(
                                transaction.barang_id
                            ) ===
                                Number(barang.id) &&
                            transaction.tanggal ===
                                tanggal
                        );
                    }
                );

            if (adaTransaksi) {
                cell.s = {
                    font: {
                        bold: true,
                        color: {
                            rgb: "FFFFFF"
                        }
                    },
                    fill: {
                        patternType: "solid",
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

/* FONT SEMUA SEL: APTOS UKURAN 8 */

/* ==================================
   FONT DAN BORDER SEMUA AREA
================================== */

const rangeExcel =
    XLSX.utils.decode_range(
        worksheet["!ref"]
    );

for (
    let row = rangeExcel.s.r;
    row <= rangeExcel.e.r;
    row++
) {
    for (
        let column = rangeExcel.s.c;
        column <= rangeExcel.e.c;
        column++
    ) {
        const alamatCell =
            XLSX.utils.encode_cell({
                r: row,
                c: column
            });

        /*
         * Buat sel kosong agar border
         * tetap muncul di seluruh area.
         */
        if (!worksheet[alamatCell]) {
            worksheet[alamatCell] = {
                t: "s",
                v: ""
            };
        }

        const cell =
            worksheet[alamatCell];

        cell.s =
            cell.s || {};

        /*
         * Semua font Aptos ukuran 8.
         */
        cell.s.font = {
            ...(cell.s.font || {}),
            name: "Aptos",
            sz: 8
        };

        /*
         * Border warna #D8D8D8.
         */
        cell.s.border = {
            top: {
                style: "thin",
                color: {
                    rgb: "D8D8D8"
                }
            },

            bottom: {
                style: "thin",
                color: {
                    rgb: "D8D8D8"
                }
            },

            left: {
                style: "thin",
                color: {
                    rgb: "D8D8D8"
                }
            },

            right: {
                style: "thin",
                color: {
                    rgb: "D8D8D8"
                }
            }
        };
    }
}

    /* ==================================
       EXPORT XLSX REKAP STOK
    ================================== */

    const excelData =
        XLSX.write(
            workbook,
            {
                bookType: "xlsx",
                type: "array"
            }
        );

    let blob;

    try {
        blob =
            await createLandscapeExcelBlob(
                excelData
            );
    } catch (error) {
        console.error(
            "ERROR EXPORT REKAP STOK:",
            error
        );

        alert(
            "Gagal membuat file Excel Landscape."
        );
        return;
    }

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
/* ==================================
   EXPORT PDF REKAP STOK
================================== */

async function exportPDF() {
    if (
        typeof window.jspdf ===
            "undefined" ||
        typeof window.jspdf.jsPDF ===
            "undefined"
    ) {
        alert(
            "Library PDF belum dimuat."
        );
        return;
    }

    const { jsPDF } =
        window.jspdf;

    const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
    });

    if (
        typeof pdf.autoTable !==
        "function"
    ) {
        alert(
            "Library tabel PDF belum dimuat."
        );
        return;
    }


    const disetujui =
        await mintaKonfirmasiExport(
            "Export rekap stok ke PDF?"
        );

    if (!disetujui) {
        return;
    }


    /* TANGGAL SEKARANG */

    const sekarang =
        new Date();

    const tahun =
        sekarang.getFullYear();

    const bulan =
        sekarang.getMonth();

    const hariIni =
        sekarang.getDate();

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


    /* HEADER PDF */

    const header = [
        `${namaBulan[bulan]}-${tahun}`
    ];

    for (
        let hari = 1;
        hari <= jumlahHari;
        hari++
    ) {
        header.push(hari);
    }


    /* DATA PDF */

    const dataPDF = [];
    const metadataBarisPDF = [];
    const transaksiCellPDF = new Map();

    const dataBarangPDF =
        dataBarang.filter(
            function(barang) {
                return (
                    getStokTanggalSatuExport(
                    barang,
                    tahun,
                    bulan
                ) !== 0
                );
            }
        );

    if (dataBarangPDF.length === 0) {
        alert(
            "Tidak ada barang dengan stok pada tanggal 1."
        );
        return;
    }

    const kelompokBarangPDF =
        kelompokkanBarangExport(
            dataBarangPDF
        );


    kelompokBarangPDF.forEach(
        function(kelompok) {
            const brandRow = [
                kelompok.brand.toLocaleUpperCase(
                    "id-ID"
                )
            ];

            for (let kolom = 1; kolom <= jumlahHari; kolom++) {
                brandRow.push("");
            }

            dataPDF.push(brandRow);

            metadataBarisPDF.push({
                type: "brand",
                brand: kelompok.brand
            });

            kelompok.barang.forEach(
                function(barang) {
                    const indexBarisPDF =
                        dataPDF.length;

                    let stok =
                        Number(
                            barang.stok_awal
                        ) || 0;

                    const row = [
                        formatNamaBarangExport(
                            barang.nama
                        )
                    ];

                    for (
                        let hari = 1;
                        hari <= jumlahHari;
                        hari++
                    ) {
                        if (hari > hariIni) {
                            row.push("");
                            continue;
                        }

                        const tanggal =
                            `${tahun}-${String(
                                bulan + 1
                            ).padStart(2, "0")}-${String(
                                hari
                            ).padStart(2, "0")}`;

                        const transaksiHari =
                            transactions.filter(
                                function(transaction) {
                                    return (
                                        Number(
                                            transaction.barang_id
                                        ) ===
                                            Number(barang.id) &&
                                        transaction.tanggal ===
                                            tanggal
                                    );
                                }
                            );

                        let perubahan = 0;
                        let totalMasuk = 0;
                        let totalKeluar = 0;
                        let adaTransaksi = false;

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
                                    perubahan += qty;
                                    totalMasuk += qty;
                                    adaTransaksi = true;
                                }

                                if (
                                    transaction.type ===
                                    "laku"
                                ) {
                                    perubahan -= qty;
                                    totalKeluar += qty;
                                    adaTransaksi = true;
                                }
                            }
                        );

                        if (adaTransaksi) {
                            transaksiCellPDF.set(
                                `${indexBarisPDF}:${hari}`,
                                {
                                    stokSebelum: stok,
                                    totalMasuk,
                                    totalKeluar
                                }
                            );

                            row.push(stok);
                            stok += perubahan;
                        } else {
                            row.push(stok);
                        }
                    }

                    dataPDF.push(row);
                    metadataBarisPDF.push({
                        type: "barang",
                        barang
                    });
                }
            );
        }
    );


    const jumlahBarangPDF = [
        "JUMLAH BARANG",
        dataBarangPDF.length
    ];

    while (jumlahBarangPDF.length <= jumlahHari) {
        jumlahBarangPDF.push("");
    }

    dataPDF.push(jumlahBarangPDF);
    metadataBarisPDF.push({ type: "jumlah" });

    dataPDF.push([
        {
            content:
                KETERANGAN_EXPORT,

            colSpan:
                jumlahHari + 1
        }
    ]);

    metadataBarisPDF.push({
        type: "legenda"
    });


    /* UKURAN HALAMAN DAN KOLOM */

    const marginKiri = 5.08;
    const marginKanan = 5.08;
    const marginAtas = 12.7;
    const marginBawah = 3.81;

    const lebarHalaman =
        pdf.internal.pageSize.getWidth();

    const lebarTabel =
        lebarHalaman -
        marginKiri -
        marginKanan;

    /*
     * Lebar kolom nama barang.
     */
    const lebarKolomBarang = 60;

    /*
     * Sisa halaman dibagi rata ke
     * seluruh kolom tanggal.
     */
    const lebarKolomTanggal =
        (
            lebarTabel -
            lebarKolomBarang
        ) / jumlahHari;

    const columnStyles = {
        0: {
            cellWidth:
                lebarKolomBarang,

            halign: "left",

            overflow: "ellipsize"
        }
    };

    for (
        let kolom = 1;
        kolom <= jumlahHari;
        kolom++
    ) {
        columnStyles[kolom] = {
            cellWidth:
                lebarKolomTanggal,

            halign: "center",

            overflow: "hidden"
        };
    }


    /* BUAT TABEL PDF */

    pdf.autoTable({
        head: [
            header
        ],

        body:
            dataPDF,

        startY:
            marginAtas,

        margin: {
            top:
                marginAtas,

            right:
                marginKanan,

            bottom:
                marginBawah,

            left:
                marginKiri
        },

        tableWidth:
            lebarTabel,

        theme:
            "grid",

        showHead:
            "everyPage",

        horizontalPageBreak:
            false,

        rowPageBreak:
            "avoid",

        styles: {
            font:
                "helvetica",

            fontSize:
                8,

            fontStyle:
                "normal",

            textColor:
                [0, 0, 0],

            fillColor:
                [255, 255, 255],

            lineColor:
                [216, 216, 216],

            lineWidth:
                0.1,

            cellPadding:
                0.5,

            minCellWidth:
                0,

            minCellHeight:
                4,

            halign:
                "center",

            valign:
                "middle",

            overflow:
                "hidden"
        },

        headStyles: {
            font:
                "helvetica",

            fontSize:
                8,

            fontStyle:
                "bold",

            textColor:
                [255, 255, 255],

            fillColor:
                [0, 0, 0],

            lineColor:
                [216, 216, 216],

            lineWidth:
                0.1,

            halign:
                "center",

            valign:
                "middle"
        },

        bodyStyles: {
            font:
                "helvetica",

            fontSize:
                8,

            textColor:
                [0, 0, 0],

            fillColor:
                [255, 255, 255]
        },

        columnStyles:
            columnStyles,


        /*
         * Transaksi masuk dan laku
         * diberi background hitam.
         */

        didParseCell:
            function(data) {
                if (
                    data.section !==
                    "body"
                ) {
                    return;
                }

                const metadata =
                    metadataBarisPDF[
                        data.row.index
                    ];

                if (metadata?.type === "brand") {
                    if (data.column.index === 0) {
                        data.cell.styles.fillColor = [128, 128, 128];
                        data.cell.styles.textColor = [255, 255, 255];
                        data.cell.styles.fontStyle = "bold";
                        data.cell.styles.fontSize = 9;
                        data.cell.styles.halign = "center";
                        data.cell.styles.cellPadding = 1.2;
                    }

                    return;
                }

                if (metadata?.type === "legenda") {
                    data.cell.styles.fillColor =
                        [255, 255, 255];

                    data.cell.styles.textColor =
                        [75, 85, 99];

                    data.cell.styles.fontStyle =
                        "italic";

                    data.cell.styles.fontSize =
                        5.5;

                    data.cell.styles.halign =
                        "left";

                    data.cell.styles.cellPadding =
                        1.2;

                    return;
                }

                if (metadata?.type === "jumlah") {
                    data.cell.styles.fillColor = [229, 231, 235];
                    data.cell.styles.textColor = [0, 0, 0];
                    data.cell.styles.fontStyle = "bold";
                    data.cell.styles.halign =
                        data.column.index === 0
                            ? "left"
                            : "center";
                    return;
                }

                if (
                    data.column.index === 0
                ) {
                    return;
                }

                const barang =
                    metadata?.barang;

                if (!barang) {
                    return;
                }

                const tanggal =
                    `${tahun}-${String(
                        bulan + 1
                    ).padStart(2, "0")}-${String(
                        data.column.index
                    ).padStart(2, "0")}`;

                const adaTransaksi =
                    transactions.some(
                        function(transaction) {
                            return (
                                Number(
                                    transaction.barang_id
                                ) ===
                                    Number(barang.id) &&
                                transaction.tanggal ===
                                    tanggal
                            );
                        }
                    );

                if (adaTransaksi) {
                    data.cell.styles.fillColor =
                        [0, 0, 0];

                    data.cell.styles.textColor =
                        [255, 255, 255];

                    data.cell.styles.fontStyle =
                        "bold";
                }
            }
    });


    /* SIMPAN PDF */

    pdf.save(
        `Rekap-Stok-${namaBulan[bulan]}-${tahun}.pdf`
    );
}
/* ==================================
   EXPORT EXCEL PENJUALAN
================================== */

async function exportPenjualanExcel() {
    if (typeof XLSX === "undefined") {
        alert("Library Excel belum dimuat.");
        return;
    }

    const disetujui =
        await mintaKonfirmasiExport(
            "Export catatan penjualan ke Excel?"
        );

    if (!disetujui) {
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
                    function(barangItem) {
                        return (
                            String(
                                barangItem.id
                            ) ===
                            String(
                                item.barang_id
                            )
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


    /* BUAT WORKBOOK PENJUALAN */

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


    /* LEBAR KOLOM */

    worksheet["!cols"] = [
        { wch: 6 },
        { wch: 12 },
        { wch: 35 },
        { wch: 15 },
        { wch: 10 },
        { wch: 16 },
        { wch: 18 }
    ];


    /* STYLE HEADER */

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


    /* FORMAT HARGA DAN TOTAL */

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


    /* STYLE BARIS TOTAL */

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


    /* EXPORT XLSX LANDSCAPE */

    const excelDataArray =
        XLSX.write(
            workbook,
            {
                bookType: "xlsx",
                type: "array"
            }
        );

    let blob;

    try {
        blob =
            await createLandscapeExcelBlob(
                excelDataArray
            );
    } catch (error) {
        console.error(error);

        alert(
            "Gagal membuat file Excel Landscape."
        );
        return;
    }

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;

    let namaFile = "Penjualan";

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

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}


/* ==================================
   INIT
================================== */

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
    }


    /* TANGGAL PENJUALAN HARI INI */

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


    /* LOAD DATA UTAMA */

await loadBrandBarangBaru();
await loadBarang();
await loadTransactions();


    /* FILTER DAN DATA PENJUALAN */

    await initFilterPenjualan();
}


/* ==================================
   JALANKAN APLIKASI
================================== */

init();
