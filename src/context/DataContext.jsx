import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase, fetchAllRows } from "../lib/supabase.js";
import { formatNumber } from "../lib/format.js";
import { indexTransaksi } from "../lib/stock.js";

/*
 * Data inti yang dipakai banyak halaman: barang (beserta brand), transaksi, dan daftar brand aktif.
 *
 *   const { barang, transaksi, transaksiIndex, brands, refreshCore, dbStatus, refreshTick } = useData();
 *
 * - refreshCore(): muat ulang barang + transaksi (permintaan bersamaan digabung jadi satu). Melempar galat bila gagal.
 * - loadBrands(): muat ulang brand aktif.
 * - refreshTick: angka yang naik setiap kali tab kembali terlihat; halaman yang memuat data sendiri
 *   (dashboard, catatan penjualan) memakainya sebagai pemicu muat ulang.
 * - dbStatus / setDbStatus: teks status koneksi di bilah atas.
 */

const DataContext = createContext(null);

const SELECT_BARANG =
  "id, nama, stok_awal, created_at, tanggal_mulai, brand_id, brand:brand!barang_brand_id_fkey(id, nama, aktif)";

async function fetchBarang() {
  return fetchAllRows(() =>
    supabase
      .from("barang")
      .select(SELECT_BARANG)
      .order("nama", { ascending: true })
      .order("id", { ascending: true })
  );
}

async function fetchTransaksi() {
  return fetchAllRows(() =>
    supabase
      .from("transaksi")
      .select("*")
      .order("tanggal", { ascending: true })
      .order("id", { ascending: true })
  );
}

async function fetchBrands() {
  const { data, error } = await supabase
    .from("brand")
    .select("id, nama")
    .eq("aktif", true)
    .order("nama", { ascending: true });
  if (error) throw error;
  return data || [];
}

export function DataProvider({ children }) {
  const [barang, setBarang] = useState([]);
  const [transaksi, setTransaksi] = useState([]);
  const [brands, setBrands] = useState([]);
  const [coreLoaded, setCoreLoaded] = useState(false);
  const [dbStatus, setDbStatusState] = useState({ message: "Menghubungkan ke database...", type: "" });
  const [refreshTick, setRefreshTick] = useState(0);

  const refreshPromise = useRef(null);
  const brandPromise = useRef(null);
  const aktif = useRef(true);

  useEffect(() => {
    aktif.current = true;
    return () => {
      aktif.current = false;
    };
  }, []);

  const setDbStatus = useCallback((message, type = "") => setDbStatusState({ message, type }), []);

  const loadBrands = useCallback(() => {
    if (brandPromise.current) return brandPromise.current;
    brandPromise.current = fetchBrands()
      .then((hasil) => {
        if (aktif.current) setBrands(hasil);
        return hasil;
      })
      .finally(() => {
        brandPromise.current = null;
      });
    return brandPromise.current;
  }, []);

  const refreshCore = useCallback(() => {
    if (refreshPromise.current) return refreshPromise.current;

    setDbStatus("Mengambil data barang...");
    refreshPromise.current = Promise.all([fetchBarang(), fetchTransaksi(), fetchBrands()])
      .then(([daftarBarang, daftarTransaksi, daftarBrand]) => {
        if (!aktif.current) return;
        setBarang(daftarBarang);
        setTransaksi(daftarTransaksi);
        setBrands(daftarBrand);
        setCoreLoaded(true);
        setDbStatus(`Database aktif · ${formatNumber(daftarBarang.length)} barang`, "success");
      })
      .catch((error) => {
        console.error("ERROR LOAD DATA INTI:", error);
        if (aktif.current) setDbStatus("Gagal mengambil data: " + (error?.message || "periksa koneksi"), "error");
        throw new Error("Data stok terbaru gagal dimuat. Coba lagi.");
      })
      .finally(() => {
        refreshPromise.current = null;
      });
    return refreshPromise.current;
  }, [setDbStatus]);

  // Muat ulang saat tab kembali terlihat (data bisa diubah dari perangkat lain).
  useEffect(() => {
    function onVisible() {
      if (document.hidden) return;
      setRefreshTick((tick) => tick + 1);
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const transaksiIndex = useMemo(() => indexTransaksi(transaksi), [transaksi]);

  const value = useMemo(
    () => ({
      barang,
      transaksi,
      transaksiIndex,
      brands,
      coreLoaded,
      dbStatus,
      setDbStatus,
      refreshCore,
      loadBrands,
      refreshTick
    }),
    [barang, transaksi, transaksiIndex, brands, coreLoaded, dbStatus, setDbStatus, refreshCore, loadBrands, refreshTick]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData harus dipakai di dalam <DataProvider>");
  return context;
}
