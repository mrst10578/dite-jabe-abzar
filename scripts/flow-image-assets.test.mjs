import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { parse } from "parse5";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { attr, nodes } from "./flow-home.mjs";
import { decodeProvinceImage, externalizeAmbientAudio, externalizeProvinceImages } from "./flow-image-assets.mjs";

const text = (node) => node.childNodes.map((child) => child.value ?? "").join("");
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const temporaryDirectories = [];
let canonical;
let sourceRestore;
let sourceDecoder;

beforeAll(async () => {
  canonical = await readFile("public/index.html", "utf8");
  sourceRestore = canonical.match(/    function restoreProvinceImage\(index\) \{[\s\S]*?\n    \}\n\n(?=    function restoreProvinceImages)/)[0];
  sourceDecoder = canonical.slice(canonical.indexOf("    var ARIS_COMPACT_IMAGE_ALPHABET"), canonical.indexOf("    function restoreProvinceImages"));
});
afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function options(directory = "images") {
  const parent = await mkdtemp(join(tmpdir(), "flow-lossless-assets-"));
  temporaryDirectories.push(parent);
  return { outputDirectory: join(parent, directory), publicPath: `/flow/generated/${directory}/` };
}

function imageFixture({ metadata = [["data:image/webp;base64,", 4]], payload = "!!!!!", id = "aris-province-image-0", restore = sourceRestore } = {}) {
  return parse(`<script id="${id}" type="application/octet-stream">${payload}</script><script data-aris-module="search-and-content">var ARIS_PROVINCE_IMAGES = ${JSON.stringify(metadata)};\n${restore}    function restoreProvinceImages(content) { return content; }</script>`);
}

describe("lossless province image delivery", () => {
  it("decodes full and partial ASCII85 groups and rejects invalid encodings", () => {
    expect(decodeProvinceImage("!!!!!", 4)).toEqual(Buffer.from([0, 0, 0, 0]));
    expect(decodeProvinceImage("!!!!!", 1)).toEqual(Buffer.from([0]));
    expect(() => decodeProvinceImage("!!!!", 4)).toThrow("Incomplete");
    expect(() => decodeProvinceImage("!!!!~", 4)).toThrow("encoding");
    expect(() => decodeProvinceImage("}}}}}", 4)).toThrow("group");
    expect(() => decodeProvinceImage("!!!!!", -1)).toThrow("Incomplete");
  });

  it("retains every one of the 186 source WebP files byte for byte and restores synchronous URLs", async () => {
    const document = parse(canonical);
    const originalRuntime = text(nodes(document, (node) => attr(node, "data-aris-module") === "search-and-content")[0]);
    const metadataLiteral = originalRuntime.match(/var ARIS_PROVINCE_IMAGES = (\[[^\n]+\]);/)[1];
    const metadata = JSON.parse(metadataLiteral);
    const originalPayloads = new Map(nodes(document, (node) => /^aris-province-image-\d+$/.test(attr(node, "id") ?? "")).map((node) => [attr(node, "id"), text(node)]));
    // Use the unmodified browser decoder as an independent reference. This
    // checks actual source files, including partial final groups, rather than
    // comparing this build decoder against itself.
    const legacy = { ARIS_PROVINCE_IMAGES: metadata, document: { getElementById: (id) => ({ textContent: originalPayloads.get(id) }) }, window: { btoa: (value) => Buffer.from(value, "binary").toString("base64") } };
    runInNewContext(sourceDecoder, legacy);
    const output = await options();
    const result = await externalizeProvinceImages(document, output);
    expect(result.assets).toHaveLength(186);
    expect(result.totalBytes).toBe(8_969_462);
    expect(result.originalEncodedBytes).toBe(11_212_045);
    expect(nodes(document, (node) => /^aris-province-image-/.test(attr(node, "id") ?? ""))).toHaveLength(0);
    const runtime = text(nodes(document, (node) => attr(node, "data-aris-module") === "search-and-content")[0]);
    expect(runtime).toContain(`var ARIS_PROVINCE_IMAGES = ${metadataLiteral};`);
    const projected = { ARIS_PROVINCE_IMAGES: metadata };
    runInNewContext(runtime.slice(runtime.indexOf("    var FLOW_PROVINCE_IMAGE_URLS"), runtime.indexOf("    function restoreProvinceImages")), projected);
    for (const asset of result.assets) {
      const original = Buffer.from(legacy.restoreProvinceImage(asset.index).split(",")[1], "base64");
      const bytes = await readFile(join(output.outputDirectory, asset.file));
      expect(bytes, `province image ${asset.index}`).toEqual(original);
      expect(digest(bytes)).toBe(asset.sha256);
      expect(asset.byteLength).toBe(metadata[asset.index][1]);
      expect(bytes.subarray(0, 4).toString()).toBe("RIFF");
      expect(bytes.subarray(8, 12).toString()).toBe("WEBP");
      expect(asset.url).toBe(`${output.publicPath}${asset.file}`);
      expect(projected.restoreProvinceImage(asset.index)).toBe(asset.url);
    }
    for (const index of [-1, 186, 0.5, undefined]) expect(() => projected.restoreProvinceImage(index)).toThrow("Missing province image");
    expect(await readdir(output.outputDirectory)).toHaveLength(186);
    expect(digest(await readFile("public/index.html"))).toBe("ebb69da2b9154a4ad1ca578bf6bb9409aba4846715260cd7d706964b35dfdee2");
  }, 30_000);

  it("fails before projecting a missing index, changed decoder or unsupported file type", async () => {
    const output = await options();
    await expect(externalizeProvinceImages(imageFixture({ id: "aris-province-image-1" }), output)).rejects.toThrow("index");
    await expect(externalizeProvinceImages(imageFixture({ metadata: [["data:image/bmp;base64,", 4]] }), output)).rejects.toThrow("MIME");
    await expect(externalizeProvinceImages(imageFixture({ restore: sourceRestore.replace("4294967295", "1") }), output)).rejects.toThrow("restoration contract");
    await expect(externalizeProvinceImages(imageFixture(), { ...output, publicPath: "https://example.com/" })).rejects.toThrow("safe local");
  });
});

describe("lossless ambient audio delivery", () => {
  it("extracts the original MP3 without eagerly loading it or altering native audio controls", async () => {
    const document = parse(canonical.match(/<audio\b[^>]*id="ambient-audio"[^>]*>[\s\S]*?<\/audio>/)[0]);
    const audio = nodes(document, (node) => attr(node, "id") === "ambient-audio")[0];
    const source = nodes(audio, (node) => node.tagName === "source")[0];
    const original = Buffer.from(attr(source, "src").split(",")[1], "base64");
    const originalAttributes = audio.attrs.filter((attribute) => attribute.name !== "preload").map((attribute) => ({ ...attribute }));
    const output = await options("audio");
    const result = await externalizeAmbientAudio(document, output);
    const bytes = await readFile(join(output.outputDirectory, result.file));
    expect(bytes).toEqual(original);
    expect(result.byteLength).toBe(3_381_125);
    expect(result.originalEncodedBytes).toBe(4_508_168);
    expect(result.sha256).toBe("d0d1a0db3fdda0ca90f681b8ecc60867067376aba81ab0fc0fbddef778608039");
    expect(attr(audio, "preload")).toBe("none");
    expect(audio.attrs.filter((attribute) => attribute.name !== "preload")).toEqual(originalAttributes);
    expect(attr(source, "src")).toBe(result.url);
    expect(result.file).toMatch(/^ambient-[a-f0-9]{64}\.mp3$/);
  }, 30_000);

  it("rejects corrupt audio data instead of publishing a truncated media asset", async () => {
    const document = parse('<audio id="ambient-audio"><source src="data:audio/mpeg;base64,A"></audio>');
    await expect(externalizeAmbientAudio(document, await options("audio"))).rejects.toThrow("Invalid ambient audio");
  });
});
