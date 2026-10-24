import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSearchValue, getBarangSearchScore, cariBarang } from "./search.js";

const daftar = [
  { nama: "Handle Pintu Besar", brand: { nama: "Dekkson" } },
  { nama: "Engsel Nylon", brand: { nama: "Dekkson" } },
  { nama: "Kunci Dekkson Premium", brand: { nama: "Yale" } },
  { nama: "Rel Laci", brand: { nama: "Hafele" } }
];

test("normalisasi menghapus aksen dan spasi", () => {
  assert.equal(normalizeSearchValue("  ÉNGSEL "), "engsel");
  assert.equal(normalizeSearchValue(null), "");
});

test("skor relevansi mengutamakan brand lalu nama", () => {
  assert.equal(getBarangSearchScore(daftar[0], "dekkson"), 0);
  assert.equal(getBarangSearchScore(daftar[0], "dek"), 1);
  assert.equal(getBarangSearchScore(daftar[0], "handle pintu besar"), 2);
  assert.equal(getBarangSearchScore(daftar[0], "handle"), 3);
  assert.equal(getBarangSearchScore(daftar[0], "pintu"), 5);
  assert.equal(getBarangSearchScore(daftar[0], "zzz"), Number.POSITIVE_INFINITY);
});

test("cariBarang menyaring dan mengurutkan", () => {
  const hasil = cariBarang(daftar, "dekkson").map((b) => b.nama);
  assert.deepEqual(hasil.slice(0, 2), ["Engsel Nylon", "Handle Pintu Besar"]);
  assert.equal(hasil.length, 3);
  assert.equal(cariBarang(daftar, "").length, 4);
  assert.equal(cariBarang(daftar, "tidak ada").length, 0);
});
