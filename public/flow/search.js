(function () {
  "use strict";
  if (!document.documentElement.hasAttribute("data-flow-theme")) return;
  const pairs = [
    ["#search-shell", "#suggestion-panel"],
    [".province-search-shell", "#province-suggestion-panel"],
  ].map(function (selectors) { return selectors.map(function (selector) { return document.querySelector(selector); }); });
  let frame = 0;
  function align(shell) {
    const header = document.querySelector(".site-header");
    const inset = Math.max(0, header?.getBoundingClientRect().bottom || 0) + 12;
    window.scrollBy({ top: shell.getBoundingClientRect().top - inset, behavior: "instant" });
    const panel = pairs.find(function (pair) { return pair[0] === shell; })?.[1];
    if (panel && !panel.hidden) {
      const height = window.visualViewport?.height || window.innerHeight;
      const available = Math.max(0, height - panel.getBoundingClientRect().top - 8);
      panel.style.setProperty("--flow-search-panel-height", Math.min(440, available, parseFloat(getComputedStyle(panel).maxHeight)) + "px");
    }
  }
  function layout() {
    frame = 0;
    const viewport = window.visualViewport;
    const height = viewport?.height || window.innerHeight;
    const open = pairs.some(function (pair) { return pair[1] && !pair[1].hidden; });
    document.body.toggleAttribute("data-flow-search-compact", open && height <= 500);
    document.body.toggleAttribute("data-flow-search-tight", open && height <= 340);
    const header = document.querySelector(".site-header");
    if (header) document.documentElement.style.setProperty("--aris-header-height", Math.ceil(header.getBoundingClientRect().height) + "px");
    const inset = Math.max(0, header?.getBoundingClientRect().bottom || 0) + 12;
    pairs.forEach(function (pair) {
      const [shell, panel] = pair;
      if (!shell || !panel) return;
      const formHeight = shell.querySelector("form")?.getBoundingClientRect().height || 80;
      const shellStyle = getComputedStyle(shell);
      const panelStyle = getComputedStyle(panel);
      const gap = (parseFloat(shellStyle.paddingTop) || 0) + (parseFloat(shellStyle.paddingBottom) || 0) + (parseFloat(panelStyle.marginTop) || 0) + 8;
      const available = Math.max(160, height - inset - formHeight - gap);
      panel.style.setProperty("--flow-search-panel-height", Math.min(440, available) + "px");
      if (height <= 500 && !panel.hidden) window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () { if (!panel.hidden) align(shell); });
      });
    });
  }
  function schedule() { if (!frame) frame = window.requestAnimationFrame(layout); }
  pairs.forEach(function (pair) {
    const [shell, panel] = pair;
    if (!shell || !panel) return;
    let wasOpen = !panel.hidden;
    new MutationObserver(function () {
      const open = !panel.hidden;
      schedule();
      if (open && !wasOpen) {
        // Put the input and the first choices together in view, without moving
        // the page again on each keystroke or changing keyboard focus.
        window.requestAnimationFrame(function () {
          if (panel.hidden) return;
          const top = shell.getBoundingClientRect().top;
          const height = window.visualViewport?.height || window.innerHeight;
          const header = document.querySelector(".site-header");
          const inset = Math.max(0, header?.getBoundingClientRect().bottom || 0) + 12;
          if (top > height * .55 || top < inset) {
            align(shell);
          }
        });
      }
      wasOpen = open;
    }).observe(panel, { attributes: true, attributeFilter: ["hidden"] });
  });
  window.addEventListener("resize", schedule, { passive: true });
  window.visualViewport?.addEventListener("resize", function () {
    layout();
    const active = pairs.find(function (pair) { return pair[1] && !pair[1].hidden; });
    if (!active) return;
    align(active[0]);
  }, { passive: true });
  const header = document.querySelector(".site-header");
  if (header) new ResizeObserver(schedule).observe(header);
  layout();
}());
