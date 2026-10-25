import test from "node:test";
import assert from "node:assert/strict";
import { calculateStockBalance } from "../src/lib/stock-balance.js";

test("uses initial stock on and after the item's start date", () => {
  const item = { id: 1, stok_awal: 12, tanggal_mulai: "2026-01-10" };
  assert.equal(calculateStockBalance(item, [], "2026-01-09"), 0);
  assert.equal(calculateStockBalance(item, [], "2026-01-10"), 12);
  assert.equal(calculateStockBalance(item, [], "2026-01-11"), 12);
});

test("applies incoming, sales, and legacy adjustment movement types", () => {
  const item = { id: 1, stok_awal: 10, created_at: "2026-01-01T00:00:00Z" };
  const transactions = [
    { barang_id: 1, tanggal: "2026-01-02", type: "masuk", qty: 5 },
    { barang_id: 1, tanggal: "2026-01-03", type: "laku", qty: 4 },
    { barang_id: 1, tanggal: "2026-01-04", type: "adjust_masuk", qty: 2 },
    { barang_id: 1, tanggal: "2026-01-05", type: "adjust_keluar", qty: 3 },
  ];
  assert.equal(calculateStockBalance(item, transactions, "2026-01-05"), 10);
});

test("ignores transactions for other items and transactions after the selected date", () => {
  const item = { id: 7, stok_awal: 8, created_at: "2026-01-01" };
  const transactions = [
    { barang_id: 8, tanggal: "2026-01-02", type: "masuk", qty: 100 },
    { barang_id: 7, tanggal: "2026-01-03", type: "laku", qty: 2 },
    { barang_id: 7, tanggal: "2026-01-04", type: "masuk", qty: 50 },
  ];
  assert.equal(calculateStockBalance(item, transactions, "2026-01-03"), 6);
});

test("counts signed 'adjust' movements recorded by catat_transaksi_stok_atomic", () => {
  const item = { id: 4, stok_awal: 10, created_at: "2026-01-01" };
  const transactions = [
    { barang_id: 4, tanggal: "2026-01-02", type: "adjust", qty: -4 },
    { barang_id: 4, tanggal: "2026-01-03", type: "adjust", qty: 2 },
  ];
  assert.equal(calculateStockBalance(item, transactions, "2026-01-03"), 8);
  assert.equal(calculateStockBalance(item, transactions, "2026-01-02"), 6);
});

test("preserves negative balances for pre-order visibility", () => {
  const item = { id: 2, stok_awal: 1, created_at: "2026-01-01" };
  const transactions = [{ barang_id: 2, tanggal: "2026-01-02", type: "laku", qty: 4 }];
  assert.equal(calculateStockBalance(item, transactions, "2026-01-02"), -3);
});

test("treats missing or nonnumeric quantities as zero, matching existing behavior", () => {
  const item = { id: 3, stok_awal: "not-a-number" };
  const transactions = [{ barang_id: 3, tanggal: "2026-01-02", type: "masuk", qty: "invalid" }];
  assert.equal(calculateStockBalance(item, transactions, "2026-01-02"), 0);
});
