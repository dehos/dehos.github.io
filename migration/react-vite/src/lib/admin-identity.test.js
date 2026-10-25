import test from "node:test";
import assert from "node:assert/strict";
import { hasMatchingAdminIdentity } from "./admin-identity.js";

test("accepts a matching session email in the admin result", () => {
  assert.equal(
    hasMatchingAdminIdentity("admin@example.com", [{ email: "admin@example.com" }], null),
    true
  );
});

test("rejects an admin row for a different user", () => {
  assert.equal(
    hasMatchingAdminIdentity("admin@example.com", [{ email: "other@example.com" }], null),
    false
  );
});

test("rejects a differently cased email instead of broadening identity matching", () => {
  assert.equal(
    hasMatchingAdminIdentity("admin@example.com", [{ email: "Admin@example.com" }], null),
    false
  );
});

test("fails closed when the query reports an error, even if data is present", () => {
  assert.equal(
    hasMatchingAdminIdentity("admin@example.com", [{ email: "admin@example.com" }], new Error("denied")),
    false
  );
});

test("rejects missing or blank session email", () => {
  assert.equal(hasMatchingAdminIdentity("", [{ email: "" }], null), false);
  assert.equal(hasMatchingAdminIdentity(null, [{ email: "admin@example.com" }], null), false);
  assert.equal(hasMatchingAdminIdentity("   ", [{ email: "admin@example.com" }], null), false);
});

test("fails closed for empty, non-array, and malformed query results", () => {
  assert.equal(hasMatchingAdminIdentity("admin@example.com", [], null), false);
  assert.equal(hasMatchingAdminIdentity("admin@example.com", null, null), false);
  assert.equal(hasMatchingAdminIdentity("admin@example.com", [{ username: "admin" }], null), false);
});
