(function () {
  "use strict";

  if (!document.documentElement.hasAttribute("data-flow-theme")) return;
  const hero = document.querySelector(".main > .hero");
  const searchStage = document.getElementById("search-stage");
  const provinceSection = document.getElementById("province-search-section");
  const header = document.querySelector(".site-header");
  if (!hero || !searchStage || !provinceSection || !header) return;

  const finalAssets = document.body.dataset.flowAssets === "ready";
  const asset = (name, source) => "/flow/assets/" + (finalAssets ? name : source);
  function image(src, className) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = "";
    img.className = className;
    img.decoding = "async";
    return img;
  }

  // Preserve the original link element: the legacy navigation binds to it.
  const brand = header.querySelector(".brand-lockup");
  if (brand) {
    const logo = image(asset("flow-wordmark.webp", "flow-source.webp"), "flow-wordmark");
    logo.alt = "Flow";
    logo.width = 180;
    logo.height = 78;
    brand.replaceChildren(logo);
    brand.setAttribute("aria-label", "Flow؛ بازگشت به جست‌وجو");
  }
  header.setAttribute("aria-label", "سربرگ Flow");
  const promise = header.querySelector(".header-promise");
  if (promise) promise.remove();

  const nav = document.createElement("nav");
  nav.className = "flow-navigation";
  nav.setAttribute("aria-label", "بخش‌های جعبه ابزار");
  [
    ["رشته‌شناسی", "major-search"],
    ["استان‌شناسی", "province-search"],
    ["راهنما", "guide-search"],
  ].forEach(([label, id]) => {
    const link = document.createElement("a");
    link.href = "#" + id;
    link.textContent = label;
    link.addEventListener("click", function (event) {
      event.preventDefault();
      const target = document.getElementById(id);
      target?.scrollIntoView({ block: "center", behavior: "auto" });
      target?.focus({ preventScroll: true });
    });
    nav.append(link);
  });
  header.insertBefore(nav, header.querySelector(".header-actions"));
  const channel = header.querySelector(".channel-link");
  if (channel) {
    channel.href = "https://t.me/Flow_Konkour";
    channel.setAttribute("aria-label", "کانال تلگرام Flow");
    const label = channel.querySelector("span");
    if (label) label.textContent = "@Flow_Konkour";
  }

  const art = document.createElement("picture");
  art.className = "flow-hero-art";
  art.setAttribute("aria-hidden", "true");
  if (finalAssets) {
    const mobile = document.createElement("source");
    mobile.media = "(max-width: 720px)";
    mobile.srcset = asset("hero-mobile.webp", "hero-source.webp");
    art.append(mobile);
  }
  const heroImage = image(asset("hero-desktop.webp", "hero-source.webp"), "flow-hero-image");
  heroImage.fetchPriority = "high";
  art.append(heroImage);
  hero.prepend(art);

  // Reuse both original search forms, input IDs, result panels and listeners.
  const copy = document.createElement("div");
  copy.className = "flow-hero-copy";
  const title = document.getElementById("page-title");
  const lead = hero.querySelector(".hero__lead");
  if (title) {
    const first = document.createElement("span");
    first.textContent = "رشته‌ات را پیدا کن،";
    const second = document.createElement("span");
    second.className = "title-accent";
    second.textContent = "محل تحصیلت را بشناس.";
    title.replaceChildren(first, document.createElement("br"), second);
    copy.append(title);
  }
  if (lead) copy.append(lead);
  const smartTools = document.getElementById("aris-smart-tools");
  const supports = document.createElement("section");
  supports.className = "flow-supports";
  supports.setAttribute("aria-label", "قطب‌نما و راهنماهای انتخاب رشته");
  if (smartTools) {
    const soon = smartTools.querySelector(".smart-tools__soon-grid");
    const divider = smartTools.querySelector(".smart-tools__divider");
    if (soon) {
      const details = document.createElement("details");
      details.className = "flow-other-tools";
      const summary = document.createElement("summary");
      summary.textContent = "ابزارهای دیگر";
      details.append(summary, soon);
      document.getElementById("aris-selection-module")?.after(details);
    }
    if (divider) divider.remove();
    const heading = smartTools.querySelector(".smart-tool--beta h3");
    if (heading) heading.textContent = "قطب‌نمای انتخاب رشته";
    if (finalAssets) smartTools.prepend(image(asset("compass.webp"), "flow-support-art"));
    supports.append(smartTools);
  }
  const guide = document.createElement("article");
  guide.className = "flow-guide-entry";
  const guideCopy = document.createElement("div");
  const guideTitle = document.createElement("h2");
  guideTitle.textContent = "راهنمای انتخاب رشته";
  const guideText = document.createElement("p");
  guideText.textContent = "مقالات و راهنماهای کاربردی برای آشنایی با رشته‌ها و مسیرهای تحصیلی مختلف.";
  const guideLink = document.createElement("a");
  guideLink.href = "#selection-guide-hub";
  guideLink.textContent = "مطالعهٔ راهنماها";
  guideLink.addEventListener("click", function (event) {
    event.preventDefault();
    document.getElementById("selection-guide-hub")?.scrollIntoView({ block: "start", behavior: "auto" });
    document.getElementById("guide-search")?.focus({ preventScroll: true });
  });
  guideCopy.append(guideTitle, guideText, guideLink);
  guide.append(guideCopy);
  if (finalAssets) guide.prepend(image(asset("guide-book.webp"), "flow-support-art"));
  supports.append(guide);
  hero.after(supports);
  if (finalAssets) {
    const divider = image(asset("botanical-divider.webp"), "flow-botanical-divider");
    hero.after(divider);
  }

  copy.append(searchStage);
  hero.append(copy);
  const pulse = searchStage.querySelector(".channel-pulse");
  if (pulse) pulse.remove();
  const majorInput = document.getElementById("major-search");
  if (majorInput) majorInput.placeholder = "نام رشته یا علاقه‌ات را بنویس";
  const provinceInput = document.getElementById("province-search");
  if (provinceInput) provinceInput.placeholder = "نام استان، شهر یا دانشگاه را بنویس";
  document.getElementById("search-form")?.setAttribute("aria-label", "رشته‌شناسی");
  document.getElementById("province-search-form")?.setAttribute("aria-label", "استان‌شناسی");
  ["#search-form .search-submit", "#province-search-form .province-search-submit"].forEach((selector) => {
    const button = document.querySelector(selector);
    if (button) button.textContent = "جست‌وجو";
  });
  const filter = document.getElementById("filter-toggle");
  const field = document.querySelector("#search-form .search-field");
  if (filter && field) {
    field.prepend(filter);
    const label = filter.querySelector(".filter-toggle__label");
    if (label) label.textContent = "حوزه";
  }
  const provinceHelp = document.querySelector("#province-search-help span");
  if (provinceHelp) provinceHelp.textContent = "مثلاً: تهران، گیلان، تبریز";
  const provinceCount = document.querySelector("#province-search-help b");
  if (provinceCount) provinceCount.textContent = "۳۱ استان";
  const bankLabel = document.querySelector(".demo-label");
  if (bankLabel) bankLabel.textContent = "بانک رشته‌ها";
  document.documentElement.dataset.flowReady = "true";
}());
