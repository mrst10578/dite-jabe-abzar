import { parseFragment } from "parse5";

export function nodes(root, predicate) {
  const result = [];
  function visit(node) {
    if (predicate(node)) result.push(node);
    for (const child of node.childNodes ?? []) visit(child);
  }
  visit(root);
  return result;
}
export const attr = (node, name) => node.attrs?.find((item) => item.name === name)?.value;
export const hasClass = (node, name) => (attr(node, "class") ?? "").split(/\s+/).includes(name);
export function setAttr(node, name, value) {
  const existing = node.attrs.find((item) => item.name === name);
  if (existing) existing.value = value;
  else node.attrs.push({ name, value });
}
export function one(root, predicate, label) {
  const matches = nodes(root, predicate);
  if (matches.length !== 1) throw new Error(`Flow source contract: expected one ${label}, found ${matches.length}`);
  return matches[0];
}
export function detach(node) {
  if (node.parentNode) node.parentNode.childNodes.splice(node.parentNode.childNodes.indexOf(node), 1);
  node.parentNode = null;
  return node;
}
export function append(parent, ...children) {
  for (const child of children) {
    detach(child);
    child.parentNode = parent;
    parent.childNodes.push(child);
  }
}
export function before(reference, child) {
  detach(child);
  child.parentNode = reference.parentNode;
  reference.parentNode.childNodes.splice(reference.parentNode.childNodes.indexOf(reference), 0, child);
}
export const markup = (html) => parseFragment(html).childNodes[0];
export function replaceContent(node, html) {
  node.childNodes = [];
  append(node, ...parseFragment(html).childNodes.slice());
}

export function projectHome(document, manifest) {
  const byId = (id) => one(document, (node) => attr(node, "id") === id, `#${id}`);
  const byClass = (root, name) => one(root, (node) => hasClass(node, name), `.${name}`);
  const html = one(document, (node) => node.tagName === "html", "html");
  if (attr(html, "data-flow-layout") === "1") return;
  setAttr(html, "data-flow-layout", "1");
  const ready = manifest.productionReady;
  const image = (file, cls, width, height, alt = "") => `<img src="/flow/assets/${file}" class="${cls}" width="${width}" height="${height}" alt="${alt}" decoding="async">`;
  const header = byClass(document, "site-header"), brand = byClass(header, "brand-lockup");
  replaceContent(brand, image(ready ? "flow-wordmark.webp" : "flow-source.webp", "flow-wordmark", 180, 78, "Flow"));
  setAttr(brand, "aria-label", "Flow؛ بازگشت به جست‌وجو");
  setAttr(header, "aria-label", "سربرگ Flow");
  detach(byClass(header, "header-promise"));
  before(byClass(header, "header-actions"), markup('<nav class="flow-navigation" aria-label="بخش‌های جعبه ابزار"><a href="#major-search">رشته‌شناسی</a><a href="#province-search">استان‌شناسی</a><a href="#guide-search">راهنما</a></nav>'));
  const channel = byClass(header, "channel-link");
  setAttr(channel, "href", "https://t.me/Flow_Konkour");
  setAttr(channel, "aria-label", "کانال تلگرام Flow");
  replaceContent(one(channel, (node) => node.tagName === "span", "channel label"), "@Flow_Konkour");
  const main = byId("main-content"), hero = byClass(main, "hero"), title = byId("page-title");
  replaceContent(title, '<span><em>رشته‌ات</em> را پیدا کن،</span><br><span class="title-accent"><em>محل تحصیلت</em> را بشناس.</span>');
  const copy = markup('<div class="flow-hero-copy"></div>'), stage = byId("search-stage");
  append(copy, title, byClass(hero, "hero__lead"), stage);
  const art = markup(`<picture class="flow-hero-art" aria-hidden="true">${ready ? '<source media="(max-width: 720px)" srcset="/flow/assets/hero-mobile.webp">' : ""}${image(ready ? "hero-desktop.webp" : "hero-source.webp", "flow-hero-image", 1586, 992)}</picture>`);
  setAttr(one(art, (node) => node.tagName === "img", "hero image"), "fetchpriority", "high");
  append(hero, art, copy);
  const tools = byId("aris-smart-tools"), soon = byClass(tools, "smart-tools__soon-grid");
  const details = markup('<details class="flow-other-tools"><summary>ابزارهای دیگر</summary></details>');
  append(details, soon);
  detach(byClass(tools, "smart-tools__divider"));
  replaceContent(one(byClass(tools, "smart-tool--beta"), (node) => node.tagName === "h3", "compass heading"), "قطب‌نمای انتخاب رشته");
  if (ready) before(tools.childNodes[0], markup(image("compass.webp", "flow-support-art", 1254, 1254)));
  const supports = markup('<section class="flow-supports" aria-label="قطب‌نما و راهنماهای انتخاب رشته"></section>');
  const guide = markup(`<article class="flow-guide-entry">${ready ? image("guide-book.webp", "flow-support-art", 1254, 1254) : ""}<div><h2>راهنمای انتخاب رشته</h2><p>مقالات و راهنماهای کاربردی برای آشنایی با رشته‌ها و مسیرهای تحصیلی مختلف.</p><a href="#selection-guide-hub">مطالعهٔ راهنماها</a></div></article>`);
  append(supports, guide, tools, byId("aris-smart-tools-script"));
  const selection = byId("aris-selection-module");
  if (ready) before(selection, markup(`<div class="flow-divider-frame">${image("botanical-divider.webp", "flow-botanical-divider", 1536, 656)}</div>`));
  before(selection, supports);
  const next = main.childNodes[main.childNodes.indexOf(selection) + 1];
  if (next) before(next, details); else append(main, details);
  detach(byClass(stage, "channel-pulse"));
  setAttr(byId("major-search"), "placeholder", "نام رشته یا علاقه‌ات را بنویس");
  setAttr(byId("province-search"), "placeholder", "نام استان، شهر یا دانشگاه را بنویس");
  const majorForm = byId("search-form"), provinceForm = byId("province-search-form");
  setAttr(majorForm, "aria-label", "رشته‌شناسی");
  setAttr(provinceForm, "aria-label", "استان‌شناسی");
  replaceContent(byClass(majorForm, "search-submit"), "جست‌وجو");
  replaceContent(byClass(provinceForm, "province-search-submit"), "جست‌وجو");
  const field = byClass(majorForm, "search-field");
  before(field.childNodes[0], byId("filter-toggle"));
  replaceContent(byClass(field, "filter-toggle__label"), "حوزه");
  const help = byId("province-search-help");
  replaceContent(one(help, (node) => node.tagName === "span", "province example"), "مثلاً: تهران، گیلان، تبریز");
  replaceContent(one(help, (node) => node.tagName === "b", "province count"), "۳۱ استان");
  replaceContent(byClass(document, "demo-label"), "بانک رشته‌ها");
  const footer = byClass(document, "aris-home-footer");
  replaceContent(nodes(footer, (node) => node.tagName === "p")[0], "Flow · شناخت رشته، شناخت مسیر");
  const footerLink = one(footer, (node) => node.tagName === "a", "footer channel");
  setAttr(footerLink, "href", "https://t.me/Flow_Konkour");
  replaceContent(footerLink, "همراه Flow در مسیر انتخاب رشته · @Flow_Konkour");
}
