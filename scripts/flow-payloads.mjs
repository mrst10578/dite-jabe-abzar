import { parse } from "parse5";
import { createHash } from "node:crypto";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { append, attr, before, markup, one, setAttr } from "./flow-home.mjs";

const text = (node) => node.childNodes.map((child) => child.value ?? "").join("");
const setText = (node, value) => { node.childNodes = [{ nodeName: "#text", value, parentNode: node }]; };
const json = (value) => JSON.stringify(value).replace(/</g, "\\u003c");
function integrate(node, original, replacement) {
  const source = text(node);
  if (source.split(original).length !== 2) throw new Error(`Flow payload integration changed: ${original.slice(0, 80)}`);
  setText(node, source.replace(original, replacement));
}

// Preserve the authored documents exactly, but transfer each only when opened.
// Metadata and the full-body article search index remain available immediately.
export async function externalizeDocuments(document, themes, runtime) {
  const byId = (value) => one(document, (node) => attr(node, "id") === value, `#${value}`);
  const data = byId("aris-selection-guides-data");
  const guides = JSON.parse(text(data));
  const compass = byId("aris-compass-html");
  const compassSource = Buffer.from(text(compass), "base64").toString("utf8");
  const catalog = {};
  await rm("public/flow/generated/documents", { recursive: true, force:true });
  await mkdir("public/flow/generated/documents", { recursive: true });
  for (const item of [...guides, { id: "compass", document: compassSource }]) {
    const themeTitle = text(one(parse(item.document), (node) => node.tagName === "title", "document title"));
    if (!Object.hasOwn(themes, themeTitle)) throw new Error(`Missing document theme: ${item.id}`);
    const payload = json({ id: item.id, title: themeTitle, document: item.document, theme: themes[themeTitle] });
    const digest = createHash("sha256").update(payload).digest("hex").slice(0, 16);
    const filename = `${item.id}-${digest}.json`;
    await writeFile(`public/flow/generated/documents/${filename}`, payload);
    catalog[item.id] = `/flow/generated/documents/${filename}`;
  }
  setText(data, json(guides.map((guide) => { const metadata = { ...guide, payloadURL:catalog[guide.id] }; delete metadata.document; return metadata; })));
  setText(compass, "");
  setAttr(compass, "data-flow-payload", catalog.compass);
  const head = one(document, (node) => node.tagName === "head", "head");
  append(head, markup(`<script data-flow-payloads>${runtime}\nwindow.FlowPayloads.configure(${json(catalog)});</script>`));

  const guideRuntime = one(document, (node) => attr(node, "data-aris-module") === "selection-guide-browser", "guide runtime");
  const frame = byId("guide-reader-frame");
  before(frame, markup('<div id="flow-guide-loading" class="flow-document-loading" hidden><span class="flow-loading-orbit" aria-hidden="true"></span><p role="status" aria-live="polite">در حال آماده‌سازی مقاله…</p><button type="button" id="flow-guide-retry" hidden>تلاش دوباره</button></div>'));
  integrate(guideRuntime, "function openGuide(id){", 'var flowGuideRequest=0;\nvar flowGuideLoading=document.getElementById("flow-guide-loading"),flowGuideRetry=document.getElementById("flow-guide-retry");\nflowGuideRetry.addEventListener("click",function(){if(activeIndex>=0)openGuide(guides[activeIndex].id)});\nasync function openGuide(id){');
  integrate(guideRuntime, "  frame.srcdoc=window.FlowDocuments.theme(guide.document);", '  var request=++flowGuideRequest;\n  frame.hidden=true;frame.srcdoc="";\n  flowGuideLoading.hidden=false;flowGuideRetry.hidden=true;\n  flowGuideLoading.querySelector("p").textContent="در حال آماده‌سازی مقاله…";\n  reader.setAttribute("aria-busy","true");');
  integrate(guideRuntime, 'reader.scrollTop=0;root.dispatchEvent(new CustomEvent("aris:guide-opened",{bubbles:true,detail:{id:guide.id,title:guide.title}}));', `reader.scrollTop=0;root.dispatchEvent(new CustomEvent("aris:guide-opened",{bubbles:true,detail:{id:guide.id,title:guide.title}}));
  try{
    var payload=await window.FlowPayloads.ensure(guide.id);
    if(request!==flowGuideRequest||!reader.open)return;
    guide.document=payload.document;
    frame.srcdoc=window.FlowDocuments.theme(guide.document);
    // Keep the loading state until the iframe has applied its theme and scripts.
  }catch(error){
    if(request!==flowGuideRequest||!reader.open)return;
    reader.removeAttribute("aria-busy");
    flowGuideLoading.querySelector("p").textContent="مقاله دریافت نشد. اتصال اینترنت را بررسی کن و دوباره تلاش کن.";
    flowGuideRetry.hidden=false;
  }`);
  integrate(guideRuntime, "function closeReader(){", 'frame.addEventListener("load",function(){if(reader.open&&frame.getAttribute("srcdoc")){frame.hidden=false;flowGuideLoading.hidden=true;reader.removeAttribute("aria-busy")}});\nfunction closeReader(){\n  ++flowGuideRequest;flowGuideLoading.hidden=true;reader.removeAttribute("aria-busy");');
  integrate(guideRuntime, "open:function(id){openGuide(id)}", "open:function(id){return openGuide(id)}");
  const host = byId("aris-compass-host");
  integrate(host, "function mount() {", "async function mount() {");
  integrate(host, "      var source = decodeSource();", "      await window.FlowPayloads.ensure('compass');\n      var source = decodeSource();");
}
