import { readFile, writeFile, mkdir, cp } from "node:fs/promises";
import { parse, serialize } from "parse5";
import { append, attr, before, markup, nodes, one, projectHome } from "./flow-home.mjs";
import { documentTheme, themeCss } from "./flow-document-theme.mjs";

const source = await readFile("public/index.html", "utf8");
const manifest = JSON.parse(await readFile("public/flow/assets/manifest.json", "utf8"));
if (manifest.productionReady) {
  for (const asset of manifest.assets) {
    if (asset.status !== "ready") throw new Error(`Flow asset not approved: ${asset.file}`);
    await readFile(`public/flow/assets/${asset.file}`);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function setMeta(html, attribute, key, content) {
  const pattern = new RegExp(
    `<meta\\b(?=[^>]*\\b${escapeRegExp(attribute)}=["']${escapeRegExp(key)}["'])[^>]*>`,
    "i",
  );
  return html.replace(pattern, `<meta ${attribute}="${key}" content="${content}"/>`);
}

const assetState = manifest.productionReady ? "ready" : "source";
let preview = source
  .replace(/<html\b([^>]*)>/, '<html$1 data-flow-theme="midnight">')
  .replace(/<body\b/, `<body data-flow-assets="${assetState}"`)
  .replace(/<title>[^<]*<\/title>/, "<title>Flow | جعبه ابزار انتخاب رشته</title>");

preview = setMeta(preview, "name", "application-name", "Flow");
preview = setMeta(preview, "name", "description", "رشته‌شناسی، استان‌شناسی و راهنمای انتخاب رشته در Flow");
preview = setMeta(preview, "name", "theme-color", "#031319");
preview = setMeta(preview, "property", "og:title", "Flow | جعبه ابزار انتخاب رشته");
preview = setMeta(preview, "property", "og:description", "رشته‌شناسی، استان‌شناسی و راهنمای انتخاب رشته در Flow");
preview = setMeta(preview, "property", "og:site_name", "Flow");

const document = parse(preview);
projectHome(document, manifest);
const text = (node) => node.childNodes.map((child) => child.value ?? "").join("");
const setText = (node, value) => { node.childNodes = [{ nodeName: "#text", value, parentNode: node }]; };
for (const style of nodes(document, (node) => node.tagName === "style" && !(attr(node, "id") ?? "").startsWith("__ARYO_"))) {
  const original = text(style);
  setText(style, original + "\n@media screen {\n" + themeCss(original) + "\n}");
}
const id = (value) => one(document, (node) => attr(node, "id") === value, `#${value}`);
const guides = JSON.parse(text(id("aris-selection-guides-data")));
const compass = Buffer.from(text(id("aris-compass-html")), "base64").toString("utf8");
const themes = {};
for (const source of [...guides.map((guide) => guide.document), compass]) {
  const { title, ...theme } = documentTheme(source);
  if (Object.hasOwn(themes, title)) throw new Error(`Duplicate Flow document title: ${title}`);
  themes[title] = theme;
}
const tokens = await readFile("public/flow/tokens.css", "utf8");
const documentCss = tokens + await readFile("public/flow/documents.css", "utf8");
const documentRuntime = await readFile("public/flow/documents.js", "utf8");
const head = one(document, (node) => node.tagName === "head", "head");
append(head, markup(`<style data-flow-tokens>${tokens}</style>`));
append(head, markup('<link rel="stylesheet" href="/flow/theme.css">'));
append(head, markup('<link rel="stylesheet" href="/flow/surfaces.css">'));
append(head, markup('<link rel="stylesheet" href="/flow/reader.css">'));
append(head, markup('<script src="/flow/theme.js" defer></script>'));
const configuration = JSON.stringify([themes, documentCss]).replace(/</g, "\\u003c");
append(head, markup(`<script data-flow-documents>${documentRuntime}\nwindow.FlowDocuments.configure(...${configuration});</script>`));

function integrate(node, oldCode, newCode) {
  const source = text(node);
  if (source.split(oldCode).length !== 2) throw new Error(`Flow integration contract changed: ${oldCode}`);
  setText(node, source.replace(oldCode, newCode));
}
integrate(one(document, (node) => attr(node, "data-aris-module") === "selection-guide-browser", "guide runtime"),
  "frame.srcdoc=guide.document;", "frame.srcdoc=window.FlowDocuments.theme(guide.document);");
integrate(id("aris-compass-host"), "frame.srcdoc = source;", "frame.srcdoc = window.FlowDocuments.theme(source);");
const nativeRuntime = one(document, (node) => attr(node, "data-aris-module") === "search-and-content", "native reader runtime");
// Install the existing adapter before native injection. Mutation observers run
// at its microtask checkpoint, before a dossier can be painted in legacy colors.
before(nativeRuntime, markup(`<script data-flow-reader-bootstrap>${await readFile("public/flow/reader.js", "utf8")}</script>`));
preview = serialize(document);

await writeFile("public/flow-preview.html", preview);
await mkdir("dist", { recursive: true });
await writeFile("dist/flow-preview.html", preview);
await writeFile("dist/index.html", preview);
await cp("public/flow", "dist/flow", { recursive: true });
console.log(`Flow preview prepared; assets: ${assetState}. Original toolbox preserved.`);
