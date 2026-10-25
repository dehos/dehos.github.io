export function calculateStockBalance(item, transactions, date) {
  const startDate = String(item.tanggal_mulai || item.created_at || "").slice(0, 10);
  let balance = !startDate || startDate <= date ? Number(item.stok_awal) || 0 : 0;
  for (const row of transactions) {
    if (Number(row.barang_id) !== Number(item.id) || String(row.tanggal || "").slice(0, 10) > date) continue;
    const qty = Number(row.qty) || 0;
    if (row.type === "masuk" || row.type === "adjust_masuk") balance += qty;
    else if (row.type === "laku" || row.type === "adjust_keluar") balance -= qty;
    else if (row.type === "adjust") balance += qty;
  }
  return balance;
}
