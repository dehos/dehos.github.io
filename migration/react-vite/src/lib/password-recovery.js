export function validateAuthenticatedPasswordChange(currentPassword, newPassword, confirmation) {
  if (typeof currentPassword !== "string" || !currentPassword) return "Masukkan password saat ini.";
  if (typeof newPassword !== "string" || newPassword.length < 8) return "Password baru harus minimal 8 karakter.";
  if (newPassword === currentPassword) return "Gunakan password baru yang berbeda dari password lama.";
  if (newPassword !== confirmation) return "Konfirmasi password belum sama.";
  return "";
}

export function validateRecoveryPassword(password, confirmation) {
  if (typeof password !== "string" || password.length < 8) return "Password baru harus minimal 8 karakter.";
  if (password !== confirmation) return "Konfirmasi password belum sama.";
  return "";
}

export function passwordUpdateErrorMessage(error) {
  if (error?.code === "same_password") return "Gunakan password baru yang berbeda dari password lama.";
  if (error?.code === "weak_password") return "Password belum memenuhi aturan keamanan. Gunakan password yang lebih kuat.";
  if (error?.code === "reauthentication_needed") {
    return "Sesi perlu diverifikasi ulang. Masuk kembali lalu coba lagi.";
  }
  if (error?.code === "reauthentication_not_valid") {
    return "Password saat ini tidak cocok atau sesi perlu diverifikasi ulang. Periksa password lalu coba lagi.";
  }
  return "Password belum dapat disimpan. Periksa koneksi atau minta tautan reset baru.";
}
