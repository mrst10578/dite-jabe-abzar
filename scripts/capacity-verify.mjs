import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { GROUPS, YEARS, compareLabels } from "../public/capacity/model.js";

export async function verifySnapshot(directory) {
  const manifest = JSON.parse(await readFile(join(directory, "manifest.json"), "utf8"));
  if (manifest.schemaVersion !== 1 || !/^[a-f0-9]{16}$/.test(manifest.snapshotId) || !/^[a-f0-9]{40}$/.test(manifest.source?.commit)) throw new Error("Invalid snapshot manifest");
  const paths = new Set();
  for (const file of manifest.files) {
    if (!/^(catalog\.json|source\/(SUMMARY\.json|sources\.csv|140[1-4]\.csv)|majors\/[a-f0-9]{16}\.json)$/.test(file.path) || paths.has(file.path)) throw new Error("Invalid snapshot file path");
    paths.add(file.path);
    const bytes = await readFile(join(directory, file.path));
    if (bytes.length !== file.bytes || createHash("sha256").update(bytes).digest("hex") !== file.sha256) throw new Error(`Snapshot integrity/hash mismatch: ${file.path}`);
  }
  const catalog = JSON.parse(await readFile(join(directory, "catalog.json"), "utf8"));
  if (catalog.snapshotId !== manifest.snapshotId || catalog.rows !== manifest.rows || JSON.stringify(catalog.source) !== JSON.stringify(manifest.source) || JSON.stringify(catalog.groups.map((group) => group.id)) !== JSON.stringify(GROUPS.map((group) => group.id))) throw new Error("Snapshot catalog mismatch");
  const totals = {}, groups = {}, majors = new Set(), expectedFiles = new Set(["catalog.json", "source/SUMMARY.json", "source/sources.csv", ...YEARS.map((year) => `source/${year}.csv`)]);
  let rowCount = 0, capacity = 0;
  for (const group of catalog.groups) {
    if (JSON.stringify(group.majors.map((item) => item.label)) !== JSON.stringify(group.majors.map((item) => item.label).sort(compareLabels))) throw new Error("Unsorted capacity catalog");
    groups[group.id] = { rows: 0, capacity: 0 };
    for (const major of group.majors) {
      if (major.path !== `majors/${major.id}.json` || expectedFiles.has(major.path)) throw new Error("Invalid/duplicate major path");
      expectedFiles.add(major.path); majors.add(major.label);
      const shard = JSON.parse(await readFile(join(directory, major.path), "utf8"));
      if (shard.snapshotId !== manifest.snapshotId || shard.id !== major.id || shard.group !== group.id || shard.major !== major.label) throw new Error(`Snapshot shard mismatch: ${major.path}`);
      const universities = new Set();
      for (const record of shard.records) {
        if (!YEARS.includes(record.year) || !Number.isSafeInteger(record.capacity) || record.capacity < 0 || record.major !== major.label || !record.university) throw new Error("Invalid snapshot record");
        universities.add(record.university); totals[record.year] ??= { rows: 0, capacity: 0 };
        totals[record.year].rows += 1; totals[record.year].capacity += record.capacity;
        groups[group.id].rows += 1; groups[group.id].capacity += record.capacity;
        rowCount += 1; capacity += record.capacity;
      }
      if (JSON.stringify([...universities].sort(compareLabels)) !== JSON.stringify(major.universities)) throw new Error("University catalog mismatch");
    }
  }
  if (expectedFiles.size !== paths.size || [...expectedFiles].some((path) => !paths.has(path))) throw new Error("Incomplete snapshot file manifest");
  for (const year of YEARS) if (JSON.stringify(totals[year]) !== JSON.stringify(manifest.years[year])) throw new Error("Snapshot year totals mismatch");
  for (const group of GROUPS) if (JSON.stringify(groups[group.id]) !== JSON.stringify(manifest.groups[group.id])) throw new Error("Snapshot group totals mismatch");
  if (rowCount !== manifest.rows || capacity !== manifest.capacity || majors.size !== manifest.majorFamilies) throw new Error("Snapshot totals mismatch");
  return manifest;
}
