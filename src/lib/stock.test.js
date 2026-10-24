import test from "node:test";
import assert from "node:assert/strict";
import {
  indexTransaksi, stokMentahPadaTanggal, stokPadaTanggal, stokSebelumTanggal,
  barangAdaPadaTanggal, tanggalMulaiBarang, isStockIn, isStockOut
} from "./stock.js";

const barang = { id: 1, nama: "Engsel", stok_awal: 10, tanggal_mulai: "2026-10-01", created_at: "2026-09-01T00:00:00Z" };
const trx = [
  { id: 1, barang_id: 1, tanggal: "2026-10-02", type: "masuk", qty: 5 },
  { id: 2, barang_id: 1, tanggal: "2026-10-03", type: "laku", qty: 8 },
  { id: 3, barang_id: 1, tanggal: "2026-10-05", type: "adjust_keluar", qty: 2 },
  { id: 4, barang_id: 1, tanggal: "2026-10-06", type: "adjust_masuk", qty: 1 },
  { id: 5, barang_id: 2, tanggal: "2026-10-02", type: "masuk", qty: 99 }
];
const index = indexTransaksi(trx);

test("jenis transaksi", () => {
  assert.ok(isStockIn({ type: "masuk" }) && isStockIn({ type: "adjust_masuk" }));
  assert.ok(isStockOut({ type: "laku" }) && isStockOut({ type: "adjust_keluar" }));
  assert.ok(!isStockIn({ type: "laku" }) && !isStockOut({ type: "masuk" }));
});

test("stok pada tanggal mengikuti aturan database", () => {
  assert.equal(stokMentahPadaTanggal(barang, "2026-10-01", index), 10);
  assert.equal(stokMentahPadaTanggal(barang, "2026-10-02", index), 15);
  assert.equal(stokMentahPadaTanggal(barang, "2026-10-03", index), 7);
  assert.equal(stokMentahPadaTanggal(barang, "2026-10-05", index), 5);
  assert.equal(stokMentahPadaTanggal(barang, "2026-10-31", index), 6);
  assert.equal(stokMentahPadaTanggal(barang, undefined, index), 6);
});

test("stok awal belum dihitung sebelum tanggal mulai", () => {
  const baru = { id: 3, nama: "Baru", stok_awal: 20, tanggal_mulai: "2026-10-10" };
  const idx = indexTransaksi([{ barang_id: 3, tanggal: "2026-10-05", type: "masuk", qty: 4 }]);
  assert.equal(stokMentahPadaTanggal(baru, "2026-10-07", idx), 4); // ada transaksi, stok awal belum aktif
  assert.equal(stokMentahPadaTanggal(baru, "2026-10-10", idx), 24);
  assert.equal(barangAdaPadaTanggal(baru, "2026-10-01", idx), false);
  assert.equal(stokMentahPadaTanggal(baru, "2026-10-01", idx), 0);
});

test("stok tampilan tidak pernah negatif tetapi stok mentah bisa", () => {
  const idx = indexTransaksi([{ barang_id: 1, tanggal: "2026-10-02", type: "laku", qty: 30 }]);
  assert.equal(stokMentahPadaTanggal(barang, "2026-10-02", idx), -20);
  assert.equal(stokPadaTanggal(barang, "2026-10-02", idx), 0);
});

test("stok sebelum tanggal mengecualikan transaksi pada tanggal itu", () => {
  assert.equal(stokSebelumTanggal(barang, "2026-10-03", index), 15);
  assert.equal(stokSebelumTanggal(barang, "2026-10-01", index), 10);
});

test("tanggal mulai barang memakai created_at zona Jakarta bila kosong", () => {
  assert.equal(tanggalMulaiBarang(barang), "2026-10-01");
  assert.equal(tanggalMulaiBarang({ created_at: "2026-10-23T17:30:00Z" }), "2026-10-24");
  assert.equal(tanggalMulaiBarang({}), "");
});
