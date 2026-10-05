import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { parseCsv } from "./capacity-snapshot.mjs";

const [csvPath, sourceCommit, sourceCommitDate] = process.argv.slice(2);
if (!csvPath || !/^[a-f0-9]{40}$/.test(sourceCommit || "") || !Number.isFinite(Date.parse(sourceCommitDate || ""))) {
  throw new Error("Usage: node scripts/activate-1405-humanities.mjs <csv> <source-commit> <source-date>");
}

const dir = "public/capacity/data";
const csvBytes = await readFile(csvPath);
const incomingSourceRows = parseCsv(csvBytes.toString("utf8"));
const rows1405Humanities = incomingSourceRows.map((row) => ({
  ...row,
  year: Number(row.year),
  capacity: Number(row.capacity),
}));
if (rows1405Humanities.length !== 2513) throw new Error(`Unexpected 1405 humanities row count: ${rows1405Humanities.length}`);
const codes = rows1405Humanities.map((row) => row.notes?.match(/کدرشته[\s\u200c]*محل منبع:\s*(\d+)/)?.[1]);
if (codes.some((code) => !code) || new Set(codes).size !== rows1405Humanities.length) {
  throw new Error("1405 humanities course-location codes are missing or duplicated");
}
const capacity1405Humanities = rows1405Humanities.reduce((sum, row) => sum + row.capacity, 0);
if (capacity1405Humanities !== 23226) throw new Error(`Unexpected 1405 humanities capacity total: ${capacity1405Humanities}`);

const catalog = JSON.parse(await readFile(`${dir}/catalog.json`, "utf8"));
const oldManifest = JSON.parse(await readFile(`${dir}/manifest.json`, "utf8"));
const collator = new Intl.Collator("fa", { sensitivity: "base", numeric: true });
const compare = (a, b) => collator.compare(a, b);

const rowsByMajor = new Map();
for (const row of rows1405Humanities) {
  if (!rowsByMajor.has(row.major)) rowsByMajor.set(row.major, []);
  rowsByMajor.get(row.major).push(row);
}

const humanities = catalog.groups.find((group) => group.id === "humanities");
if (!humanities) throw new Error("Humanities group is missing from catalog");
const supported = new Set(humanities.majors.map((major) => major.label));
const unknown = [...rowsByMajor.keys()].filter((major) => !supported.has(major));
const missing = humanities.majors.map((major) => major.label).filter((major) => !rowsByMajor.has(major));
if (unknown.length || missing.length) {
  throw new Error(`1405 humanities major mismatch; unknown=${unknown.join("|")} missing=${missing.join("|")}`);
}

const source = {
  repository: "mrst10578/Entekhab-Reshte",
  commit: sourceCommit,
  commitDate: sourceCommitDate,
};
const snapshotId = createHash("sha256")
  .update(oldManifest.snapshotId)
  .update(csvBytes)
  .update(source.commit)
  .digest("hex")
  .slice(0, 16);

let added = 0;
let replacedRows = 0;
let replacedCapacity = 0;
for (const group of catalog.groups) {
  for (const major of group.majors) {
    const file = `${dir}/${major.path}`;
    const shard = JSON.parse(await readFile(file, "utf8"));
    if (group.id === "humanities") {
      const incoming = rowsByMajor.get(major.label) ?? [];
      const outgoing = shard.records.filter((row) => row.year === 1405);
      replacedRows += outgoing.length;
      replacedCapacity += outgoing.reduce((sum, row) => sum + Number(row.capacity || 0), 0);
      shard.records = shard.records.filter((row) => row.year !== 1405);
      shard.records.push(...incoming);
      added += incoming.length;
    }
    shard.records.sort((a, b) =>
      b.year - a.year ||
      compare(a.university || "", b.university || "") ||
      (a.capacity ?? 0) - (b.capacity ?? 0)
    );
    shard.snapshotId = snapshotId;
    major.universities = [...new Set(shard.records.map((row) => row.university).filter(Boolean))].sort(compare);
    await writeFile(file, JSON.stringify(shard) + "\n");
  }
}
if (added !== 2513) throw new Error(`Merged only ${added} 1405 humanities rows`);

catalog.snapshotId = snapshotId;
catalog.source = source;
catalog.years = [1405, 1404, 1403, 1402, 1401];
catalog.rows = oldManifest.rows - replacedRows + rows1405Humanities.length;

const existing1405Path = `${dir}/source/1405.csv`;
const existing1405Bytes = await readFile(existing1405Path);
const existing1405Rows = parseCsv(existing1405Bytes.toString("utf8"));
const base1405Rows = existing1405Rows.filter((row) => !String(row.source_id || "").startsWith("1405-humanities"));
if (base1405Rows.length !== 5903) throw new Error(`Unexpected non-humanities 1405 row count: ${base1405Rows.length}`);
const header = existing1405Bytes.toString("utf8").split(/\r?\n/, 1)[0].replace(/^\ufeff/, "");
const fields = header.split(",");
const escapeCsv = (value) => {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
const combinedSourceRows = [...base1405Rows, ...incomingSourceRows];
const combined1405 = header + "\n" + combinedSourceRows.map((row) => fields.map((field) => escapeCsv(row[field])).join(",")).join("\n") + "\n";
const combinedRows = parseCsv(combined1405);
if (combinedRows.length !== 8416) throw new Error(`Unexpected combined 1405 row count: ${combinedRows.length}`);
await writeFile(existing1405Path, combined1405);

const sourcesPath = `${dir}/source/sources.csv`;
let sources = await readFile(sourcesPath, "utf8");
if (!sources.includes("\n1405-humanities-booklet,")) {
  if (!sources.endsWith("\n")) sources += "\n";
  sources += "1405-humanities-booklet,1405,Ensani.pdf,booklet,دفترچه انتخاب رشته گروه علوم انسانی ۱۴۰۵,dc53d8c1f61bfd2f9fcb6d8d1cf97ea134c46aa140e0ed7129c3a9f50b5b2d06,,پیام نور و غیرانتفاعی/غیردولتی در خروجی ابزار وارد نشده‌اند.\n";
  await writeFile(sourcesPath, sources);
}

const summaryPath = `${dir}/source/SUMMARY.json`;
const sourceSummary = JSON.parse(await readFile(summaryPath, "utf8"));
sourceSummary.dataset.years["1405"] = {
  year: 1405,
  rows: 8416,
  capacity: 132198,
  input_files: [
    { path: "capacities-1405-experimental.csv", rows: 3900, capacity: 56662 },
    { path: "capacities-math.csv", rows: 2003, capacity: 52310 },
    { path: "capacities-humanities.csv", rows: 2513, capacity: 23226 },
  ],
  coverage: ["experimental", "math", "humanities"],
  partial: false,
};
sourceSummary.dataset.rows = Object.values(sourceSummary.dataset.years).reduce((sum, item) => sum + Number(item.rows || 0), 0);
sourceSummary.dataset.capacity = Object.values(sourceSummary.dataset.years).reduce((sum, item) => sum + Number(item.capacity || 0), 0);
await writeFile(summaryPath, JSON.stringify(sourceSummary, null, 2) + "\n");

await writeFile(`${dir}/catalog.json`, JSON.stringify(catalog) + "\n");

const old1405 = oldManifest.years["1405"] ?? { rows: 0, capacity: 0 };
if (![5903, 8416].includes(old1405.rows)) {
  throw new Error(`Unexpected pre-humanities 1405 manifest totals: ${JSON.stringify(old1405)}`);
}
const oldHumanities = oldManifest.groups.humanities;
if (!oldHumanities) throw new Error("Humanities group totals missing from manifest");

const manifest = {
  ...oldManifest,
  snapshotId,
  source,
  years: {
    ...oldManifest.years,
    "1405": { rows: old1405.rows - replacedRows + rows1405Humanities.length, capacity: old1405.capacity - replacedCapacity + capacity1405Humanities },
  },
  groups: {
    ...oldManifest.groups,
    humanities: {
      rows: oldHumanities.rows - replacedRows + rows1405Humanities.length,
      capacity: oldHumanities.capacity - replacedCapacity + capacity1405Humanities,
    },
  },
  rows: oldManifest.rows - replacedRows + rows1405Humanities.length,
  capacity: oldManifest.capacity - replacedCapacity + capacity1405Humanities,
};

if (manifest.years["1405"].rows !== 8416 || manifest.years["1405"].capacity !== 132198) throw new Error("Wrong 1405 totals");
if (manifest.rows !== 41742 || manifest.capacity !== 653043) throw new Error(`Wrong global totals: ${manifest.rows}/${manifest.capacity}`);

const paths = [
  "catalog.json",
  "source/SUMMARY.json",
  "source/sources.csv",
  "source/1401.csv",
  "source/1402.csv",
  "source/1403.csv",
  "source/1404.csv",
  "source/1405.csv",
  ...catalog.groups.flatMap((group) => group.majors.map((major) => major.path)),
].sort();

manifest.files = [];
for (const relative of paths) {
  const bytes = await readFile(`${dir}/${relative}`);
  manifest.files.push({
    path: relative,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
await writeFile(`${dir}/manifest.json`, JSON.stringify(manifest, null, 2) + "\n");

console.log(JSON.stringify({
  snapshotId,
  rows: manifest.rows,
  capacity: manifest.capacity,
  rows1405: manifest.years["1405"].rows,
  capacity1405: manifest.years["1405"].capacity,
  added1405Humanities: rows1405Humanities.length,
  capacity1405Humanities,
}));
