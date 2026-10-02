import { readFile, writeFile, mkdir, cp } from "node:fs/promises";

const source = await readFile("public/index.html", "utf8");
const manifest = JSON.parse(await readFile("public/flow/assets/manifest.json", "utf8"));
if (manifest.productionReady) {
  for (const asset of manifest.assets) {
    if (asset.status !== "ready") throw new Error(`Flow asset not approved: ${asset.file}`);
    await readFile(`public/flow/assets/${asset.file}`);
  }
}
const assetState = manifest.productionReady ? "ready" : "source";
const preview = source
  .replace(/<html\b([^>]*)>/, '<html$1 data-flow-theme="midnight">')
  .replace(/<body\b/, `<body data-flow-assets="${assetState}"`)
  .replace(/<title>[^<]*<\/title>/, "<title>Flow | جعبه ابزار انتخاب رشته</title>")
  .replace("</head>", '<link rel="stylesheet" href="/flow/theme.css"><link rel="stylesheet" href="/flow/reader.css"><script src="/flow/theme.js" defer></script><script src="/flow/reader.js" defer></script></head>');
await writeFile("public/flow-preview.html", preview);
await mkdir("dist", { recursive: true });
await writeFile("dist/flow-preview.html", preview);
await writeFile("dist/index.html", preview);
await cp("public/flow", "dist/flow", { recursive: true });
console.log(`Flow preview prepared; assets: ${assetState}. Original toolbox preserved.`);
