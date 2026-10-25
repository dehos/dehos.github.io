export function validateRecoveryPassword(password, confirmation) {
  if (typeof password !== "string" || password.length < 8) return "Password baru harus minimal 8 karakter.";
  if (password !== confirmation) return "Konfirmasi password belum sama.";
  return "";
}

export function passwordUpdateErrorMessage(error) {
  if (error?.code === "same_password") return "Gunakan password baru yang berbeda dari password lama.";
  if (error?.code === "weak_password") return "Password belum memenuhi aturan keamanan. Gunakan password yang lebih kuat.";
  if (error?.code === "reauthentication_needed" || error?.code === "reauthentication_not_valid") {
    return "Sesi perlu diverifikasi ulang. Minta tautan reset baru jika masalah berlanjut.";
  }
  return "Password belum dapat disimpan. Periksa koneksi atau minta tautan reset baru.";
}
