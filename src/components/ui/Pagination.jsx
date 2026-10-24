import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn.js";

/** Nomor halaman yang ditampilkan: jendela `lebar` tombol di sekitar halaman aktif. */
export function hitungJendelaHalaman(halaman, jumlahHalaman, lebar = 5) {
  const total = Math.max(1, jumlahHalaman);
  const ukuran = Math.min(lebar, total);
  let awal = Math.max(1, halaman - Math.floor(ukuran / 2));
  let akhir = awal + ukuran - 1;
  if (akhir > total) {
    akhir = total;
    awal = Math.max(1, akhir - ukuran + 1);
  }
  const hasil = [];
  for (let nomor = awal; nomor <= akhir; nomor += 1) hasil.push(nomor);
  return hasil;
}

export function Pagination({ page, pageCount, onPageChange, windowSize = 5, className }) {
  if (pageCount <= 1) return null;
  const dasar =
    "inline-flex size-9 items-center justify-center rounded-lg text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40";
  return (
    <nav aria-label="Navigasi halaman" className={cn("flex items-center justify-center gap-1", className)}>
      <button
        type="button"
        className={cn(dasar, "text-fg-soft hover:bg-primary-soft")}
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Halaman sebelumnya"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>
      {hitungJendelaHalaman(page, pageCount, windowSize).map((nomor) => (
        <button
          key={nomor}
          type="button"
          onClick={() => onPageChange(nomor)}
          aria-current={nomor === page ? "page" : undefined}
          aria-label={`Halaman ${nomor}`}
          className={cn(
            dasar,
            nomor === page ? "bg-primary text-primary-fg shadow-sm" : "text-fg-soft hover:bg-primary-soft"
          )}
        >
          {nomor}
        </button>
      ))}
      <button
        type="button"
        className={cn(dasar, "text-fg-soft hover:bg-primary-soft")}
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="Halaman berikutnya"
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
