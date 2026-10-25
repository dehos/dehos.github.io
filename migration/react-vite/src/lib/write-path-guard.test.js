import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../App.jsx", import.meta.url), "utf8");

test("React data UI never writes directly to business tables", () => {
  const directTableWrite = /\.from\(\s*["'](?:penjualan|barang|transaksi)["']\s*\)\s*\.(?:insert|update|upsert|delete)\s*\(/i;
  assert.doesNotMatch(
    appSource,
    directTableWrite,
    "Business-table mutations must use reviewed atomic RPCs, not direct Supabase table writes.",
  );
});

test("sale and stock creation stay on the existing atomic RPC contracts", () => {
  assert.match(appSource, /\.rpc\(\s*["']catat_penjualan_atomic["']/);
  assert.match(appSource, /\.rpc\(\s*["']catat_transaksi_stok_atomic["']/);
});

test("sale edit/delete use only the reviewed RPCs, once each, through validated parameter builders", () => {
  assert.equal((appSource.match(/\.rpc\(\s*["']edit_penjualan_atomic["']\s*,\s*built\.params\s*\)/g) || []).length, 1);
  assert.equal((appSource.match(/\.rpc\(\s*["']hapus_penjualan_atomic["']\s*,\s*built\.params\s*\)/g) || []).length, 1);
  assert.equal((appSource.match(/edit_penjualan_atomic|hapus_penjualan_atomic/g) || []).length, 2);
  assert.match(appSource, /buildEditSaleParams\(editing, editForm\)/);
  assert.match(appSource, /buildDeleteSaleParams\(item\)/);
});

test("no unreviewed stock-transaction edit/delete RPC is introduced", () => {
  assert.doesNotMatch(appSource, /\.rpc\(\s*["'](?:edit_transaksi_atomic|hapus_transaksi_atomic)["']/);
});

test("confirmation dialogs use real newline escapes, not literal backslash-n text", () => {
  assert.doesNotMatch(appSource, /window\.confirm\([\s\S]{0,400}\\\\n/);
});
