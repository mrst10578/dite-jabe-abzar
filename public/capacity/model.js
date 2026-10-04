const collator = new Intl.Collator("fa", { sensitivity: "base", numeric: true });
export const YEARS = [1404, 1403, 1402, 1401];
export const GROUPS = [
  { id: "experimental", label: "تجربی" },
  { id: "math", label: "ریاضی" },
  { id: "humanities", label: "انسانی" },
];

export function normalizePersian(value) {
  return String(value).normalize("NFKC").replace(/ي/g, "ی").replace(/ك/g, "ک")
    .replace(/[\u200c\u200e\u200f]/g, " ").replace(/\s+/g, " ").trim();
}
export function compareLabels(left, right) { return collator.compare(left, right); }

export function capacityTotals(records, universities) {
  const selected = new Set(universities);
  const result = new Map([...selected].sort(compareLabels).map((university) => [university, {
    university, years: Object.fromEntries(YEARS.map((year) => [year, null])),
  }]));
  for (const record of records) {
    const target = result.get(record.university);
    if (target && YEARS.includes(record.year)) {
      target.years[record.year] = (target.years[record.year] ?? 0) + record.capacity;
    }
  }
  return [...result.values()];
}

export function bookletGroup(sourceId) {
  if (sourceId.includes("humanities")) return "humanities";
  if (sourceId.includes("math")) return "math";
  if (/^140[1-4]-booklet$/.test(sourceId)) return "experimental";
  return null;
}
