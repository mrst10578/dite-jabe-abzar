(function () {
  "use strict";
  document.documentElement.dataset.flowLoading = "preparing";
  const started = Date.now();
  let timer;
  function release() {
    clearTimeout(timer);
    delete document.documentElement.dataset.flowLoading;
    document.body?.removeAttribute("aria-busy");
  }
  function check() {
    clearTimeout(timer);
    const loader = document.getElementById("flow-startup");
    if (!loader) { timer = setTimeout(check, 100); return; }
    document.body.setAttribute("aria-busy", "true");
    const ready = window.ArisSelectionModule && window.ArisPsychologyTest &&
      document.getElementById("aris-selection-module")?.dataset.arisModuleReady === "true" &&
      document.getElementById("major-search") && document.readyState !== "loading";
    if (ready) { release(); return; }
    if (Date.now() - started > 20000) {
      document.documentElement.dataset.flowLoading = "error";
      loader.querySelector('[role="status"]').textContent = "آماده‌سازی صفحه طول کشید. دوباره تلاش کن.";
      loader.querySelector("small").hidden = true;
      loader.querySelector(".flow-loading-orbit").hidden = true;
      const retry = loader.querySelector("button");
      retry.hidden = false;
      retry.onclick = function () { location.reload(); };
      timer = setTimeout(check, 250);
      return;
    }
    timer = setTimeout(check, 100);
  }
  document.addEventListener("DOMContentLoaded", check, { once:true });
  // Detect stalled transfers too; this status is independent of optional media.
  timer = setTimeout(check, 100);
}());
