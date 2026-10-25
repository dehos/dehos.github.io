import test from "node:test";
import assert from "node:assert/strict";
import { matchesStockTransactionSearch } from "./stock-search.js";

const row = { type: "masuk", barang_id: 42 };
const good = { nama: "Tas Kerja", brand: { nama: "DEHOS" } };

test("matches transaction history by item name, associated brand, or type", () => {
  assert.equal(matchesStockTransactionSearch(row, good, "tas"), true);
  assert.equal(matchesStockTransactionSearch(row, good, "dehos"), true);
  assert.equal(matchesStockTransactionSearch(row, good, "masuk"), true);
  assert.equal(matchesStockTransactionSearch(row, good, "tidak-ada"), false);
});

test("empty search matches and missing related data is handled safely", () => {
  assert.equal(matchesStockTransactionSearch(row, good, ""), true);
  assert.equal(matchesStockTransactionSearch({ type: null }, null, "dehos"), false);
});

test("search is case-insensitive for Indonesian text", () => {
  assert.equal(matchesStockTransactionSearch(row, good, "DEHOS"), true);
  assert.equal(matchesStockTransactionSearch(row, good, "TAS KERJA"), true);
});
