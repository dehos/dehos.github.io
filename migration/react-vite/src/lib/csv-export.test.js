import test from "node:test";
import assert from "node:assert/strict";
import { serializeCsv } from "./csv-export.js";

test("adds a real UTF-8 BOM and serializes rows with CRLF", () => {
  const csv = serializeCsv([["Tanggal", "Nama"], ["2026-10-25", "Tas"]]);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.equal(csv, "\uFEFF\"Tanggal\",\"Nama\"\r\n\"2026-10-25\",\"Tas\"");
});

test("quotes delimiters, quotes, and embedded line breaks", () => {
  const csv = serializeCsv([["Nama", "Catatan"], ["Tas, besar", 'Model "premium"\nbaru']]);
  assert.equal(csv, "\uFEFF\"Nama\",\"Catatan\"\r\n\"Tas, besar\",\"Model \"\"premium\"\"\nbaru\"");
});

test("neutralizes spreadsheet formula prefixes in text cells", () => {
  const csv = serializeCsv([["Nama"], ["=1+1"], ["+SUM(A1:A2)"], ["-cmd"], ["@SUM(1,2)"], [" \t=HYPERLINK(\"https://example.invalid\")"]]);
  assert.ok(csv.includes("\"'=1+1\""));
  assert.ok(csv.includes("\"'+SUM(A1:A2)\""));
  assert.ok(csv.includes("\"'-cmd\""));
  assert.ok(csv.includes("\"'@SUM(1,2)\""));
  assert.ok(csv.includes("\"' \t=HYPERLINK(\"\"https://example.invalid\"")\""));
});

test("preserves actual numeric values, including negative numbers", () => {
  const csv = serializeCsv([["Qty", "Harga"], [2, -1500]]);
  assert.equal(csv, "\uFEFF\"Qty\",\"Harga\"\r\n\"2\",\"-1500\"");
});

test("serializes nullish values as empty cells", () => {
  assert.equal(serializeCsv([[null, undefined]]), "\uFEFF\"\",\"\"");
});
