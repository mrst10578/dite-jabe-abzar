(function () {
  "use strict";
  if (window.FlowTypography || !document.documentElement.hasAttribute("data-flow-theme")) return;

  const marker = "[data-flow-muted-text]";
  const structuralExcluded = "script,style,textarea,input,select,option,pre,code,svg,canvas,h1,h2,h3,h4,h5,h6";
  const excluded = structuralExcluded + ',[aria-hidden="true"]';
  const muted = new Set([
    "182,203,212", "145,170,181", "209,224,226", "172,191,196",
    "170,189,194", "160,185,186", "184,212,211",
  ]);
  const directHeadings = [
    ":scope > h1", ":scope > h2", ":scope > h3", ":scope > h4", ":scope > strong", ":scope > b",
    ":scope > [class$='__title']", ":scope > [class$='-title']",
    ":scope > header > :is(h1,h2,h3,h4,strong)",
    ":scope > div > :is(h1,h2,h3,h4,strong,[class$='__title'],[class$='-title'])",
  ].join(",");
  const associations = [
    ["#filter-toggle", ".filter-toggle__label"],
    [".panel-head", ".panel-title"],
    [".smart-tool--beta", ".smart-tool__beta-main > h3"],
    [".smart-tool--soon,.flow-other-tools", ".smart-tool--soon h3,h3"],
    [".flow-guide-entry", "h2"],
    [".flow-hero-copy", "#page-title"],
    [".guide-card", ".guide-card__title"],
    [".boomi-spotlight__copy", ":scope > strong"],
    [".guide-reader__copy", ".guide-reader__title"],
    [".major-viewer__labels", ".major-viewer__title"],
    [".province-viewer__labels", ".province-viewer__title"],
    [".guide-hub__shell", ".guide-hub__title"],
    [".site-header", ".flow-navigation a"],
  ];
  const pending = new Set();
  let frame = 0;

  function color(value) {
    const numbers = value.match(/[\d.]+/g)?.map(Number);
    return numbers?.length >= 3 ? { rgb: numbers.slice(0, 3).join(","), alpha: numbers[3] ?? 1 } : null;
  }

  function isMuted(style) {
    const value = color(style.color);
    return value && value.alpha > 0 && muted.has(value.rgb);
  }

  function apply(roots) {
    const styles = new Map();
    const references = new Map();
    const plans = [];
    const visited = new Set();
    function style(node) {
      if (!styles.has(node)) styles.set(node, getComputedStyle(node));
      return styles.get(node);
    }
    function referenceSize(nodes) {
      let size = Infinity;
      nodes.forEach(function (node) {
        const appearance = style(node);
        const value = color(appearance.color);
        if (value?.alpha >= .9 && (!isMuted(appearance) || /^H[1-6]$/.test(node.tagName)) && node.textContent.trim()) {
          size = Math.min(size, parseFloat(appearance.fontSize));
        }
      });
      return size;
    }
    function ceiling(parent) {
      // An inline white word keeps its original size. Do not enlarge the gray
      // words around it beyond that size, even if the section title is bigger.
      const paragraph = parent.closest("p,li,label,dt,dd,figcaption");
      const inline = paragraph ? referenceSize(Array.from(paragraph.querySelectorAll("b,strong"))) : Infinity;
      let title = Infinity;
      for (const [container, selector] of associations) {
        const context = parent.closest(container);
        if (context) {
          title = referenceSize(Array.from(context.querySelectorAll(selector)));
          if (Number.isFinite(title)) break;
        }
      }
      if (!Number.isFinite(title)) {
        for (let context = parent; context && context !== document.body; context = context.parentElement) {
          if (!references.has(context)) references.set(context, referenceSize(Array.from(context.querySelectorAll(directHeadings))));
          title = references.get(context);
          if (Number.isFinite(title)) break;
        }
      }
      if (!Number.isFinite(title)) title = parseFloat(style(document.body).fontSize);
      return Math.min(inline, title);
    }
    function plan(textNode, wrapper) {
      const parent = wrapper ? wrapper.parentElement : textNode.parentElement;
      if (!parent || parent.closest(excluded) || !textNode.textContent.trim()) return;
      const appearance = style(parent);
      const base = parseFloat(appearance.fontSize);
      if (!isMuted(appearance) || base > 24) {
        if (wrapper) plans.push({ wrapper, base, size: base });
        return;
      }
      // Equal-sized selected/unselected control labels retain their hierarchy.
      const fixedPeer = parent.closest(".guide-filter,.scale button,.pair-scale button");
      const limit = fixedPeer ? base : ceiling(parent);
      const size = Math.max(base, Math.min(base + 2, limit));
      plans.push({ textNode, wrapper, base, size });
    }

    // Read every original parent size before writing. Parents never grow, so
    // nested text and later renders cannot accidentally receive +4px or +6px.
    roots.forEach(function (root) {
      if (!root?.isConnected || root.nodeType !== Node.ELEMENT_NODE) return;
      const wrappers = root.matches(marker) ? [root] : Array.from(root.querySelectorAll(marker));
      wrappers.forEach(function (wrapper) {
        if (visited.has(wrapper)) return;
        visited.add(wrapper);
        if (wrapper.firstChild) plan(wrapper.firstChild, wrapper);
      });
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: function (node) {
          return node.parentElement?.closest(marker + "," + excluded) || !node.textContent.trim()
            ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
        },
      });
      let textNode;
      while ((textNode = walker.nextNode())) {
        if (visited.has(textNode)) continue;
        visited.add(textNode);
        plan(textNode, null);
      }
    });
    plans.forEach(function (item) {
      let wrapper = item.wrapper;
      if (!wrapper) {
        // Unchanged text needs no extra node. In particular, white emphasis
        // next to gray body copy can cap the body at its existing size.
        if (item.size === item.base || !item.textNode.isConnected) return;
        wrapper = document.createElement("span");
        wrapper.dataset.flowMutedText = "";
        item.textNode.replaceWith(wrapper);
        wrapper.append(item.textNode);
      }
      wrapper.style.setProperty("--flow-muted-size", item.size + "px");
    });
  }

  function queue(root) {
    if (!root?.isConnected) return;
    if (root.nodeType === Node.TEXT_NODE) root = root.parentElement;
    if (!root || root.closest(excluded) || root.closest(marker)) return;
    for (const existing of pending) {
      if (existing.contains(root)) return;
      if (root.contains(existing)) pending.delete(existing);
    }
    pending.add(root);
    if (!frame) frame = requestAnimationFrame(flush);
  }
  function flush() {
    frame = 0;
    const roots = Array.from(pending);
    pending.clear();
    apply(roots);
  }
  function start() {
    apply([document.body]);
    const options = {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ["class", "hidden", "aria-hidden", "aria-pressed", "aria-selected", "open"],
    };
    const observer = new MutationObserver(function (records) {
      records.forEach(function (record) {
        if (record.type === "attributes") queue(record.target);
        else record.addedNodes.forEach(function (node) {
          // Ignore our own neutral spans and text moved inside them.
          if (node.nodeType === Node.ELEMENT_NODE && node.matches(marker)) return;
          // Native compass modals/toasts can be appended outside its main view.
          // Observe that new view, without scanning the whole body on updates.
          if (record.target === document.body && node.nodeType === Node.ELEMENT_NODE && !node.matches(structuralExcluded)) observer.observe(node, options);
          queue(node);
        });
      });
    });
    const scopes = Array.from(document.querySelectorAll("main,header,footer,#flow-startup,dialog,[role='dialog'],.modal,.toast"));
    if (!scopes.length) scopes.push(...Array.from(document.body.children).filter((node) => !node.matches(structuralExcluded)));
    scopes.filter((scope) => !scopes.some((other) => other !== scope && other.contains(scope)))
      .forEach((scope) => observer.observe(scope, options));
    observer.observe(document.body, { childList: true });
    document.addEventListener("transitionend", function (event) {
      if (event.propertyName === "color" || event.propertyName === "font-size") queue(event.target);
    });
    window.addEventListener("resize", function () { queue(document.body); }, { passive: true });
    document.documentElement.dataset.flowTypography = "ready";
  }
  window.FlowTypography = { apply: function (root) { queue(root); } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}());
