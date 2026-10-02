(function () {
  "use strict";
  if (!document.documentElement.hasAttribute("data-flow-theme")) return;
  const viewer = document.getElementById("major-viewer");
  const root = document.getElementById("major-document");
  if (!viewer || !root) return;

  const homeTitle = document.title;

  // Roll out through an explicit adapter registry. These profiles were inspected
  // in the real reader first; all other majors intentionally keep the legacy UI.
  const majorAdapters = new Map([
    ["computer-engineering", { family: "engineering" }],
    ["medicine", { family: "health" }],
    ["law", { family: "humanities" }],
    ["graphic-design", { family: "art" }],
    ["psychology", { family: "humanities" }],
  ]);

  function getAdapter(page) {
    return page ? majorAdapters.get(page.dataset.arisProfile) : null;
  }

  function clearReaderState(wasFlowReader) {
    if (wasFlowReader && viewer.hidden) document.title = homeTitle;
    delete document.body.dataset.flowReader;
    delete document.body.dataset.flowReaderFamily;
  }

  function wrapFlatSections(page) {
    let section = null;
    Array.from(page.children).forEach(function (node) {
      if (node.tagName === "H2") {
        section = document.createElement("section");
        section.className = "flow-reader-section";
        page.insertBefore(section, node);
        section.append(node);
      } else if (section && !["SECTION", "ASIDE", "DETAILS"].includes(node.tagName)) {
        section.append(node);
      } else {
        section = null;
      }
    });
  }

  function repairMarketJump(page) {
    const marketHeading = Array.from(page.querySelectorAll("h2")).find(function (heading) {
      return /بازار کار|محیط کار|فرصت.{0,12}شغلی|درآمد|واقعیت.{0,10}کار/.test(heading.textContent);
    });
    const marketSection = marketHeading?.closest(".flow-reader-section");
    const nav = page.querySelector("[data-aris-quick-nav]");
    if (!marketSection || !nav) return;

    marketSection.dataset.arisSection = "market";
    marketSection.tabIndex = -1;
    nav.addEventListener("click", function (event) {
      const button = event.target instanceof Element
        ? event.target.closest('[data-aris-jump="market"]')
        : null;
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      nav.querySelectorAll("button").forEach(function (item) {
        item.classList.toggle("is-active", item === button);
      });
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      marketSection.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      marketSection.focus({ preventScroll: true });
    }, true);
  }

  function brandPortalChrome(page) {
    const footer = root.querySelector(".aris-dossier-footer");
    if (footer) {
      footer.setAttribute("aria-label", "پایان راهنما و همراهی با Flow");
      const footerEyebrow = footer.querySelector(".aris-footer-eyebrow");
      const footerDescription = footer.querySelector(".aris-footer-description");
      const footerCredit = footer.querySelector(".aris-footer-credit");
      if (footerEyebrow) footerEyebrow.textContent = "Flow · قدم بعدی تو";
      if (footerDescription) footerDescription.textContent = "این راهنما را کنار علاقه‌ها، توانایی‌ها و شرایط خودت بگذار. برای شناخت گزینه‌های بعدی، همراه Flow باش.";
      if (footerCredit) footerCredit.textContent = "FLOW · راهنمای شناخت رشته و محل تحصیل";
      footer.querySelectorAll(".aris-footer-actions a").forEach(function (link) {
        link.href = "https://t.me/Flow_KonKour";
        link.setAttribute("aria-label", "کانال تلگرام Flow");
        if (!link.classList.contains("aris-footer-join")) link.textContent = "@Flow_KonKour";
        if (link.classList.contains("aris-footer-handle")) link.dir = "ltr";
      });
    }

    const invite = page.querySelector(".aris-inline-invite");
    if (!invite) return;
    invite.setAttribute("aria-label", "ادامهٔ مسیر با Flow");
    const paragraph = invite.querySelector("p");
    if (paragraph) {
      const strong = paragraph.querySelector("b");
      if (strong) paragraph.replaceChildren(strong, "راهنماهای بعدی را در کانال Flow دنبال کن.");
      else paragraph.textContent = "راهنماهای بعدی را در کانال Flow دنبال کن.";
    }
    const link = invite.querySelector("a");
    if (link) {
      link.href = "https://t.me/Flow_KonKour";
    }
  }

  function enhanceReader() {
    const page = root.querySelector(".page[data-aris-profile]");
    const adapter = getAdapter(page);
    const active = !viewer.hidden && page && adapter;
    const wasFlowReader = document.body.dataset.flowReader === "major";

    if (!active) {
      clearReaderState(wasFlowReader);
      return;
    }

    document.body.dataset.flowReader = "major";
    document.body.dataset.flowReaderFamily = adapter.family;
    const viewerTitle = document.getElementById("major-viewer-title")?.textContent?.trim();
    document.title = (viewerTitle || "رشته‌شناسی") + " | Flow";

    if (page.dataset.flowReaderTemplate) return;
    page.dataset.flowReaderTemplate = "1";
    page.dataset.flowReaderAdapter = adapter.family;

    const hero = page.querySelector("header.hero");
    const eyebrow = hero?.querySelector(".eyebrow");
    if (eyebrow) eyebrow.textContent = "رشته‌شناسی · Flow";
    if (hero) {
      const art = document.createElement("img");
      art.className = "flow-reader-art";
      art.src = "/flow/assets/guide-book.webp";
      art.alt = "";
      art.width = 1254;
      art.height = 1254;
      art.decoding = "async";
      hero.append(art);
    }

    // All five inspected families share the same flat H2 runs, while their lead,
    // table and evidence blocks vary. Wrap only those flat runs and leave authored
    // structural sections untouched.
    wrapFlatSections(page);
    repairMarketJump(page);
    brandPortalChrome(page);
    window.FlowBranding.document(root);

    // On direct links the original runtime can scroll before the deferred Flow
    // styles hide the home guide hub. Align once after the final reader layout.
    window.requestAnimationFrame(function () {
      if (root.contains(page) && !viewer.hidden) viewer.scrollIntoView({ behavior: "auto", block: "start" });
    });
  }

  // Native readers inject the dossier synchronously, both on search and history.
  // Observe only the container and visibility; never the whole body/subtree.
  new MutationObserver(enhanceReader).observe(root, { childList: true });
  new MutationObserver(enhanceReader).observe(viewer, { attributes: true, attributeFilter: ["hidden"] });
  enhanceReader();

}());
