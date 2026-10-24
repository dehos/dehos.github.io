import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { Button, Field, Modal, PasswordInput } from "../../components/ui/index.js";
import { cn } from "../../lib/cn.js";

export function PasswordDialog({ open, onOpenChange }) {
  const { changePassword } = useAuth();
  const [lama, setLama] = useState("");
  const [baru, setBaru] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ text: "", type: "" });

  useEffect(() => {
    if (!open) {
      setLama("");
      setBaru("");
      setKonfirmasi("");
      setStatus({ text: "", type: "" });
    }
  }, [open]);

  async function simpan() {
    if (busy) return;
    setBusy(true);
    setStatus({ text: "Menyimpan password...", type: "loading" });
    const hasil = await changePassword(lama, baru, konfirmasi);
    setStatus({ text: hasil.message, type: hasil.type });
    if (hasil.type === "success") {
      setLama("");
      setBaru("");
      setKonfirmasi("");
    }
    setBusy(false);
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Ganti password"
      description="Gunakan password baru minimal 8 karakter."
      icon={KeyRound}
      busy={busy}
      onSubmit={simpan}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            Tutup
          </Button>
          <Button type="submit" loading={busy}>
            Simpan password
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Password lama">
          {({ id }) => (
            <PasswordInput
              id={id}
              value={lama}
              onChange={(event) => setLama(event.target.value)}
              autoComplete="current-password"
              placeholder="Masukkan password lama"
              required
            />
          )}
        </Field>
        <Field label="Password baru">
          {({ id }) => (
            <PasswordInput
              id={id}
              value={baru}
              onChange={(event) => setBaru(event.target.value)}
              autoComplete="new-password"
              placeholder="Minimal 8 karakter"
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
              required
            />
          )}
        </Field>
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-medium",
            !status.text && "hidden",
            status.type === "error" && "bg-danger-soft text-danger",
            status.type === "success" && "bg-success-soft text-success",
            status.type === "loading" && "bg-primary-soft text-fg-soft"
          )}
        >
          {status.text}
        </div>
      </div>
    </Modal>
  );
}
