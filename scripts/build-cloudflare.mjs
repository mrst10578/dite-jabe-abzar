import { cp, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";

// Only generated output is cleared; public/index.html remains the source of truth.
await rm("dist", { recursive: true, force: true });
await import("./build-static.mjs");
await cp("public", "dist", { recursive: true });

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
