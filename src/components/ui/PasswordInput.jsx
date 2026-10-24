import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "../../lib/cn.js";
import { inputClass } from "./Input.jsx";

/** Input password dengan tombol tampilkan/sembunyikan. */
export function PasswordInput({ className, ...props }) {
  const [terlihat, setTerlihat] = useState(false);
  return (
    <div className="relative">
      <input type={terlihat ? "text" : "password"} className={cn(inputClass, "pr-11", className)} {...props} />
      <button
        type="button"
        onClick={() => setTerlihat((sekarang) => !sekarang)}
        aria-pressed={terlihat}
        aria-label={terlihat ? "Sembunyikan password" : "Tampilkan password"}
        className="absolute right-1 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:bg-primary-soft hover:text-primary"
      >
        {terlihat ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
      </button>
    </div>
  );
}
