(function () {
  "use strict";
  window.FlowDocuments = {
    configure: function (themes, css, typography) {
      this.themes = themes;
      this.css = css;
      this.typography = typography;
    },
    theme: function (source) {
      const doc = new DOMParser().parseFromString(source, "text/html");
      const theme = this.themes[doc.title];
      if (!theme) throw new Error("Unregistered Flow document: " + doc.title);
      const styles = Array.from(doc.querySelectorAll("style"));
      if (styles.length !== theme.styles.length) throw new Error("Flow document styles changed: " + doc.title);
      styles.forEach(function (style, index) {
        // Keep the original cascade for print. Screen gets the compiled colors.
        style.textContent += "\n@media screen {\n" + theme.styles[index] + "\n}";
      });
      const inlineRules = [];
      doc.querySelectorAll("[style]").forEach(function (node) {
        const original = node.getAttribute("style");
        if (Object.hasOwn(theme.inline, original)) {
          const inline = theme.inline[original];
          node.setAttribute("style", inline.style);
          node.dataset.flowInlineTheme = inline.key;
          inlineRules.push('[data-flow-inline-theme="' + inline.key + '"]{' + inline.variables + '}');
        }
      });
      doc.documentElement.dataset.flowTheme = "midnight";
      const css = doc.createElement("style");
      css.dataset.flowDocumentTheme = "1";
      css.textContent = this.css + "\n@media screen {" + inlineRules.join("\n") + "}";
      doc.head.append(css);
      const typography = doc.createElement("script");
      typography.dataset.flowTypography = "1";
      typography.textContent = this.typography || "";
      doc.head.append(typography);
      let meta = doc.head.querySelector('meta[name="theme-color"]');
      if (!meta) { meta = doc.createElement("meta"); meta.name = "theme-color"; doc.head.append(meta); }
      meta.content = "#031319";
      // Prepare static and dynamically generated branding before srcdoc paints.
      window.FlowBranding.document(doc);
      return "<!DOCTYPE html>" + doc.documentElement.outerHTML;
    },
  };
}());
