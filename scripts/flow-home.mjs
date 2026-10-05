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
  const image = (file, cls, width, height, alt = "", deferred = false) => {
    const asset = manifest.assets?.find((item) => item.file === file);
    const dimensions = { width: asset?.width ?? width, height: asset?.height ?? height };
    const delivery = deferred ? ' loading="lazy" fetchpriority="low"' : ' loading="eager"';
    return `<img src="/flow/assets/${file}" class="${cls}" width="${dimensions.width}" height="${dimensions.height}" alt="${alt}" decoding="async"${delivery}>`;
  };
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
  const futureIntro = markup(`<div class="flow-future-intro" aria-hidden="true">${ready ? image("flow-future-capsule.png", "flow-future-capsule", 1122, 1402, "", true) : ""}<span>ابزارهای بعدی Flow در حال شکل‌گرفتن‌اند</span></div>`);
  append(details, futureIntro, soon);
  detach(byClass(tools, "smart-tools__divider"));
  replaceContent(one(byClass(tools, "smart-tool--beta"), (node) => node.tagName === "h3", "compass heading"), "قطب‌نمای انتخاب رشته");
  if (ready) before(tools.childNodes[0], markup(image("compass.webp", "flow-support-art", 1254, 1254, "", true)));
  const supports = markup('<section class="flow-supports" aria-label="قطب‌نمای انتخاب رشته"></section>');
  const guide = markup(`<article class="flow-guide-entry">${ready ? image("guide-book.webp", "flow-support-art", 1254, 1254, "", true) : ""}<div><h2>راهنمای انتخاب رشته</h2><p>مقالات و راهنماهای کاربردی برای آشنایی با رشته‌ها و مسیرهای تحصیلی مختلف.</p></div></article>`);
  const decisionCore = markup(`<div class="flow-decision-core-wrap" aria-hidden="true">${ready ? image("flow-decision-core.png", "flow-decision-core", 1254, 1254, "", true) : ""}</div>`);
  append(supports, tools, decisionCore, byId("aris-smart-tools-script"));

  const dataTools = markup(`<section class="flow-data-tools" aria-labelledby="flow-data-tools-title">
    <header class="flow-data-tools__head">
      <span>داده‌های واقعی برای انتخاب دقیق‌تر</span>
      <h2 id="flow-data-tools-title">آرشیو قبولی‌ها و آمار پذیرش دانشگاه‌ها</h2>
      <p>برای اینکه انتخاب رشته فقط بر پایه حدس نباشد، این بخش داده‌های قبولی سال‌های گذشته، آخرین قبولی‌ها و تعداد پذیرش دانشگاه‌ها را کنار هم جمع می‌کند.</p>
    </header>

    <article class="flow-data-card flow-data-card--featured" id="historical-admissions">
      <div class="flow-data-card__copy">
        <span class="flow-data-card__eyebrow">پوشش سال‌های ۱۳۹۰ تا ۱۴۰۴</span>
        <h3>دیتابیس قبولی سال‌های گذشته</h3>
        <p>این دیتابیس هزاران کارنامه و رکورد قبولی از سال ۱۳۹۰ تا ۱۴۰۴ را در یک مجموعه یکپارچه پوشش می‌دهد؛ می‌توانید قبولی‌های سال‌های مختلف را کنار هم ببینید، انتخاب‌ها را با نمونه‌های واقعی مقایسه کنید و با دید بازتری سراغ چینش انتخاب رشته بروید.</p>
        <a class="flow-data-action" href="https://konkour.database.loprax.workers.dev" target="_blank" rel="noopener noreferrer">ورود به دیتابیس قبولی‌ها</a>
      </div>
      <div class="flow-data-card__visual" aria-hidden="true">
        ${ready ? image("flow-data-archive.png", "flow-data-card__art", 1254, 1254, "", true) : ""}
        <span class="flow-data-card__visual-label"><strong>۱۵</strong><small>سال داده · ۱۳۹۰ تا ۱۴۰۴</small></span>
      </div>
    </article>

    <article class="flow-data-card" id="last-admission-data">
      <div class="flow-data-card__copy">
        <span class="flow-data-card__eyebrow">آخرین مرزهای قبولی</span>
        <h3>دیتای آخرین قبولی‌های دانشگاه‌ها در چند رشته مختلف</h3>
        <p>اینجا آخرین رتبه‌ها و نمونه‌های قبولی رشته‌های منتخب در دانشگاه‌های مختلف قرار می‌گیرد تا سریع‌تر ببینید مرز قبولی هر رشته و دانشگاه در داده‌های موجود کجا بوده و مقایسه بین انتخاب‌ها ساده‌تر شود.</p>
        <a class="flow-data-action" href="/last-admissions/">ورود به آخرین قبولی‌ها</a>
        <p class="flow-data-card__note">رشته، دانشگاه و نوع دوره را فیلتر کن و رتبه‌های ثبت‌شده هر سه منطقه را کنار هم مقایسه کن.</p>
      </div>
      <div class="flow-data-card__visual" aria-hidden="true">
        ${ready ? image("flow-acceptance-gate.png", "flow-data-card__art flow-data-card__art--portrait", 1122, 1402, "", true) : ""}
      </div>
    </article>

    <article class="flow-data-card flow-data-card--tool" id="admission-count-tool">
      <div class="flow-data-card__copy">
        <span class="flow-data-card__eyebrow">ابزار آمار پذیرش</span>
        <h3>ظرفیت پذیرش دانشگاه‌ها در رشته‌های مختلف</h3>
        <p>گروه آزمایشی، رشته و دانشگاه‌های موردنظرت را انتخاب کن و ظرفیت اعلام‌شده در سال‌های ۱۴۰۱ تا ۱۴۰۴ را کنار هم ببین. این ابزار در صفحه‌ای مستقل باز می‌شود.</p>
        <a class="flow-data-action" href="/capacity/">ورود به ابزار ظرفیت پذیرش</a>
      </div>
      <div class="flow-data-card__visual" aria-hidden="true">
        ${ready ? image("flow-capacity-garden.png", "flow-data-card__art", 1254, 1254, "", true) : ""}
      </div>
      <div class="flow-admission-years" aria-label="سال‌های تحت پوشش">
        <span class="is-soon"><b>۱۴۰۵</b><small>به‌زودی</small></span>
        <span><b>۱۴۰۴</b><small>قابل مشاهده</small></span>
        <span><b>۱۴۰۳</b><small>قابل مشاهده</small></span>
        <span><b>۱۴۰۲</b><small>قابل مشاهده</small></span>
        <span><b>۱۴۰۱</b><small>قابل مشاهده</small></span>
      </div>
      <p class="flow-data-card__note">ظرفیت اعلام‌شده با تعداد افراد پذیرفته‌شده متفاوت است؛ جزئیات دوره‌ها و منابع در صفحهٔ ابزار در دسترس است.</p>
    </article>
  </section>`);

  const selection = byId("aris-selection-module");
  const divider = (file, modifier) => markup(`<div class="flow-divider-frame" aria-hidden="true">${ready ? image(file, `flow-botanical-divider ${modifier}`, 2172, 724, "", true) : ""}</div>`);
  before(selection, supports);
  before(selection, divider("flow-divider-direct.png", "flow-divider--direct"));
  before(selection, dataTools);
  before(selection, divider("flow-divider-split.png", "flow-divider--split"));
  before(selection, guide);
  const next = main.childNodes[main.childNodes.indexOf(selection) + 1];
  const finalDivider = divider("flow-divider-knot.png", "flow-divider--knot");
  if (next) {
    before(next, finalDivider);
    before(next, details);
  } else {
    append(main, finalDivider, details);
  }
  detach(byClass(stage, "channel-pulse"));
  setAttr(byId("major-search"), "placeholder", "نام رشته یا علاقه‌ات را بنویس");
  setAttr(byId("province-search"), "placeholder", "نام استان، شهر یا دانشگاه را بنویس");
  const majorForm = byId("search-form"), provinceForm = byId("province-search-form");
  setAttr(majorForm, "aria-label", "رشته‌شناسی");
  setAttr(provinceForm, "aria-label", "استان‌شناسی");
  if (ready) before(provinceForm, markup(`<div class="flow-province-art-wrap" aria-hidden="true">${image("flow-iran-atlas.png", "flow-province-art", 1122, 1402, "", true)}</div>`));
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
  replaceContent(footer, `
    <div class="flow-home-footer__shell">
      <div class="flow-home-footer__brand">
        <img class="flow-home-footer__logo" src="/flow/assets/flow-wordmark.webp" width="180" height="78" alt="Flow" loading="lazy" decoding="async">
        <span class="flow-home-footer__eyebrow">FLOW · SELECTION TOOLBOX</span>
        <h2>انتخاب بهتر، با شناخت بیشتر.</h2>
        <p>ابزارها، داده‌ها و راهنماهایی که مسیر انتخاب رشته را شفاف‌تر می‌کنند، اینجا کنار هم جمع شده‌اند.</p>
        <span class="flow-home-footer__status"><i aria-hidden="true"></i> جعبه ابزار Flow در حال توسعه و تکمیل مداوم است.</span>
      </div>
      <div class="flow-home-footer__telegram">
        <span class="flow-home-footer__telegram-label">کانال رسمی Flow در تلگرام</span>
        <strong>تحلیل‌ها و آپدیت‌های انتخاب رشته را از دست نده.</strong>
        <a class="aris-footer-join" href="https://t.me/Flow_Konkour">عضویت در کانال فلو</a>
        <span class="flow-channel-handle" dir="ltr">@Flow_KonKour</span>
      </div>
    </div>
    <div class="flow-home-footer__bottom">
      <span>Flow · جعبه ابزار انتخاب رشته</span>
      <span>شناخت رشته · شناخت مسیر · انتخاب دقیق‌تر</span>
    </div>
  `);
}
