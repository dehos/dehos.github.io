import { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { formatKetikTanggal, formatTanggalTampilan, parseTanggalTampilan } from "../../lib/date.js";
import { cn } from "../../lib/cn.js";
import { inputClass } from "./Input.jsx";

/*
 * Input tanggal berformat dd/mm/yyyy dengan kalender bawaan perangkat.
 *   <DateField value="2026-10-24" onChange={(iso) => ...} />
 * - value / onChange memakai "yyyy-mm-dd"; onChange("") bila teks belum valid.
 * - pickerOnly: teks hanya-baca, klik membuka kalender (dipakai pada dialog export).
 * - min / max: batas "yyyy-mm-dd" untuk kalender bawaan.
 */
export function DateField({
  value = "",
  onChange,
  id,
  placeholder = "dd/mm/yyyy",
  pickerOnly = false,
  required = false,
  disabled = false,
  min,
  max,
  className,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  pickerLabel = "Buka kalender"
}) {
  const [draft, setDraft] = useState(formatTanggalTampilan(value));
  const [disentuh, setDisentuh] = useState(false);
  const nativeRef = useRef(null);

  // Sinkronkan dari luar hanya bila nilai benar-benar berubah (bukan saat pengguna sedang mengetik).
  useEffect(() => {
    setDraft((sekarang) =>
      parseTanggalTampilan(sekarang) === (value || "") ? sekarang : formatTanggalTampilan(value)
    );
  }, [value]);

  const tidakValid = disentuh && draft !== "" && parseTanggalTampilan(draft) === "";

  function bukaKalender() {
    const native = nativeRef.current;
    if (!native || disabled) return;
    if (typeof native.showPicker === "function") {
      try {
        native.showPicker();
        return;
      } catch {
        /* jatuh ke click() */
      }
    }
    native.click();
  }

  function ubahKetikan(event) {
    const teks = formatKetikTanggal(event.target.value);
    setDraft(teks);
    onChange?.(parseTanggalTampilan(teks));
  }

  return (
    <div className={cn("relative", className)}>
      <input
        id={id}
        type="text"
        inputMode={pickerOnly ? undefined : "numeric"}
        autoComplete="off"
        maxLength={10}
        value={draft}
        placeholder={pickerOnly ? "Pilih tanggal" : placeholder}
        readOnly={pickerOnly}
        required={required}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-haspopup={pickerOnly ? "dialog" : undefined}
        aria-invalid={tidakValid || undefined}
        onChange={pickerOnly ? undefined : ubahKetikan}
        onBlur={() => setDisentuh(true)}
        onClick={pickerOnly ? bukaKalender : undefined}
        onKeyDown={
          pickerOnly
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  bukaKalender();
                }
              }
            : undefined
        }
        className={cn(inputClass, "pr-10", pickerOnly && "cursor-pointer")}
      />
      <input
        ref={nativeRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value || ""}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(event) => {
          setDraft(formatTanggalTampilan(event.target.value));
          onChange?.(event.target.value);
        }}
        className="pointer-events-none absolute bottom-0 right-0 size-px opacity-0"
      />
      <button
        type="button"
        onClick={bukaKalender}
        disabled={disabled}
        aria-label={pickerLabel}
        title={pickerLabel}
        className="absolute right-1 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:bg-primary-soft hover:text-primary disabled:opacity-50"
      >
        <CalendarDays className="size-4" aria-hidden="true" />
      </button>
      {tidakValid ? (
        <p role="alert" className="mt-1 text-xs font-medium text-danger">
          Gunakan tanggal yang valid dalam format dd/mm/yyyy.
        </p>
      ) : null}
    </div>
  );
}
