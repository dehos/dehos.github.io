/**
 * Return a stable, bounded page window without mutating the input collection.
 * Page numbers are 1-based; empty collections still report page 1 of 1.
 */
export function paginateItems(items, requestedPage = 1, pageSize = 25) {
  const rows = Array.isArray(items) ? items : [];
  const size = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 25;
  const pageCount = Math.max(1, Math.ceil(rows.length / size));
  const numericPage = Number.isFinite(Number(requestedPage)) ? Math.trunc(Number(requestedPage)) : 1;
  const page = Math.min(pageCount, Math.max(1, numericPage));
  const offset = (page - 1) * size;
  return {
    items: rows.slice(offset, offset + size),
    page,
    pageCount,
    pageSize: size,
    total: rows.length,
    start: rows.length ? offset + 1 : 0,
    end: Math.min(offset + size, rows.length),
  };
}
