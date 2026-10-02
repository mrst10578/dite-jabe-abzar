(function (global) {
  "use strict";
  const channel = "https://t.me/Flow_KonKour";
  const handle = "@Flow_KonKour";
  const logo = "/flow/assets/flow-wordmark.webp";
  const marks = "[\\u200e\\u200f\\u202a-\\u202e\\u2066-\\u2069]*";
  const oldHandle = new RegExp("@" + marks + "ArisAcademy" + marks, "gi");
  const oldChannel = /https?:\/\/(?:www\.)?(?:t\.me|telegram\.me)\/ArisAcademy\b\/?/gi;
  const persian = /(?<![\p{L}])[آا]ریس(?:[\s\u200c]+[آا]کادمی)?(?![\p{L}])/gu;
  const academy = /\bAris(?:[\s\u200c]+Academy|Academy)\b/gi;
  function common(value) {
    return value.replace(/https?:\\\/\\\/(?:www\.)?(?:t\.me|telegram\.me)\\\/ArisAcademy\b/gi, channel.replace(/\//g, "\\/"))
      .replace(/@(?:\\u(?:200[e-f]|202[a-e]|206[6-9]))*ArisAcademy(?:\\u(?:200[e-f]|202[a-e]|206[6-9]))*/gi, handle)
      .replace(oldChannel, channel).replace(oldHandle, handle)
      .replace(persian, "فلو").replace(academy, "FLOW")
      .replace(/\bAris_(Advisor_Report|Answers)_/g, "Flow_$1_")
      .replace(/@Flow_Konkour/gi, handle).replace(/https:\/\/t\.me\/Flow_Konkour/gi, channel);
  }
  function text(value) {
    return common(value).replace(/\bAris\b/gi, "FLOW");
  }
  function code(value) {
    // Presentation phrases only: never rename APIs, selectors, media tokens,
    // storage/schema keys or compact source payloads.
    return common(value).replace(/(["'])ARIS\1/gi, "$1FLOW$1");
  }
  const plane = '<svg class="flow-channel-icon" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M22.162 2.656a1.23 1.23 0 0 0-1.272-.166L1.43 10.208c-.93.367-.925 1.68.01 2.04l4.567 1.759 1.769 5.694a1.08 1.08 0 0 0 1.835.402l2.548-2.68 4.897 3.609c.746.55 1.811.146 2.01-.755L22.65 3.84a1.23 1.23 0 0 0-.488-1.184ZM8.116 13.383l9.135-5.745-7.558 7.111-.344 3.19-1.233-4.556Z"/></svg>';
  const image = '<img class="flow-footer-logo" src="' + logo + '" width="128" height="54" alt="FLOW" decoding="async">';
  const join = plane + '<span>عضویت در کانال فلو</span>';
  function documentBrand(root) {
    const doc = root.ownerDocument || root;
    const walker = doc.createTreeWalker(root, 4);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.parentElement?.closest("script,style,textarea")) node.nodeValue = text(node.nodeValue);
    }
    root.querySelectorAll("*").forEach(function (element) {
      for (const name of ["title", "alt", "aria-label", "placeholder"]) {
        if (element.hasAttribute(name)) element.setAttribute(name, text(element.getAttribute(name)));
      }
      if (element.matches('meta[name="description"],meta[name="application-name"],meta[name="copyright"],meta[property^="og:"],meta[name^="twitter:"]')) {
        element.content = text(element.content);
      }
      if (element.hasAttribute("href")) {
        element.setAttribute("href", common(element.getAttribute("href")));
      }
      if (element.matches("script:not([type]),script[type='text/javascript'],style") && !element.id.startsWith("__ARYO_")) {
        element.textContent = code(element.textContent);
      }
    });
    root.querySelectorAll('svg.aris-footer-mark,svg:has(use[href="#aris-sigil-shape"])').forEach(function (mark) {
      const holder = doc.createElement("template"); holder.innerHTML = image;
      mark.replaceWith(holder.content.firstElementChild);
    });
    root.querySelectorAll(".brand-mark:has(svg)").forEach(function (mark) {
      mark.classList.add("flow-brand-mark"); mark.innerHTML = image;
    });
    root.querySelectorAll('a[href="' + channel + '"]').forEach(function (link) {
      link.target = "_blank"; link.rel = "noopener noreferrer";
      if (link.matches(".aris-footer-join,.aris-home-footer a,.aris-inline-invite a") || /عضویت|همراه.*شو/.test(link.textContent)) {
        link.classList.add("flow-channel-join"); link.innerHTML = join;
        link.setAttribute("aria-label", "عضویت در کانال فلو در تلگرام");
      } else if (link.textContent.includes(handle)) {
        link.setAttribute("dir", "ltr");
      }
    });
    root.querySelectorAll(".aris-footer-credit").forEach(function (credit) {
      credit.textContent = "FLOW · راهنمای شناخت رشته و محل تحصیل";
    });
    root.querySelectorAll("#aris-sigil-shape").forEach(function (symbol) { symbol.remove(); });
    return root;
  }
  function html(source) {
    const template = global.document.createElement("template");
    template.innerHTML = source;
    documentBrand(template.content);
    return template.innerHTML;
  }
  global.FlowBranding = { text, code, document: documentBrand, html, channel, handle, logo, image, join };
}(globalThis));
