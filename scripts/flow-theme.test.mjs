import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { parse, serialize } from "parse5";
import { beforeAll, describe, expect, it } from "vitest";
import { attr, nodes, projectHome } from "./flow-home.mjs";
import { themeCss } from "./flow-document-theme.mjs";

// CI runs unit tests before Next's prebuild. Prepare the generated fixture from
// canonical source here so this contract test also works in a fresh checkout.
beforeAll(() => {
  execFileSync(process.execPath, ["scripts/build-flow-preview.mjs"], { stdio: "pipe" });
}, 20_000);

describe("Flow theme projection", () => {
  it("retains canonical HTML and every raw data/provenance payload", async () => {
    const source = await readFile("public/index.html", "utf8");
    expect(createHash("sha256").update(source).digest("hex")).toBe("ebb69da2b9154a4ad1ca578bf6bb9409aba4846715260cd7d706964b35dfdee2");
    const generated = parse(await readFile("public/flow-preview.html", "utf8"));
    const payload = (node) => node.tagName === "script" &&
      (["application/json", "application/octet-stream", "text/plain"].includes(attr(node, "type")) || (attr(node, "id") ?? "").startsWith("__ARYO_"));
    const originals = nodes(parse(source), payload);
    const projected = nodes(generated, payload);
    expect(originals.length).toBeGreaterThan(180);
    expect(projected.map((node) => serialize(node))).toEqual(originals.map((node) => serialize(node)));
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
});
