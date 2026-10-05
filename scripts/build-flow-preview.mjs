import { readFile, writeFile, mkdir, cp } from "node:fs/promises";
import { parse, serialize } from "parse5";
import { append, attr, before, markup, nodes, one, projectHome } from "./flow-home.mjs";
import { documentTheme, themeCss } from "./flow-document-theme.mjs";
import { brandTree, branding } from "./flow-branding.mjs";
import { projectGuideBrowser } from "./flow-guide-browser.mjs";
import { externalizeDocuments } from "./flow-payloads.mjs";
import { externalizeAmbientAudio, externalizeProvinceImages } from "./flow-image-assets.mjs";

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
  .replace(/<html\b([^>]*)>/, '<html$1 data-flow-theme="midnight" data-flow-viewport="desktop">')
  .replace(/<body\b/, `<body data-flow-assets="${assetState}"`)
  .replace(/<title>[^<]*<\/title>/, "<title>Flow | جعبه ابزار انتخاب رشته</title>");

// Match the supplied reference: Chrome’s 980px desktop canvas on phones.
// Browsers fit it to the screen with horizontal forms and stacked support rows.
// Retain pinch zoom and the relaxed zoom-out limit.
// Desktop browsers keep their normal viewport.
preview = setMeta(preview, "name", "viewport", "width=980, minimum-scale=0.1, viewport-fit=cover");
preview = setMeta(preview, "name", "application-name", "Flow");
preview = setMeta(preview, "name", "description", "رشته‌شناسی، استان‌شناسی و راهنمای انتخاب رشته در Flow");
preview = setMeta(preview, "name", "theme-color", "#031319");
preview = setMeta(preview, "property", "og:title", "Flow | جعبه ابزار انتخاب رشته");
preview = setMeta(preview, "property", "og:description", "رشته‌شناسی، استان‌شناسی و راهنمای انتخاب رشته در Flow");
preview = setMeta(preview, "property", "og:site_name", "Flow");

const document = parse(preview);
projectHome(document, manifest);
projectGuideBrowser(document);
brandTree(document);
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
const brandCss = await readFile("public/flow/branding.css", "utf8");
const brandRuntime = await readFile("public/flow/branding.js", "utf8");
const typographyCss = await readFile("public/flow/typography.css", "utf8");
const typographyRuntime = await readFile("public/flow/typography.js", "utf8");
const documentCss = tokens + await readFile("public/flow/documents.css", "utf8") + brandCss + typographyCss;
const documentRuntime = await readFile("public/flow/documents.js", "utf8");
const head = one(document, (node) => node.tagName === "head", "head");
append(head, markup(`<style data-flow-tokens>${tokens}</style>`));
append(head, markup('<link rel="stylesheet" href="/flow/theme.css">'));
append(head, markup('<link rel="stylesheet" href="/flow/surfaces.css">'));
append(head, markup('<link rel="stylesheet" href="/flow/reader.css">'));
append(head, markup('<link rel="stylesheet" href="/flow/branding.css?v=20261005-2">'));
append(head, markup('<link rel="stylesheet" href="/flow/home-controls.css">'));
append(head, markup('<link rel="stylesheet" href="/flow/search.css">'));
append(head, markup('<link rel="stylesheet" href="/flow/guides.css">'));
append(head, markup(`<style data-flow-typography>${typographyCss}</style>`));
append(head, markup(`<script data-flow-typography>${typographyRuntime}</script>`));
append(head, markup('<script src="/flow/theme.js" defer></script>'));
append(head, markup('<script src="/flow/search.js" defer></script>'));
append(head, markup(`<script data-flow-branding>${brandRuntime}</script>`));
const configuration = JSON.stringify([{}, documentCss, typographyRuntime]).replace(/</g, "\\u003c");
append(head, markup(`<script data-flow-documents>${documentRuntime}\nwindow.FlowDocuments.configure(...${configuration});</script>`));

function integrate(node, oldCode, newCode) {
  const source = text(node);
  if (source.split(oldCode).length !== 2) throw new Error(`Flow integration contract changed: ${oldCode}`);
  setText(node, source.replace(oldCode, newCode));
}
integrate(one(document, (node) => attr(node, "data-aris-module") === "selection-guide-browser", "guide runtime"),
  "frame.srcdoc=guide.document;", "frame.srcdoc=window.FlowDocuments.theme(guide.document);");
integrate(one(document, (node) => attr(node, "data-aris-module") === "selection-guide-browser", "guide runtime"),
  "guides.forEach(function(g,index){", 'guides.forEach(function(g,index){ ["title","description","eyebrow","categoryLabel"].forEach(function(key){if(typeof g[key]==="string")g[key]=window.FlowBranding.text(g[key]);});');
integrate(id("aris-compass-host"), "frame.srcdoc = source;", "frame.srcdoc = window.FlowDocuments.theme(source);");
// Rebrand the optional verification panel's copy while preserving its original
// signed records, identifiers and verification API.
integrate(id("__ARYO_ARIS_OWNERSHIP__runtime"), "بررسی مالکیت آریس", "بررسی منشأ فایل");
integrate(id("__ARYO_ARIS_OWNERSHIP__runtime"), "محتوای آریس", "محتوای سایت");
const nativeRuntime = one(document, (node) => attr(node, "data-aris-module") === "search-and-content", "native reader runtime");
integrate(nativeRuntime, "majorDocument.innerHTML = content;", "majorDocument.innerHTML = window.FlowBranding.html(content);");
integrate(nativeRuntime, "provinceDocument.innerHTML = content;", "provinceDocument.innerHTML = window.FlowBranding.html(content);");
integrate(nativeRuntime, 'enhanceDossier(majorDocument, "major");', 'enhanceDossier(majorDocument, "major"); window.FlowBranding.document(majorDocument);');
integrate(nativeRuntime, 'enhanceDossier(provinceDocument, "province");', 'enhanceDossier(provinceDocument, "province"); window.FlowBranding.document(provinceDocument);');
integrate(nativeRuntime, '<svg class="aris-footer-mark" viewBox="0 0 120 148" aria-hidden="true"><use href="#aris-sigil-shape"></use></svg>', branding.image);
integrate(nativeRuntime, `} else if (event.key === "Escape" && provinceSearchInput.value) {
            event.preventDefault();
            provinceSearchInput.value = "";
            provinceSearchClear.hidden = true;
            renderProvinceResults("");
        } else if (event.key === "Escape") {`, `} else if (event.key === "Escape") {`);
// Install the existing adapter before native injection. Mutation observers run
// at its microtask checkpoint, before a dossier can be painted in legacy colors.
before(nativeRuntime, markup(`<script data-flow-reader-bootstrap>${await readFile("public/flow/reader.js", "utf8")}</script>`));
// Paint a small native status while the initial HTML prepares its controls.
const loadingCss = await readFile("public/flow/loading.css", "utf8");
const loadingRuntime = await readFile("public/flow/loading.js", "utf8");
const charset = one(head, (node) => node.tagName === "meta" && attr(node, "charset"), "charset");
const afterCharset = head.childNodes[head.childNodes.indexOf(charset) + 1];
before(afterCharset, markup(`<style data-flow-loading>${loadingCss}</style>`));
before(afterCharset, markup(`<script data-flow-loading>${loadingRuntime}</script>`));
const body = one(document, (node) => node.tagName === "body", "body");
before(body.childNodes[0], markup('<div class="flow-startup" id="flow-startup"><div class="flow-startup__content"><div class="flow-startup__brand" lang="en">FLOW</div><span class="flow-loading-orbit" aria-hidden="true"></span><p role="status" aria-live="polite">در حال آماده‌سازی جعبه ابزار انتخاب رشته…</p><small>چند لحظه تا شناخت بهتر مسیرت</small><button type="button" hidden>بارگذاری دوباره</button></div></div>'));
await externalizeDocuments(document, themes, await readFile("public/flow/payloads.js", "utf8"));
// Deliver the identical media files only when their feature needs them. Their
// former inline payloads delayed the search runtime behind 15 MB of base64.
await externalizeProvinceImages(document, {
  outputDirectory: "public/flow/generated/province-images",
  publicPath: "/flow/generated/province-images/",
});
await externalizeAmbientAudio(document, {
  outputDirectory: "public/flow/generated/audio",
  publicPath: "/flow/generated/audio/",
});
preview = serialize(document);\npreview = preview.replace('href="/last-admissions.html"', 'href="/last-admissions/"');

await writeFile("public/flow-preview.html", preview);
await mkdir("dist", { recursive: true });
await writeFile("dist/flow-preview.html", preview);
await writeFile("dist/index.html", preview);
await cp("public/flow", "dist/flow", { recursive: true });
console.log(`Flow preview prepared; assets: ${assetState}. Original toolbox preserved.`);
