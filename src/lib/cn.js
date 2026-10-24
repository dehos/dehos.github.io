/** Menggabungkan nama class, membuang nilai falsy. Contoh: cn("a", cond && "b", ["c"]) */
export function cn(...parts) {
  return parts.flat(Infinity).filter(Boolean).join(" ");
}
