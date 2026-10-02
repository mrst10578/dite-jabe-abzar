import "../public/flow/branding.js";
import { attr, nodes, detach, markup, before, append, hasClass, replaceContent, setAttr } from "./flow-home.mjs";

export const branding = globalThis.FlowBranding;

export function brandTree(root) {
  for (const node of nodes(root, () => true)) {
    if (node.nodeName === "#text" && !["script", "style", "textarea"].includes(node.parentNode?.tagName)) {
      node.value = branding.text(node.value);
    }
    for (const item of node.attrs ?? []) {
      if (["alt", "title", "aria-label", "placeholder"].includes(item.name)) item.value = branding.text(item.value);
      if (item.name === "href") item.value = branding.code(item.value);
      if (item.name === "content" && node.tagName === "meta" && /^(description|application-name|copyright|og:|twitter:)/.test(attr(node, "name") || attr(node, "property") || "")) item.value = branding.text(item.value);
    }
    if (node.tagName === "link" && /(?:^|\s)icon(?:\s|$)/.test(attr(node, "rel") || "")) {
      setAttr(node, "href", "/flow/favicon.svg"); setAttr(node, "type", "image/svg+xml");
    }
    if (["script", "style"].includes(node.tagName) && !(attr(node, "id") ?? "").startsWith("__ARYO_") && (!attr(node, "type") || attr(node, "type") === "text/javascript")) {
      for (const child of node.childNodes) if (child.value) child.value = branding.code(child.value);
    }
    if (node.tagName === "symbol" && attr(node, "id") === "aris-sigil-shape") detach(node);
    if (node.tagName === "svg" && (hasClass(node, "aris-footer-mark") || nodes(node, (child) => child.tagName === "use" && attr(child, "href") === "#aris-sigil-shape").length)) {
      before(node, markup(branding.image)); detach(node);
    }
    if (hasClass(node, "brand-mark") && nodes(node, (child) => child.tagName === "svg").length) {
      setAttr(node, "class", (attr(node, "class") || "") + " flow-brand-mark"); replaceContent(node, branding.image);
    }
    if (node.tagName === "a" && attr(node, "href") === branding.channel) {
      setAttr(node, "target", "_blank"); setAttr(node, "rel", "noopener noreferrer");
      const label = nodes(node, (child) => child.nodeName === "#text").map((child) => child.value).join("");
      if (hasClass(node, "aris-footer-join") || hasClass(node.parentNode, "aris-home-footer") || /عضویت|همراه.*شو/.test(label)) {
        if (!hasClass(node, "flow-channel-join")) setAttr(node, "class", (attr(node, "class") || "") + " flow-channel-join");
        replaceContent(node, branding.join);
        setAttr(node, "aria-label", "عضویت در کانال فلو در تلگرام");
        if (hasClass(node.parentNode, "aris-home-footer") && !nodes(node.parentNode, (child) => hasClass(child, "flow-channel-handle")).length) {
          append(node.parentNode, markup(`<span class="flow-channel-handle" dir="ltr">${branding.handle}</span>`));
        }
      }
    }
  }
}
