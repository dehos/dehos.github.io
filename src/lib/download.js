import { safeFileName } from "./format.js";

/*
 * Menyimpan Blob sebagai file.
 * - Di wrapper Android (window.AndroidDownloads) dikirim bertahap lewat jembatan native.
 * - Di browser biasa memakai tautan unduh.
 * Antarmuka jembatan Android TIDAK boleh diubah: begin/append/finish/cancel/save/failed/failedWithReason.
 */

const UKURAN_POTONGAN = 16 * 1024;

function bacaBlobSebagaiBuffer(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else reject(new Error("JS_FILE_READER_RESULT"));
    };
    reader.onerror = () => reject(new Error("JS_FILE_READER"));
    reader.readAsArrayBuffer(blob);
  });
}

async function simpanBertahapAndroid(blob, namaFile, mimeType) {
  const bridge = window.AndroidDownloads;
  let idDownload = "";

  try {
    idDownload = bridge.begin(namaFile, mimeType);
    if (!idDownload) throw new Error("JS_BEGIN");

    const buffer = await bacaBlobSebagaiBuffer(blob);
    let jumlahPotongan = 0;

    for (let awal = 0; awal < buffer.byteLength; awal += UKURAN_POTONGAN) {
      const bagian = new Uint8Array(buffer, awal, Math.min(UKURAN_POTONGAN, buffer.byteLength - awal));

      let biner = "";
      for (let posisi = 0; posisi < bagian.length; posisi += 8192) {
        biner += String.fromCharCode.apply(null, bagian.subarray(posisi, posisi + 8192));
      }

      if (bridge.append(idDownload, window.btoa(biner)) === false) {
        throw new Error("JS_APPEND");
      }

      jumlahPotongan += 1;
      if (jumlahPotongan % 8 === 0) {
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }
    }

    const selesai = bridge.finish(idDownload);
    idDownload = "";
    if (selesai === false) return;
  } catch (error) {
    if (idDownload && typeof bridge.cancel === "function") bridge.cancel(idDownload);

    const alasan = error instanceof Error ? error.message : "JS_UNKNOWN";
    if (typeof bridge.failedWithReason === "function") {
      bridge.failedWithReason(String(alasan).slice(0, 80));
      return;
    }
    bridge.failed?.();
  }
}

export function simpanBlob(blob, namaFile) {
  const nama = safeFileName(namaFile);
  const mimeType = blob?.type || "application/octet-stream";
  const bridge = typeof window !== "undefined" ? window.AndroidDownloads : undefined;

  if (
    bridge &&
    typeof bridge.begin === "function" &&
    typeof bridge.append === "function" &&
    typeof bridge.finish === "function"
  ) {
    void simpanBertahapAndroid(blob, nama, mimeType);
    return;
  }

  if (bridge && typeof bridge.save === "function") {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result !== "string") {
        bridge.failed?.();
        return;
      }
      bridge.save(nama, mimeType, reader.result);
    };
    reader.onerror = () => bridge.failed?.();
    reader.readAsDataURL(blob);
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nama;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** true bila aplikasi berjalan di wrapper Android Dhouse. */
export function isAndroidWrapper() {
  return typeof window !== "undefined" && Boolean(window.AndroidDownloads);
}
