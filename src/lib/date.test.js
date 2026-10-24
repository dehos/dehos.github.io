import test from "node:test";
import assert from "node:assert/strict";
import {
  isISODate, formatTanggalTampilan, formatTanggalRingkasTabel, parseTanggalTampilan, formatKetikTanggal,
  tanggalJakarta, addDaysISO, formatBulan, monthRangeISO, toISODate, addMonths, startOfMonth, monthOfISO
} from "./date.js";

test("validasi dan konversi tanggal", () => {
  assert.equal(isISODate("2026-10-24"), true);
  assert.equal(isISODate("2026-02-30"), false);
  assert.equal(isISODate("24/10/2026"), false);
  assert.equal(formatTanggalTampilan("2026-10-24"), "24/10/2026");
  assert.equal(formatTanggalTampilan("x"), "");
  assert.equal(formatTanggalRingkasTabel("2026-10-04"), "4/10");
});

test("parseTanggalTampilan menolak tanggal mustahil", () => {
  assert.equal(parseTanggalTampilan("24/10/2026"), "2026-10-24");
  assert.equal(parseTanggalTampilan("31/02/2026"), "");
  assert.equal(parseTanggalTampilan("24-10-2026"), "");
  assert.equal(parseTanggalTampilan(""), "");
});

test("formatKetikTanggal memasang garis miring otomatis", () => {
  assert.equal(formatKetikTanggal("2"), "2");
  assert.equal(formatKetikTanggal("241"), "24/1");
  assert.equal(formatKetikTanggal("24102026"), "24/10/2026");
  assert.equal(formatKetikTanggal("24/10/2026999"), "24/10/2026");
});

test("tanggalJakarta memakai zona Asia/Jakarta", () => {
  // 17:30 UTC tanggal 23 = 00:30 WIB tanggal 24
  assert.equal(tanggalJakarta("2026-10-23T17:30:00Z"), "2026-10-24");
  assert.equal(tanggalJakarta("2026-10-23T16:30:00Z"), "2026-10-23");
  assert.equal(tanggalJakarta("bukan tanggal"), "");
});

test("aritmetika tanggal dan bulan", () => {
  assert.equal(addDaysISO("2026-10-31", 1), "2026-11-01");
  assert.equal(addDaysISO("2026-03-01", -1), "2026-02-28");
  assert.equal(formatBulan(new Date(2026, 9, 1)), "Oktober 2026");
  assert.deepEqual(monthRangeISO(new Date(2026, 11, 15)), { start: "2026-12-01", endExclusive: "2027-01-01" });
  assert.equal(toISODate(addMonths(startOfMonth(new Date(2026, 0, 31)), -1)), "2025-12-01");
  assert.equal(toISODate(monthOfISO("2026-10-24")), "2026-10-01");
});
