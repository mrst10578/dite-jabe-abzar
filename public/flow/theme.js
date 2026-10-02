(function () {
  "use strict";
  if (document.documentElement.dataset.flowLayout !== "1") return;
  const nav = document.querySelector(".flow-navigation");
  if (!nav || nav.dataset.flowBound) return;
  nav.dataset.flowBound = "true";
  function focusSearch(id) {
    const target = document.getElementById(id);
    if (!target) return;
    const viewer = ["major", "province"].map((kind) => document.getElementById(kind + "-viewer"))
      .find((element) => element && !element.hidden);
    const observer = viewer ? new MutationObserver(finish) : null;
    let settled = false;
    function finish() {
      if (settled || (viewer && !viewer.hidden)) return;
      settled = true;
      observer?.disconnect();
      // The native close path also restores focus in an animation frame.
      // Queue after it so the navigation's requested search wins.
      window.requestAnimationFrame(function () {
        target.scrollIntoView({ block: "center", behavior: "auto" });
        target.focus({ preventScroll: true });
      });
    }
    if (viewer) {
      observer.observe(viewer, { attributes: true, attributeFilter: ["hidden"] });
      document.getElementById(viewer.id + "-close")?.click();
      finish();
    } else finish();
  }
  nav.addEventListener("click", function (event) {
    const link = event.target instanceof Element ? event.target.closest("a") : null;
    if (!link?.hash) return;
    event.preventDefault();
    focusSearch(link.hash.slice(1));
  });
  document.querySelector(".flow-guide-entry a")?.addEventListener("click", function (event) {
    event.preventDefault();
    document.getElementById("selection-guide-hub")?.scrollIntoView({ block: "start", behavior: "auto" });
    document.getElementById("guide-search")?.focus({ preventScroll: true });
  });
  document.documentElement.dataset.flowReady = "true";
}());
