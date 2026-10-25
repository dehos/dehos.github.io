import test from "node:test";
import assert from "node:assert/strict";
import { buildEditSaleParams, buildDeleteSaleParams, isRealIsoDate } from "./sale-edit.js";

const sale = { id: 176, barang_id: 12, brand: "Brand A", qty: 4, harga: 1000, tanggal_pembelian: "2026-10-20" };
const form = { qty: "6", harga: "2500", tanggal: "2026-10-21" };

test("builds exact RPC parameters and keeps item and brand unchanged", () => {
  const result = buildEditSaleParams(sale, form);
  assert.equal(result.ok, true);
  assert.equal(result.changed, true);
  assert.deepEqual(result.params, {
    p_penjualan_id: 176, p_barang_id: 12, p_brand: "Brand A", p_qty: 6, p_harga: 2500, p_tanggal_pembelian: "2026-10-21",
  });
});

test("reports an unchanged form so no-op edits can be skipped", () => {
  const result = buildEditSaleParams(sale, { qty: "4", harga: "1000", tanggal: "2026-10-20" });
  assert.equal(result.ok, true);
  assert.equal(result.changed, false);
});

test("rejects invalid quantity values", () => {
  for (const qty of ["0", "-1", "1.5", "", "  ", "abc", "Infinity"]) {
    assert.equal(buildEditSaleParams(sale, { ...form, qty }).ok, false, "qty " + JSON.stringify(qty));
  }
});

test("rejects blank, negative, and nonnumeric price but accepts zero", () => {
  for (const harga of ["", "  ", "-1", "abc"]) {
    assert.equal(buildEditSaleParams(sale, { ...form, harga }).ok, false, "harga " + JSON.stringify(harga));
  }
  const zero = buildEditSaleParams(sale, { ...form, harga: "0" });
  assert.equal(zero.ok, true);
  assert.equal(zero.params.p_harga, 0);
});

test("rejects impossible or malformed dates", () => {
  for (const tanggal of ["", "2026-02-30", "2026-13-01", "26-10-21", "2026-10-2", "abc", undefined]) {
    assert.equal(buildEditSaleParams(sale, { ...form, tanggal }).ok, false, "tanggal " + String(tanggal));
  }
  assert.equal(isRealIsoDate("2028-02-29"), true);
  assert.equal(isRealIsoDate("2026-02-29"), false);
});

test("rejects sales without a usable id, item, or brand", () => {
  assert.equal(buildEditSaleParams(null, form).ok, false);
  assert.equal(buildEditSaleParams({ ...sale, id: 0 }, form).ok, false);
  assert.equal(buildEditSaleParams({ ...sale, id: "1.5" }, form).ok, false);
  assert.equal(buildEditSaleParams({ ...sale, barang_id: null }, form).ok, false);
  assert.equal(buildEditSaleParams({ ...sale, brand: "   " }, form).ok, false);
  assert.equal(buildEditSaleParams({ ...sale, brand: null }, form).ok, false);
});

test("delete parameters contain only a validated sale id", () => {
  assert.deepEqual(buildDeleteSaleParams(sale), { ok: true, params: { p_penjualan_id: 176 } });
  assert.equal(buildDeleteSaleParams({ id: -3 }).ok, false);
  assert.equal(buildDeleteSaleParams(undefined).ok, false);
});
