export function hasMatchingAdminIdentity(sessionEmail, admins, error) {
  if (error || typeof sessionEmail !== "string" || !sessionEmail.trim()) return false;
  if (!Array.isArray(admins)) return false;

  const expectedEmail = sessionEmail.trim();
  return admins.some(
    (admin) => admin && typeof admin.email === "string" && admin.email === expectedEmail
  );
}
