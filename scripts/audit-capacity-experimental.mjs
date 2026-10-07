// Find suspicious university labels within the pinned experimental-group snapshot.
// This is a review queue, not an automatic name-merger. Campus-specific rows remain separate.
import { readFileSync } from "node:fs";
import { normalizeUniversity, recordUniversity } from "../public/capacity/model.js";

const root = "public/capacity/data";
const catalog = JSON.parse(readFileSync(`${root}/catalog.json`, "utf8"));
const experimental = catalog.groups.find((group) => group.id === "experimental");
if (!experimental) throw new Error("Experimental group not found");

const suspiciousFormat = /[()]{2}|(?:دانشگاه|دانشکده)\)|\)\(|\)\S|\(\s*محل تحصیل[^)]*$/u;
const stem = (name) => name
  .replace(/\s*\(محل تحصیل.*$/u, "")
  .replace(/\s+-\s+(?:تهران|همدان|کرج|بندرعباس|رشت|ساری|شیراز|قزوین|تبریز)$/u, "")
  .trim();

const report = {
  sourceCommit: catalog.source.commit,
  snapshotId: catalog.snapshotId,
  group: "experimental",
  majors: experimental.majors.length,
  rows: 0,
  flaggedFormats: [],
  reviewOnlyPairs: [],
};

for (const major of experimental.majors) {
  const shard = JSON.parse(readFileSync(`${root}/${major.path}`, "utf8"));
  const grouped = new Map();
  report.rows += shard.records.length;
  for (const record of shard.records) {
    const university = recordUniversity(record);
    if (!grouped.has(university)) grouped.set(university, { years: new Set(), samples: new Set() });
    const entry = grouped.get(university);
    entry.years.add(record.year);
    entry.samples.add(record.university);
  }
  for (const [name, entry] of grouped) {
    if (suspiciousFormat.test(name)) report.flaggedFormats.push({
      major: major.label, name, years: [...entry.years].sort(),
      originalNames: [...entry.samples].slice(0, 3),
    });
    if (entry.years.size !== 1 || !entry.years.has(1405)) continue;
    const similarOlder = [...grouped].filter(([older, value]) =>
      older !== name && value.years.has(1404) && stem(older) === stem(name)).map(([older]) => older);
    if (similarOlder.length) report.reviewOnlyPairs.push({
      major: major.label, current: name, older: similarOlder,
      reason: name.includes("محل تحصیل")
        ? "Named campus or training center; do not merge without booklet evidence"
        : "Same main-institution stem; check historical campus and code",
    });
  }
}
report.flaggedFormats.sort((a, b) => a.major.localeCompare(b.major, "fa"));
report.reviewOnlyPairs.sort((a, b) => a.major.localeCompare(b.major, "fa"));
if (process.argv.includes("--json")) {
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
} else {
  console.log(`Experimental capacity snapshot ${report.snapshotId}: ${report.rows} records, ${report.majors} majors`);
  console.log(`Remaining suspicious university labels: ${report.flaggedFormats.length}`);
  console.log(`One-year campus/name review candidates: ${report.reviewOnlyPairs.length}`);
  for (const entry of report.flaggedFormats) console.log(`  [${entry.major}] ${entry.name}`);
  console.log("Use --json for complete review queue and years; no data has been modified.");
}
