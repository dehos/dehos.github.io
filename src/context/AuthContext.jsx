import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase, createVerifierClient } from "../lib/supabase.js";
import {
  KUNCI_RECOVERY,
  cleanRecoveryUrl,
  recoveryLinkError,
  recoveryLinkRequested
} from "../lib/recoveryHash.js";

/*
 * Autentikasi admin. Perilaku dipertahankan dari versi lama:
 *  - login dengan email (Supabase Auth) atau username (Edge Function `login-username`);
 *  - hanya akun yang ada di tabel `app_admins` yang boleh masuk;
 *  - alur "lupa password" -> tautan email -> form password baru (mode "recovery");
 *  - ganti password dari dalam aplikasi, password lama diverifikasi lewat klien terpisah.
 *
 * status: "checking" (memeriksa sesi) | "locked" (tampilkan layar masuk) | "ready" (aplikasi terbuka)
 * mode:   "login" | "reset" (minta tautan) | "recovery" (isi password baru)
 */

const AuthContext = createContext(null);

function pesanGalatPassword(error) {
  const code = error?.code;
  if (code === "same_password") return "Gunakan password baru yang berbeda dari password lama.";
  if (code === "weak_password") return "Password belum memenuhi aturan keamanan. Gunakan password yang lebih kuat.";
  if (code === "current_password_mismatch" || code === "invalid_credentials") return "Password lama salah.";
  if (code === "reauthentication_needed" || code === "reauthentication_not_valid") {
    return "Sesi perlu diverifikasi ulang. Keluar lalu login kembali, atau gunakan Lupa password.";
  }
  return "Password belum dapat disimpan. Periksa koneksi dan coba lagi, atau minta tautan reset baru.";
}

export function validasiPasswordBaru(password, konfirmasi, lama = "") {
  if (password.length < 8) return "Password baru harus minimal 8 karakter.";
  if (password !== konfirmasi) return "Konfirmasi password belum sama.";
  if (lama && password === lama) return "Gunakan password baru yang berbeda dari password lama.";
  return "";
}

export function AuthProvider({ children }) {
  const [status, setStatus] = useState("checking");
  const [mode, setMode] = useState("login");
  const [pesan, setPesan] = useState({ text: "", type: "" });
  const [busy, setBusyState] = useState(false);
  const [session, setSession] = useState(null);

  const busyRef = useRef(false);
  const recoveryRef = useRef(false);
  const bootRef = useRef(false);

  const setBusy = useCallback((nilai) => {
    busyRef.current = nilai;
    setBusyState(nilai);
  }, []);

  const setMessage = useCallback((text = "", type = "") => setPesan({ text, type }), []);

  const kunci = useCallback(
    (text = "", type = "") => {
      setStatus("locked");
      setMessage(text, type);
    },
    [setMessage]
  );

  const goMode = useCallback(
    (nextMode, text = "", type = "") => {
      if (busyRef.current) return;
      setMode(nextMode);
      setMessage(text, type);
    },
    [setMessage]
  );

  const aktifkanSesi = useCallback(
    async (nextSession) => {
      if (!nextSession) {
        kunci();
        return;
      }
      setMessage("Memeriksa izin akun...", "loading");
      const { data, error } = await supabase.from("app_admins").select("email").limit(1);
      if (error || !Array.isArray(data) || data.length === 0) {
        await supabase.auth.signOut();
        kunci("Akun ini tidak memiliki izin admin.");
        return;
      }
      setSession(nextSession);
      setMessage("");
      setStatus("ready");
    },
    [kunci, setMessage]
  );

  // Dengarkan kejadian auth. Callback sengaja sinkron agar tidak menyebabkan deadlock lock SDK.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        recoveryRef.current = true;
        sessionStorage.setItem(KUNCI_RECOVERY, "1");
        setStatus("locked");
        setMode("recovery");
        setPesan({ text: "", type: "" });
      } else if (event === "SIGNED_OUT") {
        sessionStorage.removeItem(KUNCI_RECOVERY);
        setSession(null);
        setStatus("locked");
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Pemeriksaan sesi awal (sekali).
  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (recoveryLinkError || (recoveryLinkRequested && !data.session)) {
          cleanRecoveryUrl();
          setMode("reset");
          kunci("Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan baru.", "error");
        } else if (
          data.session &&
          (recoveryLinkRequested || recoveryRef.current || sessionStorage.getItem(KUNCI_RECOVERY) === "1")
        ) {
          recoveryRef.current = true;
          sessionStorage.setItem(KUNCI_RECOVERY, "1");
          setMode("recovery");
          kunci();
        } else if (data.session) {
          await aktifkanSesi(data.session);
        } else {
          kunci();
        }
      } catch {
        kunci("Sesi tidak dapat diperiksa. Silakan masuk kembali.", "error");
      }
    })();
  }, [aktifkanSesi, kunci]);

  const signIn = useCallback(
    async (loginId, password) => {
      if (busyRef.current) return;
      const id = String(loginId || "").trim();
      if (!id || String(password || "").length < 8) {
        setMessage("Isi username atau email dan password minimal 8 karakter.", "error");
        return;
      }

      setBusy(true);
      setMessage("Sedang masuk...", "loading");
      try {
        let nextSession;

        if (id.includes("@")) {
          const { data, error } = await supabase.auth.signInWithPassword({ email: id, password });
          if (error) {
            setMessage("Gagal masuk: " + error.message, "error");
            return;
          }
          nextSession = data.session;
        } else {
          const { data, error } = await supabase.functions.invoke("login-username", {
            body: { username: id, password }
          });
          if (error) {
            const code = error.context?.status;
            setMessage(
              code === 429
                ? "Terlalu banyak percobaan. Coba lagi dalam 15 menit."
                : code === 401
                  ? "Username atau password salah."
                  : "Login server belum bisa diproses. Coba lagi.",
              "error"
            );
            return;
          }
          const { data: authData, error: sessionError } = await supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token
          });
          if (sessionError) {
            setMessage("Gagal memulai sesi. Coba lagi.", "error");
            return;
          }
          nextSession = authData.session;
        }

        await aktifkanSesi(nextSession);
      } catch {
        setMessage("Login belum dapat diproses. Periksa koneksi dan coba lagi.", "error");
      } finally {
        setBusy(false);
      }
    },
    [aktifkanSesi, setBusy, setMessage]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setMode("login");
    kunci("Anda telah keluar dari aplikasi.", "success");
  }, [kunci]);

  const requestReset = useCallback(
    async (email) => {
      if (busyRef.current) return;
      const alamat = String(email || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alamat)) {
        setMessage("Masukkan email akun yang valid.", "error");
        return;
      }
      setBusy(true);
      setMessage("Mengirim tautan reset...", "loading");
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(alamat, {
          redirectTo: new URL(window.location.pathname, window.location.origin).href
        });
        if (error) throw error;
        setMessage("Jika email terdaftar, tautan reset akan dikirim. Periksa kotak masuk dan folder spam.", "success");
      } catch (error) {
        setMessage(
          error?.status === 429 || /rate_limit/.test(error?.code || "")
            ? "Terlalu banyak permintaan. Tunggu beberapa saat sebelum mencoba lagi."
            : "Tautan reset belum dapat dikirim. Coba lagi nanti.",
          "error"
        );
      } finally {
        setBusy(false);
      }
    },
    [setBusy, setMessage]
  );

  const saveRecovered = useCallback(
    async (password, konfirmasi) => {
      if (busyRef.current) return false;
      const galat = validasiPasswordBaru(password, konfirmasi);
      if (galat) {
        setMessage(galat, "error");
        return false;
      }
      setBusy(true);
      setMessage("Menyimpan password baru...", "loading");
      let diperbarui = false;
      try {
        if (!recoveryRef.current) throw new Error("Missing recovery session");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        diperbarui = true;
        const { error: keluarError } = await supabase.auth.signOut({ scope: "global" });
        if (keluarError) throw keluarError;
        recoveryRef.current = false;
        sessionStorage.removeItem(KUNCI_RECOVERY);
        cleanRecoveryUrl();
      } catch (error) {
        setMessage(
          diperbarui ? "Password sudah diperbarui. Kembali ke login untuk menutup sesi ini." : pesanGalatPassword(error),
          diperbarui ? "success" : "error"
        );
      } finally {
        setBusy(false);
      }
      if (diperbarui && !recoveryRef.current) {
        setMode("login");
        setMessage("Password berhasil diperbarui. Silakan masuk dengan password baru.", "success");
        return true;
      }
      return false;
    },
    [setBusy, setMessage]
  );

  const returnToSignIn = useCallback(async () => {
    if (busyRef.current) return;
    if (recoveryRef.current) {
      setBusy(true);
      try {
        const { error } = await supabase.auth.signOut({ scope: "local" });
        if (error) throw error;
        recoveryRef.current = false;
        sessionStorage.removeItem(KUNCI_RECOVERY);
      } catch {
        setMessage("Sesi belum dapat ditutup. Coba kembali.", "error");
        return;
      } finally {
        setBusy(false);
      }
    }
    cleanRecoveryUrl();
    setMode("login");
    setMessage("");
  }, [setBusy, setMessage]);

  /** Ganti password dari dalam aplikasi. Mengembalikan { type: "success" | "error", message }. */
  const changePassword = useCallback(async (lama, baru, konfirmasi) => {
    if (!lama) return { type: "error", message: "Isi password lama terlebih dahulu." };
    const galat = validasiPasswordBaru(baru, konfirmasi, lama);
    if (galat) return { type: "error", message: galat };

    let verifier;
    try {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !data.user?.email) throw userError || new Error("Missing account");

      // Sesi terpisah memverifikasi password lama tanpa menimpa penyimpanan sesi aplikasi.
      verifier = createVerifierClient();
      const { data: verified, error: verifyError } = await verifier.auth.signInWithPassword({
        email: data.user.email,
        password: lama
      });
      if (verifyError) throw verifyError;
      if (verified.user?.id !== data.user.id) throw new Error("Account mismatch");

      const { error } = await supabase.auth.updateUser({ password: baru, current_password: lama });
      if (error) throw error;
      return { type: "success", message: "Password berhasil diperbarui." };
    } catch (error) {
      return { type: "error", message: pesanGalatPassword(error) };
    } finally {
      if (verifier) {
        try {
          await verifier.auth.signOut({ scope: "local" });
        } catch {
          /* Tidak ada sesi tersimpan. */
        }
      }
    }
  }, []);

  const value = useMemo(
    () => ({
      status,
      mode,
      message: pesan,
      busy,
      session,
      user: session?.user || null,
      goMode,
      signIn,
      signOut,
      requestReset,
      saveRecovered,
      returnToSignIn,
      changePassword
    }),
    [status, mode, pesan, busy, session, goMode, signIn, signOut, requestReset, saveRecovered, returnToSignIn, changePassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth harus dipakai di dalam <AuthProvider>");
  return context;
}
