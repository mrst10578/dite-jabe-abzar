import { copyFile, cp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Only generated output is cleared; public/index.html remains the source of truth.
await rm("dist", { recursive: true, force: true });
await import("./build-static.mjs");
await cp("public", "dist", { recursive: true });
// The source HTML stays intact; publish the generated active Flow entry.
await copyFile("public/flow-preview.html", "dist/index.html");

// Inline recovery into all public entry points so it can react even when a
// critical external JS or CSS request fails.
const resilienceRuntime = (await readFile("scripts/resilience-inline.js", "utf8"))
  .replaceAll("</script", "<\\/script");
const resilienceTag = `<script data-flow-resilience>${resilienceRuntime}</script>`;

for (const relative of [
  "index.html",
  "flow-preview.html",
  "capacity/index.html",
  "last-admissions/index.html",
]) {
  const path = join("dist", relative);
  let html;
  try {
    html = await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") continue;
    throw error;
  }
  if (html.includes("data-flow-resilience")) continue;
  if (!html.includes("<head>")) throw new Error(`Missing <head> in ${path}`);
  await writeFile(path, html.replace("<head>", `<head>\n${resilienceTag}`));
}

// Workers Free limits: https://developers.cloudflare.com/workers/platform/limits/
const maxFileBytes = 25 * 1024 * 1024;
const maxFiles = 20_000;
let files = 0;
let bytes = 0;
async function validate(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await validate(path);
    } else if (entry.isFile()) {
      const { size } = await stat(path);
      if (size > maxFileBytes) throw new Error(`${path} exceeds the Workers 25 MiB asset limit`);
      files += 1;
      bytes += size;
    } else {
      throw new Error(`Unsupported asset type: ${path}`);
    }
  }
}
await validate("dist");
if (files > maxFiles) throw new Error(`Workers Free supports at most ${maxFiles} assets`);
console.log(`Cloudflare assets ready: ${files} files, ${bytes} bytes`);
