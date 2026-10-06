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
    // The psychology global and arisModuleReady data flag belonged to an older
    // bootstrap path and are no longer created. Waiting for them keeps the
    // startup overlay on screen forever even though the homepage is usable.
    const ready = Boolean(
      window.ArisSelectionModule &&
      document.getElementById("major-search") &&
      document.readyState !== "loading"
    );
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

(function () {
  "use strict";

  const RECOVERY_KEY = "flow_boot_recovery_v1";
  const PRIMARY_HOST = "entekhab-reshte.flow1.workers.dev";
  const BACKUP_HOST = "entekhab-reshte-backup.flow1.workers.dev";
  let recovering = false;

  function resetRecovery() {
    try { sessionStorage.removeItem(RECOVERY_KEY); } catch {}
  }

  function recover() {
    if (recovering) return;
    if (!navigator.onLine) {
      window.addEventListener("online", recover, { once: true });
      return;
    }

    let attempts = 0;
    try { attempts = Number(sessionStorage.getItem(RECOVERY_KEY) || "0"); } catch {}

    if (attempts < 2) {
      recovering = true;
      try { sessionStorage.setItem(RECOVERY_KEY, String(attempts + 1)); } catch {}
      setTimeout(function () { location.reload(); }, 500 + attempts * 700);
      return;
    }

    const current = location.hostname;
    const fallback = current === PRIMARY_HOST ? BACKUP_HOST : current === BACKUP_HOST ? "" : PRIMARY_HOST;
    if (!fallback) return;

    recovering = true;
    const target = "https://" + fallback + location.pathname + location.search + location.hash;
    location.replace(target);
  }

  window.addEventListener(
    "error",
    function (event) {
      const target = event.target;
      if (target instanceof HTMLScriptElement || target instanceof HTMLLinkElement) {
        setTimeout(recover, 250);
      }
    },
    true,
  );

  window.addEventListener("unhandledrejection", function (event) {
    const message = String(event.reason?.message || event.reason || "");
    if (/ChunkLoadError|Loading chunk|dynamically imported module|Failed to fetch|NetworkError/i.test(message)) {
      setTimeout(recover, 250);
    }
  });

  const healthTimer = setInterval(function () {
    const state = document.documentElement.dataset.flowLoading;
    if (!state) {
      clearInterval(healthTimer);
      resetRecovery();
    } else if (state === "error") {
      clearInterval(healthTimer);
      recover();
    }
  }, 500);

  if ("serviceWorker" in navigator) {
    window.addEventListener(
      "load",
      function () {
        const register = function () {
          navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(function () {});
        };
        if ("requestIdleCallback" in window) {
          window.requestIdleCallback(register, { timeout: 4000 });
        } else {
          setTimeout(register, 1500);
        }
      },
      { once: true },
    );
  }
}());
