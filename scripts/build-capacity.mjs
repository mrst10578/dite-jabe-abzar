import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { verifySnapshot } from "./capacity-verify.mjs";

const manifest = await verifySnapshot("public/capacity/data");
const source = await readFile("public/index.html", "utf8");
const font = source.match(/data:font\/woff2;base64,([A-Za-z0-9+/=]+)/);
if (!font) throw new Error("Native Flow font is absent from canonical source");
await mkdir("public/capacity", { recursive: true });
await writeFile("public/capacity/vazirmatn.woff2", Buffer.from(font[1], "base64"));
// Every static build must publish the independent page, including npm run build.
await mkdir("dist", { recursive: true });
await rm("dist/capacity", { recursive: true, force: true });
await cp("public/capacity", "dist/capacity", { recursive: true });
console.log(`Verified fixed capacity snapshot ${manifest.snapshotId}: ${manifest.rows} rows`);
