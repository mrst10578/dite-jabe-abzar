import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { attr, detach, nodes, one, setAttr } from "./flow-home.mjs";

// The source bundle uses its own ASCII85 alphabet, rather than Adobe ASCII85.
// Decode at build time so opening search does not first download all 186 images.
const imageAlphabet = "!#$%()*+,-.0123456789:;=?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_abcdefghijklmnopqrstuvwxyz{|}";
const imageDigits = new Int16Array(128).fill(-1);
for (let i = 0; i < imageAlphabet.length; i++) imageDigits[imageAlphabet.charCodeAt(i)] = i;

const extensions = new Map([
  ["image/webp", "webp"], ["image/png", "png"], ["image/jpeg", "jpg"],
  ["image/gif", "gif"], ["image/avif", "avif"], ["image/svg+xml", "svg"],
]);
const text = (node) => node.childNodes.map((child) => child.value ?? "").join("");
const setText = (node, value) => { node.childNodes = [{ nodeName: "#text", value, parentNode: node }]; };
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

function assetOptions(options) {
  const { outputDirectory, publicPath } = options;
  if (typeof outputDirectory !== "string" || !outputDirectory) throw new Error("Flow assets require an output directory");
  // Local absolute URLs also resolve correctly from the native province reader.
  if (typeof publicPath !== "string" || !/^\/(?:[a-zA-Z0-9_-]+\/)+$/.test(publicPath)) {
    throw new Error("Flow assets require a safe local public path ending in a slash");
  }
  return { outputDirectory, publicPath };
}

export function decodeProvinceImage(encoded, length) {
  if (!Number.isSafeInteger(length) || length <= 0 || typeof encoded !== "string" || encoded.length !== Math.ceil(length / 4) * 5) {
    throw new Error("Incomplete province image");
  }
  const bytes = Buffer.alloc(length);
  let offset = 0;
  for (let i = 0; i < encoded.length; i += 5) {
    let value = 0;
    for (let j = 0; j < 5; j++) {
      const code = encoded.charCodeAt(i + j);
      const digit = code < 128 ? imageDigits[code] : -1;
      if (digit < 0) throw new Error("Invalid province image encoding");
      value = value * 85 + digit;
    }
    if (value > 4294967295) throw new Error("Invalid province image group");
    for (let shift = 24; shift >= 0 && offset < length; shift -= 8) {
      bytes[offset++] = (value >>> shift) & 255;
    }
  }
  return bytes;
}

export async function externalizeProvinceImages(document, options) {
  const { outputDirectory, publicPath } = assetOptions(options);
  const runtime = one(document, (node) => attr(node, "data-aris-module") === "search-and-content", "native reader runtime");
  const source = text(runtime);
  const records = [...source.matchAll(/var ARIS_PROVINCE_IMAGES = (\[[^\n]+\]);/g)];
  if (records.length !== 1) throw new Error("Flow province image metadata contract changed");
  const metadata = JSON.parse(records[0][1]);
  if (!Array.isArray(metadata) || !metadata.length) throw new Error("Missing province image metadata");
  const payloads = nodes(document, (node) => node.tagName === "script" && /^aris-province-image-/.test(attr(node, "id") ?? ""));
  if (payloads.length !== metadata.length) throw new Error("Province image payload count differs from metadata");
  const indexed = new Map();
  for (const payload of payloads) {
    const match = /^aris-province-image-(0|[1-9]\d*)$/.exec(attr(payload, "id"));
    if (!match || attr(payload, "type") !== "application/octet-stream") throw new Error("Invalid province image payload ID or type");
    const index = Number(match[1]);
    if (index >= metadata.length || indexed.has(index)) throw new Error("Duplicate or unknown province image index");
    indexed.set(index, payload);
  }
  let originalEncodedBytes = 0;
  const decoded = metadata.map((record, index) => {
    if (!Array.isArray(record) || record.length !== 2) throw new Error("Invalid province image metadata");
    const mime = /^data:(image\/[a-z+]+);base64,$/.exec(record[0])?.[1];
    const extension = extensions.get(mime);
    if (!extension) throw new Error("Unsupported province image MIME type");
    const payload = indexed.get(index);
    if (!payload) throw new Error("Missing province image index");
    const encoded = text(payload);
    originalEncodedBytes += encoded.length;
    const bytes = decodeProvinceImage(encoded, record[1]);
    const sha256 = digest(bytes);
    const file = `province-${String(index).padStart(3, "0")}-${sha256}.${extension}`;
    return { index, mime, byteLength: bytes.length, sha256, file, url: publicPath + file, bytes };
  });
  const originalFunction = /    function restoreProvinceImage\(index\) \{[\s\S]*?\n    \}\n\n(?=    function restoreProvinceImages)/g;
  const matches = [...source.matchAll(originalFunction)];
  if (matches.length !== 1 || digest(Buffer.from(matches[0][0])) !== "de76febcb922e15691771786c295d4e0354d6f6ad78abe6d4b79eb36f67e09e1") {
    throw new Error("Flow province image restoration contract changed");
  }
  const urls = JSON.stringify(decoded.map((asset) => asset.url));
  const replacement = `    var FLOW_PROVINCE_IMAGE_URLS = ${urls};\n    function restoreProvinceImage(index) {\n        if (!Number.isInteger(index) || !ARIS_PROVINCE_IMAGES[index] || !FLOW_PROVINCE_IMAGE_URLS[index]) throw new Error("Missing province image");\n        return FLOW_PROVINCE_IMAGE_URLS[index];\n    }\n\n`;
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all(decoded.map((asset) => writeFile(join(outputDirectory, asset.file), asset.bytes)));
  // Mutate only the generated projection, after all contracts and files pass.
  setText(runtime, source.replace(originalFunction, replacement));
  payloads.forEach(detach);
  return {
    assets: decoded.map((asset) => {
      const published = { ...asset };
      delete published.bytes;
      return published;
    }),
    originalEncodedBytes,
    totalBytes: decoded.reduce((total, asset) => total + asset.byteLength, 0),
  };
}

export async function externalizeAmbientAudio(document, options) {
  const { outputDirectory, publicPath } = assetOptions(options);
  const audio = one(document, (node) => node.tagName === "audio" && attr(node, "id") === "ambient-audio", "ambient audio");
  const source = one(audio, (node) => node.tagName === "source", "ambient audio source");
  const match = /^data:audio\/mpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(attr(source, "src") ?? "");
  if (!match) throw new Error("Flow ambient audio data contract changed");
  const bytes = Buffer.from(match[1], "base64");
  if (!bytes.length || bytes.toString("base64") !== match[1]) throw new Error("Invalid ambient audio base64");
  const sha256 = digest(bytes);
  const file = `ambient-${sha256}.mp3`;
  const url = publicPath + file;
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(join(outputDirectory, file), bytes);
  setAttr(source, "src", url);
  setAttr(audio, "preload", "none");
  return { mime: "audio/mpeg", byteLength: bytes.length, sha256, file, url, originalEncodedBytes: match[1].length };
}
