"use strict";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_SCAN_FILES = 10;
const MAX_SCAN_TOTAL = 40 * 1024 * 1024;
const PDF_JS_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
const PDF_WORKER_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
const TESSERACT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js";

const converterState = {
    pdfFile: null,
    pdfWorkbookBlob: null,
    scanFiles: [],
    scanWorkbookBlob: null,
    excelFile: null,
    excelWorkbook: null,
    loadingScripts: new Map()
};

document.addEventListener("DOMContentLoaded", initializeConverter);

function initializeConverter() {
    document.querySelectorAll(".tool-tab").forEach((button) => {
        button.addEventListener("click", () => activateTool(button.dataset.tool));
    });

    setupDropZone("pdf", document.getElementById("pdfInput"), handlePdfSelection);
    setupDropZone("scan", document.getElementById("scanInput"), handleScanSelection);
    setupDropZone("excel", document.getElementById("excelInput"), handleExcelSelection);

    document.getElementById("pdfConvertButton").addEventListener("click", convertPdfToExcel);
    document.getElementById("pdfDownloadButton").addEventListener("click", downloadPdfWorkbook);
    document.getElementById("scanConvertButton").addEventListener("click", convertScansToExcel);
    document.getElementById("scanDownloadButton").addEventListener("click", downloadScanWorkbook);
    document.getElementById("excelConvertButton").addEventListener("click", convertExcelToPdf);
    document.getElementById("excelAllSheets").addEventListener("change", updateExcelSheetState);
}

function activateTool(tool) {
    document.querySelectorAll(".tool-tab").forEach((button) => {
        const active = button.dataset.tool === tool;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
    });

    document.querySelectorAll(".tool-panel").forEach((panel) => {
        const active = panel.dataset.panel === tool;
        panel.classList.toggle("active", active);
        panel.hidden = !active;
    });
}

function setupDropZone(type, input, onFiles) {
    const zone = document.querySelector(`[data-drop="${type}"]`);

    input.addEventListener("change", () => onFiles(Array.from(input.files || [])));

    ["dragenter", "dragover"].forEach((eventName) => {
        zone.addEventListener(eventName, (event) => {
            event.preventDefault();
            zone.classList.add("dragging");
        });
    });

    ["dragleave", "drop"].forEach((eventName) => {
        zone.addEventListener(eventName, (event) => {
            event.preventDefault();
            zone.classList.remove("dragging");
        });
    });

    zone.addEventListener("drop", (event) => {
        onFiles(Array.from(event.dataTransfer?.files || []));
    });
}

function handlePdfSelection(files) {
    const file = files[0];
    const button = document.getElementById("pdfConvertButton");
    converterState.pdfFile = null;
    converterState.pdfWorkbookBlob = null;
    hideElement("pdfResult");

    if (!file) {
        button.disabled = true;
        hideElement("pdfFileInfo");
        return;
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        showToast("Pilih file dengan format PDF.", true);
        button.disabled = true;
        return;
    }

    if (file.size > MAX_FILE_SIZE) {
        showToast("Ukuran PDF melebihi batas 20 MB.", true);
        button.disabled = true;
        return;
    }

    converterState.pdfFile = file;
    setFileInfo("pdfFileInfo", `${file.name} · ${formatBytes(file.size)}`);
    button.disabled = false;
}

function handleScanSelection(files) {
    const accepted = files.filter((file) => /^image\/(jpeg|png|webp)$/i.test(file.type)).slice(0, MAX_SCAN_FILES);
    const totalSize = accepted.reduce((total, file) => total + file.size, 0);
    const button = document.getElementById("scanConvertButton");
    converterState.scanFiles = [];
    converterState.scanWorkbookBlob = null;
    hideElement("scanResult");

    if (!accepted.length) {
        button.disabled = true;
        hideElement("scanFileInfo");
        if (files.length) showToast("Gunakan foto JPG, PNG, atau WEBP.", true);
        return;
    }

    if (totalSize > MAX_SCAN_TOTAL) {
        button.disabled = true;
        showToast("Total ukuran foto melebihi batas 40 MB.", true);
        return;
    }

    converterState.scanFiles = accepted;
    setFileInfo("scanFileInfo", `${accepted.length} foto · ${formatBytes(totalSize)}${files.length > MAX_SCAN_FILES ? " · hanya 10 foto pertama" : ""}`);
    button.disabled = false;
}

async function handleExcelSelection(files) {
    const file = files[0];
    const button = document.getElementById("excelConvertButton");
    converterState.excelFile = null;
    converterState.excelWorkbook = null;

    if (!file) {
        button.disabled = true;
        hideElement("excelFileInfo");
        return;
    }

    if (!/\.(xlsx|xls)$/i.test(file.name)) {
        showToast("Pilih file Excel berformat XLSX atau XLS.", true);
        button.disabled = true;
        return;
    }

    if (file.size > MAX_FILE_SIZE) {
        showToast("Ukuran Excel melebihi batas 20 MB.", true);
        button.disabled = true;
        return;
    }

    if (!window.XLSX) {
        showToast("Modul Excel belum tersedia. Periksa koneksi internet lalu muat ulang.", true);
        return;
    }

    setStatus("excelStatus", "Membaca workbook...");
    button.disabled = true;

    try {
        const workbook = window.XLSX.read(await readBlobAsArrayBuffer(file), {
            type: "array",
            cellDates: true,
            cellStyles: true
        });

        if (!workbook.SheetNames.length) throw new Error("Workbook tidak memiliki worksheet.");

        converterState.excelFile = file;
        converterState.excelWorkbook = workbook;
        populateSheetOptions(workbook.SheetNames);
        setFileInfo("excelFileInfo", `${file.name} · ${formatBytes(file.size)} · ${workbook.SheetNames.length} worksheet`);
        hideElement("excelStatus");
        button.disabled = false;
    } catch (error) {
        setStatus("excelStatus", normalizeError(error, "File Excel tidak dapat dibaca."), true);
    }
}

async function convertPdfToExcel() {
    const file = converterState.pdfFile;
    if (!file) return;

    const button = document.getElementById("pdfConvertButton");
    const useOcr = document.getElementById("pdfOcrFallback").checked;
    button.disabled = true;
    hideElement("pdfResult");
    setStatus("pdfStatus", "Menyiapkan pembaca PDF...");

    let ocrWorker = null;

    try {
        const pdfjs = await loadPdfJs();
        const pdf = await pdfjs.getDocument({ data: await readBlobAsArrayBuffer(file) }).promise;
        const workbook = window.XLSX.utils.book_new();
        let ocrPageCount = 0;
        let extractedRows = 0;

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
            setStatus("pdfStatus", `Membaca halaman ${pageNumber} dari ${pdf.numPages}...`);
            const page = await pdf.getPage(pageNumber);
            let rows = await extractRowsFromPdfPage(page);

            if (!rows.length && useOcr) {
                if (!ocrWorker) ocrWorker = await createOcrWorker((message) => updateOcrProgress("pdfStatus", `OCR halaman ${pageNumber}`, message));
                const canvas = await renderPdfPage(page);
                const result = await ocrWorker.recognize(canvas);
                rows = textToRows(result.data?.text || "");
                ocrPageCount += 1;
                canvas.width = 1;
                canvas.height = 1;
            }

            const safeRows = rows.length ? rows : [["Tidak ada teks yang dapat dibaca"]];
            extractedRows += rows.length;
            const sheet = window.XLSX.utils.aoa_to_sheet(safeRows);
            applyWorksheetWidths(sheet, safeRows);
            window.XLSX.utils.book_append_sheet(workbook, sheet, safeSheetName(`Halaman ${pageNumber}`, workbook.SheetNames));
        }

        converterState.pdfWorkbookBlob = workbookToBlob(workbook);
        document.getElementById("pdfResultSummary").textContent = `${pdf.numPages} halaman · ${extractedRows} baris${ocrPageCount ? ` · ${ocrPageCount} halaman memakai OCR` : ""}`;
        hideElement("pdfStatus");
        showElement("pdfResult");
    } catch (error) {
        setStatus("pdfStatus", normalizeError(error, "PDF gagal diproses."), true);
    } finally {
        if (ocrWorker) await ocrWorker.terminate().catch(() => {});
        button.disabled = false;
    }
}

async function convertScansToExcel() {
    if (!converterState.scanFiles.length) return;

    const button = document.getElementById("scanConvertButton");
    button.disabled = true;
    hideElement("scanResult");
    setStatus("scanStatus", "Menyiapkan modul OCR. Unduhan pertama dapat memerlukan waktu...");

    let worker = null;

    try {
        let activeIndex = 0;
        worker = await createOcrWorker((message) => updateOcrProgress("scanStatus", `Foto ${activeIndex + 1}`, message));
        const workbook = window.XLSX.utils.book_new();
        let totalRows = 0;

        for (let index = 0; index < converterState.scanFiles.length; index += 1) {
            activeIndex = index;
            const file = converterState.scanFiles[index];
            setStatus("scanStatus", `Membaca foto ${index + 1} dari ${converterState.scanFiles.length}: ${file.name}`);
            const result = await worker.recognize(file);
            const rows = textToRows(result.data?.text || "");
            const safeRows = rows.length ? rows : [["Tidak ada teks yang dapat dibaca"]];
            totalRows += rows.length;
            const sheet = window.XLSX.utils.aoa_to_sheet(safeRows);
            applyWorksheetWidths(sheet, safeRows);
            window.XLSX.utils.book_append_sheet(workbook, sheet, safeSheetName(`Foto ${index + 1}`, workbook.SheetNames));
        }

        converterState.scanWorkbookBlob = workbookToBlob(workbook);
        document.getElementById("scanResultSummary").textContent = `${converterState.scanFiles.length} foto · ${totalRows} baris terbaca`;
        hideElement("scanStatus");
        showElement("scanResult");
    } catch (error) {
        setStatus("scanStatus", normalizeError(error, "Foto gagal diproses oleh OCR."), true);
    } finally {
        if (worker) await worker.terminate().catch(() => {});
        button.disabled = false;
    }
}

async function convertExcelToPdf() {
    const workbook = converterState.excelWorkbook;
    const file = converterState.excelFile;
    if (!workbook || !file) return;

    const button = document.getElementById("excelConvertButton");
    const orientation = document.getElementById("excelOrientation").value;
    const allSheets = document.getElementById("excelAllSheets").checked;
    const selectedSheet = document.getElementById("excelSheet").value;
    const sheetNames = allSheets ? workbook.SheetNames : [selectedSheet];

    button.disabled = true;
    setStatus("excelStatus", "Menyusun halaman PDF...");

    try {
        const jsPdfConstructor = window.jspdf?.jsPDF;
        if (!jsPdfConstructor) throw new Error("Modul PDF belum tersedia. Periksa koneksi internet lalu muat ulang.");

        const doc = new jsPdfConstructor({ orientation, unit: "mm", format: "a4", compress: true });

        sheetNames.forEach((sheetName, index) => {
            if (index > 0) doc.addPage("a4", orientation);
            const rows = window.XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
                header: 1,
                defval: "",
                raw: false,
                blankrows: false
            });

            const normalizedRows = rows.map((row) => row.map((cell) => String(cell ?? "")));
            const columnCount = Math.max(1, ...normalizedRows.map((row) => row.length));
            const header = normalizedRows[0]?.length ? normalizedRows[0] : ["Data"];
            const body = normalizedRows.length > 1 ? normalizedRows.slice(1) : [["Tidak ada data"]];

            doc.setFont("helvetica", "bold");
            doc.setTextColor(16, 33, 61);
            doc.setFontSize(11);
            doc.text(sheetName, 10, 11);

            const options = {
                startY: 15,
                head: [header],
                body,
                theme: "grid",
                margin: { top: 15, right: 8, bottom: 10, left: 8 },
                styles: {
                    font: "helvetica",
                    fontSize: columnCount > 10 ? 5 : columnCount > 6 ? 6 : 8,
                    cellPadding: columnCount > 10 ? 1 : 1.5,
                    overflow: "linebreak",
                    valign: "middle",
                    textColor: [52, 68, 94],
                    lineColor: [218, 226, 237],
                    lineWidth: .15
                },
                headStyles: {
                    fillColor: [6, 43, 71],
                    textColor: [255, 255, 255],
                    fontStyle: "bold"
                },
                alternateRowStyles: { fillColor: [247, 249, 252] }
            };

            if (typeof doc.autoTable === "function") {
                doc.autoTable(options);
            } else if (window.jspdfAutoTable?.autoTable) {
                window.jspdfAutoTable.autoTable(doc, options);
            } else {
                throw new Error("Modul tabel PDF belum tersedia.");
            }
        });

        const outputName = `${stripExtension(file.name)}-${allSheets ? "semua-sheet" : safeFilePart(selectedSheet)}.pdf`;
        await saveBlob(doc.output("blob"), outputName);
        hideElement("excelStatus");
        showToast("PDF berhasil dibuat.");
    } catch (error) {
        setStatus("excelStatus", normalizeError(error, "Excel gagal diubah menjadi PDF."), true);
    } finally {
        button.disabled = false;
    }
}

async function loadPdfJs() {
    if (!window.pdfjsLib) await loadExternalScript(PDF_JS_URL, "pdfjsLib");
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
    return window.pdfjsLib;
}

async function createOcrWorker(logger) {
    if (!window.Tesseract) await loadExternalScript(TESSERACT_URL, "Tesseract");
    return window.Tesseract.createWorker("ind+eng", 1, { logger });
}

function loadExternalScript(source, globalName) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    if (converterState.loadingScripts.has(source)) return converterState.loadingScripts.get(source);

    const promise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = source;
        script.async = true;
        script.onload = () => window[globalName] ? resolve(window[globalName]) : reject(new Error(`Modul ${globalName} tidak ditemukan.`));
        script.onerror = () => reject(new Error(`Modul ${globalName} gagal dimuat. Periksa koneksi internet.`));
        document.head.appendChild(script);
    });

    converterState.loadingScripts.set(source, promise);
    return promise;
}

async function extractRowsFromPdfPage(page) {
    const content = await page.getTextContent();
    const items = content.items
        .filter((item) => String(item.str || "").trim())
        .map((item) => ({
            text: String(item.str).trim(),
            x: Number(item.transform?.[4] || 0),
            y: Number(item.transform?.[5] || 0),
            width: Number(item.width || 0)
        }))
        .sort((a, b) => Math.abs(b.y - a.y) > 3 ? b.y - a.y : a.x - b.x);

    const lines = [];
    items.forEach((item) => {
        let line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= 3);
        if (!line) {
            line = { y: item.y, items: [] };
            lines.push(line);
        }
        line.items.push(item);
    });

    return lines
        .sort((a, b) => b.y - a.y)
        .map((line) => {
            const sorted = line.items.sort((a, b) => a.x - b.x);
            const cells = [];
            let current = "";
            let previousEnd = null;

            sorted.forEach((item) => {
                const gap = previousEnd === null ? 0 : item.x - previousEnd;
                if (current && gap > 12) {
                    cells.push(current.trim());
                    current = item.text;
                } else {
                    current += `${current ? " " : ""}${item.text}`;
                }
                previousEnd = item.x + item.width;
            });

            if (current.trim()) cells.push(current.trim());
            return cells;
        })
        .filter((row) => row.some(Boolean));
}

async function renderPdfPage(page) {
    const viewport = page.getViewport({ scale: 1.6 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas tidak dapat digunakan pada perangkat ini.");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: context, viewport }).promise;
    return canvas;
}

function textToRows(text) {
    return String(text || "")
        .replace(/\r/g, "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const columns = line.split(/\t+|\s{2,}/).map((value) => value.trim()).filter(Boolean);
            return columns.length ? columns : [line];
        });
}

function workbookToBlob(workbook) {
    const output = window.XLSX.write(workbook, { bookType: "xlsx", type: "array", compression: true });
    return new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function applyWorksheetWidths(sheet, rows) {
    const maxColumns = Math.max(1, ...rows.map((row) => row.length));
    sheet["!cols"] = Array.from({ length: maxColumns }, (_, columnIndex) => {
        const width = Math.max(10, ...rows.map((row) => String(row[columnIndex] ?? "").length + 2));
        return { wch: Math.min(width, 45) };
    });
}

function populateSheetOptions(sheetNames) {
    const select = document.getElementById("excelSheet");
    select.innerHTML = "";
    sheetNames.forEach((sheetName) => {
        const option = document.createElement("option");
        option.value = sheetName;
        option.textContent = sheetName;
        select.appendChild(option);
    });
    updateExcelSheetState();
}

function updateExcelSheetState() {
    const hasWorkbook = Boolean(converterState.excelWorkbook);
    document.getElementById("excelSheet").disabled = !hasWorkbook || document.getElementById("excelAllSheets").checked;
}

function updateOcrProgress(statusId, prefix, message) {
    if (message?.status === "recognizing text") {
        setStatus(statusId, `${prefix}: ${Math.round((message.progress || 0) * 100)}%`);
    } else if (message?.status) {
        setStatus(statusId, `${prefix}: ${translateOcrStatus(message.status)}`);
    }
}

function translateOcrStatus(status) {
    const translations = {
        "loading tesseract core": "memuat mesin OCR",
        "initializing tesseract": "menyiapkan OCR",
        "loading language traineddata": "memuat bahasa",
        "initializing api": "menyiapkan pembaca",
        "recognizing text": "membaca teks"
    };
    return translations[status] || status;
}

function downloadPdfWorkbook() {
    if (!converterState.pdfWorkbookBlob || !converterState.pdfFile) return;
    saveBlob(converterState.pdfWorkbookBlob, `${stripExtension(converterState.pdfFile.name)}-hasil.xlsx`);
}

function downloadScanWorkbook() {
    if (!converterState.scanWorkbookBlob) return;
    saveBlob(converterState.scanWorkbookBlob, `hasil-scan-${dateStamp()}.xlsx`);
}

async function saveBlob(blob, fileName) {
    const safeName = String(fileName || "hasil-converter").replace(/[\\/:*?"<>|]/g, "-");
    const mimeType = blob.type || "application/octet-stream";

    if (window.AndroidDownloads?.begin && window.AndroidDownloads?.append && window.AndroidDownloads?.finish) {
        await saveBlobToAndroid(blob, safeName, mimeType);
        return;
    }

    if (window.AndroidDownloads?.save) {
        const reader = new FileReader();
        reader.onloadend = () => window.AndroidDownloads.save(safeName, mimeType, reader.result);
        reader.onerror = () => window.AndroidDownloads.failed?.();
        reader.readAsDataURL(blob);
        return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = safeName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function saveBlobToAndroid(blob, fileName, mimeType) {
    const chunkSize = 16 * 1024;
    let downloadId = "";

    try {
        downloadId = window.AndroidDownloads.begin(fileName, mimeType);
        if (!downloadId) throw new Error("ANDROID_BEGIN");
        const buffer = await readBlobAsArrayBuffer(blob);

        for (let start = 0, count = 0; start < buffer.byteLength; start += chunkSize, count += 1) {
            const part = new Uint8Array(buffer, start, Math.min(chunkSize, buffer.byteLength - start));
            let binary = "";
            for (let position = 0; position < part.length; position += 8192) {
                binary += String.fromCharCode.apply(null, part.subarray(position, position + 8192));
            }
            if (window.AndroidDownloads.append(downloadId, window.btoa(binary)) === false) throw new Error("ANDROID_APPEND");
            if (count % 8 === 0) await new Promise((resolve) => window.setTimeout(resolve, 0));
        }

        window.AndroidDownloads.finish(downloadId);
        downloadId = "";
    } catch (error) {
        if (downloadId) window.AndroidDownloads.cancel?.(downloadId);
        window.AndroidDownloads.failedWithReason?.(normalizeError(error, "ANDROID_SAVE").slice(0, 80));
        if (!window.AndroidDownloads.failedWithReason) window.AndroidDownloads.failed?.();
        throw error;
    }
}

function readBlobAsArrayBuffer(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => reader.result instanceof ArrayBuffer
            ? resolve(reader.result)
            : reject(new Error("File tidak dapat dibaca."));
        reader.onerror = () => reject(reader.error || new Error("File tidak dapat dibaca."));
        reader.readAsArrayBuffer(blob);
    });
}

function setStatus(id, message, isError = false) {
    const element = document.getElementById(id);
    element.textContent = message;
    element.classList.toggle("error", isError);
    element.hidden = false;
}

function setFileInfo(id, message) {
    const element = document.getElementById(id);
    element.textContent = message;
    element.hidden = false;
}

function showElement(id) { document.getElementById(id).hidden = false; }
function hideElement(id) { document.getElementById(id).hidden = true; }

function showToast(message, isError = false) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.toggle("error", isError);
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => { toast.hidden = true; }, 3500);
}

function safeSheetName(name, existingNames) {
    const base = String(name).replace(/[\\/?*\[\]:]/g, "-").slice(0, 31) || "Data";
    let candidate = base;
    let index = 2;
    while (existingNames.includes(candidate)) {
        const suffix = ` ${index}`;
        candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`;
        index += 1;
    }
    return candidate;
}

function stripExtension(name) { return String(name).replace(/\.[^.]+$/, ""); }
function safeFilePart(value) { return String(value || "sheet").replace(/[\\/:*?"<>|]/g, "-"); }
function dateStamp() { return new Date().toISOString().slice(0, 10); }

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeError(error, fallback) {
    const message = error instanceof Error ? error.message : String(error || "");
    return message && message !== "[object Object]" ? message : fallback;
}
