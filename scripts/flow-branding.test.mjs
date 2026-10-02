import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { parse, serialize } from "parse5";
import { describe, expect, it } from "vitest";
import { branding, brandTree } from "./flow-branding.mjs";
import { attr, nodes } from "./flow-home.mjs";

const byId = (root, id) => nodes(root, (node) => attr(node, "id") === id)[0];
const content = (node) => nodes(node, (child) => child.nodeName === "#text").map((child) => child.value).join("");

describe("shared Flow branding", () => {
  it("replaces human-facing Persian and English names without changing unrelated names", () => {
    expect(branding.text("آریس آکادمی · آریس · اریس اکادمی · Aris Academy · ARIS ACADEMY · ArisAcademy · Aris"))
      .toBe("فلو · فلو · فلو · FLOW · FLOW · FLOW · FLOW");
    const academic = "Paris, Aristotle, comparisons, aristocratic؛ دانشگاه پاریس";
    expect(branding.text(academic)).toBe(academic);
  });

  it("normalizes channel targets and handles including invisible direction marks", () => {
    expect(branding.text("@\u200eArisAcademy\u200e @\u2066ARISACADEMY\u2069 @Flow_Konkour"))
      .toBe("@Flow_KonKour @Flow_KonKour @Flow_KonKour");
    for (const link of ["https://t.me/ArisAcademy", "http://telegram.me/ArisAcademy/", "https://www.t.me/ARISACADEMY"]) {
      expect(branding.code(link)).toBe("https://t.me/Flow_KonKour");
    }
  });

  it("changes code presentation strings and export filenames while retaining runtime contracts", () => {
    const contracts = String.raw`window.ArisSelectionModule.open("x");const ARIS_MAJORS=[];const token="@aris-image:9@";const id="aris-compass-frame";const key="aris_compass_state";`;
    expect(branding.code(contracts)).toBe(contracts);
    expect(branding.code('document.title="Guide | Aris Academy";const label="کانال آریس";'))
      .toBe('document.title="Guide | FLOW";const label="کانال فلو";');
    expect(branding.code("Aris_Advisor_Report_2026-10-02.txt Aris_Answers_2026-10-02.json"))
      .toBe("Flow_Advisor_Report_2026-10-02.txt Flow_Answers_2026-10-02.json");
  });

  it("exposes the same pure API when loaded as a standalone browser script", () => {
    const context = {};
    runInNewContext(readFileSync(new URL("../public/flow/branding.js", import.meta.url), "utf8"), context);
    expect(context.FlowBranding.text("Aris Academy @\u200eArisAcademy\u200e"))
      .toBe("FLOW @Flow_KonKour");
    expect(context.FlowBranding.code('window.ArisSelectionModule;"@aris-image:3@"'))
      .toBe('window.ArisSelectionModule;"@aris-image:3@"');
  });
});

describe("build-time branding of inert HTML", () => {
  const source = `<!DOCTYPE html><html lang="fa" dir="rtl"><head>
    <title>رشته‌شناسی آریس آکادمی | Aris Academy</title>
    <meta name="description" content="راهنمای آریس آکادمی">
    <style>.channel-link::after{content:"کانال آریس"}</style>
    </head><body>
    <svg aria-hidden="true"><symbol id="aris-sigil-shape"><path class="sigil-a" d="M1 1"></path></symbol></svg>
    <div class="brand-mark"><svg viewBox="0 0 32 32"><path d="M10 18.8 16 8.5l6 10.3"></path></svg></div>
    <p id="academic"><b>Paris و Aristotle</b>؛ محتوای دانشگاهی بدون تغییر. <a href="https://example.org/aris-research?q=Paris">مرجع رسمی</a></p>
    <form id="search-form"><label for="major-search">جست‌وجو</label><input id="major-search" aria-label="بانک رشته‌های آریس" placeholder="رشته مورد نظر"></form>
    <img id="province-image" src="@aris-image:9@" alt="تصویر استان">
    <footer class="aris-dossier-footer"><svg class="aris-footer-mark"><use href="#aris-sigil-shape"></use></svg>
      <p class="aris-footer-credit">آریس آکادمی · راهنمای شناخت رشته و محل تحصیل</p>
      <a id="join" class="aris-footer-join" href="https://t.me/ArisAcademy">عضویت در کانال آریس</a>
      <a id="handle" href="https://t.me/ArisAcademy">@\u200eArisAcademy\u200e</a>
    </footer>
    <footer class="aris-home-footer"><a id="home-join" href="https://t.me/ArisAcademy">همراه آریس در مسیر انتخاب رشته · @ArisAcademy</a></footer>
    <script type="application/json" id="source-record">{"brand":"Aris","image":"@aris-image:9@","value":37}</script>
    <script id="runtime">window.ArisSelectionModule.open("x");document.title="راهنمای آریس آکادمی";</script>
    <script id="__ARYO_ARIS_OWNERSHIP__runtime">const original="آریس آکادمی";</script>
    </body></html>`;

  it("rebrands titles, accessible names and CSS presentation without changing academic content or data", () => {
    const document = parse(source);
    const academicBefore = serialize(byId(document, "academic"));
    const jsonBefore = content(byId(document, "source-record"));
    const provenanceBefore = content(byId(document, "__ARYO_ARIS_OWNERSHIP__runtime"));
    brandTree(document);
    expect(content(nodes(document, (node) => node.tagName === "title")[0])).toBe("رشته‌شناسی فلو | FLOW");
    expect(attr(nodes(document, (node) => node.tagName === "meta")[0], "content")).toBe("راهنمای فلو");
    expect(attr(byId(document, "major-search"), "aria-label")).toBe("بانک رشته‌های فلو");
    expect(content(nodes(document, (node) => node.tagName === "style")[0])).toContain('content:"کانال فلو"');
    expect(serialize(byId(document, "academic"))).toBe(academicBefore);
    expect(content(byId(document, "source-record"))).toBe(jsonBefore);
    expect(content(byId(document, "__ARYO_ARIS_OWNERSHIP__runtime"))).toBe(provenanceBefore);
    expect(attr(byId(document, "province-image"), "src")).toBe("@aris-image:9@");
    for (const id of ["search-form", "major-search", "source-record", "runtime"]) {
      expect(nodes(document, (node) => attr(node, "id") === id)).toHaveLength(1);
    }
    expect(content(byId(document, "runtime"))).toBe('window.ArisSelectionModule.open("x");document.title="راهنمای فلو";');
  });

  it("removes old A graphics and replaces both native and compass marks with the Flow logo", () => {
    const document = parse(source);
    brandTree(document);
    expect(nodes(document, (node) => attr(node, "id") === "aris-sigil-shape")).toHaveLength(0);
    expect(nodes(document, (node) => node.tagName === "use" && attr(node, "href") === "#aris-sigil-shape")).toHaveLength(0);
    expect(nodes(document, (node) => node.tagName === "svg" && (attr(node, "class") ?? "").includes("aris-footer-mark"))).toHaveLength(0);
    const logos = nodes(document, (node) => node.tagName === "img" && attr(node, "class") === "flow-footer-logo");
    expect(logos).toHaveLength(2);
    for (const logo of logos) {
      expect(attr(logo, "src")).toBe("/flow/assets/flow-wordmark.webp");
      expect(attr(logo, "alt")).toBe("FLOW");
    }
  });

  it("uses the exact Flow membership label and target with a decorative Telegram icon", () => {
    const document = parse(source);
    brandTree(document);
    for (const id of ["join", "home-join"]) {
      const link = byId(document, id);
      expect(content(link)).toBe("عضویت در کانال فلو");
      expect(attr(link, "href")).toBe("https://t.me/Flow_KonKour");
      expect(attr(link, "aria-label")).toBe("عضویت در کانال فلو در تلگرام");
      expect(attr(link, "target")).toBe("_blank");
      expect(attr(link, "rel")).toBe("noopener noreferrer");
      const icons = nodes(link, (node) => node.tagName === "svg");
      expect(icons).toHaveLength(1);
      expect(attr(icons[0], "aria-hidden")).toBe("true");
    }
    expect(content(byId(document, "handle"))).toBe("@Flow_KonKour");
    expect(attr(byId(document, "handle"), "href")).toBe("https://t.me/Flow_KonKour");
    const handles = nodes(document, (node) => attr(node, "class") === "flow-channel-handle");
    expect(handles).toHaveLength(1);
    expect(content(handles[0])).toBe("@Flow_KonKour");
  });

  it("is idempotent without duplicating branding classes, CTAs or channel handles", () => {
    const document = parse(source);
    brandTree(document);
    const once = serialize(document);
    brandTree(document);
    expect(serialize(document)).toBe(once);
    for (const node of nodes(document, (item) => Boolean(attr(item, "class")))) {
      const flowClasses = attr(node, "class").split(/\s+/).filter((value) => value.startsWith("flow-"));
      expect(new Set(flowClasses).size).toBe(flowClasses.length);
    }
  });
});
