(function () {
  "use strict";
  const pending = new Map();
  window.FlowPayloads = {
    configure: function (catalog) { this.catalog = catalog; },
    ensure: function (id) {
      if (pending.has(id)) return pending.get(id);
      const url = this.catalog[id];
      if (!url) return Promise.reject(new Error("Unknown Flow document: " + id));
      const request = fetch(url, { signal: AbortSignal.timeout(20000) }).then(function (response) {
        if (!response.ok) throw new Error("Flow document request: " + response.status);
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
