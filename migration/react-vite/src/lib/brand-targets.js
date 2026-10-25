export function normalizeBrandTargets(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .filter(([name, raw]) => {
        if (typeof name !== "string" || !name.trim()) return false;
        if (typeof raw !== "number" && typeof raw !== "string") return false;
        if (typeof raw === "string" && raw.trim() === "") return false;
        const amount = Number(raw);
        return Number.isFinite(amount) && amount >= 0;
      })
      .map(([name, raw]) => [name, Number(raw)])
  );
}
