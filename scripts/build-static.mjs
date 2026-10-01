import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";

try {
  await readFile("public/index.html");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
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
