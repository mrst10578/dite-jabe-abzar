(function () {
  "use strict";
  if (!document.documentElement.hasAttribute("data-flow-theme")) return;
  const viewer = document.getElementById("major-viewer");
  const root = document.getElementById("major-document");
  if (!viewer || !root) return;

  // The pilot is deliberately one real dossier. Luna can extend this allowlist
  // after checking each content family; names and URL text are not selectors.
  const pilotProfiles = new Set(["computer-engineering"]);

  function enhanceReader() {
    const page = root.querySelector(".page[data-aris-profile]");
    const active = !viewer.hidden && page && pilotProfiles.has(page.dataset.arisProfile);
    if (!active) {
      delete document.body.dataset.flowReader;
      return;
    }
    document.body.dataset.flowReader = "major";
    document.title = document.getElementById("major-viewer-title").textContent + " | Flow";
    if (page.dataset.flowReaderTemplate) return;
    page.dataset.flowReaderTemplate = "1";

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

    // Group the legacy flat heading + content runs without cloning or rewriting
    // their nodes. Existing jump listeners, tables, details and references survive.
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

    // The original flat H2's closest section was the outer viewer, so the
    // market button captured the viewer as its target before these wrappers
    // existed. Correct only that pilot jump, keeping the other native bindings.
    const marketHeading = Array.from(page.querySelectorAll("h2")).find(function (heading) {
      return /بازار کار|محیط کار|فرصت.{0,12}شغلی|درآمد|واقعیت.{0,10}کار/.test(heading.textContent);
    });
    const marketSection = marketHeading?.closest(".flow-reader-section");
    if (marketSection) {
      marketSection.dataset.arisSection = "market";
      marketSection.tabIndex = -1;
      const nav = page.querySelector("[data-aris-quick-nav]");
      nav.addEventListener("click", function (event) {
        const button = event.target.closest('[data-aris-jump="market"]');
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

    // These are portal-generated promotional blocks, not the authored article.
    // Retain the original author credit and all editorial/source references.
    const footer = root.querySelector(".aris-dossier-footer");
    if (footer) {
      footer.setAttribute("aria-label", "پایان راهنما و همراهی با Flow");
      footer.querySelector(".aris-footer-eyebrow").textContent = "Flow · قدم بعدی تو";
      footer.querySelector(".aris-footer-description").textContent = "این راهنما را کنار علاقه‌ها، توانایی‌ها و شرایط خودت بگذار. برای شناخت گزینه‌های بعدی، همراه Flow باش.";
      footer.querySelector(".aris-footer-credit").textContent = "منبع محتوای این پرونده: آریس آکادمی";
      footer.querySelectorAll(".aris-footer-actions a").forEach(function (link) {
        link.href = "https://t.me/Flow_Konkour";
        link.setAttribute("aria-label", "کانال تلگرام Flow");
        link.textContent = link.classList.contains("aris-footer-join") ? "همراه Flow شو ↗" : "@Flow_Konkour";
        if (link.classList.contains("aris-footer-handle")) link.dir = "ltr";
      });
    }
    const invite = page.querySelector(".aris-inline-invite");
    if (invite) {
      invite.setAttribute("aria-label", "ادامهٔ مسیر با Flow");
      const paragraph = invite.querySelector("p");
      const strong = paragraph.querySelector("b");
      paragraph.replaceChildren(strong, "راهنماهای بعدی را در کانال Flow دنبال کن.");
      const link = invite.querySelector("a");
      link.href = "https://t.me/Flow_Konkour";
      link.textContent = "همراه Flow شو ↗";
    }
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

  // Reuse the native close/history path before focusing a home search. The home
  // navigation otherwise tries to focus a field hidden by the open reader.
  document.querySelector(".flow-navigation")?.addEventListener("click", function (event) {
    if (document.body.dataset.flowReader !== "major") return;
    const link = event.target.closest("a");
    const target = link && document.getElementById(link.hash.slice(1));
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const observer = new MutationObserver(finish);
    function finish() {
      if (!viewer.hidden) return;
      observer.disconnect();
      window.requestAnimationFrame(function () {
        target.scrollIntoView({ block: "center", behavior: "auto" });
        target.focus({ preventScroll: true });
      });
    }
    observer.observe(viewer, { attributes: true, attributeFilter: ["hidden"] });
    document.getElementById("major-viewer-close").click();
    finish();
  }, true);
}());
