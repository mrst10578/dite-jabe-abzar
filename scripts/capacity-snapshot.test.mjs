import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseCsv, buildSnapshot, exportPinnedCapacity } from "./capacity-snapshot.mjs";
import { capacityTotals, normalizePersian, compareLabels } from "../public/capacity/model.js";

const temporary = [];
afterEach(async () => { await Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });
const fields = ["year", "major", "university", "capacity", "base_source_id", "source_id", "notes"];
const csv = (rows) => fields.join(",") + "\n" + rows.map((row) => fields.map((key) => '"' + String(row[key] ?? "").replaceAll('"', '""') + '"').join(",")).join("\n") + "\n";

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "flow-capacity-")); temporary.push(root);
  const source = join(root, "source"), output = join(root, "output");
  const years = {};
  for (const year of [1401, 1402, 1403, 1404]) {
    const base = (major, capacity, sourceId, notes = "") => ({ year, major, university: "دانشگاه تهران", capacity, base_source_id: sourceId, source_id: sourceId, notes });
    const parts = {
      "capacities.csv": [base("شیمی محض", 10, `${year}-booklet`), { ...base("شیمی محض", 4, `${year}-correction-7`), base_source_id: "" }],
      "capacities-chemistry-math.csv": [base("شیمی محض", 20, `${year}-math-booklet`)],
      "capacities-law.csv": [base("حقوق", 30, `${year}-humanities-booklet`, 'توضیح, "رسمی"\nخط دوم')],
    };
    const rows = Object.values(parts).flat();
    const dir = join(source, "normalized", String(year)); await mkdir(dir, { recursive: true });
    for (const [name, records] of Object.entries(parts)) await writeFile(join(dir, name), csv(records));
    await writeFile(join(dir, "capacities-all.csv"), csv(rows));
    years[year] = { rows: 4, capacity: 64, input_files: Object.entries(parts).map(([path, records]) => ({ path, rows: records.length, capacity: records.reduce((sum, row) => sum + row.capacity, 0) })) };
  }
  await mkdir(join(source, "raw"));
  await writeFile(join(source, "raw", "sources.csv"), "source_id,year,file_name\n1401-booklet,1401,booklet.pdf\n");
  await writeFile(join(source, "SUMMARY.json"), JSON.stringify({ dataset: { rows: 16, capacity: 256, major_families: 2, years } }));
  return { source, output };
}
const provenance = { repository: "mrst10578/Entekhab-Reshte", commit: "a".repeat(40), commitDate: "2026-10-04T13:11:03Z" };

describe("capacity snapshot", () => {
  it("parses BOM, quoted commas, doubled quotes and embedded line breaks", () => {
    expect(parseCsv('\ufeffname,notes\r\n"تهران","متن, با ""نقل""\nخط دوم"\r\n')).toEqual([{ name: "تهران", notes: 'متن, با "نقل"\nخط دوم' }]);
    expect(() => parseCsv('name,notes\na,b,c\n')).toThrow(/column/i);
    expect(() => parseCsv('name\n"unfinished')).toThrow(/quote/i);
  });

  it("preserves each final row and keeps shared majors in their source groups", async () => {
    const { source, output } = await fixture();
    const result = await buildSnapshot(source, output, provenance);
    expect(result.rows).toBe(16); expect(result.capacity).toBe(256);
    const catalog = JSON.parse(await readFile(join(output, "catalog.json"), "utf8"));
    expect(catalog.groups.map((group) => group.id)).toEqual(["experimental", "math", "humanities"]);
    const experiment = catalog.groups[0].majors[0], math = catalog.groups[1].majors[0];
    expect(experiment.label).toBe("شیمی محض"); expect(math.label).toBe("شیمی محض"); expect(experiment.id).not.toBe(math.id);
    const shard = JSON.parse(await readFile(join(output, experiment.path), "utf8"));
    expect(shard.records).toHaveLength(8); expect(shard.records.filter((row) => row.year === 1401).reduce((sum, row) => sum + row.capacity, 0)).toBe(14);
    expect(await readFile(join(output, "source/1401.csv"), "utf8")).toBe(await readFile(join(source, "normalized/1401/capacities-all.csv"), "utf8"));
    const first = await readFile(join(output, "manifest.json"), "utf8");
    await buildSnapshot(source, output, provenance);
    expect(await readFile(join(output, "manifest.json"), "utf8")).toBe(first);
  });

  it("rejects missing rows instead of silently producing a partial snapshot", async () => {
    const { source, output } = await fixture();
    await writeFile(join(source, "normalized/1401/capacities-all.csv"), csv([]));
    await expect(buildSnapshot(source, output, provenance)).rejects.toThrow(/rows|multiset/i);
  });

  it("rejects mixed booklet groups in a constituent file", async () => {
    const { source, output } = await fixture();
    const path = join(source, "normalized/1401/capacities-law.csv");
    const rows = parseCsv(await readFile(path, "utf8")); rows.push({ ...rows[0], base_source_id: "1401-math-booklet" });
    await writeFile(path, csv(rows));
    await expect(buildSnapshot(source, output, provenance)).rejects.toThrow(/group/i);
  });

  it("matches legacy constituent columns while preserving the final canonical metadata", async () => {
    const { source, output } = await fixture();
    for (const year of [1401, 1402, 1403, 1404]) {
      const path = join(source, `normalized/${year}/capacities-law.csv`);
      const rows = parseCsv(await readFile(path, "utf8"));
      await writeFile(path, "year,major,university,capacity,source_id,source_title\n" + rows.map((row) => [row.year, row.major, row.university, row.capacity, row.source_id, "حقوق"].join(",")).join("\n") + "\n");
    }
    const result = await buildSnapshot(source, output, provenance);
    const catalog = JSON.parse(await readFile(join(output, "catalog.json"), "utf8"));
    const major = catalog.groups.find((group) => group.id === "humanities").majors[0];
    const shard = JSON.parse(await readFile(join(output, major.path), "utf8"));
    expect(result.rows).toBe(16);
    expect(shard.records[0].notes).toBe('توضیح, "رسمی"\nخط دوم');
    expect(shard.records[0].base_source_id).toBe("1401-humanities-booklet");
  });

  it("pins Git bytes before subsequent source edits, so a snapshot never mixes commits", async () => {
    const { source, output } = await fixture();
    const repository = join(source, "..");
    await mkdir(join(repository, "data"));
    const { rename } = await import("node:fs/promises");
    await rename(source, join(repository, "data/capacity"));
    const git = (...args) => execFileSync("git", ["-C", repository, ...args], { encoding: "utf8" });
    git("init", "--quiet"); git("add", "data");
    git("-c", "user.name=Snapshot Test", "-c", "user.email=test@example.invalid", "commit", "--quiet", "-m", "pin source");
    const finalPath = join(repository, "data/capacity/normalized/1401/capacities-all.csv");
    const original = await readFile(finalPath, "utf8");
    const pinned = await exportPinnedCapacity(repository);
    try {
      await writeFile(finalPath, original.replace("خط دوم", "edited after pinning"));
      const manifest = await buildSnapshot(pinned.directory, output, pinned.source);
      expect(await readFile(join(output, "source/1401.csv"), "utf8")).toBe(original);
      expect(manifest.source.commit).toBe(git("rev-parse", "HEAD").trim());
    } finally { await pinned.cleanup(); }
  });
});

describe("capacity presentation", () => {
  it("adds distinct intake/gender rows and distinguishes missing years from zero", () => {
    const rows = [{ year: 1404, university: "تهران", capacity: 10 }, { year: 1404, university: "تهران", capacity: 15 }, { year: 1402, university: "تهران", capacity: 0 }, { year: 1404, university: "شیراز", capacity: 100 }];
    expect(capacityTotals(rows, ["تهران"])).toEqual([{ university: "تهران", years: { 1405: null, 1404: 25, 1403: null, 1402: 0, 1401: null } }]);
    expect(capacityTotals(rows, [])).toEqual([]);
  });
  it("normalizes Persian searches and sorts labels using Persian collation", () => {
    expect(normalizePersian("  شيمي‌  كاربردي ")).toBe("شیمی کاربردی");
    expect(["پزشکی", "حقوق", "آمار"].sort(compareLabels)).toEqual(["آمار", "پزشکی", "حقوق"]);
  });
});
