/** Match stock history rows by the related item name, brand, or transaction type. */
export function matchesStockTransactionSearch(row, good, normalizedTerm) {
  if (!normalizedTerm) return true;
  return [good?.nama, good?.brand?.nama, row?.type]
    .some((value) => String(value || "").toLocaleLowerCase("id-ID").includes(normalizedTerm));
}
