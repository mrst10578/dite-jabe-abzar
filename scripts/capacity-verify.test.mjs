import { createHash } from "node:crypto";
import { readFile, mkdtemp, cp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { verifySnapshot } from "./capacity-verify.mjs";
import { parseCsv } from "./capacity-snapshot.mjs";

it("verifies the committed snapshot and preserves every canonical source field", async () => {
  const directory = "public/capacity/data";
  const manifest = await verifySnapshot(directory);
  expect(manifest?.rows).toBe(33326);
  expect(manifest?.capacity).toBe(520845);
  expect(manifest?.source.commit).toBe("e48c51abb5511b9d36a5594f96dfff3817f4192a");
  const catalog = JSON.parse(await readFile(join(directory, "catalog.json"), "utf8"));
  const records = [];
  for (const group of catalog.groups) for (const major of group.majors) {
    const shard = JSON.parse(await readFile(join(directory, major.path), "utf8"));
    records.push(...shard.records);
  }
  const key = (row) => JSON.stringify(Object.keys(row).sort().map((field) => [field, String(row[field])]));
  for (const year of [1401, 1402, 1403, 1404]) {
    const source = parseCsv(await readFile(join(directory, `source/${year}.csv`), "utf8"));
    expect(records.filter((row) => row.year === year).map(key).sort()).toEqual(source.map(key).sort());
  }
}, 20_000);

it("rejects file drift during ordinary builds", async () => {
  const root = await mkdtemp(join(tmpdir(), "flow-capacity-drift-"));
  try {
    await cp("public/capacity/data", root, { recursive: true });
    await writeFile(join(root, "catalog.json"), "{}\n");
    await expect(verifySnapshot(root)).rejects.toThrow(/hash|integrity|bytes/i);
  } finally { await rm(root, { recursive: true, force: true }); }
});

it("snapshot IDs bind both canonical source bytes and the source commit", async () => {
  const manifest = JSON.parse(await readFile("public/capacity/data/manifest.json", "utf8"));
  const sourcePaths = ["source/SUMMARY.json", "source/sources.csv", ...[1401, 1402, 1403, 1404].map((year) => `source/${year}.csv`)];
  const sourceHashes = sourcePaths.map((path) => [path, manifest.files.find((file) => file.path === path).sha256]);
  expect(createHash("sha256").update(JSON.stringify([manifest.source.commit, sourceHashes])).digest("hex").slice(0, 16)).toBe(manifest.snapshotId);
});
