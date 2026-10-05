import { readFile, mkdtemp, mkdir, cp, writeFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";
import { verifySnapshot } from "./capacity-verify.mjs";
import { parseCsv } from "./capacity-snapshot.mjs";

it("exports the capacity page and fixed snapshot in the ordinary static build", async () => {
  const root = await mkdtemp(join(tmpdir(), "flow-capacity-build-"));
  try {
    await mkdir(join(root, "public"));
    await cp("public/capacity", join(root, "public/capacity"), { recursive: true });
    await writeFile(join(root, "public/index.html"), "data:font/woff2;base64,dGVzdA==");
    execFileSync(process.execPath, [resolve("scripts/build-capacity.mjs")], { cwd: root });
    expect(await readFile(join(root, "dist/capacity/index.html"), "utf8")).toBe(await readFile("public/capacity/index.html", "utf8"));
    const committed = JSON.parse(await readFile("public/capacity/data/manifest.json", "utf8"));
    expect((await verifySnapshot(join(root, "dist/capacity/data"))).snapshotId).toBe(committed.snapshotId);
    for (const file of ["app.js", "model.js", "capacity.css"]) {
      expect(await readFile(join(root, "dist/capacity", file), "utf8")).toBe(await readFile(join("public/capacity", file), "utf8"));
    }
    expect(await readFile(join(root, "dist/capacity/vazirmatn.woff2"), "utf8")).toBe("test");
  } finally { await rm(root, { recursive: true, force: true }); }
}, 20_000);

it("verifies the committed snapshot and preserves every canonical source field", async () => {
  const directory = "public/capacity/data";
  const manifest = await verifySnapshot(directory);
  expect(manifest?.rows).toBe(41742);
  expect(manifest?.capacity).toBe(653043);
  expect(manifest?.source.commit).toBe("052b7785b5d5ca193545c7fd1149b7b0dc8711ba");
  const catalog = JSON.parse(await readFile(join(directory, "catalog.json"), "utf8"));
  const records = [];
  for (const group of catalog.groups) for (const major of group.majors) {
    const shard = JSON.parse(await readFile(join(directory, major.path), "utf8"));
    records.push(...shard.records);
  }
  const key = (row) => JSON.stringify(Object.keys(row).sort().map((field) => [field, String(row[field])]));
  for (const year of [1401, 1402, 1403, 1404, 1405]) {
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

it("pins every canonical source file and the source commit in the snapshot manifest", async () => {
  const manifest = JSON.parse(await readFile("public/capacity/data/manifest.json", "utf8"));
  const catalog = JSON.parse(await readFile("public/capacity/data/catalog.json", "utf8"));
  const sourcePaths = ["source/SUMMARY.json", "source/sources.csv", ...[1401, 1402, 1403, 1404, 1405].map((year) => `source/${year}.csv`)];
  for (const path of sourcePaths) {
    expect(manifest.files.find((file) => file.path === path)?.sha256).toMatch(/^[a-f0-9]{64}$/);
  }
  expect(manifest.snapshotId).toMatch(/^[a-f0-9]{16}$/);
  expect(catalog.source).toEqual(manifest.source);
});
