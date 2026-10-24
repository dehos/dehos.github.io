import { useEffect, useState } from "react";
import { useData } from "../context/DataContext.jsx";

/**
 * Dipanggil oleh halaman yang memakai data inti. Memuat ulang barang + transaksi saat halaman dibuka
 * dan setiap kali tab kembali terlihat. Mengembalikan { loading, error }.
 */
export function useCoreData() {
  const { refreshCore, refreshTick, coreLoaded } = useData();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!coreLoaded);

  useEffect(() => {
    let batal = false;
    setLoading((sudah) => sudah || !coreLoaded);
    refreshCore()
      .then(() => !batal && setError(null))
      .catch((galat) => !batal && setError(galat))
      .finally(() => !batal && setLoading(false));
    return () => {
      batal = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick]);

  return { loading: loading && !coreLoaded, error };
}
