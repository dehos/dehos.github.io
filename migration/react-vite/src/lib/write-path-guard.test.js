import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

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

// --- Whole-source guard: every non-test file under src/ is scanned, not just App.jsx. ---
const srcRoot = new URL("../", import.meta.url).pathname;
function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(js|jsx)$/.test(name) && !/\.test\.js$/.test(name) ? [path] : [];
  });
}
const allSources = sourceFiles(srcRoot).map((path) => ({ path, text: readFileSync(path, "utf8") }));

test("the browser calls exactly the four reviewed RPCs (plus the read-only dashboard summary) and no others", () => {
  const names = new Set();
  for (const { path, text } of allSources) {
    for (const match of text.matchAll(/\.rpc\(\s*([^,)]*)/g)) {
      const arg = match[1].trim();
      assert.match(arg, /^["'][a-z_]+["']$/, "RPC name must be a string literal in " + path + ": " + arg);
      names.add(arg.slice(1, -1));
    }
  }
  assert.deepEqual([...names].sort(), [
    "catat_penjualan_atomic", "catat_transaksi_stok_atomic", "edit_penjualan_atomic", "get_dashboard_summary", "hapus_penjualan_atomic",
  ]);
});

test("no source file mutates any table through the client", () => {
  for (const { path, text } of allSources) {
    assert.doesNotMatch(text, /(?<!Array|Object|Buffer)\.from\(\s*[^"'\s]/, "table name must be a string literal in " + path);
    assert.doesNotMatch(
      text,
      /(?<!Array|Object|Buffer)\.from\([^)]*\)[\s\S]{0,200}?\.(?:insert|update|upsert|delete)\s*\(/,
      "direct table mutation found in " + path,
    );
  }
});
