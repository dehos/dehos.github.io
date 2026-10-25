import test from "node:test";
import assert from "node:assert/strict";
import { paginateItems } from "./pagination.js";

test("splits rows into stable 1-based page windows without mutating input", () => {
  const rows = Array.from({ length: 53 }, (_, index) => index + 1);
  const snapshot = [...rows];
  assert.deepEqual(paginateItems(rows, 1, 25), {
    items: rows.slice(0, 25), page: 1, pageCount: 3, pageSize: 25, total: 53, start: 1, end: 25,
  });
  assert.deepEqual(paginateItems(rows, 3, 25), {
    items: rows.slice(50), page: 3, pageCount: 3, pageSize: 25, total: 53, start: 51, end: 53,
  });
  assert.deepEqual(rows, snapshot);
});

test("clamps invalid and out-of-range page numbers safely", () => {
  const rows = [1, 2, 3];
  assert.equal(paginateItems(rows, 0, 2).page, 1);
  assert.equal(paginateItems(rows, 99, 2).page, 2);
  assert.equal(paginateItems(rows, "not-a-page", 2).page, 1);
  assert.equal(paginateItems(rows, 1, 0).pageSize, 25);
});

test("handles empty and malformed collections without invalid ranges", () => {
  assert.deepEqual(paginateItems([], 7, 10), {
    items: [], page: 1, pageCount: 1, pageSize: 10, total: 0, start: 0, end: 0,
  });
  assert.equal(paginateItems(null).total, 0);
});
