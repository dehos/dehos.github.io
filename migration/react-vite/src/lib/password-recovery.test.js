import test from "node:test";
import assert from "node:assert/strict";
import { passwordUpdateErrorMessage, validateRecoveryPassword } from "./password-recovery.js";

test("requires a password of at least eight characters", () => {
  assert.match(validateRecoveryPassword("short", "short"), /minimal 8 karakter/);
  assert.equal(validateRecoveryPassword("12345678", "12345678"), "");
});

test("requires exact password confirmation", () => {
  assert.match(validateRecoveryPassword("secure-pass", "secure-pass!"), /belum sama/);
});

test("does not accept missing or non-string passwords", () => {
  assert.match(validateRecoveryPassword("", ""), /minimal 8 karakter/);
  assert.match(validateRecoveryPassword(null, null), /minimal 8 karakter/);
});

test("maps weak and reused password errors to safe user messages", () => {
  assert.match(passwordUpdateErrorMessage({ code: "same_password" }), /berbeda/);
  assert.match(passwordUpdateErrorMessage({ code: "weak_password" }), /lebih kuat/);
});

test("does not expose provider error internals", () => {
  const message = passwordUpdateErrorMessage({ message: "internal database detail", code: "unexpected" });
  assert.match(message, /Periksa koneksi/);
  assert.doesNotMatch(message, /internal database detail/);
});
