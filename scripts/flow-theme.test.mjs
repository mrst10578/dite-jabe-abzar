import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { parse, serialize } from "parse5";
import { inflateRawSync } from "node:zlib";
import postcss from "postcss";
import { beforeAll, describe, expect, it } from "vitest";
import { attr, nodes, projectHome } from "./flow-home.mjs";
import { themeCss } from "./flow-document-theme.mjs";

// CI runs unit tests before Next's prebuild. Prepare the generated fixture from
// canonical source here so this contract test also works in a fresh checkout.
beforeAll(() => {
  execFileSync(process.execPath, ["scripts/build-flow-preview.mjs"], { stdio: "pipe" });
}, 20_000);

describe("Flow theme projection", () => {
  it("retains canonical HTML and authored data/provenance payloads", async () => {
    const source = await readFile("public/index.html", "utf8");
    expect(createHash("sha256").update(source).digest("hex")).toBe("ebb69da2b9154a4ad1ca578bf6bb9409aba4846715260cd7d706964b35dfdee2");
    const generated = parse(await readFile("public/flow-preview.html", "utf8"));
    const payload = (node) => node.tagName === "script" &&
      (["application/json", "application/octet-stream", "text/plain"].includes(attr(node, "type")) || (attr(node, "id") ?? "").startsWith("__ARYO_"));
    const originals = nodes(parse(source), payload);
    // Province media has a separate byte-for-byte delivery contract in
    // flow-image-assets.test.mjs. The derived article index is generated data.
    const retained = originals.filter((node) => !(attr(node, "id") ?? "").startsWith("aris-province-image-") && !["aris-selection-guides-data", "aris-compass-html"].includes(attr(node, "id")));
    const projected = nodes(generated, payload).filter((node) => !["flow-guide-search-index", "aris-selection-guides-data", "aris-compass-html"].includes(attr(node, "id")));
    expect(originals.length).toBeGreaterThan(180);
    expect(projected.map((node) => serialize(node))).toEqual(retained.map((node) => {
      const original = serialize(node);
      // This optional panel has two authorized presentation-copy changes;
      // every signed record and all other runtime bytes remain identical.
      return attr(node, "id") === "__ARYO_ARIS_OWNERSHIP__runtime"
        ? original.replace("بررسی مالکیت آریس", "بررسی منشأ فایل").replace("محتوای آریس", "محتوای سایت")
        : original;
    }));
  }, 20_000);

  it("delivers all 23 authored documents unchanged on demand with matching themes", async () => {
    const original = parse(await readFile("public/index.html", "utf8"));
    const generated = parse(await readFile("public/flow-preview.html", "utf8"));
    const text = (node) => node.childNodes.map((child) => child.value ?? "").join("");
    const byId = (document, id) => nodes(document, (node) => attr(node, "id") === id)[0];
    const guides = JSON.parse(text(byId(original, "aris-selection-guides-data")));
    const metadata = JSON.parse(text(byId(generated, "aris-selection-guides-data")));
    const omit = (item, field) => Object.fromEntries(Object.entries(item).filter(([key]) => key !== field));
    expect(metadata.map((guide) => omit(guide, "payloadURL"))).toEqual(guides.map((guide) => omit(guide, "document")));
    const compass = Buffer.from(text(byId(original, "aris-compass-html")), "base64").toString("utf8");
    expect(text(byId(generated, "aris-compass-html"))).toBe("");
    expect(await readdir("public/flow/generated/documents")).toHaveLength(23);
    for (const guide of [...guides, { id: "compass", document: compass }]) {
      const url = guide.id === "compass" ? attr(byId(generated, "aris-compass-html"), "data-flow-payload") : metadata.find((item) => item.id === guide.id).payloadURL;
      const payload = JSON.parse(await readFile(`public${url}`, "utf8"));
      expect(payload.document, guide.id).toBe(guide.document);
      expect(payload.theme.styles).toHaveLength(nodes(parse(guide.document), (node) => node.tagName === "style").length);
      expect(payload.title).toBe(text(nodes(parse(guide.document), (node) => node.tagName === "title")[0]));
    }
    expect(Buffer.byteLength(await readFile("public/flow-preview.html", "utf8"))).toBeLessThan(3_000_000);
  }, 20_000);

  it("is idempotent and keeps every search and launch control unique", async () => {
    const document = parse(await readFile("public/index.html", "utf8"));
    const manifest = JSON.parse(await readFile("public/flow/assets/manifest.json", "utf8"));
    projectHome(document, manifest);
    const once = serialize(document);
    projectHome(document, manifest);
    expect(serialize(document)).toBe(once);
    for (const id of ["search-form", "major-search", "province-search-form", "province-search", "aris-psych-test-launch", "guide-reader-frame"]) {
      expect(nodes(document, (node) => attr(node, "id") === id), id).toHaveLength(1);
    }
  }, 20_000);

  it("rejects a changed source contract instead of silently dropping controls", async () => {
    const source = await readFile("public/index.html", "utf8");
    const document = parse(source.replace('id="search-form"', 'id="new-search-form"'));
    expect(() => projectHome(document, { productionReady: true })).toThrow("expected one #search-form");
  }, 20_000);
});

describe("screen document colors", () => {
  it("retains print colors, font data, illustration URLs and layout", () => {
    const css = '@font-face{src:url(data:font/woff2;base64,white)}.card{padding:24px;background:#fff;color:#17211d;background-image:url("image.svg#fff")}@media print{body{background:#fff;color:#111}}';
    const result = themeCss(css);
    expect(result).toContain("padding:24px");
    expect(result).toContain("background:#0a2028");
    expect(result).toContain("color:#f7f2e2");
    expect(result).toContain('url("image.svg#fff")');
    expect(result).toContain("data:font/woff2;base64,white");
    expect(result).toContain("@media print{body{background:#fff;color:#111}}");
  });

  it("keeps success, warning and danger surfaces distinguishable", () => {
    const result = themeCss(".good{background:#fff;color:green}.warn{background:#fff;color:#fff}.error{background:#fff;color:#fff}");
    expect(result).toContain("background:#112e29");
    expect(result).toContain("background:#242b24");
    expect(result).toContain("background:#36232a");
    expect(result).toContain("color:#c6a950");
    expect(result).toContain("color:#ffad9f");
  });

  it("keeps text-clipped heading gradients readable and light mint panels dark", () => {
    const result = themeCss(":root{--mint:#dfece4}.hero h1{background:linear-gradient(#fff,#f4d7a7);background-clip:text;color:transparent}");
    expect(result).toContain("--mint:#10262f");
    expect(result).toContain("background:linear-gradient(#f7f2e2,#f7f2e2)");
    expect(result).toContain("background-clip:text");
  });

  it("uses dark text on filled accents and retains meaningful score fill colors", () => {
    const css = '.btn.primary{background:linear-gradient(var(--accent),var(--gold-2));color:#17120b}.bar-fill{background:linear-gradient(90deg,#A96F1C,#E3A83B,#FFD878)}';
    const result = themeCss(css);
    expect(result).toContain("color:#031319");
    expect(result).toContain("linear-gradient(90deg,#A96F1C,#E3A83B,#FFD878)");
  });

  it("removes academy watermark boxes without removing answer labels or counters", () => {
    const css = '.intro-badge:before{content:"A";position:absolute;font:700 8rem/1 Georgia}.final-note:after{content:"A"}.share-panel:after{content:"A"}.answer:before{content:"A"}.step:before{content:counter(step)}@media print{.intro-badge:before{content:"A"}}';
    const result = themeCss(css);
    expect(result).toContain('.intro-badge:before{content:none');
    expect(result).toContain('.final-note:after{content:none}');
    expect(result).toContain('.share-panel:after{content:none}');
    expect(result).toContain('.answer:before{content:"A"}');
    expect(result).toContain('.step:before{content:counter(step)}');
    expect(result).toContain('@media print{.intro-badge:before{content:"A"}}');
  });

  it("replaces metallic decoration variables with Flow accents and preserves report fills", () => {
    const css = '.intro:before,.section:before{height:3px;background:var(--gold-gradient)}.term:before{background:linear-gradient(var(--aris-gold-2),var(--aris-gold-dark))}.eyebrow{color:var(--aris-gold)}.primary{background:var(--gold-gradient);color:#fff}.callout.warn{border-color:var(--gold)}.bar-fill{background:linear-gradient(var(--gold),#FFD878)}.reading-percent{background:conic-gradient(var(--aris-gold) var(--read),#fff 0)}.progress span{background:var(--gold-gradient)}';
    const result = themeCss(css);
    expect(result).toContain('height:3px;background:linear-gradient(90deg,#a2e887,#31dded)');
    expect(result).toContain('.term:before{background:linear-gradient(#31dded,#31dded)');
    expect(result).toContain('.eyebrow{color:#31dded}');
    expect(result).toContain('.primary{background:linear-gradient(90deg,#a2e887,#31dded);color:#031319}');
    expect(result).toContain('.callout.warn{border-color:var(--gold)}');
    expect(result).toContain('.bar-fill{background:linear-gradient(var(--gold),#FFD878)}');
    expect(result).toContain('.reading-percent{background:conic-gradient(var(--aris-gold) var(--read),#fff 0)}');
    expect(result).toContain('.progress span{background:var(--gold-gradient)}');
  });

  it("covers the remaining decorative A and metallic bars across the complete authored corpus", async () => {
    const source = await readFile("public/index.html", "utf8");
    const document = parse(source);
    const text = (node) => node.childNodes.map((child) => child.value ?? "").join("");
    const guides = JSON.parse(text(nodes(document, (node) => attr(node, "id") === "aris-selection-guides-data")[0]));
    const corpus = [{ id: "home", html: source }, ...guides.map((guide) => ({ id: guide.id, html: guide.document })), {
      id: "compass", html: Buffer.from(text(nodes(document, (node) => attr(node, "id") === "aris-compass-html")[0]), "base64").toString("utf8"),
    }];
    for (const name of ["ARIS_CONTENT_PACKS", "ARIS_PROVINCE_CONTENT_PACKS"]) {
      const packs = JSON.parse(source.match(new RegExp(`var ${name} = (\\[[^;]+\\]);`))[1]);
      for (const pack of packs) {
        const decoded = JSON.parse(inflateRawSync(Buffer.from(pack, "base64")).toString("utf8"));
        corpus.push(...Object.entries(decoded).map(([id, html]) => ({ id, html })));
      }
    }
    expect(corpus).toHaveLength(397);
    let watermarks = 0;
    let cardBars = 0;
    for (const item of corpus) {
      for (const style of nodes(parse(item.html), (node) => node.tagName === "style")) {
        const original = postcss.parse(text(style));
        const compiled = postcss.parse(themeCss(text(style)));
        original.walkRules((rule) => {
          const watermark = rule.nodes.some((node) => node.prop === "content" && node.value === '"A"');
          if (watermark) {
            watermarks += 1;
            const themed = [];
            compiled.walkRules(rule.selector, (rule) => themed.push(rule));
            expect(themed[0].nodes.find((node) => node.prop === "content").value, item.id).toBe("none");
          }
          if (rule.selector === ".intro:before,.section:before") {
            cardBars += 1;
            const themed = [];
            compiled.walkRules(rule.selector, (rule) => themed.push(rule));
            expect(themed[0].nodes.find((node) => node.prop === "background").value, item.id).toBe("linear-gradient(90deg,#a2e887,#31dded)");
          }
        });
      }
    }
    expect(watermarks).toBe(30);
    expect(cardBars).toBe(10);
  }, 20_000);
});
