import test from "node:test";
import assert from "node:assert/strict";
import {
  passwordUpdateErrorMessage,
  validateAuthenticatedPasswordChange,
  validateRecoveryPassword,
} from "./password-recovery.js";

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

test("authenticated password change requires the current password", () => {
  assert.match(validateAuthenticatedPasswordChange("", "new-password", "new-password"), /password saat ini/);
});

test("authenticated password change requires a new password different from the current one", () => {
  assert.match(validateAuthenticatedPasswordChange("same-pass", "same-pass", "same-pass"), /berbeda/);
});

test("authenticated password change enforces length and confirmation", () => {
  assert.match(validateAuthenticatedPasswordChange("old-pass", "short", "short"), /minimal 8 karakter/);
  assert.match(validateAuthenticatedPasswordChange("old-pass", "new-password", "new-passworD"), /belum sama/);
  assert.equal(validateAuthenticatedPasswordChange("old-pass", "new-password", "new-password"), "");
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
