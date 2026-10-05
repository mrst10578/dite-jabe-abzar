import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { parseCsv } from "./capacity-snapshot.mjs";

const [csvPath, sourceCommit, sourceCommitDate] = process.argv.slice(2);
if (!csvPath || !/^[a-f0-9]{40}$/.test(sourceCommit || "") || !Number.isFinite(Date.parse(sourceCommitDate || ""))) {
  throw new Error("Usage: node scripts/activate-1405-snapshot.mjs <csv> <source-commit> <source-date>");
}

const dir = "public/capacity/data";
const csvBytes = await readFile(csvPath);
const rows1405 = parseCsv(csvBytes.toString("utf8")).map((row) => ({
  ...row,
  year: Number(row.year),
  capacity: Number(row.capacity),
}));
if (rows1405.length !== 3900) throw new Error(`Unexpected 1405 row count: ${rows1405.length}`);
const codes = rows1405.map((row) => row.notes?.match(/کدرشته[\s\u200c]*محل منبع:\s*(\d+)/)?.[1]);
if (codes.some((code) => !code) || new Set(codes).size !== rows1405.length) {
  throw new Error("1405 course-location codes are missing or duplicated");
}
const capacity1405 = rows1405.reduce((sum, row) => sum + row.capacity, 0);
if (capacity1405 !== 56662) throw new Error(`Unexpected 1405 capacity total: ${capacity1405}`);

const catalog = JSON.parse(await readFile(`${dir}/catalog.json`, "utf8"));
const oldManifest = JSON.parse(await readFile(`${dir}/manifest.json`, "utf8"));
const collator = new Intl.Collator("fa", { sensitivity: "base", numeric: true });
const compare = (a, b) => collator.compare(a, b);

const rowsByMajor = new Map();
for (const row of rows1405) {
  if (!rowsByMajor.has(row.major)) rowsByMajor.set(row.major, []);
  rowsByMajor.get(row.major).push(row);
}

const experimental = catalog.groups.find((group) => group.id === "experimental");
if (!experimental) throw new Error("Experimental group is missing from catalog");
const supported = new Set(experimental.majors.map((major) => major.label));
const unknown = [...rowsByMajor.keys()].filter((major) => !supported.has(major));
const missing = experimental.majors.map((major) => major.label).filter((major) => !rowsByMajor.has(major));
if (unknown.length || missing.length) {
  throw new Error(`1405 major mismatch; unknown=${unknown.join("|")} missing=${missing.join("|")}`);
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
    if (group.id === "experimental") {
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
if (added !== 3900) throw new Error(`Merged only ${added} 1405 rows`);

catalog.snapshotId = snapshotId;
catalog.source = source;
catalog.years = [1405, 1404, 1403, 1402, 1401];
catalog.rows = oldManifest.rows + rows1405.length;
await writeFile(`${dir}/source/1405.csv`, csvBytes);

const sourcesPath = `${dir}/source/sources.csv`;
let sources = await readFile(sourcesPath, "utf8");
if (!sources.includes("\n1405-booklet,")) {
  if (!sources.endsWith("\n")) sources += "\n";
  sources += "1405-booklet,1405,Tajrobi.pdf,booklet,نسخه ارسالی کاربر,e9f6d83e0be75e62a5b240dfcbf66856ba0d9c575e762a04fbb610b545618756,,فایل منبع در Entekhab-Reshte به دو بخش PDF نگهداری می‌شود.\n";
  await writeFile(sourcesPath, sources);
}

await writeFile(`${dir}/catalog.json`, JSON.stringify(catalog) + "\n");

const manifest = {
  ...oldManifest,
  snapshotId,
  source,
  years: {
    ...oldManifest.years,
    "1405": { rows: rows1405.length, capacity: capacity1405 },
  },
  groups: {
    ...oldManifest.groups,
    experimental: {
      rows: oldManifest.groups.experimental.rows + rows1405.length,
      capacity: oldManifest.groups.experimental.capacity + capacity1405,
    },
  },
  rows: oldManifest.rows + rows1405.length,
  capacity: oldManifest.capacity + capacity1405,
};

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
  added1405: rows1405.length,
  capacity1405,
}));
