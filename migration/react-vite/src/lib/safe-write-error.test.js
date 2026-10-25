import test from "node:test";
import assert from "node:assert/strict";
import { safeWriteErrorMessage } from "./safe-write-error.js";

test("maps known database errors to safe user-facing messages", () => {
  assert.match(safeWriteErrorMessage({ code: "23505", message: "private constraint detail" }), /Data serupa/);
  assert.match(safeWriteErrorMessage({ code: "23503", message: "private foreign key detail" }), /referensi terkait/);
  assert.match(safeWriteErrorMessage({ code: "42501", message: "private policy detail" }), /Akses ditolak/);
  assert.match(safeWriteErrorMessage({ code: "P0001", message: "private RPC detail" }), /aturan bisnis/);
});

test("does not expose provider messages, details, or hints for unknown errors", () => {
  const result = safeWriteErrorMessage({
    code: "XX000",
    message: "SECRET SQL MESSAGE",
    details: "SECRET ROW DETAIL",
    hint: "SECRET DATABASE HINT",
  }, "Operasi gagal. Silakan coba lagi.");
  assert.equal(result, "Operasi gagal. Silakan coba lagi.");
  assert.doesNotMatch(result, /SECRET|SQL|DATABASE|ROW DETAIL/);
});

test("uses a generic fallback for missing and malformed errors", () => {
  assert.equal(safeWriteErrorMessage(null), "Operasi gagal. Silakan coba lagi.");
  assert.equal(safeWriteErrorMessage({ message: "sensitive provider text" }, "Periksa stok."), "Periksa stok.");
});

test("maps known business-rule failures to fixed messages without leaking provider text", () => {
  const brand = safeWriteErrorMessage({ code: "P0001", message: "Barang ID 1260 belum memiliki brand aktif" });
  assert.match(brand, /brand aktif/);
  assert.doesNotMatch(brand, /1260|Barang ID/);
  const stock = safeWriteErrorMessage({ code: "P0001", message: "Stok berubah menjadi -3. Periksa kembali sebelum menyimpan." });
  assert.match(stock, /Stok barang berubah/);
  assert.doesNotMatch(stock, /-3/);
});

test("keeps the generic business-rule message for unrecognized P0001 errors and ignores matching text on other codes", () => {
  assert.match(safeWriteErrorMessage({ code: "P0001", message: "Data penjualan tidak valid" }), /aturan bisnis/);
  assert.equal(safeWriteErrorMessage({ code: "XX000", message: "belum memiliki brand aktif" }, "Gagal."), "Gagal.");
});
