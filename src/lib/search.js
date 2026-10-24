/** Normalisasi untuk pencarian: tanpa aksen, huruf kecil, dipangkas. */
export function normalizeSearchValue(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("id-ID")
    .trim();
}

/**
 * Skor relevansi (semakin kecil semakin relevan):
 * 0 brand sama persis, 1 brand diawali, 2 nama sama persis, 3 nama diawali,
 * 4 kata brand diawali, 5 kata nama diawali, 6 brand memuat, 7 nama memuat.
 */
export function getBarangSearchScore(barang, keyword) {
  const query = normalizeSearchValue(keyword);
  if (!query) return 0;

  const nama = normalizeSearchValue(barang?.nama);
  const brand = normalizeSearchValue(barang?.brand?.nama);
  const namaWords = nama.split(/[\s\-_/]+/);
  const brandWords = brand.split(/[\s\-_/]+/);

  if (brand === query) return 0;
  if (brand.startsWith(query)) return 1;
  if (nama === query) return 2;
  if (nama.startsWith(query)) return 3;
  if (brandWords.some((word) => word.startsWith(query))) return 4;
  if (namaWords.some((word) => word.startsWith(query))) return 5;
  if (brand.includes(query)) return 6;
  if (nama.includes(query)) return 7;
  return Number.POSITIVE_INFINITY;
}

export function compareBarangSearchResults(a, b, keyword) {
  const selisih = getBarangSearchScore(a, keyword) - getBarangSearchScore(b, keyword);
  if (selisih !== 0) return selisih;

  const brand = String(a?.brand?.nama || "").localeCompare(String(b?.brand?.nama || ""), "id", {
    sensitivity: "base"
  });
  if (brand !== 0) return brand;

  return String(a?.nama || "").localeCompare(String(b?.nama || ""), "id", { sensitivity: "base" });
}

/** Menyaring dan mengurutkan barang menurut relevansi kata kunci. Kata kunci kosong -> daftar apa adanya. */
export function cariBarang(daftar, keyword) {
  if (!normalizeSearchValue(keyword)) return daftar;
  return daftar
    .filter((barang) => Number.isFinite(getBarangSearchScore(barang, keyword)))
    .sort((a, b) => compareBarangSearchResults(a, b, keyword));
}
