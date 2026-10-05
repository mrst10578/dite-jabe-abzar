(function () {
  "use strict";
  const pending = new Map();

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  async function fetchWithRetry(url, attempts) {
    let lastError;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const response = await fetch(url, {
          cache: "force-cache",
          signal: AbortSignal.timeout(12000),
        });
        if (response.ok) return response;
        if (response.status < 500 && response.status !== 429) {
          throw new Error("Flow document request: " + response.status);
        }
        lastError = new Error("Flow document request: " + response.status);
      } catch (error) {
        lastError = error;
      }
      if (attempt < attempts - 1) await sleep(350 * (attempt + 1));
    }
    throw lastError || new Error("Flow document request failed");
  }

  window.FlowPayloads = {
    configure: function (catalog) { this.catalog = catalog; },
    ensure: function (id) {
      if (pending.has(id)) return pending.get(id);
      const url = this.catalog[id];
      if (!url) return Promise.reject(new Error("Unknown Flow document: " + id));
      const request = fetchWithRetry(url, 4).then(function (response) {
        return response.json();
      }).then(function (payload) {
        if (payload.id !== id || typeof payload.document !== "string" || !payload.theme) throw new Error("Invalid Flow document: " + id);
        window.FlowDocuments.themes[payload.title] = payload.theme;
        // Retain the original data surface for existing integrations and QA.
        if (id === "compass") {
          const bytes = new TextEncoder().encode(payload.document);
          const parts = [];
          for (let offset = 0; offset < bytes.length; offset += 8192) parts.push(String.fromCharCode.apply(null, bytes.subarray(offset, offset + 8192)));
          document.getElementById("aris-compass-html").textContent = btoa(parts.join(""));
        } else {
          const data = document.getElementById("aris-selection-guides-data");
          const guides = JSON.parse(data.textContent);
          const guide = guides.find(function (item) { return item.id === id; });
          if (guide) { guide.document = payload.document; data.textContent = JSON.stringify(guides); }
        }
        return payload;
      }).catch(function (error) { pending.delete(id); throw error; });
      pending.set(id, request);
      return request;
    },
  };
}());
