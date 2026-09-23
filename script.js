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

let authActionBusy = false;
let appHasInitialized = false;

const appDataLoadState = {
    coreLoaded: false,
    corePromise: null,
    salesInitialized: false,
    salesPromise: null,
    dashboardPromise: null
};

function setAuthStatus(message, type = "") {
    const status =
        document.getElementById("authStatus");

    if (!status) return;

    status.textContent = message || "";
    status.className =
        "auth-status" +
        (type ? ` is-${type}` : "");
}

function setAuthBusy(isBusy) {
    authActionBusy = isBusy;

    [
        "authSignInButton",
        "authSignUpButton"
    ].forEach(function(buttonId) {
        const button =
            document.getElementById(buttonId);

        if (button) {
            button.disabled = isBusy;
            button.setAttribute(
                "aria-busy",
                String(isBusy)
            );
        }
    });
}

function showAuthGate(
    message = "",
    type = ""
) {
    document.body.classList.add(
        "auth-locked"
    );
    document.body.classList.remove(
        "auth-ready"
    );

    setAuthStatus(message, type);
}

async function activateAdminSession(session) {
    if (!session) {
        showAuthGate();
        return;
    }

    setAuthStatus(
        "Memeriksa izin akun...",
        "loading"
    );

    const { data, error } =
        await supabaseClient
            .from("app_admins")
            .select("email")
            .limit(1);

    if (
        error ||
        !Array.isArray(data) ||
        data.length === 0
    ) {
        await supabaseClient.auth.signOut();
        showAuthGate(
            "Akun ini tidak memiliki izin admin."
        );
        return;
    }

    document.body.classList.remove(
        "auth-locked"
    );
    document.body.classList.add(
        "auth-ready"
    );

    setAuthStatus("");

    const passwordInput =
        document.getElementById(
            "authPassword"
        );

    if (passwordInput) {
        passwordInput.value = "";
    }

    if (appHasInitialized) {
        window.location.reload();
        return;
    }

    initAppNavigation();
    await init();
    appHasInitialized = true;
}

async function handleAdminSignIn(event) {
    event?.preventDefault();

    if (authActionBusy) return;

    const email =
        document.getElementById(
            "authEmail"
        )?.value.trim();

    const password =
        document.getElementById(
            "authPassword"
        )?.value || "";

    if (!email || password.length < 8) {
        setAuthStatus(
            "Isi email dan password minimal 8 karakter.",
            "error"
        );
        return;
    }

    setAuthBusy(true);
    setAuthStatus("Sedang masuk...", "loading");

    try {
        const { data, error } =
            await supabaseClient.auth
                .signInWithPassword({
                    email,
                    password
                });

        if (error) {
            setAuthStatus(
                "Gagal masuk: " + error.message,
                "error"
            );
            return;
        }

        await activateAdminSession(
            data.session
        );
    } finally {
        setAuthBusy(false);
    }
}

async function handleAdminSignUp() {
    if (authActionBusy) return;

    const email =
        document.getElementById(
            "authEmail"
        )?.value.trim();

    const password =
        document.getElementById(
            "authPassword"
        )?.value || "";

    if (!email || password.length < 8) {
        setAuthStatus(
            "Isi email dan password minimal 8 karakter.",
            "error"
        );
        return;
    }

    setAuthBusy(true);
    setAuthStatus(
        "Membuat akun admin...",
        "loading"
    );

    try {
        const { data, error } =
            await supabaseClient.auth.signUp({
                email,
                password
            });

        if (error) {
            setAuthStatus(
                "Gagal membuat akun: " +
                    error.message,
                "error"
            );
            return;
        }

        if (data.session) {
            await activateAdminSession(
                data.session
            );
            return;
        }

        setAuthStatus(
            "Akun dibuat. Periksa email untuk konfirmasi, lalu masuk.",
            "success"
        );
    } finally {
        setAuthBusy(false);
    }
}

async function signOutAdmin() {
    const confirmed =
        await showAppConfirm(
            "Keluar dari aplikasi sekarang?",
            {
                title: "Keluar",
                confirmLabel: "Ya, Keluar"
            }
        );

    if (!confirmed) return;

    await supabaseClient.auth.signOut();
    showAuthGate(
        "Anda telah keluar dari aplikasi.",
        "success"
    );
}

async function bootAuthenticatedApp() {
    const { data, error } =
        await supabaseClient.auth
            .getSession();

    if (error) {
        showAuthGate(
            "Sesi tidak dapat diperiksa. Silakan masuk kembali."
        );
        return;
    }

    if (data.session) {
        await activateAdminSession(
            data.session
        );
    } else {
        showAuthGate();
    }

    supabaseClient.auth.onAuthStateChange(
        function(event) {
            if (event === "SIGNED_OUT") {
                showAuthGate();
            }
        }
    );
}


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
    sortAscending:
        '<path d="M12 19V5"></path>' +
        '<path d="m7 10 5-5 5 5"></path>',
    sortDescending:
        '<path d="M12 5v14"></path>' +
        '<path d="m7 14 5 5 5-5"></path>',
    sortNeutral:
        '<path d="m8 9 4-4 4 4"></path>' +
        '<path d="m16 15-4 4-4-4"></path>',
    loading:
        '<circle cx="12" cy="12" r="8"></circle>' +
        '<path d="M12 4a8 8 0 0 1 8 8"></path>',
    success:
        '<circle cx="12" cy="12" r="9"></circle>' +
        '<path d="m8 12 2.6 2.6L16.5 9"></path>',
    error:
        '<circle cx="12" cy="12" r="9"></circle>' +
        '<path d="m9 9 6 6M15 9l-6 6"></path>',
    info:
        '<circle cx="12" cy="12" r="9"></circle>' +
        '<path d="M12 11v5"></path>' +
        '<path d="M12 8h.01"></path>',
    warning:
        '<path d="M10.3 4.2 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z"></path>' +
        '<path d="M12 9v4"></path>' +
        '<path d="M12 17h.01"></path>'
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

let penyelesaiDialogAplikasi = null;

function bukaDialogAplikasi({
    title = "Perhatian",
    message = "",
    type = "info",
    confirmLabel = "Mengerti",
    cancelLabel = "Batal",
    showCancel = false
} = {}) {
    const dialog =
        document.getElementById(
            "appMessageDialog"
        );

    if (!dialog) {
        console.warn(message);
        return Promise.resolve(
            !showCancel
        );
    }

    if (dialog.open) {
        dialog.close();

        if (penyelesaiDialogAplikasi) {
            penyelesaiDialogAplikasi(false);
            penyelesaiDialogAplikasi = null;
        }
    }

    const titleElement =
        document.getElementById(
            "appMessageTitle"
        );

    const messageElement =
        document.getElementById(
            "appMessageText"
        );

    const iconElement =
        document.getElementById(
            "appMessageIcon"
        );

    const cancelButton =
        document.getElementById(
            "appMessageCancel"
        );

    const confirmButton =
        document.getElementById(
            "appMessageConfirm"
        );

    const cancelText =
        document.getElementById(
            "appMessageCancelText"
        );

    const confirmText =
        document.getElementById(
            "appMessageConfirmText"
        );

    if (titleElement) {
        titleElement.textContent = title;
    }

    if (messageElement) {
        messageElement.textContent = message;
    }

    dialog.dataset.type = type;

    if (iconElement) {
        iconElement.innerHTML =
            getUiIconSvg(
                type === "danger"
                    ? "warning"
                    : type === "error"
                        ? "error"
                        : "info",
                "app-message-status-icon"
            );
    }

    if (cancelButton) {
        cancelButton.hidden =
            !showCancel;
    }

    if (cancelText) {
        cancelText.textContent =
            cancelLabel;
    }

    if (confirmText) {
        confirmText.textContent =
            confirmLabel;
    }

    dialog.showModal();

    requestAnimationFrame(function() {
        confirmButton?.focus();
    });

    return new Promise(function(resolve) {
        penyelesaiDialogAplikasi = resolve;
    });
}

function showAppAlert(
    message,
    options = {}
) {
    const messageText =
        String(message || "");

    const inferredType =
        /gagal|tidak valid|harus|tidak ditemukan|tidak mencukupi|melebihi|belum dimulai|tidak ada/i
            .test(messageText)
            ? "error"
            : "info";

    const alertType =
        options.type ||
        inferredType;

    return bukaDialogAplikasi({
        title:
            options.title ||
            (alertType === "error"
                ? "Terjadi Kendala"
                : "Perhatian"),
        message: messageText,
        type:
            alertType,
        confirmLabel:
            options.confirmLabel ||
            "Mengerti",
        showCancel: false
    });
}

function showAppConfirm(
    message,
    options = {}
) {
    return bukaDialogAplikasi({
        title:
            options.title ||
            "Konfirmasi",
        message,
        type:
            options.type ||
            "danger",
        confirmLabel:
            options.confirmLabel ||
            "Ya, Lanjutkan",
        cancelLabel:
            options.cancelLabel ||
            "Batal",
        showCancel: true
    });
}

function selesaikanDialogAplikasi(
    disetujui
) {
    const dialog =
        document.getElementById(
            "appMessageDialog"
        );

    if (dialog?.open) {
        dialog.close();
    }

    if (penyelesaiDialogAplikasi) {
        penyelesaiDialogAplikasi(
            Boolean(disetujui)
        );
        penyelesaiDialogAplikasi = null;
    }
}

document.getElementById(
    "appMessageDialog"
)?.addEventListener(
    "cancel",
    function(event) {
        event.preventDefault();
        selesaikanDialogAplikasi(false);
    }
);

document.getElementById(
    "appMessageDialog"
)?.addEventListener(
    "click",
    function(event) {
        if (event.target === this) {
            selesaikanDialogAplikasi(false);
        }
    }
);

let lastModalTrigger = null;

const APP_MODAL_IDS = [
    "transactionModal",
    "editTransaksiModal",
    "editPenjualanModal",
    "tambahBarangModal",
    "importExcelModal"
];

const modalSubmitState = {
    tambahBarang: false,
    transaksi: false,
    editTransaksi: false,
    editPenjualan: false,
    importExcel: false
};

function setModalSubmitBusy(
    buttonId,
    isBusy,
    busyLabel = "Menyimpan..."
) {
    const button =
        document.getElementById(
            buttonId
        );

    if (!button) {
        return;
    }

    if (isBusy) {
        button.dataset.idleHtml =
            button.innerHTML;
        button.disabled = true;
        button.setAttribute(
            "aria-busy",
            "true"
        );
        button.innerHTML =
            getUiIconSvg(
                "loading",
                "button-loading-icon"
            ) +
            "<span>" +
            escapeHTML(busyLabel) +
            "</span>";
        return;
    }

    button.disabled = false;
    button.removeAttribute(
        "aria-busy"
    );

    if (button.dataset.idleHtml) {
        button.innerHTML =
            button.dataset.idleHtml;
        delete button.dataset.idleHtml;
    }
}

function showAppModal(
    modal,
    focusTarget
) {
    if (!modal) {
        return;
    }

    lastModalTrigger =
        document.activeElement;

    modal.style.display = "flex";
    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    requestAnimationFrame(function() {
        focusTarget?.focus();
    });
}

function hideAppModal(modal) {
    if (!modal) {
        return;
    }

    modal.style.display = "none";
    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    const returnTarget =
        lastModalTrigger;

    lastModalTrigger = null;

    requestAnimationFrame(function() {
        if (
            returnTarget instanceof HTMLElement &&
            returnTarget.isConnected
        ) {
            returnTarget.focus();
        }
    });
}

function getVisibleAppModal() {
    return APP_MODAL_IDS
        .map(function(id) {
            return document.getElementById(id);
        })
        .find(function(modal) {
            return (
                modal &&
                modal.style.display === "flex"
            );
        }) || null;
}

function closeVisibleAppModal() {
    const modal =
        getVisibleAppModal();

    if (!modal) {
        return;
    }

    if (modal.id === "transactionModal") {
        closeModal();
    } else if (
        modal.id === "editTransaksiModal"
    ) {
        closeEditTransaksi();
    } else if (
        modal.id === "editPenjualanModal"
    ) {
        closeEditPenjualan();
    } else if (
        modal.id === "tambahBarangModal"
    ) {
        closeTambahBarang();
    } else if (
        modal.id === "importExcelModal"
    ) {
        closeImportExcel();
    }
}

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

    const toastDuration =
        type === "error"
            ? 4000
            : 3000;

    toast.style.setProperty(
        "--toast-duration",
        toastDuration + "ms"
    );

    toast.setAttribute(
        "role",
        type === "error"
            ? "alert"
            : "status"
    );

    if (type) {
        toast.classList.add(type);
    }

    requestAnimationFrame(function() {
        toast.classList.add("show");
    });

    toastTimer = setTimeout(function() {
        toast.classList.remove("show");
    }, toastDuration);
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

    element.setAttribute(
        "aria-busy",
        statusType === "loading"
            ? "true"
            : "false"
    );
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

    const editSelectBrand =
        document.getElementById(
            "editPenjualanBrand"
        );

    if (!selectBrand && !editSelectBrand) {
        return true;
    }

    if (selectBrand) {
        selectBrand.innerHTML =
            '<option value="">Memuat daftar brand...</option>';
    }

    if (editSelectBrand) {
        editSelectBrand.innerHTML =
            '<option value="">Memuat daftar brand...</option>';
    }

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

        if (selectBrand) {
            selectBrand.innerHTML =
                '<option value="">Gagal memuat brand</option>';
        }

        if (editSelectBrand) {
            editSelectBrand.innerHTML =
                '<option value="">Gagal memuat brand</option>';
        }

        return false;
    }

    if (selectBrand) {
        selectBrand.innerHTML =
            '<option value="">Pilih Brand</option>';
    }

    if (editSelectBrand) {
        editSelectBrand.innerHTML =
            '<option value="">Pilih Brand</option>';
    }

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

            selectBrand?.appendChild(
                option
            );

            if (editSelectBrand) {
                const editOption =
                    document.createElement(
                        "option"
                    );

                editOption.value =
                    item.nama;

                editOption.textContent =
                    item.nama;

                editSelectBrand.appendChild(
                    editOption
                );
            }
        }
    );

    return true;
}
/*/*==================================
   LOAD BARANG
===================================================== */
async function loadBarang(render = true) {
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
            return false;
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
        "Database aktif · " +
            formatNumber(
                dataBarang.length
            ) +
            " barang",
        "success"
    );

    if (render) {
        updateTable();
    }

    return true;
}


/*/*==================================
   LOAD TRANSAKSI
===================================================== */

async function loadTransactions(render = true) {

    const batasPerHalaman = 1000;
    let posisiAwal = 0;
    const semuaTransaksi = [];

    while (true) {
        const posisiAkhir =
            posisiAwal +
            batasPerHalaman -
            1;

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

            console.error(error);

            setDatabaseStatus(
                "Gagal mengambil transaksi: " +
                error.message,
                "error"
            );

            return false;
        }

        const hasil =
            data || [];

        semuaTransaksi.push(
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

    transactions =
        semuaTransaksi;

    if (render) {
        updateTable();
    }

    return true;
}


/*/*==================================
   TAMBAH BARANG
===================================================== */

async function tambahBarang() {

    if (modalSubmitState.tambahBarang) {
        return;
    }

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

        await showAppAlert(
            "Nama barang harus diisi."
        );

        namaInput.focus();

        return;
    }

    if (
        !Number.isFinite(stokAwal) ||
        stokAwal < 0
    ) {

        await showAppAlert(
            "Stok awal tidak valid."
        );

        stokInput.focus();

        return;
    }

    if (
        !Number.isInteger(brandId) ||
        brandId < 1
    ) {

        await showAppAlert(
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

        await showAppAlert(
            "Barang dengan nama tersebut sudah ada."
        );

        return;
    }

    modalSubmitState.tambahBarang = true;
    setModalSubmitBusy(
        "tambahBarangSubmit",
        true
    );

    try {
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
    } catch (error) {
        console.error(
            "ERROR TAMBAH BARANG:",
            error
        );

        setDatabaseStatus(
            "Gagal menyimpan barang.",
            "error"
        );
    } finally {
        modalSubmitState.tambahBarang = false;
        setModalSubmitBusy(
            "tambahBarangSubmit",
            false
        );
    }
}


/*/*==================================
   BUKA MODAL TAMBAH BARANG
===================================================== */

function openTambahBarang() {

    const modal =
        document.getElementById(
            "tambahBarangModal"
        );

    showAppModal(
        modal,
        document.getElementById(
            "namaBarang"
        )
    );
}


/*/*==================================
   TUTUP MODAL TAMBAH BARANG
===================================================== */

function closeTambahBarang() {

    const modal =
        document.getElementById(
            "tambahBarangModal"
        );

    hideAppModal(modal);
}


/* =====================================================
   IMPORT DATABASE BARANG DARI EXCEL
===================================================== */

const IMPORT_EXCEL_MAX_ROWS = 1000;
const IMPORT_EXCEL_MAX_FILE_SIZE =
    5 * 1024 * 1024;
const IMPORT_EXCEL_PREVIEW_LIMIT = 100;

let importExcelState = {
    fileName: "",
    rows: [],
    validRows: [],
    newBrandNames: [],
    skippedCount: 0,
    invalidCount: 0
};

function normalizeImportKey(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLocaleLowerCase("id-ID")
        .replace(/\s+/g, " ");
}

function normalizeImportHeader(value) {
    return normalizeImportKey(value)
        .replace(/[^a-z0-9]/g, "");
}

function getImportColumnIndexes(row) {
    const aliases = {
        nama: [
            "nama",
            "namabarang",
            "barang",
            "produk",
            "product"
        ],
        stok: [
            "stokawal",
            "stockawal",
            "stok",
            "stock",
            "qty",
            "jumlah"
        ],
        brand: [
            "brand",
            "merk",
            "merek"
        ]
    };

    const indexes = {};

    (row || []).forEach(
        function(value, index) {
            const header =
                normalizeImportHeader(value);

            Object.keys(aliases).forEach(
                function(field) {
                    if (
                        indexes[field] === undefined &&
                        aliases[field].includes(header)
                    ) {
                        indexes[field] = index;
                    }
                }
            );
        }
    );

    return [
        indexes.nama,
        indexes.stok,
        indexes.brand
    ].every(Number.isInteger)
        ? indexes
        : null;
}

function parseImportStock(value) {
    if (
        typeof value === "number" &&
        Number.isFinite(value)
    ) {
        return Number.isInteger(value) &&
            value >= 0
            ? value
            : null;
    }

    const text =
        String(value ?? "")
            .trim()
            .replace(/\s+/g, "");

    if (!text) {
        return null;
    }

    const normalized =
        /^\d{1,3}([.,]\d{3})+$/.test(text)
            ? text.replace(/[.,]/g, "")
            : text;

    const numberValue =
        Number(normalized);

    return Number.isInteger(numberValue) &&
        numberValue >= 0
        ? numberValue
        : null;
}

async function fetchImportBrands() {
    const {
        data,
        error
    } = await supabaseClient
        .from("brand")
        .select("id, nama, aktif")
        .order(
            "nama",
            {
                ascending: true
            }
        );

    if (error) {
        throw error;
    }

    return data || [];
}

function parseImportWorkbook(
    workbook,
    existingBrands
) {
    const existingItemNames =
        new Set(
            dataBarang.map(function(item) {
                return normalizeImportKey(
                    item.nama
                );
            })
        );

    const existingBrandMap =
        new Map(
            (existingBrands || []).map(
                function(item) {
                    return [
                        normalizeImportKey(
                            item.nama
                        ),
                        item
                    ];
                }
            )
        );

    const fileItemNames = new Set();
    const rows = [];
    const validRows = [];
    const newBrandMap = new Map();
    let foundHeader = false;
    let candidateCount = 0;

    workbook.SheetNames.forEach(
        function(sheetName) {
            const sheet =
                workbook.Sheets[sheetName];

            const matrix =
                XLSX.utils.sheet_to_json(
                    sheet,
                    {
                        header: 1,
                        defval: "",
                        raw: true
                    }
                );

            const searchLimit =
                Math.min(
                    matrix.length,
                    25
                );

            let headerIndex = -1;
            let columns = null;

            for (
                let index = 0;
                index < searchLimit;
                index += 1
            ) {
                const found =
                    getImportColumnIndexes(
                        matrix[index]
                    );

                if (found) {
                    headerIndex = index;
                    columns = found;
                    foundHeader = true;
                    break;
                }
            }

            if (!columns) {
                return;
            }

            for (
                let index = headerIndex + 1;
                index < matrix.length;
                index += 1
            ) {
                const sourceRow =
                    matrix[index] || [];

                const rawName =
                    sourceRow[columns.nama];

                const rawStock =
                    sourceRow[columns.stok];

                const rawBrand =
                    sourceRow[columns.brand];

                if (
                    [
                        rawName,
                        rawStock,
                        rawBrand
                    ].every(function(value) {
                        return String(
                            value ?? ""
                        ).trim() === "";
                    })
                ) {
                    continue;
                }

                candidateCount += 1;

                if (
                    candidateCount >
                    IMPORT_EXCEL_MAX_ROWS
                ) {
                    throw new Error(
                        "Excel maksimal berisi " +
                        formatNumber(
                            IMPORT_EXCEL_MAX_ROWS
                        ) +
                        " baris data."
                    );
                }

                const nama =
                    String(rawName ?? "")
                        .trim()
                        .replace(/\s+/g, " ");

                const brandInput =
                    String(rawBrand ?? "")
                        .trim()
                        .replace(/\s+/g, " ");

                const namaKey =
                    normalizeImportKey(nama);

                const brandKey =
                    normalizeImportKey(
                        brandInput
                    );

                const existingBrand =
                    existingBrandMap.get(
                        brandKey
                    );

                const brand =
                    existingBrand?.nama ||
                    brandInput;

                const stok =
                    parseImportStock(
                        rawStock
                    );

                const row = {
                    source:
                        sheetName +
                        " · " +
                        String(index + 1),
                    nama,
                    brand,
                    stok,
                    stokTampilan:
                        String(rawStock ?? ""),
                    status: "ready",
                    message: "Siap"
                };

                if (!nama) {
                    row.status = "invalid";
                    row.message = "Nama kosong";
                } else if (nama.length > 200) {
                    row.status = "invalid";
                    row.message = "Nama terlalu panjang";
                } else if (!brandInput) {
                    row.status = "invalid";
                    row.message = "Brand kosong";
                } else if (brand.length > 100) {
                    row.status = "invalid";
                    row.message = "Brand terlalu panjang";
                } else if (stok === null) {
                    row.status = "invalid";
                    row.message = "Stok tidak valid";
                } else if (
                    existingItemNames.has(
                        namaKey
                    )
                ) {
                    row.status = "skipped";
                    row.message = "Sudah ada";
                } else if (
                    fileItemNames.has(
                        namaKey
                    )
                ) {
                    row.status = "skipped";
                    row.message = "Duplikat di Excel";
                } else {
                    fileItemNames.add(namaKey);

                    if (!existingBrand) {
                        row.message =
                            "Siap · brand baru";

                        if (
                            !newBrandMap.has(
                                brandKey
                            )
                        ) {
                            newBrandMap.set(
                                brandKey,
                                brand
                            );
                        }
                    }

                    validRows.push(row);
                }

                rows.push(row);
            }
        }
    );

    if (!foundHeader) {
        throw new Error(
            "Kolom nama, stock_awal, dan brand tidak ditemukan."
        );
    }

    return {
        rows,
        validRows,
        newBrandNames:
            Array.from(
                newBrandMap.values()
            ),
        skippedCount:
            rows.filter(function(row) {
                return row.status === "skipped";
            }).length,
        invalidCount:
            rows.filter(function(row) {
                return row.status === "invalid";
            }).length
    };
}

function renderImportExcelPreview() {
    const body =
        document.getElementById(
            "importExcelPreviewBody"
        );

    const fileName =
        document.getElementById(
            "importExcelFileName"
        );

    const readyCount =
        document.getElementById(
            "importExcelReadyCount"
        );

    const brandCount =
        document.getElementById(
            "importExcelBrandCount"
        );

    const skippedCount =
        document.getElementById(
            "importExcelSkippedCount"
        );

    const invalidCount =
        document.getElementById(
            "importExcelInvalidCount"
        );

    const limitText =
        document.getElementById(
            "importExcelPreviewLimit"
        );

    const submitButton =
        document.getElementById(
            "importExcelSubmit"
        );

    if (
        !body ||
        !fileName ||
        !submitButton
    ) {
        return;
    }

    fileName.textContent =
        importExcelState.fileName;

    if (readyCount) {
        readyCount.textContent =
            formatNumber(
                importExcelState
                    .validRows.length
            );
    }

    if (brandCount) {
        brandCount.textContent =
            formatNumber(
                importExcelState
                    .newBrandNames.length
            );
    }

    if (skippedCount) {
        skippedCount.textContent =
            formatNumber(
                importExcelState
                    .skippedCount
            );
    }

    if (invalidCount) {
        invalidCount.textContent =
            formatNumber(
                importExcelState
                    .invalidCount
            );
    }

    const previewRows =
        importExcelState.rows.slice(
            0,
            IMPORT_EXCEL_PREVIEW_LIMIT
        );

    if (!previewRows.length) {
        body.innerHTML =
            '<tr><td colspan="5" class="import-excel-empty">Tidak ada baris data.</td></tr>';
    } else {
        body.innerHTML =
            previewRows.map(
                function(row) {
                    const stockText =
                        row.stok === null
                            ? row.stokTampilan || "—"
                            : formatNumber(
                                row.stok
                            );

                    return `
                        <tr>
                            <td>${escapeHTML(row.source)}</td>
                            <td>${escapeHTML(row.nama || "—")}</td>
                            <td>${escapeHTML(row.brand || "—")}</td>
                            <td>${escapeHTML(stockText)}</td>
                            <td>
                                <span class="import-row-status import-row-${row.status}">
                                    ${escapeHTML(row.message)}
                                </span>
                            </td>
                        </tr>
                    `;
                }
            ).join("");
    }

    if (limitText) {
        const hiddenCount =
            importExcelState.rows.length -
            previewRows.length;

        limitText.hidden =
            hiddenCount <= 0;

        limitText.textContent =
            hiddenCount > 0
                ? formatNumber(hiddenCount) +
                    " baris lainnya tetap akan diproses."
                : "";
    }

    submitButton.disabled =
        importExcelState.validRows.length === 0;

    submitButton.textContent =
        "Import " +
        formatNumber(
            importExcelState.validRows.length
        ) +
        " Barang";
}

function openImportExcel() {
    if (modalSubmitState.importExcel) {
        return;
    }

    const input =
        document.getElementById(
            "importExcelFile"
        );

    if (!input) {
        return;
    }

    input.value = "";
    input.click();
}

async function handleImportExcelFile(event) {
    const input = event?.target;
    const file = input?.files?.[0];

    if (!file) {
        return;
    }

    try {
        if (typeof XLSX === "undefined") {
            throw new Error(
                "Library Excel belum dimuat. Coba lagi beberapa saat."
            );
        }

        if (
            !/\.(xlsx|xls)$/i.test(
                file.name
            )
        ) {
            throw new Error(
                "Pilih file Excel berformat .xlsx atau .xls."
            );
        }

        if (
            file.size >
            IMPORT_EXCEL_MAX_FILE_SIZE
        ) {
            throw new Error(
                "Ukuran file Excel maksimal 5 MB."
            );
        }

        setDatabaseStatus(
            "Membaca file Excel..."
        );

        await ensureCoreData();

        const [
            buffer,
            existingBrands
        ] = await Promise.all([
            file.arrayBuffer(),
            fetchImportBrands()
        ]);

        const workbook =
            XLSX.read(
                buffer,
                {
                    type: "array"
                }
            );

        const parsed =
            parseImportWorkbook(
                workbook,
                existingBrands
            );

        importExcelState = {
            fileName: file.name,
            ...parsed
        };

        renderImportExcelPreview();

        showAppModal(
            document.getElementById(
                "importExcelModal"
            ),
            document.getElementById(
                "importExcelSubmit"
            )
        );

        setDatabaseStatus(
            formatNumber(
                parsed.validRows.length
            ) +
            " barang siap diimport.",
            "success"
        );
    } catch (error) {
        console.error(
            "ERROR BACA IMPORT EXCEL:",
            error
        );

        input.value = "";

        setDatabaseStatus(
            "File Excel gagal dibaca.",
            "error"
        );

        await showAppAlert(
            error?.message ||
                "File Excel gagal dibaca.",
            {
                title: "Import Excel"
            }
        );
    }
}

function closeImportExcel() {
    if (modalSubmitState.importExcel) {
        return;
    }

    hideAppModal(
        document.getElementById(
            "importExcelModal"
        )
    );

    const input =
        document.getElementById(
            "importExcelFile"
        );

    if (input) {
        input.value = "";
    }

    importExcelState = {
        fileName: "",
        rows: [],
        validRows: [],
        newBrandNames: [],
        skippedCount: 0,
        invalidCount: 0
    };
}

async function simpanImportExcel() {
    if (
        modalSubmitState.importExcel ||
        !importExcelState.validRows.length
    ) {
        return;
    }

    const approved =
        await showAppConfirm(
            "Tambahkan " +
            formatNumber(
                importExcelState
                    .validRows.length
            ) +
            " barang baru dan " +
            formatNumber(
                importExcelState
                    .newBrandNames.length
            ) +
            " brand baru? Barang yang sudah ada tetap tidak diubah.",
            {
                title: "Konfirmasi Import Excel",
                type: "info",
                confirmLabel: "Ya, Import"
            }
        );

    if (!approved) {
        return;
    }

    modalSubmitState.importExcel = true;

    setModalSubmitBusy(
        "importExcelSubmit",
        true,
        "Mengimport..."
    );

    let importedCount = 0;
    let newlySkippedCount = 0;
    let importSucceeded = false;
    let errorMessage = "";

    try {
        setDatabaseStatus(
            "Memeriksa database terbaru..."
        );

        const loadSucceeded =
            await loadBarang(false);

        if (loadSucceeded === false) {
            throw new Error(
                "Data barang terbaru gagal dimuat."
            );
        }

        let existingBrands =
            await fetchImportBrands();

        const existingItemNames =
            new Set(
                dataBarang.map(
                    function(item) {
                        return normalizeImportKey(
                            item.nama
                        );
                    }
                )
            );

        const rowsToImport =
            importExcelState.validRows
                .filter(function(row) {
                    const isExisting =
                        existingItemNames.has(
                            normalizeImportKey(
                                row.nama
                            )
                        );

                    if (isExisting) {
                        newlySkippedCount += 1;
                    }

                    return !isExisting;
                });

        if (!rowsToImport.length) {
            throw new Error(
                "Semua barang dalam Excel sudah ada di database."
            );
        }

        let brandMap =
            new Map(
                existingBrands.map(
                    function(item) {
                        return [
                            normalizeImportKey(
                                item.nama
                            ),
                            item
                        ];
                    }
                )
            );

        const requiredBrandNames =
            new Map();

        rowsToImport.forEach(
            function(row) {
                const key =
                    normalizeImportKey(
                        row.brand
                    );

                if (!requiredBrandNames.has(key)) {
                    requiredBrandNames.set(
                        key,
                        row.brand
                    );
                }
            }
        );

        const inactiveBrandIds =
            Array.from(
                requiredBrandNames.keys()
            )
                .map(function(key) {
                    return brandMap.get(key);
                })
                .filter(function(item) {
                    return item &&
                        item.aktif === false;
                })
                .map(function(item) {
                    return item.id;
                });

        if (inactiveBrandIds.length) {
            const { error } =
                await supabaseClient
                    .from("brand")
                    .update({
                        aktif: true
                    })
                    .in(
                        "id",
                        inactiveBrandIds
                    );

            if (error) {
                throw error;
            }
        }

        const missingBrandNames =
            Array.from(
                requiredBrandNames.entries()
            )
                .filter(function(entry) {
                    return !brandMap.has(
                        entry[0]
                    );
                })
                .map(function(entry) {
                    return entry[1];
                });

        if (missingBrandNames.length) {
            const {
                error
            } = await supabaseClient
                .from("brand")
                .insert(
                    missingBrandNames.map(
                        function(nama) {
                            return {
                                nama,
                                aktif: true
                            };
                        }
                    )
                );

            if (error) {
                existingBrands =
                    await fetchImportBrands();

                const latestBrandKeys =
                    new Set(
                        existingBrands.map(
                            function(item) {
                                return normalizeImportKey(
                                    item.nama
                                );
                            }
                        )
                    );

                const unresolved =
                    missingBrandNames.some(
                        function(nama) {
                            return !latestBrandKeys.has(
                                normalizeImportKey(
                                    nama
                                )
                            );
                        }
                    );

                if (unresolved) {
                    throw error;
                }
            }
        }

        existingBrands =
            await fetchImportBrands();

        brandMap =
            new Map(
                existingBrands.map(
                    function(item) {
                        return [
                            normalizeImportKey(
                                item.nama
                            ),
                            item
                        ];
                    }
                )
            );

        const payload =
            rowsToImport.map(
                function(row) {
                    const brand =
                        brandMap.get(
                            normalizeImportKey(
                                row.brand
                            )
                        );

                    if (!brand?.id) {
                        throw new Error(
                            "Brand " +
                            row.brand +
                            " gagal disiapkan."
                        );
                    }

                    return {
                        nama: row.nama,
                        stok_awal: row.stok,
                        brand_id: brand.id
                    };
                }
            );

        setDatabaseStatus(
            "Mengimport barang ke database..."
        );

        const {
            data,
            error
        } = await supabaseClient
            .from("barang")
            .insert(payload)
            .select("id");

        if (error) {
            throw error;
        }

        importedCount =
            data?.length ||
            payload.length;

        await Promise.all([
            loadBrandBarangBaru(),
            loadBarang(false)
        ]);

        updateTable();

        setDatabaseStatus(
            formatNumber(importedCount) +
            " barang berhasil diimport.",
            "success"
        );

        importSucceeded = true;
    } catch (error) {
        console.error(
            "ERROR SIMPAN IMPORT EXCEL:",
            error
        );

        errorMessage =
            error?.message ||
            "Data Excel gagal diimport.";

        setDatabaseStatus(
            "Import Excel gagal.",
            "error"
        );
    } finally {
        modalSubmitState.importExcel = false;

        setModalSubmitBusy(
            "importExcelSubmit",
            false
        );
    }

    if (!importSucceeded) {
        await showAppAlert(
            errorMessage,
            {
                title: "Import Excel Gagal"
            }
        );
        return;
    }

    const totalSkipped =
        importExcelState.skippedCount +
        newlySkippedCount;

    closeImportExcel();

    showToast(
        formatNumber(importedCount) +
        " barang ditambahkan" +
        (totalSkipped > 0
            ? " · " +
                formatNumber(totalSkipped) +
                " dilewati"
            : ""),
        "success"
    );
}


/*/*==================================
   HITUNG STOK
===================================================== */

function getRawCurrentStock(barang) {

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


function getCurrentStock(barang) {
    return Math.max(
        0,
        getRawCurrentStock(barang)
    );
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

    tombolSebelumnya.setAttribute(
        "aria-label",
        "Halaman stok sebelumnya"
    );

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

        titikAwal.setAttribute(
            "aria-hidden",
            "true"
        );

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

        tombol.setAttribute(
            "aria-label",
            "Buka halaman stok " + halaman
        );

        if (
            halaman ===
            halamanStok
        ) {
            tombol.classList.add(
                "active"
            );

            tombol.setAttribute(
                "aria-current",
                "page"
            );

            tombol.setAttribute(
                "aria-label",
                "Halaman stok " +
                halaman +
                ", halaman aktif"
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

        titikAkhir.setAttribute(
            "aria-hidden",
            "true"
        );

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

    tombolBerikutnya.setAttribute(
        "aria-label",
        "Halaman stok berikutnya"
    );

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

    updateStockSortHeaders();

    updateTable();
}


function sortNama() {

    sortMode = "nama";

    updateStockSortHeaders();

    updateTable();
}


function updateStockSortHeaders() {

    const namaHeader =
        document.getElementById(
            "namaHeader"
        );

    const stokHeader =
        document.getElementById(
            "stokHeader"
        );

    const namaButton =
        namaHeader?.querySelector(
            ".table-sort-button"
        );

    const stokButton =
        stokHeader?.querySelector(
            ".table-sort-button"
        );

    const namaAktif =
        sortMode === "nama";

    const stokAktif =
        sortMode === "stok";

    if (namaHeader && namaButton) {

        namaHeader.setAttribute(
            "aria-sort",
            namaAktif
                ? "ascending"
                : "none"
        );

        namaButton.setAttribute(
            "aria-label",
            namaAktif
                ? "Nama barang diurutkan naik"
                : "Urutkan berdasarkan nama barang"
        );

        namaButton.innerHTML =
            "<span>Nama Barang</span>" +
            getUiIconSvg(
                namaAktif
                    ? "sortAscending"
                    : "sortNeutral",
                "table-sort-icon"
            );
    }

    if (stokHeader && stokButton) {

        const arahStok =
            stockSortAsc
                ? "ascending"
                : "descending";

        stokHeader.setAttribute(
            "aria-sort",
            stokAktif
                ? arahStok
                : "none"
        );

        stokButton.setAttribute(
            "aria-label",
            stokAktif
                ? "Stok diurutkan " +
                    (stockSortAsc
                        ? "naik"
                        : "turun")
                : "Urutkan berdasarkan jumlah stok"
        );

        stokButton.innerHTML =
            "<span>Stok</span>" +
            getUiIconSvg(
                stokAktif
                    ? (stockSortAsc
                        ? "sortAscending"
                        : "sortDescending")
                    : "sortNeutral",
                "table-sort-icon"
            );
    }
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

        showAppAlert(
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

    showAppModal(
        modal,
        qtyInput
    );
}


/*/*==================================
   TUTUP MODAL
===================================================== */

function closeModal() {

    const modal =
        document.getElementById(
            "transactionModal"
        );

    hideAppModal(modal);
}


/*/*==================================
   SIMPAN TRANSAKSI
===================================================== */

async function confirmTransaction() {

    if (modalSubmitState.transaksi) {
        return;
    }

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

        showAppAlert(
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

        showAppAlert(
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

            showAppAlert(
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


    modalSubmitState.transaksi = true;
    setModalSubmitBusy(
        "transactionSubmit",
        true
    );

    try {
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

            showAppAlert(
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
    } catch (error) {
        console.error(
            "ERROR SIMPAN TRANSAKSI:",
            error
        );

        showToast(
            "Gagal menyimpan transaksi",
            "error"
        );
    } finally {
        modalSubmitState.transaksi = false;
        setModalSubmitBusy(
            "transactionSubmit",
            false
        );
    }
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
                    colspan="6"
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

            const typeTextMobile =
                transaction.type ===
                "masuk"
                    ? "In"
                    : "Out";

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

            const tanggalISO =
                String(
                    transaction.tanggal || ""
                );

            const waktu =
                tanggalISO
                    ? formatTanggalTampilan(
                        tanggalISO
                    ) || "-"
                    : "-";

            const waktuRingkas =
                tanggalISO
                    ? formatTanggalRingkasTabel(
                        tanggalISO
                    ) || "-"
                    : "-";

            const tr =
                document.createElement(
                    "tr"
                );

            tr.innerHTML =
                `
                <td>
                    <time datetime="${escapeHTML(
                        tanggalISO
                    )}">
                        <span class="history-date-desktop">${escapeHTML(
                            waktu
                        )}</span>
                        <span class="history-date-mobile">${escapeHTML(
                            waktuRingkas
                        )}</span>
                    </time>
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
                    <span class="history-type-desktop">
                        ${typeText}
                    </span>
                    <span class="history-type-mobile">
                        ${typeTextMobile}
                    </span>
                </td>

                <td>
                    ${qtyText}
                </td>

                <td>
                    ${formatNumber(
                        stokAkhir
                    )}
                </td>

                <td class="text-center">
                    <button
                        type="button"
                        class="history-edit-transaction-btn"
                        onclick="openEditTransaksi(${Number(transaction.id)})"
                        title="Edit tanggal dan jumlah"
                        aria-label="Edit tanggal dan jumlah transaksi ${escapeHTML(namaBarang)}"
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 20h9"/>
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>
                        </svg>
                    </button>
                </td>
                `;

            tbody.appendChild(
                tr
            );
        }
    );
}


/* ==================================
   EDIT TRANSAKSI IN/OUT
================================== */

function openEditTransaksi(id) {
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
        showAppAlert(
            "Transaksi tidak ditemukan."
        );
        return;
    }

    const barang =
        dataBarang.find(
            function(item) {
                return (
                    Number(item.id) ===
                    Number(transaction.barang_id)
                );
            }
        );

    document.getElementById(
        "editTransaksiId"
    ).value = transaction.id;

    document.getElementById(
        "editTransaksiBarang"
    ).value = barang
        ? barang.nama
        : "Barang tidak ditemukan";

    document.getElementById(
        "editTransaksiJenis"
    ).value = transaction.type === "masuk"
        ? "Masuk"
        : "Keluar";

    document.getElementById(
        "editTransaksiQty"
    ).value = Number(transaction.qty) || 1;

    document.getElementById(
        "editTransaksiTanggal"
    ).value = transaction.tanggal || "";

    showAppModal(
        document.getElementById(
            "editTransaksiModal"
        ),
        document.getElementById(
            "editTransaksiQty"
        )
    );
}


function closeEditTransaksi() {
    hideAppModal(
        document.getElementById(
            "editTransaksiModal"
        )
    );
}


async function simpanEditTransaksi() {
    if (modalSubmitState.editTransaksi) {
        return;
    }

    const id = Number(
        document.getElementById(
            "editTransaksiId"
        ).value
    );

    const transaction =
        transactions.find(
            function(item) {
                return Number(item.id) === id;
            }
        );

    if (!transaction) {
        showAppAlert(
            "Transaksi tidak ditemukan."
        );
        return;
    }

    const qty = Number(
        document.getElementById(
            "editTransaksiQty"
        ).value
    );

    const tanggal =
        document.getElementById(
            "editTransaksiTanggal"
        ).value;

    if (!Number.isFinite(qty) || qty <= 0) {
        showAppAlert(
            "Jumlah harus lebih dari 0."
        );
        return;
    }

    if (!parseTanggalISOExport(tanggal)) {
        showAppAlert(
            "Tanggal transaksi tidak valid."
        );
        return;
    }

    const disetujui =
        await showAppConfirm(
            "Simpan perubahan tanggal dan jumlah transaksi ini?",
            {
                title: "Edit Transaksi In/Out",
                type: "info",
                confirmLabel: "Ya, Simpan"
            }
        );

    if (!disetujui) {
        return;
    }

    modalSubmitState.editTransaksi = true;
    setModalSubmitBusy(
        "editTransaksiSubmit",
        true
    );

    try {
        if (transaction.penjualan_id) {
            const {
                data: penjualan,
                error: errorPenjualan
            } =
                await supabaseClient
                    .from("penjualan")
                    .select("*")
                    .eq(
                        "id",
                        transaction.penjualan_id
                    )
                    .single();

            if (errorPenjualan || !penjualan) {
                throw new Error(
                    errorPenjualan?.message ||
                    "Catatan penjualan terkait tidak ditemukan."
                );
            }

            const { error } =
                await supabaseClient.rpc(
                    "edit_penjualan_atomic",
                    {
                        p_penjualan_id:
                            Number(penjualan.id),
                        p_barang_id:
                            Number(penjualan.barang_id),
                        p_brand:
                            penjualan.brand,
                        p_qty:
                            qty,
                        p_harga:
                            Number(penjualan.harga) || 0,
                        p_tanggal_pembelian:
                            tanggal
                    }
                );

            if (error) {
                throw error;
            }
        } else {
            const { data, error } =
                await supabaseClient
                    .from("transaksi")
                    .update({
                        qty,
                        tanggal
                    })
                    .eq("id", id)
                    .select("id")
                    .single();

            if (error || !data) {
                throw (
                    error ||
                    new Error(
                        "Transaksi tidak berhasil diperbarui."
                    )
                );
            }
        }

        await loadTransactions(false);
        updateTable();
        updateStats();

        if (transaction.penjualan_id) {
            await loadPenjualan();
        }

        closeEditTransaksi();

        showToast(
            "Tanggal dan jumlah transaksi berhasil diperbarui",
            "success"
        );
    } catch (error) {
        console.error(
            "ERROR EDIT TRANSAKSI:",
            error
        );

        showAppAlert(
            "Gagal mengubah transaksi:\n" +
            (error?.message || "Kesalahan tidak diketahui.")
        );
    } finally {
        modalSubmitState.editTransaksi = false;
        setModalSubmitBusy(
            "editTransaksiSubmit",
            false
        );
    }
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
        await showAppConfirm(
            "Hapus transaksi ini?\n\n" +
            "Data transaksi akan dihapus permanen.",
            {
                title: "Hapus Transaksi",
                confirmLabel: "Ya, Hapus"
            }
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
        if (
            event.target instanceof HTMLElement &&
            event.target.classList.contains("modal")
        ) {
            closeVisibleAppModal();
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
        const modal =
            getVisibleAppModal();

        if (!modal) {
            return;
        }

        if (event.key === "Escape") {
            event.preventDefault();
            closeVisibleAppModal();
            return;
        }

        if (event.key === "Tab") {
            const focusable =
                Array.from(
                    modal.querySelectorAll(
                        "button:not([disabled]), " +
                        "input:not([disabled]):not([type='hidden']), " +
                        "select:not([disabled]), " +
                        "textarea:not([disabled]), " +
                        "[tabindex]:not([tabindex='-1'])"
                    )
                ).filter(function(element) {
                    return element.offsetParent !== null;
                });

            if (focusable.length === 0) {
                return;
            }

            const first = focusable[0];
            const last =
                focusable[
                    focusable.length - 1
                ];

            if (
                event.shiftKey &&
                document.activeElement === first
            ) {
                event.preventDefault();
                last.focus();
            } else if (
                !event.shiftKey &&
                document.activeElement === last
            ) {
                event.preventDefault();
                first.focus();
            }
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

const tanggalTampilanElement =
    document.getElementById(
        "tanggalTampilan"
    );

const tanggalPickerButton =
    document.getElementById(
        "tanggalPickerButton"
    );


function formatTanggalTampilan(
    nilaiTanggal
) {
    const cocok =
        String(nilaiTanggal || "")
            .match(
                /^(\d{4})-(\d{2})-(\d{2})$/
            );

    if (!cocok) {
        return "";
    }

    return (
        cocok[3] +
        "/" +
        cocok[2] +
        "/" +
        cocok[1]
    );
}


function formatTanggalRingkasTabel(
    nilaiTanggal
) {
    const cocok =
        String(nilaiTanggal || "")
            .match(
                /^(\d{4})-(\d{2})-(\d{2})$/
            );

    if (!cocok) {
        return "";
    }

    return (
        Number(cocok[3]) +
        "/" +
        Number(cocok[2])
    );
}


function parseTanggalTampilan(
    nilaiTanggal
) {
    const cocok =
        String(nilaiTanggal || "")
            .trim()
            .match(
                /^(\d{2})\/(\d{2})\/(\d{4})$/
            );

    if (!cocok) {
        return "";
    }

    const hari =
        Number(cocok[1]);

    const bulan =
        Number(cocok[2]);

    const tahun =
        Number(cocok[3]);

    const tanggal =
        new Date(
            tahun,
            bulan - 1,
            hari
        );

    if (
        tanggal.getFullYear() !== tahun ||
        tanggal.getMonth() !== bulan - 1 ||
        tanggal.getDate() !== hari
    ) {
        return "";
    }

    return (
        String(tahun).padStart(4, "0") +
        "-" +
        String(bulan).padStart(2, "0") +
        "-" +
        String(hari).padStart(2, "0")
    );
}


function formatKetikTanggal(
    nilaiTanggal
) {
    const angka =
        String(nilaiTanggal || "")
            .replace(/\D/g, "")
            .slice(0, 8);

    const bagian = [];

    if (angka.length > 0) {
        bagian.push(
            angka.slice(0, 2)
        );
    }

    if (angka.length > 2) {
        bagian.push(
            angka.slice(2, 4)
        );
    }

    if (angka.length > 4) {
        bagian.push(
            angka.slice(4, 8)
        );
    }

    return bagian.join("/");
}


function sinkronkanTanggalTampilan() {
    if (!tanggalTampilanElement) {
        return;
    }

    tanggalTampilanElement.value =
        formatTanggalTampilan(
            tanggalElement?.value ||
            tanggalDipilih
        );
}


function terapkanTanggalTampilan() {
    if (
        !tanggalElement ||
        !tanggalTampilanElement
    ) {
        return;
    }

    const nilaiTampilan =
        tanggalTampilanElement.value
            .trim();

    if (!nilaiTampilan) {
        sinkronkanTanggalTampilan();
        return;
    }

    const nilaiIso =
        parseTanggalTampilan(
            nilaiTampilan
        );

    if (!nilaiIso) {
        showToast(
            "Gunakan format tanggal/bulan/tahun.",
            "error"
        );

        sinkronkanTanggalTampilan();
        return;
    }

    tanggalElement.value =
        nilaiIso;

    tanggalDipilih =
        nilaiIso;

    sinkronkanTanggalTampilan();
    updateTable();
}


if (tanggalElement) {

    tanggalElement.addEventListener(
        "change",
        function() {

            tanggalDipilih =
                this.value;

            sinkronkanTanggalTampilan();
            updateTable();
        }
    );
}


if (tanggalTampilanElement) {

    tanggalTampilanElement.addEventListener(
        "input",
        function() {
            this.value =
                formatKetikTanggal(
                    this.value
                );
        }
    );

    tanggalTampilanElement.addEventListener(
        "blur",
        terapkanTanggalTampilan
    );

    tanggalTampilanElement.addEventListener(
        "keydown",
        function(event) {
            if (event.key === "Enter") {
                event.preventDefault();
                terapkanTanggalTampilan();
                this.blur();
            }

            if (event.key === "Escape") {
                sinkronkanTanggalTampilan();
                this.blur();
            }
        }
    );
}


if (
    tanggalPickerButton &&
    tanggalElement
) {
    tanggalPickerButton.addEventListener(
        "click",
        function() {
            if (
                typeof tanggalElement.showPicker ===
                "function"
            ) {
                tanggalElement.showPicker();
                return;
            }

            tanggalElement.click();
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

const inputPenjualanTanggalTampilan =
    document.getElementById(
        "penjualanTanggalTampilan"
    );

const penjualanTanggalPickerButton =
    document.getElementById(
        "penjualanTanggalPickerButton"
    );

const simpanPenjualanButton =
    document.getElementById("simpanPenjualanButton");

let penjualanSedangDisimpan = false;


function sinkronkanTanggalPenjualanTampilan() {
    if (!inputPenjualanTanggalTampilan) {
        return;
    }

    inputPenjualanTanggalTampilan.value =
        formatTanggalTampilan(
            inputPenjualanTanggal?.value
        );
}


function terapkanTanggalPenjualanTampilan() {
    if (
        !inputPenjualanTanggal ||
        !inputPenjualanTanggalTampilan
    ) {
        return;
    }

    const nilaiTampilan =
        inputPenjualanTanggalTampilan
            .value
            .trim();

    if (!nilaiTampilan) {
        sinkronkanTanggalPenjualanTampilan();
        return;
    }

    const nilaiIso =
        parseTanggalTampilan(
            nilaiTampilan
        );

    if (!nilaiIso) {
        showToast(
            "Gunakan format tanggal/bulan/tahun.",
            "error"
        );

        sinkronkanTanggalPenjualanTampilan();
        return;
    }

    inputPenjualanTanggal.value =
        nilaiIso;

    sinkronkanTanggalPenjualanTampilan();
    updatePenjualanSummary();
}


if (inputPenjualanTanggal) {
    inputPenjualanTanggal.addEventListener(
        "change",
        sinkronkanTanggalPenjualanTampilan
    );
}


if (inputPenjualanTanggalTampilan) {
    inputPenjualanTanggalTampilan.addEventListener(
        "input",
        function() {
            this.value =
                formatKetikTanggal(
                    this.value
                );
        }
    );

    inputPenjualanTanggalTampilan.addEventListener(
        "blur",
        terapkanTanggalPenjualanTampilan
    );

    inputPenjualanTanggalTampilan.addEventListener(
        "keydown",
        function(event) {
            if (event.key === "Enter") {
                event.preventDefault();
                terapkanTanggalPenjualanTampilan();
                this.blur();
            }

            if (event.key === "Escape") {
                sinkronkanTanggalPenjualanTampilan();
                this.blur();
            }
        }
    );
}


if (
    penjualanTanggalPickerButton &&
    inputPenjualanTanggal
) {
    penjualanTanggalPickerButton.addEventListener(
        "click",
        function() {
            if (
                typeof inputPenjualanTanggal.showPicker ===
                    "function"
            ) {
                inputPenjualanTanggal.showPicker();
                return;
            }

            inputPenjualanTanggal.click();
        }
    );
}

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

function getPenjualanStockStatus(
    barang,
    tanggal,
    qty = 0
) {
    if (!barang) {
        return {
            stokTersedia: 0,
            preOrderSebelum: 0,
            preOrderTambahan: 0,
            preOrderSetelah: 0
        };
    }

    const tanggalSebelumnya =
        tanggalDipilih;

    tanggalDipilih =
        tanggal || tanggalSebelumnya;

    const stokMentah =
        getRawCurrentStock(barang);

    tanggalDipilih =
        tanggalSebelumnya;

    const stokTersedia =
        Math.max(0, stokMentah);

    const preOrderSebelum =
        Math.max(0, -stokMentah);

    const jumlahJual =
        Math.max(0, Number(qty) || 0);

    const stokSetelah =
        stokMentah - jumlahJual;

    return {
        stokTersedia,
        preOrderSebelum,
        preOrderTambahan:
            Math.max(
                0,
                jumlahJual - stokTersedia
            ),
        preOrderSetelah:
            Math.max(0, -stokSetelah)
    };
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

    const statusStok =
        getPenjualanStockStatus(
            barang,
            inputPenjualanTanggal?.value,
            qty
        );

    const stok =
        statusStok.stokTersedia;

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

    const menjadiPreOrder =
        Boolean(barang) &&
        qty > stok;

    if (stockElement) {
        stockElement.classList.toggle(
            "is-error",
            false
        );

        stockElement.classList.toggle(
            "is-preorder",
            menjadiPreOrder
        );

        const stockIconName =
            menjadiPreOrder
                ? "warning"
                : barang
                    ? "success"
                    : "info";

        const stockMessage =
            barang
                ? (
                    menjadiPreOrder
                        ? "Stok tersedia: " +
                          formatNumber(stok) +
                          " · Pre-order setelah dicatat: " +
                          formatNumber(
                              statusStok.preOrderSetelah
                          )
                        : "Stok tersedia: " +
                          formatNumber(stok)
                  )
                : "Pilih barang untuk melihat stok.";

        stockElement.innerHTML =
            getUiIconSvg(
                stockIconName,
                "sales-stock-status-icon"
            ) +
            "<span>" +
            escapeHTML(stockMessage) +
            "</span>";
    }

    if (simpanPenjualanButton) {
        simpanPenjualanButton.disabled =
            penjualanSedangDisimpan ||
            !barang ||
            !inputPenjualanBrand?.value.trim() ||
            qty < 1 ||
            !inputPenjualanHarga?.value ||
            !inputPenjualanTanggal?.value;
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

        return showAppAlert(
            "Pilih barang dari daftar saran."
        );
    }

    if (!brand) {

    return showAppAlert(
        "Barang belum memiliki brand."
    );
}

    if (!qty || qty < 1) {

        return showAppAlert(
            "Quantity harus diisi."
        );
    }

    if (
        !hargaInput.value ||
        harga < 0
    ) {

        return showAppAlert(
            "Harga/Unit harus diisi."
        );
    }

    if (!tanggal) {

        return showAppAlert(
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

        return showAppAlert(
            "Barang tidak ditemukan."
        );
    }


    const statusStok =
        getPenjualanStockStatus(
            barang,
            tanggal,
            qty
        );

    const jumlahPreOrder =
        statusStok.preOrderSetelah;


    const dikonfirmasi =
        await showAppConfirm(
            "Catat penjualan ini?\n\n" +
            "Barang: " + barang.nama + "\n" +
            "Quantity: " + formatNumber(qty) + "\n" +
            (jumlahPreOrder > 0
                ? "Pre-order setelah dicatat: " +
                  formatNumber(jumlahPreOrder) +
                  "\n"
                : "") +
            "Total: Rp" +
            formatNumber(qty * harga),
            {
                title: "Konfirmasi Penjualan",
                type: "info",
                confirmLabel: "Ya, Catat"
            }
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

        return showAppAlert(
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

        return showAppAlert(
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
        jumlahPreOrder > 0
            ? "Penjualan dicatat · " +
              formatNumber(jumlahPreOrder) +
              " barang pre-order"
            : "Penjualan berhasil dicatat dan stok berkurang " +
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
        },
        {
            nama: "Hanata",
            target: null
        },
        {
            nama: "Morgan/Verano",
            target: 20000000
        }
    ]);

const TARGET_BRAND_COLORS =
    Object.freeze({
        Belleza: "#68d391",
        Solid: "#d7aa47",
        Dekkson: "#63b3ed",
        Violet: "#a78bfa",
        "Vapely/Wepe": "#b7794a",
        Tsunami: "#f07867",
        Trisensa: "#2f9e68",
        Rona: "#94a3b8",
        Hanata: "#43c3df",
        "Morgan/Verano": "#f59e0b"
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

    if (
        [
            "morgan",
            "verano",
            "morgan/verano",
            "verano/morgan"
        ].includes(
            normalized
        )
    ) {
        return "Morgan/Verano";
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

    const totals = {};
    let tanggalDataTerakhir = "";

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

            const tanggalPembelian =
                String(
                    item.tanggal_pembelian || ""
                ).slice(0, 10);

            if (
                /^\d{4}-\d{2}-\d{2}$/.test(
                    tanggalPembelian
                ) &&
                tanggalPembelian >
                    tanggalDataTerakhir
            ) {
                tanggalDataTerakhir =
                    tanggalPembelian;
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

    let statusPeriode =
        "Belum ada data";

    if (tanggalDataTerakhir) {
        const bagianTanggal =
            tanggalDataTerakhir
                .split("-")
                .map(Number);

        const tanggalRingkas =
            new Date(
                bagianTanggal[0],
                bagianTanggal[1] - 1,
                bagianTanggal[2]
            ).toLocaleDateString(
                "id-ID",
                {
                    day: "numeric",
                    month: "short"
                }
            );

        statusPeriode =
            "Data s.d. " + tanggalRingkas;
    }

    monthLabel.textContent =
        formatBulanPenjualan(
            periode
        ) +
        " · " +
        statusPeriode;

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
        function(item) {
            const percentageRounded =
                Math.round(item.percentage);

            const remaining =
                Math.max(
                    item.target - item.actual,
                    0
                );

            const excess =
                Math.max(
                    item.actual - item.target,
                    0
                );

            const targetStatus =
                remaining > 0
                    ? "Rp" +
                        formatNumber(remaining)
                    : excess > 0
                        ? "Rp" +
                            formatNumber(excess)
                        : "Tercapai";

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
                <div class="target-brand-identity">
                    <span class="target-brand-indicator" aria-hidden="true"></span>
                    <div>
                        <strong class="target-brand-name">
                            ${escapeHTML(item.nama)}
                        </strong>

                        ${item.nama === "Morgan/Verano"
                            ? `<small class="target-brand-note">Gabungan penjualan</small>`
                            : ""}
                    </div>
                </div>

                <div class="target-brand-progress">
                    <div class="target-progress-caption">
                        <span>
                            Rp${formatNumber(item.actual)} / Rp${formatNumber(item.target)}
                        </span>
                        <strong class="target-progress-label">
                            ${formatNumber(percentageRounded)}%
                        </strong>
                    </div>

                    <div
                        class="target-progress-track"
                        role="progressbar"
                        aria-label="Pencapaian ${escapeHTML(item.nama)}"
                        aria-valuemin="0"
                        aria-valuemax="100"
                        aria-valuenow="${Math.round(progressValue)}"
                    >
                        <span class="target-progress-fill"></span>
                    </div>
                </div>

                <div class="target-card-values">
                    <span>
                        ${remaining > 0
                            ? "Sisa target"
                            : excess > 0
                                ? "Di atas target"
                                : "Status"}
                    </span>
                    <strong class="target-card-gap">
                        ${targetStatus}
                    </strong>
                </div>
                `;

            list.appendChild(card);
        }
    );

    const brandsWithoutTarget =
        TARGET_PENJUALAN_BRAND
            .filter(function(item) {
                return item.target === null;
            });

    if (brandsWithoutTarget.length) {
        const groupLabel =
            document.createElement("p");

        groupLabel.className =
            "target-brand-group-label";

        groupLabel.textContent =
            "Monitoring tanpa target";

        list.appendChild(groupLabel);
    }

    brandsWithoutTarget.forEach(
        function(item) {
            const noTargetCard =
                document.createElement("article");

            noTargetCard.className =
                "target-brand-card target-brand-no-target" +
                (item.nama === "PJS Handle"
                    ? " target-brand-rainbow"
                    : "");

            noTargetCard.style.setProperty(
                "--brand-color",
                TARGET_BRAND_COLORS[item.nama] ||
                    "#64748b"
            );

            noTargetCard.style.setProperty(
                "--progress",
                0
            );

            noTargetCard.innerHTML =
                `
                <div class="target-brand-identity">
                    <span class="target-brand-indicator" aria-hidden="true"></span>
                    <div>
                        <strong class="target-brand-name">
                            ${escapeHTML(item.nama)}
                        </strong>
                    </div>
                </div>

                <div class="target-brand-progress">
                    <div class="target-progress-caption">
                        <span>Penjualan</span>
                        <strong>
                            Rp${formatNumber(
                                totals[item.nama] || 0
                            )}
                        </strong>
                    </div>

                    <div
                        class="target-progress-track"
                        aria-label="${escapeHTML(item.nama)} tanpa target"
                    >
                        <span class="target-progress-fill"></span>
                    </div>
                </div>

                <div class="target-card-values">
                    <span>Status</span>
                    <strong>Tanpa target</strong>
                </div>
                `;

            list.appendChild(noTargetCard);
        }
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


    const bulan =
        document.getElementById(
            "filterBulan"
        )?.value || "";

    const brand =
        document.getElementById(
            "filterBrand"
        )?.value || "";

    let query =
        supabaseClient
            .from("penjualan")
            .select("*")
            .order(
                "tanggal_pembelian",
                {
                    ascending: false
                }
            )
            .order(
                "id",
                {
                    ascending: false
                }
            );

    if (/^\d{4}-\d{2}$/.test(bulan)) {
        const bagianBulan =
            bulan.split("-").map(Number);

        const awalBulanBerikutnya =
            new Date(
                bagianBulan[0],
                bagianBulan[1],
                1
            );

        const batasBulan =
            awalBulanBerikutnya.getFullYear() +
            "-" +
            String(
                awalBulanBerikutnya.getMonth() + 1
            ).padStart(2, "0") +
            "-01";

        query = query
            .gte(
                "tanggal_pembelian",
                bulan + "-01"
            )
            .lt(
                "tanggal_pembelian",
                batasBulan
            );
    }

    if (brand) {
        query = query.eq(
            "brand",
            brand
        );
    }

    const { data, error } =
        await query;


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


            const tanggalISO =
                String(
                    item.tanggal_pembelian || ""
                );

            const tanggal =
                tanggalISO
                    ? formatTanggalTampilan(
                        tanggalISO
                    ) || "-"
                    : "-";

            const tanggalRingkas =
                tanggalISO
                    ? formatTanggalRingkasTabel(
                        tanggalISO
                    ) || "-"
                    : "-";


            tbody.innerHTML +=
                `
                <tr>
                    <td class="text-center">
                        <time datetime="${escapeHTML(
                            tanggalISO
                        )}">
                            <span class="sales-date-desktop">${escapeHTML(
                                tanggal
                            )}</span>
                            <span class="sales-date-mobile">${escapeHTML(
                                tanggalRingkas
                            )}</span>
                        </time>
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
                            <small class="sales-mobile-brand">
                                ${escapeHTML(item.brand || "-")}
                            </small>
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
        showAppAlert("Data penjualan tidak ditemukan.");
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

    const modal =
        document.getElementById(
            "editPenjualanModal"
        );

    showAppModal(
        modal,
        document.getElementById(
            "editPenjualanQty"
        )
    );
}

function closeEditPenjualan() {
    const modal = document.getElementById(
        "editPenjualanModal"
    );

    hideAppModal(modal);
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

    const konfirmasi = await showAppConfirm(
        "Simpan perubahan penjualan ini?",
        {
            title: "Simpan Perubahan",
            type: "info",
            confirmLabel: "Ya, Simpan"
        }
    );

    if (!konfirmasi) {
        return;
    }

    if (modalSubmitState.editPenjualan) {
        return;
    }

    modalSubmitState.editPenjualan = true;
    setModalSubmitBusy(
        "editPenjualanSubmit",
        true
    );

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
    } finally {
        modalSubmitState.editPenjualan = false;
        setModalSubmitBusy(
            "editPenjualanSubmit",
            false
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
        const konfirmasi = await showAppConfirm(
            "Hapus penjualan ini?\n\n" +
            "Data penjualan akan dihapus dan stok akan dikembalikan.",
            {
                title: "Hapus Penjualan",
                confirmLabel: "Ya, Hapus"
            }
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

    const [
        hasilTanggalTertua,
        hasilBrand
    ] = await Promise.all([
        supabaseClient
            .from("penjualan")
            .select("tanggal_pembelian")
            .order(
                "tanggal_pembelian",
                {
                    ascending: true
                }
            )
            .limit(1),
        supabaseClient
            .from("brand")
            .select("nama")
            .eq("aktif", true)
            .order(
                "nama",
                {
                    ascending: true
                }
            )
    ]);

    if (
        hasilTanggalTertua.error ||
        hasilBrand.error
    ) {

        console.error(
            "ERROR FILTER PENJUALAN:",
            hasilTanggalTertua.error ||
                hasilBrand.error
        );

        return;
    }

    const tanggalTertua =
        hasilTanggalTertua.data?.[0]
            ?.tanggal_pembelian || "";

    bulanPenjualanTertua =
        /^\d{4}-\d{2}/.test(tanggalTertua)
            ? String(tanggalTertua)
                .substring(0, 7)
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

    const daftarBrand =
        (hasilBrand.data || [])
            .map(function(item) {
                return String(
                    item.nama || ""
                ).trim();
            })
            .filter(Boolean);

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


function simpanBlobExport(
    blob,
    namaFile
) {
    const namaFileAman =
        String(namaFile || "Stock-Barang")
            .replace(/[\\/:*?"<>|]/g, "-");

    const mimeType =
        blob?.type ||
        "application/octet-stream";

    if (
        window.AndroidDownloads &&
        typeof window.AndroidDownloads.begin ===
            "function" &&
        typeof window.AndroidDownloads.append ===
            "function" &&
        typeof window.AndroidDownloads.finish ===
            "function"
    ) {
        simpanBlobAndroidBertahap(
            blob,
            namaFileAman,
            mimeType
        );
        return;
    }

    if (
        window.AndroidDownloads &&
        typeof window.AndroidDownloads.save ===
            "function"
    ) {
        const pembaca =
            new FileReader();

        pembaca.onloadend =
            function() {
                if (
                    typeof pembaca.result !==
                    "string"
                ) {
                    window.AndroidDownloads.failed?.();
                    return;
                }

                window.AndroidDownloads.save(
                    namaFileAman,
                    mimeType,
                    pembaca.result
                );
            };

        pembaca.onerror =
            function() {
                window.AndroidDownloads.failed?.();
            };

        pembaca.readAsDataURL(blob);
        return;
    }

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;
    link.download = namaFileAman;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.setTimeout(
        function() {
            URL.revokeObjectURL(url);
        },
        1000
    );
}


async function simpanBlobAndroidBertahap(
    blob,
    namaFile,
    mimeType
) {
    const ukuranPotongan =
        16 * 1024;

    let idDownload = "";

    try {
        idDownload =
            window.AndroidDownloads.begin(
                namaFile,
                mimeType
            );

        if (!idDownload) {
            throw new Error(
                "JS_BEGIN"
            );
        }

        const buffer =
            await bacaBlobAndroidSebagaiBuffer(
                blob
            );

        let jumlahPotongan = 0;

        for (
            let awal = 0;
            awal < buffer.byteLength;
            awal += ukuranPotongan
        ) {
            const bagian =
                new Uint8Array(
                    buffer,
                    awal,
                    Math.min(
                        ukuranPotongan,
                        buffer.byteLength - awal
                    )
                );

            let biner = "";

            for (
                let posisi = 0;
                posisi < bagian.length;
                posisi += 8192
            ) {
                biner +=
                    String.fromCharCode.apply(
                        null,
                        bagian.subarray(
                            posisi,
                            posisi + 8192
                        )
                    );
            }

            const tersimpan =
                window.AndroidDownloads.append(
                    idDownload,
                    window.btoa(biner)
                );

            if (tersimpan === false) {
                throw new Error(
                    "JS_APPEND"
                );
            }

            jumlahPotongan += 1;

            if (jumlahPotongan % 8 === 0) {
                await new Promise(
                    function(resolve) {
                        window.setTimeout(
                            resolve,
                            0
                        );
                    }
                );
            }
        }

        const selesai =
            window.AndroidDownloads.finish(
                idDownload
            );

        idDownload = "";

        if (selesai === false) {
            return;
        }
    } catch (error) {
        if (
            idDownload &&
            typeof window.AndroidDownloads.cancel ===
                "function"
        ) {
            window.AndroidDownloads.cancel(
                idDownload
            );
        }

        const alasan =
            error instanceof Error
                ? error.message
                : "JS_UNKNOWN";

        if (
            typeof window.AndroidDownloads.failedWithReason ===
                "function"
        ) {
            window.AndroidDownloads.failedWithReason(
                String(alasan).slice(0, 80)
            );
            return;
        }

        window.AndroidDownloads.failed?.();
    }
}


function bacaBlobAndroidSebagaiBuffer(blob) {
    return new Promise(
        function(resolve, reject) {
            const pembaca =
                new FileReader();

            pembaca.onload =
                function() {
                    if (
                        pembaca.result instanceof
                            ArrayBuffer
                    ) {
                        resolve(pembaca.result);
                        return;
                    }

                    reject(
                        new Error(
                            "JS_FILE_READER_RESULT"
                        )
                    );
                };

            pembaca.onerror =
                function() {
                    reject(
                        new Error(
                            "JS_FILE_READER"
                        )
                    );
                };

            pembaca.readAsArrayBuffer(blob);
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
        return showAppConfirm(
            message,
            {
                title: "Konfirmasi Export",
                type: "info",
                confirmLabel: "Ya, Export"
            }
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
        /^HANATA\b[\s:.-]*/i,
        /^MORGAN\b[\s:.-]*/i,
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


function formatSaldoStokExport(
    stokMentah,
    totalKeluar = 0,
    stokSebelumKeluar = stokMentah,
    totalMasuk = 0,
    stokAwalHari = stokSebelumKeluar - totalMasuk
) {
    const stok =
        Number(stokMentah) || 0;

    const stokTersedia =
        Math.max(0, stok);

    const preOrder =
        Math.max(0, -stok);

    if (preOrder > 0) {
        return (
            formatPerubahanSuperscriptExport(
                -preOrder
            ) +
            String(stokTersedia) +
            (
                totalMasuk > 0
                    ? formatPerubahanSuperscriptExport(
                        totalMasuk
                    )
                    : ""
            )
        );
    }

    if (
        totalMasuk > 0 ||
        totalKeluar > 0
    ) {
        return (
            String(
                Math.max(
                    0,
                    Number(stokAwalHari) || 0
                )
            ) +
            (
                totalMasuk > 0
                    ? formatPerubahanSuperscriptExport(
                        totalMasuk
                    )
                    : ""
            ) +
            (
                totalKeluar > 0
                    ? formatPerubahanSuperscriptExport(
                        -totalKeluar
                    )
                    : ""
            )
        );
    }

    return stokTersedia;
}


const KETERANGAN_EXPORT =
    "Keterangan: angka utama = stok | " +
    "+ kecil = masuk | - kecil sesudah stok = laku | " +
    "- kecil sebelum stok = pre-order | " +
    "—/kosong = barang belum tercatat | " +
    "sel hitam = terdapat transaksi";


const NAMA_BULAN_EXPORT = [
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


function parseTanggalISOExport(value) {
    const cocok =
        String(value || "").match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );

    if (!cocok) {
        return null;
    }

    const tanggal =
        new Date(
            Number(cocok[1]),
            Number(cocok[2]) - 1,
            Number(cocok[3])
        );

    if (
        tanggal.getFullYear() !== Number(cocok[1]) ||
        tanggal.getMonth() !== Number(cocok[2]) - 1 ||
        tanggal.getDate() !== Number(cocok[3])
    ) {
        return null;
    }

    return tanggal;
}


function formatTanggalISOExport(tanggal) {
    return (
        tanggal.getFullYear() +
        "-" +
        String(
            tanggal.getMonth() + 1
        ).padStart(2, "0") +
        "-" +
        String(
            tanggal.getDate()
        ).padStart(2, "0")
    );
}


function formatTanggalNamaPDFExport(tanggal) {
    return (
        String(tanggal.getDate()).padStart(2, "0") +
        "-" +
        String(tanggal.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(tanggal.getFullYear()).slice(-2)
    );
}


function getRentangTanggalExport() {
    const nilaiMulaiKustom =
        document.getElementById(
            "exportTanggalMulai"
        )?.value || "";

    const nilaiAkhirKustom =
        document.getElementById(
            "exportTanggalAkhir"
        )?.value || "";

    const rentangKustom =
        Boolean(
            nilaiMulaiKustom &&
            nilaiAkhirKustom
        );

    if (
        Boolean(nilaiMulaiKustom) !==
        Boolean(nilaiAkhirKustom)
    ) {
        showAppAlert(
            "Pilih tanggal awal dan tanggal akhir export."
        );
        return null;
    }

    const nilaiTanggal =
        document.getElementById(
            "tanggal"
        )?.value ||
        tanggalDipilih ||
        getTodayDate();

    const hariIni =
        parseTanggalISOExport(
            getTodayDate()
        );

    let tanggalAkhir =
        rentangKustom
            ? parseTanggalISOExport(
                nilaiAkhirKustom
            )
            : parseTanggalISOExport(
                nilaiTanggal
            ) || hariIni;

    if (!tanggalAkhir) {
        showAppAlert(
            "Tanggal akhir export tidak valid."
        );
        return null;
    }

    if (
        !rentangKustom &&
        tanggalAkhir > hariIni
    ) {
        tanggalAkhir = hariIni;
    }

    const tanggalBesok =
        new Date(hariIni);

    tanggalBesok.setDate(
        tanggalBesok.getDate() + 1
    );

    const tanggalIsiAkhir =
        tanggalAkhir > tanggalBesok
            ? tanggalBesok
            : tanggalAkhir;

    let tanggalMulai;

    if (rentangKustom) {
        tanggalMulai =
            parseTanggalISOExport(
                nilaiMulaiKustom
            );

        if (!tanggalMulai) {
            showAppAlert(
                "Tanggal awal export tidak valid."
            );
            return null;
        }

        if (tanggalMulai > tanggalAkhir) {
            showAppAlert(
                "Tanggal awal tidak boleh melewati tanggal akhir."
            );
            return null;
        }
    } else {
        const tahunBulanSebelumnya =
            tanggalAkhir.getMonth() === 0
                ? tanggalAkhir.getFullYear() - 1
                : tanggalAkhir.getFullYear();

        const bulanSebelumnya =
            (tanggalAkhir.getMonth() + 11) % 12;

        const hariTerakhirBulanSebelumnya =
            new Date(
                tahunBulanSebelumnya,
                bulanSebelumnya + 1,
                0
            ).getDate();

        const tanggalBulanSebelumnya =
            new Date(
                tahunBulanSebelumnya,
                bulanSebelumnya,
                Math.min(
                    tanggalAkhir.getDate(),
                    hariTerakhirBulanSebelumnya
                )
            );

        tanggalMulai =
            new Date(tanggalBulanSebelumnya);

        tanggalMulai.setDate(
            tanggalMulai.getDate() - 1
        );
    }

    const tanggalList = [];
    const cursor =
        new Date(tanggalMulai);

    while (cursor <= tanggalAkhir) {
        tanggalList.push({
            date: new Date(cursor),
            iso: formatTanggalISOExport(cursor),
            label:
                String(cursor.getDate()) +
                "/" +
                String(cursor.getMonth() + 1)
        });

        cursor.setDate(
            cursor.getDate() + 1
        );
    }

    const bulanAwal =
        NAMA_BULAN_EXPORT[
            tanggalMulai.getMonth()
        ];

    const bulanAkhir =
        NAMA_BULAN_EXPORT[
            tanggalAkhir.getMonth()
        ];

    const tahunAwal =
        tanggalMulai.getFullYear();

    const tahunAkhir =
        tanggalAkhir.getFullYear();

    return {
        tanggalMulai,
        tanggalAkhir,
        tanggalMulaiISO:
            formatTanggalISOExport(
                tanggalMulai
            ),
        tanggalAkhirISO:
            formatTanggalISOExport(
                tanggalAkhir
            ),
        tanggalIsiAkhirISO:
            formatTanggalISOExport(
                tanggalIsiAkhir
            ),
        rentangKustom,
        tanggalList,
        labelBulan:
            tahunAwal === tahunAkhir
                ? bulanAwal +
                  "–" +
                  bulanAkhir +
                  " " +
                  tahunAkhir
                : bulanAwal +
                  " " +
                  tahunAwal +
                  "–" +
                  bulanAkhir +
                  " " +
                  tahunAkhir,
        labelPeriode:
            String(tanggalMulai.getDate()) +
            " " +
            bulanAwal +
            (tahunAwal === tahunAkhir
                ? ""
                : " " + tahunAwal) +
            "–" +
            String(tanggalAkhir.getDate()) +
            " " +
            bulanAkhir +
            " " +
            tahunAkhir,
        namaFile:
            formatTanggalISOExport(tanggalMulai) +
            "-sd-" +
            formatTanggalISOExport(tanggalAkhir)
    };
}


function getTanggalPembuatanBarangExport(
    barang
) {
    const tanggal =
        new Date(
            barang?.created_at || ""
        );

    if (
        Number.isNaN(
            tanggal.getTime()
        )
    ) {
        return "";
    }

    return (
        tanggal.getFullYear() +
        "-" +
        String(
            tanggal.getMonth() + 1
        ).padStart(2, "0") +
        "-" +
        String(
            tanggal.getDate()
        ).padStart(2, "0")
    );
}


function getStokSebelumTanggalExport(
    barang,
    tanggalMulai
) {
    const tanggalPembuatan =
        getTanggalPembuatanBarangExport(
            barang
        );

    if (
        tanggalPembuatan &&
        tanggalPembuatan > tanggalMulai
    ) {
        return 0;
    }

    let stok =
        Number(
            barang?.stok_awal
        ) || 0;

    transactions.forEach(
        function(transaction) {
            if (
                Number(
                    transaction.barang_id
                ) !==
                    Number(barang?.id) ||
                !transaction.tanggal ||
                transaction.tanggal >=
                    tanggalMulai
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


function barangAdaDalamRentangExport(
    barang,
    tanggalAkhir
) {
    const tanggalPembuatan =
        getTanggalPembuatanBarangExport(
            barang
        );

    if (!tanggalPembuatan) {
        return true;
    }

    return (
        tanggalPembuatan <=
        tanggalAkhir
    );
}


function barangPunyaDataDalamRentangExport(
    barang,
    rentang
) {
    if (
        !barangAdaDalamRentangExport(
            barang,
            rentang.tanggalIsiAkhirISO
        )
    ) {
        return false;
    }

    if (
        getStokSebelumTanggalExport(
            barang,
            rentang.tanggalMulaiISO
        ) !== 0
    ) {
        return true;
    }

    const tanggalPembuatan =
        getTanggalPembuatanBarangExport(
            barang
        );

    if (
        tanggalPembuatan &&
        tanggalPembuatan >= rentang.tanggalMulaiISO &&
        tanggalPembuatan <= rentang.tanggalIsiAkhirISO &&
        Number(barang?.stok_awal) !== 0
    ) {
        return true;
    }

    return transactions.some(
        function(transaction) {
            return (
                Number(transaction.barang_id) ===
                    Number(barang?.id) &&
                transaction.tanggal >=
                    rentang.tanggalMulaiISO &&
                transaction.tanggal <=
                    rentang.tanggalIsiAkhirISO
            );
        }
    );
}


function buatRekapStokBarangExport(
    barang,
    rentang
) {
    let stokMentah =
        getStokSebelumTanggalExport(
            barang,
            rentang.tanggalMulaiISO
        );

    const tanggalPembuatan =
        getTanggalPembuatanBarangExport(
            barang
        );

    const transaksiPerTanggal =
        new Map();

    transactions.forEach(
        function(transaction) {
            if (
                Number(
                    transaction.barang_id
                ) !==
                    Number(barang?.id) ||
                transaction.tanggal <
                    rentang.tanggalMulaiISO ||
                transaction.tanggal >
                    rentang.tanggalIsiAkhirISO
            ) {
                return;
            }

            if (
                !transaksiPerTanggal.has(
                    transaction.tanggal
                )
            ) {
                transaksiPerTanggal.set(
                    transaction.tanggal,
                    []
                );
            }

            transaksiPerTanggal
                .get(transaction.tanggal)
                .push(transaction);
        }
    );

    const cells =
        rentang.tanggalList.map(
            function(itemTanggal) {
                if (
                    itemTanggal.iso >
                        rentang.tanggalIsiAkhirISO
                ) {
                    return {
                        value: "",
                        stokTersedia: 0,
                        preOrder: 0,
                        stokSebelumKeluar: 0,
                        totalMasuk: 0,
                        totalKeluar: 0,
                        adaTransaksi: false,
                        belumTercatat: true
                    };
                }

                if (
                    tanggalPembuatan &&
                    itemTanggal.iso <
                        tanggalPembuatan
                ) {
                    return {
                        value:
                            rentang.rentangKustom
                                ? ""
                                : "—",
                        stokTersedia: 0,
                        preOrder: 0,
                        stokSebelumKeluar: 0,
                        totalMasuk: 0,
                        totalKeluar: 0,
                        adaTransaksi: false,
                        belumTercatat: true
                    };
                }

                if (
                    tanggalPembuatan &&
                    itemTanggal.iso ===
                        tanggalPembuatan &&
                    tanggalPembuatan >
                        rentang.tanggalMulaiISO
                ) {
                    stokMentah =
                        Number(
                            barang?.stok_awal
                        ) || 0;
                }

                const transaksiHari =
                    transaksiPerTanggal.get(
                        itemTanggal.iso
                    ) || [];

                let totalMasuk = 0;
                let totalKeluar = 0;
                const stokAwalHari =
                    stokMentah;

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
                            totalMasuk += qty;
                        }

                        if (
                            transaction.type ===
                            "laku"
                        ) {
                            totalKeluar += qty;
                        }
                    }
                );

                const stokSebelumKeluar =
                    stokMentah + totalMasuk;

                stokMentah =
                    stokSebelumKeluar -
                    totalKeluar;

                const stokTersedia =
                    Math.max(0, stokMentah);

                const preOrder =
                    Math.max(0, -stokMentah);

                return {
                    value:
                        formatSaldoStokExport(
                            stokMentah,
                            totalKeluar,
                            stokSebelumKeluar,
                            totalMasuk,
                            stokAwalHari
                        ),
                    stokTersedia,
                    preOrder,
                    stokSebelumKeluar:
                        Math.max(
                            0,
                            stokSebelumKeluar
                        ),
                    stokAwalHari:
                        Math.max(
                            0,
                            stokAwalHari
                        ),
                    totalMasuk,
                    totalKeluar,
                    adaTransaksi:
                        transaksiHari.length > 0
                };
            }
        );

    return {
        cells,
        stokAkhirMentah: stokMentah
    };
}


async function exportExcel() {
    if (typeof XLSX === "undefined") {
        showAppAlert("Library Excel belum dimuat.");
        return;
    }

    const rentangExport =
        getRentangTanggalExport();

    if (!rentangExport) {
        return;
    }

    const jumlahHari =
        rentangExport.tanggalList.length;

    const disetujui =
        await mintaKonfirmasiExport(
            "Export rekap stok " +
            rentangExport.labelPeriode +
            " ke Excel?"
        );

    if (!disetujui) {
        return;
    }

    /* HEADER EXCEL */

    const header = [];

    header.push(
        rentangExport.labelBulan
    );

    rentangExport.tanggalList.forEach(
        function(itemTanggal) {
            header.push(
                itemTanggal.label
            );
        }
    );

    const dataExcel = [header];

const dataBarangExport =
    dataBarang.filter(
        function(barang) {
            return barangPunyaDataDalamRentangExport(
                barang,
                rentangExport
            );
        }
    );

if (dataBarangExport.length === 0) {
    showAppAlert(
        "Tidak ada barang dengan stok pada periode ini."
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
                const rekap =
                    buatRekapStokBarangExport(
                        barang,
                        rentangExport
                    );

                const row = [
                        formatNamaBarangExport(
                            barang.nama
                        )
                    ];

                rekap.cells.forEach(
                    function(cell) {
                        row.push(cell.value);
                    }
                );

                dataExcel.push(row);
                metadataBarisExcel.push({
                    type: "barang",
                    barang,
                    rekap
                });
            }
        );
    }
);


    const jumlahBarangExcel = [
        "JUMLAH BARANG: " +
        formatNumber(
            dataBarangExport.length
        )
    ];

    dataExcel.push(jumlahBarangExcel);
    metadataBarisExcel.push({ type: "jumlah" });

    const legendaExcel = [
        KETERANGAN_EXPORT
    ];

    dataExcel.push(legendaExcel);
    metadataBarisExcel.push({ type: "legenda" });


    /* BUAT WORKBOOK EXCEL */

    const worksheet =
        XLSX.utils.aoa_to_sheet(
            dataExcel,
            { sheetStubs: true }
        );

    const barisJumlahExcel =
        dataExcel.length - 2;

    const barisLegendaExcel =
        dataExcel.length - 1;

    worksheet["!merges"] =
        worksheet["!merges"] || [];

    metadataBarisExcel.forEach(
        function(metadata, index) {
            if (metadata?.type !== "brand") {
                return;
            }

            worksheet["!merges"].push({
                s: { r: index, c: 0 },
                e: { r: index, c: jumlahHari }
            });
        }
    );

    worksheet["!merges"].push({
        s: {
            r: barisJumlahExcel,
            c: 0
        },
        e: {
            r: barisJumlahExcel,
            c: jumlahHari
        }
    });

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
        wch: 25
    }
];

for (
    let i = 0;
    i < jumlahHari;
    i++
) {
    widths.push({
        // Kolom B sampai tanggal terakhir
        wch: 4
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

        const rekap =
            metadata?.rekap;

        if (!barang || !rekap) {
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

            const adaTransaksi =
                Boolean(
                    rekap.cells[c - 1]
                        ?.adaTransaksi
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

        if (!worksheet[alamatCell]) {
            continue;
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

        showAppAlert(
            "Gagal membuat file Excel Landscape."
        );
        return;
    }

    simpanBlobExport(
        blob,
        `Rekap-Stok-${rentangExport.namaFile}.xlsx`
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
        showAppAlert(
            "Library PDF belum dimuat."
        );
        return;
    }

    const { jsPDF } =
        window.jspdf;

    const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: true,
        putOnlyUsedFonts: true
    });

    if (
        typeof pdf.autoTable !==
        "function"
    ) {
        showAppAlert(
            "Library tabel PDF belum dimuat."
        );
        return;
    }


    const rentangExport =
        getRentangTanggalExport();

    if (!rentangExport) {
        return;
    }

    const jumlahHari =
        rentangExport.tanggalList.length;

    const disetujui =
        await mintaKonfirmasiExport(
            "Export rekap stok " +
            rentangExport.labelPeriode +
            " ke PDF?"
        );

    if (!disetujui) {
        return;
    }

    /* HEADER PDF */

    const header = [
        rentangExport.labelBulan
    ];

    rentangExport.tanggalList.forEach(
        function(itemTanggal) {
            header.push(
                itemTanggal.label
            );
        }
    );


    /* DATA PDF */

    const dataPDF = [];
    const metadataBarisPDF = [];
    const transaksiCellPDF = new Map();

    const dataBarangPDF =
        dataBarang.filter(
            function(barang) {
                return barangPunyaDataDalamRentangExport(
                    barang,
                    rentangExport
                );
            }
        );

    if (dataBarangPDF.length === 0) {
        showAppAlert(
            "Tidak ada barang dengan stok pada periode ini."
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
                {
                    content:
                        kelompok.brand.toLocaleUpperCase(
                            "id-ID"
                        ),
                    colSpan:
                        jumlahHari + 1
                }
            ];

            dataPDF.push(brandRow);

            metadataBarisPDF.push({
                type: "brand",
                brand: kelompok.brand
            });

            kelompok.barang.forEach(
                function(barang) {
                    const indexBarisPDF =
                        dataPDF.length;

                    const rekap =
                        buatRekapStokBarangExport(
                            barang,
                            rentangExport
                        );

                    const row = [
                        formatNamaBarangExport(
                            barang.nama
                        )
                    ];

                    rekap.cells.forEach(
                        function(cell, index) {
                            if (
                                cell.adaTransaksi ||
                                cell.preOrder > 0
                            ) {
                                transaksiCellPDF.set(
                                    `${indexBarisPDF}:${index + 1}`,
                                    cell
                                );
                            }

                            row.push(cell.value);
                        }
                    );

                    dataPDF.push(row);
                    metadataBarisPDF.push({
                        type: "barang",
                        barang,
                        rekap
                    });
                }
            );
        }
    );


    const jumlahBarangPDF = [
        {
            content:
                "JUMLAH BARANG: " +
                formatNumber(
                    dataBarangPDF.length
                ),
            colSpan:
                jumlahHari + 1
        }
    ];

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
                6.5,

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

                const detailStok =
                    transaksiCellPDF.get(
                        `${data.row.index}:${data.column.index}`
                    );

                if (detailStok?.adaTransaksi) {
                    data.cell.styles.fillColor =
                        [0, 0, 0];

                    data.cell.styles.textColor =
                        [255, 255, 255];

                    data.cell.styles.fontStyle =
                        "bold";

                }

                if (
                    detailStok?.preOrder > 0 ||
                    detailStok?.totalMasuk > 0 ||
                    detailStok?.totalKeluar > 0
                ) {
                    data.cell.text = [""];
                }
            },

        didDrawCell:
            function(data) {
                if (
                    data.section !== "body" ||
                    data.column.index === 0
                ) {
                    return;
                }

                const detailStok =
                    transaksiCellPDF.get(
                        `${data.row.index}:${data.column.index}`
                    );

                if (
                    !detailStok?.preOrder &&
                    !detailStok?.totalMasuk &&
                    !detailStok?.totalKeluar
                ) {
                    return;
                }

                const pangkatSebelumText =
                    detailStok.preOrder > 0
                        ? `-${detailStok.preOrder}`
                        : "";

                const stokText =
                    String(
                        detailStok.preOrder > 0
                            ? detailStok.stokTersedia
                            : detailStok.stokAwalHari
                    );

                const pangkatSesudahText =
                    (
                        detailStok.totalMasuk > 0
                            ? `+${detailStok.totalMasuk}`
                            : ""
                    ) +
                    (
                        detailStok.preOrder <= 0 &&
                        detailStok.totalKeluar > 0
                            ? `-${detailStok.totalKeluar}`
                            : ""
                    );

                let ukuranStok = 8;
                let ukuranPangkat = 5;
                const jarak = 0.2;
                const lebarTersedia =
                    Math.max(
                        data.cell.width - 1,
                        1
                    );

                pdf.setFont(
                    "helvetica",
                    "bold"
                );

                pdf.setFontSize(
                    ukuranStok
                );

                let lebarStok =
                    pdf.getTextWidth(
                        stokText
                    );

                pdf.setFontSize(
                    ukuranPangkat
                );

                let lebarPangkatSebelum =
                    pdf.getTextWidth(
                        pangkatSebelumText
                    );

                let lebarPangkatSesudah =
                    pdf.getTextWidth(
                        pangkatSesudahText
                    );

                let lebarGabungan =
                    (
                        pangkatSebelumText
                            ? lebarPangkatSebelum + jarak
                            : 0
                    ) +
                    lebarStok +
                    (
                        pangkatSesudahText
                            ? jarak + lebarPangkatSesudah
                            : 0
                    );

                if (
                    lebarGabungan >
                    lebarTersedia
                ) {
                    const skala =
                        lebarTersedia /
                        lebarGabungan;

                    ukuranStok =
                        Math.max(
                            5,
                            ukuranStok * skala
                        );

                    ukuranPangkat =
                        Math.max(
                            3,
                            ukuranPangkat * skala
                        );

                    pdf.setFontSize(
                        ukuranStok
                    );

                    lebarStok =
                        pdf.getTextWidth(
                            stokText
                        );

                    pdf.setFontSize(
                        ukuranPangkat
                    );

                    lebarPangkatSebelum =
                        pdf.getTextWidth(
                            pangkatSebelumText
                        );

                    lebarPangkatSesudah =
                        pdf.getTextWidth(
                            pangkatSesudahText
                        );

                    lebarGabungan =
                        (
                            pangkatSebelumText
                                ? lebarPangkatSebelum + jarak
                                : 0
                        ) +
                        lebarStok +
                        (
                            pangkatSesudahText
                                ? jarak + lebarPangkatSesudah
                                : 0
                        );
                }

                const posisiX =
                    data.cell.x +
                    (
                        data.cell.width -
                        lebarGabungan
                    ) / 2;

                const posisiY =
                    data.cell.y +
                    data.cell.height / 2 +
                    0.9;

                if (detailStok.adaTransaksi) {
                    pdf.setTextColor(
                        255,
                        255,
                        255
                    );
                } else {
                    pdf.setTextColor(
                        0,
                        0,
                        0
                    );
                }

                let posisiTeksX =
                    posisiX;

                if (pangkatSebelumText) {
                    pdf.setFontSize(
                        ukuranPangkat
                    );

                    pdf.text(
                        pangkatSebelumText,
                        posisiTeksX,
                        posisiY - 1.25
                    );

                    posisiTeksX +=
                        lebarPangkatSebelum +
                        jarak;
                }

                pdf.setFontSize(
                    ukuranStok
                );

                pdf.text(
                    stokText,
                    posisiTeksX,
                    posisiY
                );

                posisiTeksX +=
                    lebarStok;

                if (pangkatSesudahText) {
                    pdf.setFontSize(
                        ukuranPangkat
                    );

                    pdf.text(
                        pangkatSesudahText,
                        posisiTeksX + jarak,
                        posisiY - 1.25
                    );
                }
            }
    });


    /* SIMPAN PDF */

    simpanBlobExport(
        pdf.output("blob"),
        `stock_${
            formatTanggalNamaPDFExport(
                rentangExport.tanggalMulai
            )
        }_${
            formatTanggalNamaPDFExport(
                rentangExport.tanggalAkhir
            )
        }.pdf`
    );
}
/* ==================================
   EXPORT EXCEL PENJUALAN
================================== */

async function exportPenjualanExcel() {
    if (typeof XLSX === "undefined") {
        showAppAlert("Library Excel belum dimuat.");
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
        showAppAlert(
            "Tidak ada data penjualan untuk diekspor."
        );
        return;
    }

    const excelData = [
        [
            "Tanggal",
            "Nama Barang",
            "Brand",
            "Qty",
            "Harga/Unit",
            "Total"
        ]
    ];

    let totalPenjualan = 0;

    data.forEach(
        function(item) {
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
        "",
        "TOTAL",
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

    const formatLebarCell =
        function(value, columnIndex) {
            if (
                typeof value === "number" &&
                (columnIndex === 4 ||
                    columnIndex === 5)
            ) {
                return (
                    "Rp " +
                    value.toLocaleString("id-ID")
                );
            }

            return String(value ?? "");
        };

    worksheet["!cols"] =
        excelData[0].map(
            function(_, columnIndex) {
                const panjangTerbesar =
                    excelData.reduce(
                        function(maximum, row) {
                            return Math.max(
                                maximum,
                                formatLebarCell(
                                    row[columnIndex],
                                    columnIndex
                                ).length
                            );
                        },
                        0
                    );

                return {
                    wch: panjangTerbesar + 2
                };
            }
        );


    /* STYLE HEADER */

    for (
        let c = 0;
        c < 6;
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
                    c: 4
                })
            ];

        const totalCell =
            worksheet[
                XLSX.utils.encode_cell({
                    r: r,
                    c: 5
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


    /* BRAND DAN QTY RATA TENGAH */

    const totalRow =
        excelData.length - 1;

    for (
        let r = 1;
        r < totalRow;
        r++
    ) {
        const totalCell =
            worksheet[
                XLSX.utils.encode_cell({
                    r: r,
                    c: 5
                })
            ];

        if (totalCell) {
            const nomorBarisExcel =
                r + 1;

            totalCell.t = "n";
            totalCell.f =
                `D${nomorBarisExcel}` +
                `*E${nomorBarisExcel}`;
        }
    }

    for (
        let r = 1;
        r < totalRow;
        r++
    ) {
        [2, 3].forEach(
            function(columnIndex) {
                const cell =
                    worksheet[
                        XLSX.utils.encode_cell({
                            r: r,
                            c: columnIndex
                        })
                    ];

                if (cell) {
                    cell.s = {
                        alignment: {
                            horizontal: "center",
                            vertical: "center"
                        }
                    };
                }
            }
        );
    }


    /* STYLE BARIS TOTAL */

    const totalLabelCell =
        worksheet[
            XLSX.utils.encode_cell({
                r: totalRow,
                c: 4
            })
        ];

    const totalValueCell =
        worksheet[
            XLSX.utils.encode_cell({
                r: totalRow,
                c: 5
            })
        ];

    if (totalValueCell) {
        totalValueCell.t = "n";
        totalValueCell.f =
            `SUM(F2:F${totalRow})`;
    }

    if (totalLabelCell) {
        totalLabelCell.s = {
            font: {
                bold: true
            },
            alignment: {
                horizontal: "right",
                vertical: "center"
            }
        };
    }

    if (totalValueCell) {
        totalValueCell.s = {
            font: {
                bold: true
            },
            alignment: {
                horizontal: "left",
                vertical: "center"
            }
        };
    }


    /* FORMAT TABEL, BORDER, DAN FILTER */

    const borderTabel = {
        top: {
            style: "thin",
            color: { rgb: "B7B7B7" }
        },
        bottom: {
            style: "thin",
            color: { rgb: "B7B7B7" }
        },
        left: {
            style: "thin",
            color: { rgb: "B7B7B7" }
        },
        right: {
            style: "thin",
            color: { rgb: "B7B7B7" }
        }
    };

    for (
        let r = 0;
        r <= totalRow;
        r++
    ) {
        for (
            let c = 0;
            c < 6;
            c++
        ) {
            const alamatCell =
                XLSX.utils.encode_cell({
                    r: r,
                    c: c
                });

            if (!worksheet[alamatCell]) {
                worksheet[alamatCell] = {
                    t: "s",
                    v: ""
                };
            }

            const cell =
                worksheet[alamatCell];

            const styleCell =
                Object.assign(
                    {},
                    cell.s || {}
                );

            styleCell.border =
                borderTabel;

            styleCell.alignment =
                Object.assign(
                    {
                        vertical: "center"
                    },
                    styleCell.alignment || {}
                );

            if (r === 0) {
                styleCell.font =
                    Object.assign(
                        {},
                        styleCell.font || {},
                        {
                            bold: true,
                            color: {
                                rgb: "FFF4C7"
                            }
                        }
                    );

                styleCell.fill = {
                    patternType: "solid",
                    fgColor: {
                        rgb: "4A3A12"
                    }
                };
            }

            cell.s = styleCell;
        }
    }

    worksheet["!autofilter"] = {
        ref: XLSX.utils.encode_range({
            s: {
                r: 0,
                c: 0
            },
            e: {
                r: totalRow - 1,
                c: 5
            }
        })
    };

    worksheet["!rows"] =
        excelData.map(
            function(_, rowIndex) {
                return {
                    hpt:
                        rowIndex === 0
                            ? 22
                            : 19
                };
            }
        );


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

        showAppAlert(
            "Gagal membuat file Excel Landscape."
        );
        return;
    }

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

    simpanBlobExport(
        blob,
        `${namaFile}.xlsx`
    );
}


/* ==================================
   INIT
================================== */

async function loadDashboardSummary() {
    if (appDataLoadState.dashboardPromise) {
        return appDataLoadState.dashboardPromise;
    }

    appDataLoadState.dashboardPromise =
        (async function() {
            const bulan =
                getBulanPenjualanSekarang();

            const bagianBulan =
                bulan.split("-").map(Number);

            const awalBulanBerikutnya =
                new Date(
                    bagianBulan[0],
                    bagianBulan[1],
                    1
                );

            const batasBulan =
                awalBulanBerikutnya.getFullYear() +
                "-" +
                String(
                    awalBulanBerikutnya.getMonth() + 1
                ).padStart(2, "0") +
                "-01";

            const { data, error } =
                await supabaseClient.rpc(
                    "get_dashboard_summary",
                    {
                        p_today: getTodayDate(),
                        p_month_start:
                            bulan + "-01",
                        p_month_end:
                            batasBulan
                    }
                );

            if (error) {
                console.error(
                    "ERROR DASHBOARD SUMMARY:",
                    error
                );

                await ensureCoreData();
                return;
            }

            const totalBarang =
                Number(data?.total_barang) || 0;

            const totalStok =
                Number(data?.total_stok) || 0;

            const transaksiHariIni =
                Number(
                    data?.transaksi_hari_ini
                ) || 0;

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

            if (totalBarangElement) {
                totalBarangElement.textContent =
                    formatNumber(totalBarang);
            }

            if (totalStokElement) {
                totalStokElement.textContent =
                    formatNumber(totalStok);
            }

            if (transaksiElement) {
                transaksiElement.textContent =
                    formatNumber(
                        transaksiHariIni
                    );
            }

            const ringkasanBrand =
                Array.isArray(data?.brand_sales)
                    ? data.brand_sales.map(
                        function(item) {
                            return {
                                brand:
                                    item.brand,
                                qty: 1,
                                harga:
                                    Number(
                                        item.total
                                    ) || 0,
                                tanggal_pembelian:
                                    bulan + "-01"
                            };
                        }
                    )
                    : [];

            renderTargetPenjualan(
                ringkasanBrand,
                bulan
            );

            setDatabaseStatus(
                "Database aktif · " +
                    formatNumber(
                        totalBarang
                    ) +
                    " barang",
                "success"
            );
        })();

    try {
        await appDataLoadState
            .dashboardPromise;
    } finally {
        appDataLoadState.dashboardPromise =
            null;
    }
}

async function ensureCoreData() {
    if (appDataLoadState.coreLoaded) {
        return;
    }

    if (appDataLoadState.corePromise) {
        return appDataLoadState.corePromise;
    }

    appDataLoadState.corePromise =
        (async function() {
            const hasilMuat =
                await Promise.all([
                loadBrandBarangBaru(),
                loadBarang(false),
                loadTransactions(false)
            ]);

            if (
                hasilMuat.some(
                    function(berhasil) {
                        return berhasil === false;
                    }
                )
            ) {
                throw new Error(
                    "Sebagian data utama gagal dimuat."
                );
            }

            appDataLoadState.coreLoaded =
                true;

            updateTable();
        })();

    try {
        await appDataLoadState.corePromise;
    } finally {
        appDataLoadState.corePromise =
            null;
    }
}

async function ensureSalesData() {
    await ensureCoreData();

    if (appDataLoadState.salesPromise) {
        return appDataLoadState.salesPromise;
    }

    appDataLoadState.salesPromise =
        (async function() {
            if (
                !appDataLoadState
                    .salesInitialized
            ) {
                await initFilterPenjualan();
                appDataLoadState
                    .salesInitialized = true;
                return;
            }

            await loadPenjualan();
        })();

    try {
        await appDataLoadState.salesPromise;
    } finally {
        appDataLoadState.salesPromise = null;
    }
}

async function loadSectionData(sectionId) {
    try {
        if (sectionId === "dashboard") {
            await loadDashboardSummary();
            return;
        }

        if (
            sectionId ===
                "catatan-penjualan"
        ) {
            await ensureSalesData();
            return;
        }

        if (
            [
                "penjualan",
                "stok-barang",
                "riwayat-transaksi"
            ].includes(sectionId)
        ) {
            await ensureCoreData();
        }
    } catch (error) {
        console.error(
            "ERROR LOAD SECTION:",
            error
        );

        setDatabaseStatus(
            "Gagal memuat data. Silakan coba lagi.",
            "error"
        );
    }
}

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

        sinkronkanTanggalTampilan();
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

        sinkronkanTanggalPenjualanTampilan();
    }


    const hashAwal =
        window.location.hash
            .replace("#", "");

    const sectionAwal =
        [
            "dashboard",
            "penjualan",
            "stok-barang",
            "catatan-penjualan",
            "riwayat-transaksi"
        ].includes(hashAwal)
            ? hashAwal
            : "dashboard";

    await loadSectionData(sectionAwal);
}


/* ==================================
   JALANKAN APLIKASI
================================== */

function initAppNavigation() {
    const sectionCopy = {
        dashboard: [
            "Dashboard",
            "Ringkasan stok dan aktivitas penjualan"
        ],
        penjualan: [
            "Penjualan",
            "Catat transaksi penjualan baru"
        ],
        "stok-barang": [
            "Stok Barang",
            "Kelola persediaan dan pergerakan stok"
        ],
        "catatan-penjualan": [
            "Catatan Penjualan",
            "Lihat transaksi penjualan per bulan"
        ],
        "riwayat-transaksi": [
            "Riwayat In/Out",
            "Pantau seluruh pergerakan barang"
        ]
    };

    const links =
        Array.from(
            document.querySelectorAll(
                ".app-nav a, .app-mobile-nav a"
            )
        );

    const sections =
        Object.keys(sectionCopy)
            .map(
                function(sectionId) {
                    return document.getElementById(
                        sectionId
                    );
                }
            )
            .filter(Boolean);

    const title =
        document.getElementById(
            "appPageTitle"
        );

    const subtitle =
        document.getElementById(
            "appPageSubtitle"
        );

    function setActiveSection(
        sectionId,
        muatData = true
    ) {
        const resolvedSectionId =
            sectionCopy[sectionId]
                ? sectionId
                : "dashboard";

        const copy =
            sectionCopy[resolvedSectionId];

        sections.forEach(
            function(section) {
                const isActive =
                    section.id ===
                        resolvedSectionId;

                section.hidden = !isActive;
                section.classList.toggle(
                    "app-page-active",
                    isActive
                );
            }
        );

        links.forEach(
            function(link) {
                const isActive =
                    link.getAttribute("href") ===
                        `#${resolvedSectionId}`;

                link.classList.toggle(
                    "active",
                    isActive
                );

                if (isActive) {
                    link.setAttribute(
                        "aria-current",
                        "page"
                    );
                } else {
                    link.removeAttribute(
                        "aria-current"
                    );
                }
            }
        );

        if (title) {
            title.textContent = copy[0];
        }

        if (subtitle) {
            subtitle.textContent = copy[1];
        }

        document.title =
            copy[0] +
            " · Stock Barang";

        if (muatData) {
            void loadSectionData(
                resolvedSectionId
            );
        }
    }

    function getSectionFromHash() {
        const sectionId =
            window.location.hash
                .replace("#", "");

        return sectionCopy[sectionId]
            ? sectionId
            : "dashboard";
    }

    function openSection(sectionId) {
        const resolvedSectionId =
            sectionCopy[sectionId]
                ? sectionId
                : "dashboard";

        const nextHash =
            `#${resolvedSectionId}`;

        if (
            window.location.hash !==
                nextHash
        ) {
            window.history.pushState(
                null,
                "",
                nextHash
            );
        }

        setActiveSection(
            resolvedSectionId
        );

        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "auto"
        });
    }

    links.forEach(
        function(link) {
            link.addEventListener(
                "click",
                function(event) {
                    event.preventDefault();

                    openSection(
                        link.getAttribute("href")
                            .replace("#", "")
                    );
                }
            );
        }
    );

    window.addEventListener(
        "hashchange",
        function() {
            setActiveSection(
                getSectionFromHash()
            );

            window.scrollTo({
                top: 0,
                left: 0,
                behavior: "auto"
            });
        }
    );

    setActiveSection(
        getSectionFromHash(),
        false
    );
}

bootAuthenticatedApp();
