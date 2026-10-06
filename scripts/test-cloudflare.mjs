import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

const baseURL = "http://127.0.0.1:8789";
const server = spawn(process.execPath, [
  "node_modules/wrangler/bin/wrangler.js", "dev", "--local",
  "--ip", "127.0.0.1", "--port", "8789", "--log-level", "warn",
], { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, WRANGLER_SEND_METRICS: "false" } });
let output = "";
for (const stream of [server.stdout, server.stderr]) {
  stream.on("data", (chunk) => { output = (output + chunk).slice(-12_000); });
}
let startupError;
server.on("error", (error) => { startupError = error; });

try {
  const deadline = Date.now() + 45_000;
  while (true) {
    if (startupError) throw startupError;
    if (server.exitCode !== null) throw new Error(`Wrangler stopped: ${output}`);
    try {
      const probe = await fetch(baseURL, { method: "HEAD", signal: AbortSignal.timeout(2000) });
      if (probe.status === 200) break;
    } catch { /* The local runtime may still be starting. */ }
    if (Date.now() > deadline) throw new Error(`Wrangler startup timed out: ${output}`);
    await delay(250);
  }

  const response = await fetch(baseURL, { signal: AbortSignal.timeout(10_000) });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /text\/html/);
  assert.match(response.headers.get("cache-control") ?? "", /max-age=3600/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "SAMEORIGIN");
  const body = Buffer.from(await response.arrayBuffer());
  const source = await readFile("dist/index.html");
  const hash = (value) => createHash("sha256").update(value).digest("hex");
  assert.equal(body.length, source.length, "The Worker must serve the complete source HTML");
  assert.equal(hash(body), hash(source), "Serving assets must not alter the embedded content");

  assert.match(body.toString("utf8"), /data-flow-assets="ready"/);

  const serviceWorker = await fetch(`${baseURL}/sw.js`);
  assert.equal(serviceWorker.status, 200, "Service worker must be published");
  assert.match(serviceWorker.headers.get("cache-control") ?? "", /no-cache/);
  assert.equal(serviceWorker.headers.get("service-worker-allowed"), "/");
  assert.match(await serviceWorker.text(), /flow-toolbox-v1/);

  const flowTheme = await fetch(`${baseURL}/flow/theme.css`);
  assert.equal(flowTheme.status, 200, "Flow theme must be served");
  assert.match(flowTheme.headers.get("cache-control") ?? "", /max-age=86400/);
  const manifest = JSON.parse(await readFile("public/flow/assets/manifest.json", "utf8"));
  for (const asset of manifest.assets) {
    const response = await fetch(`${baseURL}/flow/assets/${asset.file}`);
    assert.equal(response.status, 200, `Asset must be served: ${asset.file}`);
    assert.equal(hash(Buffer.from(await response.arrayBuffer())), hash(await readFile(`public/flow/assets/${asset.file}`)));
  }
  for (const [directory, contentType, expected] of [["province-images", "image/webp", 186], ["audio", "audio/mpeg", 1], ["documents", "application/json", 23]]) {
    const files = await readdir(`public/flow/generated/${directory}`);
    assert.equal(files.length, expected);
    for (let start = 0; start < files.length; start += 8) {
      await Promise.all(files.slice(start, start + 8).map(async (file) => {
        const response = await fetch(`${baseURL}/flow/generated/${directory}/${file}`);
        assert.equal(response.status, 200, `On-demand media must be served: ${file}`);
        assert.equal(response.headers.get("content-type")?.split(";")[0], contentType);
        assert.equal(hash(Buffer.from(await response.arrayBuffer())), hash(await readFile(`public/flow/generated/${directory}/${file}`)));
      }));
    }
  }
  const alias = await fetch(`${baseURL}/index.html`, { redirect: "manual" });
  assert.equal(alias.status, 307);
  assert.equal(new URL(alias.headers.get("location"), baseURL).pathname, "/");
  const capacityPage = await fetch(`${baseURL}/capacity/`);
  assert.equal(capacityPage.status, 200, "Independent capacity page must be served");
  assert.equal(hash(Buffer.from(await capacityPage.arrayBuffer())), hash(await readFile("public/capacity/index.html")));
  for (const file of ["app.js", "model.js", "university-aliases.js", "university-identities.js", "capacity.css", "vazirmatn.woff2"]) {
    const response = await fetch(`${baseURL}/capacity/${file}`);
    assert.equal(response.status, 200, `Capacity asset must be served: ${file}`);
    assert.equal(hash(Buffer.from(await response.arrayBuffer())), hash(await readFile(`public/capacity/${file}`)));
  }
  const snapshot = JSON.parse(await readFile("public/capacity/data/manifest.json", "utf8"));
  const servedManifest = await fetch(`${baseURL}/capacity/data/manifest.json`);
  assert.equal(servedManifest.status, 200);
  assert.equal(hash(Buffer.from(await servedManifest.arrayBuffer())), hash(await readFile("public/capacity/data/manifest.json")));
  for (let start = 0; start < snapshot.files.length; start += 8) {
    await Promise.all(snapshot.files.slice(start, start + 8).map(async (file) => {
      const response = await fetch(`${baseURL}/capacity/data/${file.path}`);
      assert.equal(response.status, 200, `Snapshot asset must be served: ${file.path}`);
      assert.equal(hash(Buffer.from(await response.arrayBuffer())), file.sha256, `Snapshot asset hash: ${file.path}`);
    }));
  }
  for (const path of ["/__missing_cloudflare_page__", "/__missing_cloudflare_asset__.png"]) {
    const missing = await fetch(baseURL + path);
    assert.equal(missing.status, 404, `Missing URL must not return the homepage: ${path}`);
    await missing.body?.cancel();
  }
  console.log(`Workers runtime checks passed: homepage ${body.length} bytes, independent capacity page, ${snapshot.files.length} snapshot files, canonical redirect, real 404s`);
} finally {
  server.kill("SIGTERM");
  if (server.exitCode === null) {
    await Promise.race([
      new Promise((resolve) => server.once("exit", resolve)),
      delay(3000),
    ]);
  }
  if (server.exitCode === null) server.kill("SIGKILL");
}
