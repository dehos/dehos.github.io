import { useEffect, useRef, useState } from "react";
import { LogIn, LogOut, ShieldCheck, AlertTriangle, RefreshCw } from "lucide-react";
import { supabase, isSupabaseConfigured } from "./lib/supabase.js";
import { hasMatchingAdminIdentity } from "./lib/admin-identity.js";

const initialState = { status: "checking", message: "" };

function AuthPanel({ children }) {
  return <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
    <section className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      {children}
    </section>
  </main>;
}

export default function AuthGate({ children }) {
  const [auth, setAuth] = useState(initialState);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const verificationId = useRef(0);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuth({ status: "config", message: "Koneksi Supabase belum dikonfigurasi untuk lingkungan migrasi ini." });
      return undefined;
    }

    let active = true;
    const verifySession = async (session) => {
      const id = ++verificationId.current;
      if (!session) {
        if (active) setAuth({ status: "signedOut", message: "" });
        return;
      }

      if (active) setAuth({ status: "checking", message: "Memeriksa hak akses admin..." });
      try {
        // A session alone is not proof that this specific user is an admin.
        // Fail closed when the session has no email that can be checked.
        const sessionEmail = session.user?.email?.trim();
        if (!sessionEmail) {
          await supabase.auth.signOut();
          if (active && id === verificationId.current) {
            setAuth({
              status: "denied",
              message: "Email akun tidak tersedia untuk verifikasi admin. Akses ditolak.",
            });
          }
          return;
        }

        const { data, error } = await supabase
          .from("app_admins")
          .select("email")
          .eq("email", sessionEmail)
          .limit(1);

        if (!active || id !== verificationId.current) return;
        if (!hasMatchingAdminIdentity(sessionEmail, data, error)) {
          await supabase.auth.signOut();
          if (active) setAuth({
            status: "denied",
            message: "Akun ini tidak memiliki izin admin, atau izin admin tidak dapat diverifikasi. Akses ditolak.",
          });
          return;
        }
        setAuth({ status: "ready", message: "" });
      } catch {
        if (active && id === verificationId.current) {
          setAuth({ status: "error", message: "Hak akses admin gagal diverifikasi. Periksa koneksi dan coba lagi." });
        }
      }
    };

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        verificationId.current += 1;
        if (active) setAuth({ status: "signedOut", message: "" });
        return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION" || event === "USER_UPDATED") {
        // Defer Supabase queries outside the auth callback to avoid locking the auth client.
        queueMicrotask(() => { if (active) void verifySession(session); });
      }
    });

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        return verifySession(data.session);
      })
      .catch(() => {
        if (active) setAuth({ status: "error", message: "Sesi tidak dapat diperiksa. Periksa koneksi lalu coba lagi." });
      });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [refreshKey]);

  async function handleSignIn(event) {
    event.preventDefault();
    if (!supabase || busy) return;
    const identifier = loginId.trim();
    if (!identifier || password.length < 8) {
      setAuth({ status: "signedOut", message: "Isi username/email dan password minimal 8 karakter." });
      return;
    }

    setBusy(true);
    setAuth({ status: "checking", message: "Sedang masuk..." });
    try {
      if (identifier.includes("@")) {
        const { error } = await supabase.auth.signInWithPassword({ email: identifier, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.functions.invoke("login-username", {
          body: { username: identifier, password },
        });
        if (error) {
          const status = error.context?.status;
          setAuth({
            status: "signedOut",
            message: status === 429
              ? "Terlalu banyak percobaan. Coba lagi dalam 15 menit."
              : status === 401
                ? "Username atau password salah."
                : "Login server belum bisa diproses. Coba lagi.",
          });
          return;
        }
        if (!data?.access_token || !data?.refresh_token) {
          setAuth({ status: "signedOut", message: "Respons login tidak lengkap. Akses ditolak." });
          return;
        }
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        if (sessionError) throw sessionError;
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        setAuth({ status: "error", message: "Sesi login tidak berhasil dibuat." });
        return;
      }
      setRefreshKey((key) => key + 1);
    } catch {
      setAuth({ status: "signedOut", message: "Login gagal. Periksa kredensial dan koneksi, lalu coba lagi." });
    } finally {
      setPassword("");
      setBusy(false);
    }
  }

  async function handleSignOut() {
    if (!supabase || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setAuth({ status: "signedOut", message: "Anda telah keluar dari aplikasi." });
    } catch {
      setAuth({ status: "error", message: "Logout gagal. Coba lagi." });
    } finally {
      setBusy(false);
    }
  }

  if (auth.status === "ready") {
    return <div>
      <div className="flex items-center justify-end gap-3 border-b border-slate-200 bg-white px-4 py-2 text-sm sm:px-6">
        <span className="inline-flex items-center gap-2 text-slate-600"><ShieldCheck size={16} />Admin terverifikasi</span>
        <button type="button" onClick={handleSignOut} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-60">
          <LogOut size={15} />Keluar
        </button>
      </div>
      {children}
    </div>;
  }

  if (auth.status === "checking") {
    return <AuthPanel><div className="flex items-center gap-3 text-sm text-slate-600"><RefreshCw size={18} className="animate-spin" />{auth.message || "Memeriksa sesi..."}</div></AuthPanel>;
  }

  return <AuthPanel>
    <div className="mb-6 flex items-center gap-3">
      <div className="rounded-xl bg-slate-900 p-3 text-white"><ShieldCheck size={24} /></div>
      <div><p className="text-lg font-semibold tracking-tight">DEHOS</p><p className="text-sm text-slate-500">Login admin · migrasi React</p></div>
    </div>
    {auth.status === "config" ? <div role="alert" className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle size={18} className="shrink-0" />{auth.message} Tidak ada data aplikasi yang ditampilkan.</div> : <>
      {auth.message && <p role={auth.status === "error" || auth.status === "denied" ? "alert" : "status"} className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{auth.message}</p>}
      {auth.status === "error" && <button type="button" onClick={() => setRefreshKey((key) => key + 1)} className="mb-4 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium">Periksa sesi lagi</button>}
      <form onSubmit={handleSignIn} className="space-y-4">
        <div><label htmlFor="dehos-login-id" className="mb-1.5 block text-sm font-medium">Username atau email</label><input id="dehos-login-id" name="username" autoComplete="username" required value={loginId} onChange={(event) => setLoginId(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" /></div>
        <div><label htmlFor="dehos-login-password" className="mb-1.5 block text-sm font-medium">Password</label><input id="dehos-login-password" name="password" type="password" autoComplete="current-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" /></div>
        <button type="submit" disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"><LogIn size={17} />{busy ? "Memproses..." : "Masuk"}</button>
      </form>
      <p className="mt-5 text-xs leading-relaxed text-slate-500">Akses hanya diberikan kepada sesi yang lolos pemeriksaan tabel admin. Username menggunakan mekanisme login-username yang sama dengan aplikasi lama.</p>
    </>}
  </AuthPanel>;
}
