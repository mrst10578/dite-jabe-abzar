import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";

const forceImport = process.env.FORCE_ARIS_IMPORT === "1";
let needsImport = forceImport;

if (!needsImport) {
  try {
    await readFile("public/index.html");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    needsImport = true;
  }
}

if (needsImport) {
  const manifest = JSON.parse(await readFile("_import/manifest.json", "utf8"));
  const html = Buffer.concat(await Promise.all(manifest.parts.map((part) => readFile(`_import/${part}`))));
  if (html.length !== manifest.bytes || createHash("sha256").update(html).digest("hex") !== manifest.sha256) {
    throw new Error("Aris import integrity check failed");
  }
  await mkdir("public", { recursive: true });
  await writeFile("public/index.html", html);
}

await mkdir("dist", { recursive: true });
await copyFile("public/index.html", "dist/index.html");

await import("./build-flow-preview.mjs");
await import("./build-capacity.mjs");

// Publish the last-admissions tool in the regular static build too. Workers Builds currently runs `npm run build`, so files must be copied into `dist` explicitly just like the capacity tool.
await mkdir("dist/last-admissions", { recursive: true });
await copyFile("public/last-admissions/index.html", "dist/last-admissions/index.html");

// Cloudflare Workers Builds currently runs `npm run build` for this project.
// Keep resilience and header policy files in the production asset directory
// even when the dedicated build:cloudflare wrapper is not used.
await copyFile("public/sw.js", "dist/sw.js");
await copyFile("public/_headers", "dist/_headers");
