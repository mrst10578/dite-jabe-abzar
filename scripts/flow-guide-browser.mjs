import { parse } from "parse5";
import { append, attr, before, detach, hasClass, markup, one, replaceContent, setAttr } from "./flow-home.mjs";

const labels = { all: "همهٔ مقاله‌ها", start: "شروع و چیدمان", rules: "قوانین و فرم‌ها", reality: "واقعیت تحصیل", future: "مسیر علمی و شغلی" };
const pageSize = 6;
const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const normalize = (value) => String(value ?? "").toLowerCase().replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/[أإ]/g, "ا").replace(/ة/g, "ه").replace(/[^\u0600-\u06ff0-9a-z]+/gi, " ").trim();

// Match the native search index, but do the full-document parsing at build
// time so all 22 DOMParser calls cannot block the homepage controls.
export function guideSearchText(html) {
  const body = one(parse(html), (node) => node.tagName === "body", "guide body");
  function text(node) {
    if (["style", "script", "noscript"].includes(node.tagName) || hasClass(node, "aris-inline-search-tools") || hasClass(node, "aris-article-tools")) return "";
    if (node.nodeName === "#text") return node.value;
    return (node.childNodes ?? []).map(text).join("");
  }
  return normalize(text(body));
}

function card(guide) {
  const key = `guide-card-${guide.id}`;
  const action = guide.kind === "directory" ? "بازکردن دایرکتوری" : "مطالعه راهنما";
  return `<article class="guide-card${guide.id === "rahnamaye-karbordi-entekhab-reshte" ? " guide-card--featured" : ""}"><button class="guide-card__hit" type="button" data-guide-id="${escape(guide.id)}" aria-labelledby="${key}-title" aria-describedby="${key}-desc"><span class="sr-only">${action} ${escape(guide.title)}</span></button><span class="guide-card__top"><span class="guide-card__category">${escape(guide.eyebrow)}<span class="guide-card__validity" data-dynamic="${guide.dynamic}">${guide.dynamic ? "اطلاعات متغیر" : "مفهومی"}</span></span><span class="guide-card__time">${guide.kind === "directory" ? "مرجع جست‌وجویی" : `حدود ${guide.minutes} دقیقه`}</span></span><h3 class="guide-card__title" id="${key}-title">${escape(guide.title)}</h3><p class="guide-card__desc" id="${key}-desc">${escape(guide.description)}</p><span class="guide-card__foot"><span>${action}</span><span class="guide-card__arrow" aria-hidden="true">←</span></span></article>`;
}

function patch(script, oldCode, newCode) {
  const content = script.childNodes[0];
  const parts = content.value.split(oldCode);
  if (parts.length !== 2) throw new Error(`Flow guide contract: expected one ${oldCode.slice(0, 100)}, found ${parts.length - 1}`);
  content.value = parts.join(newCode);
}

export function projectGuideBrowser(document) {
  const root = one(document, (node) => attr(node, "id") === "aris-selection-module", "guide module");
  if (attr(root, "data-flow-guides") === "1") return;
  setAttr(root, "data-flow-guides", "1");
  const byId = (id) => one(root, (node) => attr(node, "id") === id, `#${id}`);
  const byClass = (name) => one(root, (node) => hasClass(node, name), `.${name}`);
  const payload = byId("aris-selection-guides-data");
  const guides = JSON.parse(payload.childNodes[0].value);
  const runtime = one(root, (node) => node.tagName === "script" && attr(node, "data-aris-module") === "selection-guide-browser", "guide browser runtime");
  const index = Object.fromEntries(guides.map((guide) => [guide.id, guideSearchText(guide.document)]));
  before(runtime, markup(`<script id="flow-guide-search-index" type="application/json">${JSON.stringify(index).replace(/</g, "\\u003c")}</script>`));
  patch(runtime, 'g._body=buildSearchText(g.document);', 'g._body=guideBodyIndex[g.id]||"";');
  patch(runtime, 'var guides=JSON.parse(payload.textContent),query="",category="all",activeIndex=-1,expanded=false,lastFocusedElement=null;', 'var guides=JSON.parse(payload.textContent),query="",category="all",activeIndex=-1,expanded=false,lastFocusedElement=null;\nvar guideBodyIndex=JSON.parse(root.querySelector("#flow-guide-search-index").textContent),visibleLimit=6,renderedQuery="",renderedCategory="all";');
  patch(runtime, 'var allVisible=visibleGuides(),visible=(!expanded&&category==="all"&&!query)?allVisible.slice(0,3):allVisible;', 'if(query!==renderedQuery||category!==renderedCategory){visibleLimit=6;renderedQuery=query;renderedCategory=category;}\n  var allVisible=visibleGuides(),visible=allVisible.slice(0,visibleLimit);');
  patch(runtime, 'reveal.hidden=expanded||category!=="all"||!!query||allVisible.length<=3;', 'reveal.hidden=visible.length>=allVisible.length;');
  patch(runtime, 'reveal.textContent="دیدن همه "+allVisible.length+" راهنما";', 'reveal.textContent="نمایش "+Math.min(6,allVisible.length-visible.length)+" مقالهٔ دیگر";');
  patch(runtime, 'count.textContent=(!expanded&&category==="all"&&!query)?"۳ پیشنهاد برای شروع":allVisible.length+" راهنما";', 'count.textContent=visible.length+" از "+allVisible.length+" مقاله";\n  root.querySelector("#flow-guide-reset").hidden=!query&&category==="all";');
  patch(runtime, 'reveal.addEventListener("click",function(){expanded=true;render()});', 'reveal.addEventListener("click",function(){var previousCount=grid.querySelectorAll(".guide-card").length;visibleLimit+=6;expanded=true;render();var firstNew=grid.querySelectorAll(".guide-card__hit")[previousCount];if(firstNew){firstNew.focus({preventScroll:true});firstNew.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"nearest"});}});');
  patch(runtime, 'function renderFilters(){filters.innerHTML=', 'function renderFilters(){var focused=document.activeElement,focusKey=focused&&focused.dataset.category;filters.innerHTML=');
  patch(runtime, "'<button class=\"guide-filter\" type=\"button\" data-category=\"'+key+'\" aria-pressed=\"'+(key===category)+'\">'+labels[key]+'</button>'", "'<button class=\"guide-filter\" type=\"button\" data-category=\"'+key+'\" aria-pressed=\"'+(key===category)+'\">'+(key===\"all\"?\"همهٔ مقاله‌ها\":labels[key])+'</button>'");
  patch(runtime, '}).join("")}\nfunction openGuide(id){', '}).join("");if(focusKey){var replacement=filters.querySelector(\'[data-category="\'+focusKey+\'"]\');if(replacement)replacement.focus({preventScroll:true});}}\nfunction openGuide(id){');
  patch(runtime, 'renderFilters();render();\n\nwindow.ArisSelectionModule=', 'root.querySelector("#flow-guide-reset").addEventListener("click",function(){query="";category="all";search.value="";visibleLimit=6;renderFilters();render();search.focus({preventScroll:true});});\nrenderFilters();render();\n\nwindow.ArisSelectionModule=');
  // Search and reader behavior stays in the existing native module. These
  // controls and cards also exist in the first HTML response, without JS.
  replaceContent(byId("guide-hub-title"), "مقالات و راهنماهای انتخاب رشته");
  replaceContent(byClass("guide-hub__subtitle"), "برای سؤال‌های واقعی انتخاب رشته، راهنمای مرتبط را پیدا کن و بخوان.");
  replaceContent(byClass("guide-hub__question"), "۲۲ راهنمای کاربردی");
  const path = byClass("guide-path");
  const shortcuts = markup('<details class="flow-guide-shortcuts"><summary>از کجا شروع کنم؟</summary></details>');
  before(path, shortcuts); append(shortcuts, path);
  const search = byClass("guide-search");
  const searchWrap = markup('<div class="flow-guide-find"></div>');
  before(search, searchWrap); append(searchWrap, search, markup('<button class="flow-guide-reset" id="flow-guide-reset" type="button" hidden>پاک‌کردن فیلترها</button>'));
  setAttr(byId("guide-search"), "placeholder", "جست‌وجو در عنوان و متن مقاله‌ها…");
  setAttr(byId("guide-search"), "aria-controls", "guide-grid");
  const count = byId("guide-count");
  setAttr(count, "role", "status"); setAttr(count, "aria-live", "polite"); setAttr(count, "aria-atomic", "true");
  replaceContent(count, `${Math.min(pageSize, guides.length)} از ${guides.length} مقاله`);
  replaceContent(byId("guide-filters"), Object.entries(labels).map(([key, label]) => `<button class="guide-filter" type="button" data-category="${key}" aria-pressed="${key === "all"}">${label}</button>`).join(""));
  replaceContent(byId("guide-grid"), guides.slice(0, pageSize).map(card).join(""));
  replaceContent(byId("guide-reveal"), `نمایش ${Math.min(pageSize, guides.length - pageSize)} مقالهٔ دیگر`);
  setAttr(byId("guide-reveal"), "aria-controls", "guide-grid");
  const notice = markup('<p class="flow-guide-notice">شرایط پذیرش و قوانین ممکن است تغییر کنند؛ پیش از ثبت انتخاب‌ها، دفترچهٔ رسمی سال جاری را هم بررسی کن.</p>');
  append(byClass("guide-hub__shell"), notice);
  // Move the optional question route behind the actual search and filters.
  const filters = byId("guide-filters"); detach(shortcuts); before(filters.parentNode.childNodes[filters.parentNode.childNodes.indexOf(filters) + 1], shortcuts);
  return { guides: guides.length, searchIndexBytes: Buffer.byteLength(JSON.stringify(index)) };
}
