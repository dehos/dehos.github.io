const FORMULA_PREFIX = /^[\\t\\r\\n ]*[=+\\-@]/;

/**
 * Serialize rows as UTF-8-friendly CSV while neutralizing spreadsheet formulas
 * in untrusted text cells. Numeric values remain numeric, including negatives.
 */
export function serializeCsv(rows) {
  const lines = rows.map((row) => row.map((value) => {
    let text = String(value ?? "");
    if (typeof value === "string" && FORMULA_PREFIX.test(text)) {
      text = "'" + text;
    }
    return '"' + text.replace(/"/g, '""') + '"';
  }).join(","));
  return "\uFEFF" + lines.join("\r\n");
}
