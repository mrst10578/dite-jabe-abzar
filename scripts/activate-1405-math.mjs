import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { parseCsv } from "./capacity-snapshot.mjs";

const [csvPath, sourceCommit, sourceCommitDate] = process.argv.slice(2);
if (!csvPath || !/^[a-f0-9]{40}$/.test(sourceCommit || "") || !Number.isFinite(Date.parse(sourceCommitDate || ""))) {
  throw new Error("Usage: node scripts/activate-1405-math.mjs <csv> <source-commit> <source-date>");
}

const dir = "public/capacity/data";
const csvBytes = await readFile(csvPath);
const rows1405Math = parseCsv(csvBytes.toString("utf8")).map((row) => ({
  ...row,
  year: Number(row.year),
  capacity: Number(row.capacity),
}));
if (rows1405Math.length !== 2003) throw new Error(`Unexpected 1405 math row count: ${rows1405Math.length}`);
const codes = rows1405Math.map((row) => row.notes?.match(/کدرشته[\s\u200c]*محل منبع:\s*(\d+)/)?.[1]);
if (codes.some((code) => !code) || new Set(codes).size !== rows1405Math.length) {
  throw new Error("1405 math course-location codes are missing or duplicated");
}
const capacity1405Math = rows1405Math.reduce((sum, row) => sum + row.capacity, 0);
if (capacity1405Math !== 52310) throw new Error(`Unexpected 1405 math capacity total: ${capacity1405Math}`);

const catalog = JSON.parse(await readFile(`${dir}/catalog.json`, "utf8"));
const oldManifest = JSON.parse(await readFile(`${dir}/manifest.json`, "utf8"));
const collator = new Intl.Collator("fa", { sensitivity: "base", numeric: true });
const compare = (a, b) => collator.compare(a, b);

const rowsByMajor = new Map();
for (const row of rows1405Math) {
  if (!rowsByMajor.has(row.major)) rowsByMajor.set(row.major, []);
  rowsByMajor.get(row.major).push(row);
}

const math = catalog.groups.find((group) => group.id === "math");
if (!math) throw new Error("Math group is missing from catalog");
const supported = new Set(math.majors.map((major) => major.label));
const unknown = [...rowsByMajor.keys()].filter((major) => !supported.has(major));
const missing = math.majors.map((major) => major.label).filter((major) => !rowsByMajor.has(major));
if (unknown.length || missing.length) {
  throw new Error(`1405 math major mismatch; unknown=${unknown.join("|")} missing=${missing.join("|")}`);
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
for (const group of catalog.groups) {
  for (const major of group.majors) {
    const file = `${dir}/${major.path}`;
    const shard = JSON.parse(await readFile(file, "utf8"));
    if (group.id === "math") {
      const incoming = rowsByMajor.get(major.label) ?? [];
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
if (added !== 2003) throw new Error(`Merged only ${added} 1405 math rows`);

catalog.snapshotId = snapshotId;
catalog.source = source;
catalog.years = [1405, 1404, 1403, 1402, 1401];
catalog.rows = oldManifest.rows + rows1405Math.length;

const existing1405Path = `${dir}/source/1405.csv`;
const existing1405Bytes = await readFile(existing1405Path);
const existing1405Rows = parseCsv(existing1405Bytes.toString("utf8"));
if (existing1405Rows.length !== 3900) throw new Error(`Unexpected existing 1405 row count: ${existing1405Rows.length}`);
const header = existing1405Bytes.toString("utf8").split(/\r?\n/, 1)[0].replace(/^\ufeff/, "");
const mathLines = csvBytes.toString("utf8").replace(/^\ufeff/, "").split(/\r?\n/);
if (mathLines.shift() !== header) throw new Error("1405 source CSV headers do not match");
const combined1405 = existing1405Bytes.toString("utf8").trimEnd() + "\n" + mathLines.filter(Boolean).join("\n") + "\n";
const combinedRows = parseCsv(combined1405);
if (combinedRows.length !== 5903) throw new Error(`Unexpected combined 1405 row count: ${combinedRows.length}`);
await writeFile(existing1405Path, combined1405);

const sourcesPath = `${dir}/source/sources.csv`;
let sources = await readFile(sourcesPath, "utf8");
if (!sources.includes("\n1405-math-booklet,")) {
  if (!sources.endsWith("\n")) sources += "\n";
  sources += "1405-math-booklet,1405,Riazi.pdf,booklet,دفترچه انتخاب رشته گروه علوم ریاضی و فنی ۱۴۰۵,515003f7dc758a9c90807c0a2174604604dca93e85985f5831ef35ebc5e1e389,,پیام نور و غیرانتفاعی در خروجی ابزار وارد نشده‌اند.\n";
  await writeFile(sourcesPath, sources);
}

const summaryPath = `${dir}/source/SUMMARY.json`;
const sourceSummary = JSON.parse(await readFile(summaryPath, "utf8"));
sourceSummary.dataset.years["1405"] = {
  year: 1405,
  rows: 5903,
  capacity: 108972,
  input_files: [
    { path: "capacities-1405-experimental.csv", rows: 3900, capacity: 56662 },
    { path: "capacities-math.csv", rows: 2003, capacity: 52310 },
  ],
  coverage: ["experimental", "math"],
  partial: true,
};
sourceSummary.dataset.rows = Object.values(sourceSummary.dataset.years).reduce((sum, item) => sum + Number(item.rows || 0), 0);
sourceSummary.dataset.capacity = Object.values(sourceSummary.dataset.years).reduce((sum, item) => sum + Number(item.capacity || 0), 0);
await writeFile(summaryPath, JSON.stringify(sourceSummary, null, 2) + "\n");

await writeFile(`${dir}/catalog.json`, JSON.stringify(catalog) + "\n");

const old1405 = oldManifest.years["1405"] ?? { rows: 0, capacity: 0 };
if (old1405.rows !== 3900 || old1405.capacity !== 56662) {
  throw new Error(`Unexpected pre-math 1405 manifest totals: ${JSON.stringify(old1405)}`);
}
const oldMath = oldManifest.groups.math;
if (!oldMath) throw new Error("Math group totals missing from manifest");

const manifest = {
  ...oldManifest,
  snapshotId,
  source,
  years: {
    ...oldManifest.years,
    "1405": { rows: old1405.rows + rows1405Math.length, capacity: old1405.capacity + capacity1405Math },
  },
  groups: {
    ...oldManifest.groups,
    math: {
      rows: oldMath.rows + rows1405Math.length,
      capacity: oldMath.capacity + capacity1405Math,
    },
  },
  rows: oldManifest.rows + rows1405Math.length,
  capacity: oldManifest.capacity + capacity1405Math,
};

if (manifest.years["1405"].rows !== 5903 || manifest.years["1405"].capacity !== 108972) throw new Error("Wrong 1405 totals");
if (manifest.rows !== 39229 || manifest.capacity !== 629817) throw new Error(`Wrong global totals: ${manifest.rows}/${manifest.capacity}`);

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
  added1405Math: rows1405Math.length,
  capacity1405Math,
}));
