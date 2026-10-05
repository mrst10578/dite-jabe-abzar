import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, mkdir, writeFile, rename, rm, mkdtemp } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { GROUPS, YEARS, bookletGroup, compareLabels } from "../public/capacity/model.js";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function parseCsv(input) {
  const text = input.replace(/^\ufeff/, "");
  const rows = []; let row = [], field = "", quoted = false, closed = false;
  function finishField() { row.push(field); field = ""; closed = false; }
  function finishRow() { finishField(); if (row.some((value) => value !== "")) rows.push(row); row = []; }
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') { field += '"'; index += 1; }
        else { quoted = false; closed = true; }
      } else field += char;
    } else if (char === '"') {
      if (field || closed) throw new Error("Unexpected CSV quote");
      quoted = true;
    } else if (char === ",") finishField();
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      finishRow();
    } else {
      if (closed) throw new Error("Unexpected text after CSV quote");
      field += char;
    }
  }
  if (quoted) throw new Error("Unclosed CSV quote");
  if (field || row.length || closed) finishRow();
  const header = rows.shift();
  if (!header || new Set(header).size !== header.length) throw new Error("Invalid CSV columns");
  return rows.map((values) => {
    if (values.length !== header.length) throw new Error("CSV column count mismatch");
    return Object.fromEntries(header.map((key, index) => [key, values[index]]));
  });
}

// Legacy 13-column constituent CSVs are structurally converted in capacities-all.
// Compare their shared admission identity, retaining the final CSV's full metadata.
const identityFields = ["year", "major", "university", "province", "program_type", "admission_category", "capacity", "gender", "intake", "source_id", "source_page"];
const rowKey = (row) => JSON.stringify([
  ...identityFields.map((field) => row[field] ?? ""),
  row.code || row.notes?.match(/کدرشته[\s\u200c]*محل منبع:\s*(\d+)/)?.[1] || "",
]);
const integer = (value, label) => {
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value))) throw new Error(`Invalid ${label}: ${value}`);
  return Number(value);
};

export async function exportPinnedCapacity(repositoryRoot) {
  const git = (...args) => execFileSync("git", ["-C", repositoryRoot, ...args], { encoding: "utf8" }).trim();
  if (git("status", "--porcelain", "--", "data/capacity")) throw new Error("Capacity source has uncommitted changes; commit it before snapshotting");
  const commit = git("rev-parse", "HEAD");
  const source = { repository: "mrst10578/Entekhab-Reshte", commit, commitDate: git("show", "-s", "--format=%cI", commit) };
  const directory = await mkdtemp(join(tmpdir(), "flow-capacity-source-"));
  const cleanup = () => rm(directory, { recursive: true, force: true });
  try {
    const archive = execFileSync("git", ["-C", repositoryRoot, "archive", "--format=tar", `${commit}:data/capacity`], { maxBuffer: 128 * 1024 * 1024 });
    execFileSync("tar", ["-x", "-C", directory], { input: archive });
    return { directory, source, cleanup };
  } catch (error) { await cleanup(); throw error; }
}

export async function buildSnapshot(sourceRoot, outputRoot, source) {
  if (!/^[a-f0-9]{40}$/.test(source.commit) || !Number.isFinite(Date.parse(source.commitDate))) throw new Error("Invalid source commit/date");
  const summaryBytes = await readFile(join(sourceRoot, "SUMMARY.json"));
  const dataset = JSON.parse(summaryBytes).dataset;
  const files = new Map(), shards = new Map(), yearTotals = {}, groupTotals = {};
  files.set("source/SUMMARY.json", summaryBytes);
  files.set("source/sources.csv", await readFile(join(sourceRoot, "raw/sources.csv")));
  let rowCount = 0, totalCapacity = 0;
  for (const year of [...YEARS].reverse()) {
    const directory = join(sourceRoot, "normalized", String(year));
    let info = dataset.years[year];
    if (!info && year === 1405) {
      const supplemental = JSON.parse(await readFile(join(directory, "SUMMARY.json"), "utf8"));
      info = { year: 1405, rows: supplemental.rows, capacity: supplemental.capacity, input_files: [{ path: "capacities-experimental.csv", rows: supplemental.rows, capacity: supplemental.capacity }] };
    }
    if (!info?.input_files?.length) throw new Error(`Missing source files for ${year}`);
    const csvBytes = await readFile(join(directory, "capacities-all.csv"));
    files.set(`source/${year}.csv`, csvBytes);
    const finalRows = parseCsv(csvBytes.toString("utf8"));
    if (finalRows.length !== info.rows) throw new Error(`Final rows mismatch for ${year}`);
    const assignments = new Map();
    const seenFiles = new Set();
    for (const input of info.input_files) {
      if (!/^capacities(?:-[a-z0-9-]+)?\.csv$/.test(input.path) || seenFiles.has(input.path)) throw new Error("Invalid/duplicate source filename");
      seenFiles.add(input.path);
      const rows = parseCsv(await readFile(join(directory, input.path), "utf8"));
      const groups = new Set(rows.map((row) => bookletGroup(row.base_source_id || row.source_id || "")).filter(Boolean));
      if (groups.size !== 1) throw new Error(`Ambiguous source group: ${year}/${input.path}`);
      const group = [...groups][0];
      if (rows.length !== input.rows) throw new Error(`Constituent rows mismatch: ${input.path}`);
      let capacity = 0;
      for (const row of rows) {
        capacity += integer(row.capacity, "capacity");
        const key = rowKey(row);
        if (!assignments.has(key)) assignments.set(key, []);
        if (assignments.get(key).some((previous) => previous !== group)) throw new Error("Ambiguous group for identical source rows");
        assignments.get(key).push(group);
      }
      if (capacity !== input.capacity) throw new Error(`Constituent capacity mismatch: ${input.path}`);
    }
    let yearCapacity = 0;
    for (const raw of finalRows) {
      const queue = assignments.get(rowKey(raw)), group = queue?.pop();
      if (!group) throw new Error(`Final row absent from constituent multiset: ${year}`);
      const record = { ...raw, year: integer(raw.year, "year"), capacity: integer(raw.capacity, "capacity") };
      if (record.year !== year || !record.major || !record.university) throw new Error(`Invalid source row: ${year}`);
      const key = `${group}:${record.major}`, id = sha256(key).slice(0, 16);
      if (!shards.has(key)) shards.set(key, { id, group, major: record.major, records: [] });
      shards.get(key).records.push(record);
      rowCount += 1; yearCapacity += record.capacity; totalCapacity += record.capacity;
      groupTotals[group] ??= { rows: 0, capacity: 0 };
      groupTotals[group].rows += 1; groupTotals[group].capacity += record.capacity;
    }
    if ([...assignments.values()].some((queue) => queue.length)) throw new Error(`Unmatched constituent multiset rows: ${year}`);
    if (yearCapacity !== info.capacity) throw new Error(`Final capacity mismatch: ${year}`);
    yearTotals[year] = { rows: finalRows.length, capacity: yearCapacity };
  }
  const majorFamilies = new Set([...shards.values()].map((shard) => shard.major)).size;
  const expectedRows = Object.values(yearTotals).reduce((sum, item) => sum + item.rows, 0);
  const expectedCapacity = Object.values(yearTotals).reduce((sum, item) => sum + item.capacity, 0);
  if (rowCount !== expectedRows || totalCapacity !== expectedCapacity || majorFamilies !== dataset.major_families) throw new Error("Dataset rows/capacity/major totals mismatch");
  const snapshotId = sha256(JSON.stringify([source.commit, [...files].map(([path, bytes]) => [path, sha256(bytes)])])).slice(0, 16);
  const catalog = { schemaVersion: 1, snapshotId, source, years: YEARS, rows: rowCount, groups: GROUPS.map((group) => ({ ...group, majors: [] })) };
  for (const shard of [...shards.values()].sort((a, b) => a.id.localeCompare(b.id))) {
    const path = `majors/${shard.id}.json`;
    const universities = [...new Set(shard.records.map((row) => row.university))].sort(compareLabels);
    catalog.groups.find((group) => group.id === shard.group).majors.push({ id: shard.id, label: shard.major, universities, path });
    files.set(path, Buffer.from(JSON.stringify({ schemaVersion: 1, snapshotId, ...shard }) + "\n"));
  }
  for (const group of catalog.groups) group.majors.sort((a, b) => compareLabels(a.label, b.label));
  files.set("catalog.json", Buffer.from(JSON.stringify(catalog) + "\n"));
  const manifest = { schemaVersion: 1, snapshotId, source, years: yearTotals, groups: groupTotals, majorFamilies, rows: rowCount, capacity: totalCapacity,
    files: [...files].map(([path, bytes]) => ({ path, bytes: bytes.length, sha256: sha256(bytes) })).sort((a, b) => a.path.localeCompare(b.path)) };
  files.set("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2) + "\n"));
  const staging = `${outputRoot}.staging-${process.pid}`;
  await rm(staging, { recursive: true, force: true });
  for (const [path, bytes] of files) { await mkdir(join(staging, path, ".."), { recursive: true }); await writeFile(join(staging, path), bytes); }
  await rm(outputRoot, { recursive: true, force: true });
  await rename(staging, outputRoot);
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const repositoryRoot = resolve(process.env.CAPACITY_SOURCE_ROOT || "../Entekhab-Reshte");
  const pinned = await exportPinnedCapacity(repositoryRoot);
  try {
    const manifest = await buildSnapshot(pinned.directory, resolve("public/capacity/data"), pinned.source);
    console.log(`Capacity snapshot ${manifest.snapshotId}: ${manifest.rows} rows, ${manifest.capacity} declared seats, ${manifest.majorFamilies} major families; source ${pinned.source.commit}`);
  } finally { await pinned.cleanup(); }
}
