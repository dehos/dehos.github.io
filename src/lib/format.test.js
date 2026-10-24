import test from "node:test";
import assert from "node:assert/strict";
import { formatNumber, formatNominalTabel, formatRupiah, formatHargaInput, parseHarga, safeFileName } from "./format.js";

test("formatNumber memakai pemisah ribuan Indonesia", () => {
  assert.equal(formatNumber(1234567), "1.234.567");
  assert.equal(formatNumber("abc"), "-");
});

test("formatNominalTabel menyingkat mulai 1.000", () => {
  assert.equal(formatNominalTabel(999), "999");
  assert.equal(formatNominalTabel(1000), "1K");
  assert.equal(formatNominalTabel(1500), "1,5K");
  assert.equal(formatNominalTabel(2_000_000), "2Jt");
  assert.equal(formatNominalTabel(NaN), "-");
});

test("formatRupiah dan input harga", () => {
  assert.equal(formatRupiah(0), "Rp0");
  assert.equal(formatRupiah(33000), "Rp33.000");
  assert.equal(formatHargaInput("12500"), "12.500");
  assert.equal(formatHargaInput("Rp 1a2"), "12");
  assert.equal(formatHargaInput(""), "");
  assert.equal(parseHarga("12.500"), 12500);
  assert.equal(parseHarga(""), 0);
});

test("safeFileName membuang karakter terlarang", () => {
  assert.equal(safeFileName('a/b:c*d?"e<f>g|h'), "a-b-c-d--e-f-g-h");
  assert.equal(safeFileName(""), "Stock-Barang");
});
