(() => {
  "use strict";

  const PRIMARY_HOST = "entekhab-reshte.flow1.workers.dev";
  const BACKUP_HOST = "entekhab-reshte-backup.flow1.workers.dev";
  const ATTEMPT_KEY = "flow_boot_recovery_v1";
  const MAX_RELOADS = 2;
  let finished = false;
  let timer = 0;

  function pageReady() {
    const path = location.pathname;
    if (path.startsWith("/capacity")) {
      return document.documentElement.dataset.capacityReady === "true";
    }
    if (path.startsWith("/last-admissions")) {
      const status = document.getElementById("runtime-status");
      return Boolean(status && /آماده/.test(status.textContent || ""));
    }
    if (path === "/" || path.endsWith("/flow-preview.html")) {
      return document.documentElement.dataset.flowReady === "true";
    }
    return document.readyState === "complete";
  }

  function clearRecovery() {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    try { sessionStorage.removeItem(ATTEMPT_KEY); } catch {}
  }

  function recover() {
    if (finished || pageReady()) {
      clearRecovery();
      return;
    }

    if (!navigator.onLine) {
      window.addEventListener("online", recover, { once: true });
      return;
    }

    let attempts = 0;
    try { attempts = Number(sessionStorage.getItem(ATTEMPT_KEY) || "0"); } catch {}

    if (attempts < MAX_RELOADS) {
      try { sessionStorage.setItem(ATTEMPT_KEY, String(attempts + 1)); } catch {}
      setTimeout(() => location.reload(), 450 + attempts * 700);
      return;
    }

    if (location.hostname === PRIMARY_HOST) {
      location.replace(
        "https://" +
          BACKUP_HOST +
          location.pathname +
          location.search +
          location.hash,
      );
    }
  }

  const readyPoll = setInterval(() => {
    if (pageReady()) {
      clearInterval(readyPoll);
      clearRecovery();
    }
  }, 250);

  window.addEventListener(
    "error",
    (event) => {
      const target = event.target;
      if (target instanceof HTMLScriptElement || target instanceof HTMLLinkElement) {
        setTimeout(recover, 1400);
      }
    },
    true,
  );

  window.addEventListener("unhandledrejection", (event) => {
    const message = String(event.reason?.message || event.reason || "");
    if (/Failed to fetch|Load failed|NetworkError|Importing a module script failed|ChunkLoadError/i.test(message)) {
      setTimeout(recover, 1000);
    }
  });

  timer = setTimeout(recover, 20000);

  if ("serviceWorker" in navigator) {
    window.addEventListener(
      "load",
      () => {
        navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
      },
      { once: true },
    );
  }
})();