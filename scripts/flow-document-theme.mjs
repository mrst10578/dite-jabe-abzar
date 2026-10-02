import postcss from "postcss";
import { parse } from "parse5";
import { attr, nodes } from "./flow-home.mjs";

const palette = { bg: "#031319", surface: "#0a2028", text: "#f7f2e2", muted: "#b6cbd4", cyan: "#31dded", green: "#a2e887", border: "#315c68", gold: "#c6a950" };
const colorPattern = /url\([^)]*\)|#[\da-f]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black)\b/gi;
const meaningfulFill = (selector) => /\b(?:bar-fill|progress-fill|readiness)\b|(?:reading-progress|scroll-progress|reader__progress)/.test(selector);
function printed(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (parent.type === "atrule" && parent.name === "media" && /\bprint\b/i.test(parent.params)) return true;
    if (parent.type === "atrule" && parent.name === "font-face") return true;
  }
  return false;
}
function variable(name) {
  if (/^--(?:flow-|__)/.test(name)) return null;
  if (/muted|subtext|text-secondary|dim/.test(name)) return palette.muted;
  if (/border|line/.test(name)) return palette.border;
  if (/paper|^--bg$|^--aris-bg(?:-soft)?$|background/.test(name)) return palette.bg;
  if (/card|surface|panel/.test(name)) return palette.surface;
  if (/mint/.test(name)) return "#10262f";
  if (/ink|^--text$|aris-text/.test(name)) return palette.text;
  if (/accent|focus|green|gold-light/.test(name) && !/soft|gradient/.test(name)) return palette.cyan;
  if (/^--gold$|gold-2|bronze/.test(name)) return palette.gold;
  return null;
}
function recolor(value, target) {
  return value.replace(colorPattern, (color) => {
    if (/^url\(/i.test(color) || color.includes("var(")) return color;
    if (/^rgba/i.test(color)) {
      const alpha = color.match(/,\s*([\d.]+)\s*\)$/)?.[1];
      if (alpha !== undefined) {
        const hex = target.slice(1);
        return `rgba(${parseInt(hex.slice(0,2),16)},${parseInt(hex.slice(2,4),16)},${parseInt(hex.slice(4,6),16)},${alpha})`;
      }
    }
    if (/^#[\da-f]{8}$/i.test(color)) return target + color.slice(-2);
    return target;
  });
}

// Recolor declarations, preserving selectors, geometry, priorities, URLs,
// @font-face data, media structure and the deliberately light print stylesheet.
export function themeCss(css) {
  const root = postcss.parse(css);
  root.walkDecls((decl) => {
    if (printed(decl)) return;
    if (decl.prop.startsWith("--")) {
      const target = variable(decl.prop);
      if (target) decl.value = target;
      return;
    }
    if (/^(?:background(?:-color|-image)?|border(?:-(?:top|right|bottom|left))?(?:-color)?|outline(?:-color)?|box-shadow|text-shadow|color|caret-color|text-decoration-color|-webkit-text-fill-color)$/.test(decl.prop)) {
      const selector = decl.parent.selector ?? "";
      // Score widths/rings and progress fills are data, not panel backgrounds.
      if (decl.prop.startsWith("background") && meaningfulFill(selector)) return;
      const semantic = /(?:good|success|support)(?:\b|-)/.test(selector) ? { bg: "#112e29", text: palette.green }
        : /(?:warn|caution|constraint)(?:\b|-)/.test(selector) ? { bg: "#242b24", text: palette.gold }
        : /(?:danger|error)(?:\b|-)/.test(selector) ? { bg: "#36232a", text: "#ffad9f" } : null;
      const textGradient = decl.parent.nodes?.some((node) => /background-clip$/.test(node.prop ?? "") && node.value === "text");
      const target = decl.prop.includes("background") ? (textGradient ? palette.text : semantic?.bg ?? palette.surface)
        : /border|outline|shadow/.test(decl.prop) ? palette.border : (semantic?.text ?? palette.text);
      decl.value = recolor(decl.value, target);
    }
  });
  root.walkRules((rule) => {
    if (printed(rule) || meaningfulFill(rule.selector)) return;
    if (rule.nodes.some((node) => /background-clip$/.test(node.prop ?? "") && node.value === "text")) return;
    const brightFill = rule.nodes.some((node) => /^background(?:-color|-image)?$/.test(node.prop ?? "") &&
      /var\(--(?:accent\d*|(?:aris-)?gold(?:-2|-gradient|-light|-soft)?|green2?|flow-cyan|flow-green)\s*\)/.test(node.value));
    if (!brightFill) return;
    const foreground = rule.nodes.find((node) => node.prop === "color");
    if (foreground) foreground.value = palette.bg;
    else rule.append({ prop: "color", value: palette.bg });
  });
  return root.toString();
}

export function documentTheme(source) {
  const doc = parse(source);
  const title = nodes(doc, (node) => node.tagName === "title")[0]?.childNodes[0]?.value;
  if (!title) throw new Error("Flow document contract: missing title");
  const styles = nodes(doc, (node) => node.tagName === "style").map((node) => themeCss(node.childNodes.map((child) => child.value ?? "").join("")));
  const inline = {};
  for (const node of nodes(doc, (node) => attr(node, "style") !== undefined)) {
    const source = attr(node, "style");
    if (Object.hasOwn(inline, source)) continue;
    const original = postcss.parse(`x{${source}}`);
    const themed = postcss.parse(themeCss(`x{${source}}`));
    const key = String(Object.keys(inline).length);
    const variables = [];
    original.first.nodes.forEach((decl, index) => {
      const compiled = themed.first.nodes[index];
      if (decl.type !== "decl" || decl.value === compiled.value) return;
      const name = `--flow-inline-${key}-${index}`;
      variables.push(`${name}:${compiled.value};`);
      // The original value remains the fallback in print and other media.
      // Its inline priority is retained; only screen supplies the new value.
      decl.value = `var(${name},${decl.value})`;
    });
    if (variables.length) inline[source] = { key, style: original.toString().slice(2, -1), variables: variables.join("") };
  }
  return { title, styles, inline };
}
