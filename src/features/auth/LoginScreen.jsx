import { useEffect, useState } from "react";
import { ArrowRight, KeyRound, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { Button, Field, Input, PasswordInput } from "../../components/ui/index.js";
import { cn } from "../../lib/cn.js";

const COPY = {
  login: {
    title: "Masuk ke akun",
    description: "Kelola stok dan transaksi dalam satu tempat.",
    submit: "Masuk",
    help: "Akses khusus akun admin yang telah disetujui."
  },
  reset: {
    title: "Lupa password?",
    description: "Kami akan mengirim tautan reset ke email akunmu.",
    submit: "Kirim tautan reset",
    help: "Gunakan email yang terdaftar, meski biasanya masuk dengan username."
  },
  recovery: {
    title: "Buat password baru",
    description: "Atur password baru untuk akun Dhouse kamu.",
    submit: "Simpan password baru",
    help: "Akses khusus akun admin yang telah disetujui."
  }
};

const WARNA_STATUS = {
  error: "bg-danger-soft text-danger",
  success: "bg-success-soft text-success",
  loading: "bg-primary-soft text-fg-soft",
  "": "bg-primary-soft text-fg-soft"
};

export function LoginScreen() {
  const { mode, message, busy, goMode, signIn, requestReset, saveRecovered, returnToSignIn } = useAuth();
  const copy = COPY[mode] || COPY.login;

  const [loginId, setLoginId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");

  // Bersihkan isian sensitif setiap berpindah mode.
  useEffect(() => {
    setPassword("");
    setKonfirmasi("");
  }, [mode]);

  async function kirim(event) {
    event.preventDefault();
    if (busy) return;
    if (mode === "login") {
      await signIn(loginId, password);
      setPassword("");
    } else if (mode === "reset") {
      await requestReset(email);
    } else if (mode === "recovery") {
      const berhasil = await saveRecovered(password, konfirmasi);
      if (berhasil) {
        setPassword("");
        setKonfirmasi("");
      }
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-[420px] rounded-2xl border border-border bg-surface p-6 shadow-card sm:p-8">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="" width="48" height="48" className="size-12 rounded-xl object-contain" />
          <div className="leading-tight">
            <strong className="block text-lg font-extrabold text-fg">Dhouse</strong>
            <span className="text-sm text-muted">Stok &amp; penjualan</span>
          </div>
        </div>

        <div className="mt-6">
          <h1 className="text-2xl font-extrabold text-fg">{copy.title}</h1>
          <p className="mt-1 text-sm text-muted">{copy.description}</p>
        </div>

        <form onSubmit={kirim} className="mt-6 flex flex-col gap-4" noValidate>
          {mode === "login" ? (
            <>
              <Field label="Username atau email">
                {({ id }) => (
                  <Input
                    id={id}
                    value={loginId}
                    onChange={(event) => setLoginId(event.target.value)}
                    autoComplete="username"
                    placeholder="Masukkan username atau email"
                    required
                  />
                )}
              </Field>
              <Field label="Password">
                {({ id }) => (
                  <PasswordInput
                    id={id}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    placeholder="Masukkan password"
                    minLength={8}
                    required
                  />
                )}
              </Field>
              <div className="-mt-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => goMode("reset")}
                  disabled={busy}
                  className="text-sm font-semibold text-primary hover:underline disabled:opacity-50"
                >
                  Lupa password?
                </button>
              </div>
            </>
          ) : null}

          {mode === "reset" ? (
            <Field label="Email akun">
              {({ id }) => (
                <Input
                  id={id}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="Masukkan email akun admin"
                  required
                />
              )}
            </Field>
          ) : null}

          {mode === "recovery" ? (
            <>
              <Field label="Password baru">
                {({ id }) => (
                  <PasswordInput
                    id={id}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    placeholder="Minimal 8 karakter"
                    minLength={8}
                    required
                  />
                )}
              </Field>
              <Field label="Konfirmasi password baru">
                {({ id }) => (
                  <PasswordInput
                    id={id}
                    value={konfirmasi}
                    onChange={(event) => setKonfirmasi(event.target.value)}
                    autoComplete="new-password"
                    placeholder="Ulangi password baru"
                    minLength={8}
                    required
                  />
                )}
              </Field>
            </>
          ) : null}

          <div
            role="status"
            aria-live="polite"
            className={cn(
              "min-h-0 rounded-lg px-3 py-2 text-sm font-medium",
              message.text ? WARNA_STATUS[message.type] || WARNA_STATUS[""] : "hidden"
            )}
          >
            {message.text}
          </div>

          <Button type="submit" size="lg" disabled={busy} aria-busy={busy} className="w-full">
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            <span>{copy.submit}</span>
            {mode === "recovery" ? (
              <KeyRound className="size-4" aria-hidden="true" />
            ) : (
              <ArrowRight className="size-4" aria-hidden="true" />
            )}
          </Button>

          {mode !== "login" ? (
            <Button type="button" variant="ghost" disabled={busy} onClick={returnToSignIn} className="w-full">
              Kembali ke login
            </Button>
          ) : null}
        </form>

        <p className="mt-5 text-center text-xs text-muted">{copy.help}</p>
      </div>
    </div>
  );
}
