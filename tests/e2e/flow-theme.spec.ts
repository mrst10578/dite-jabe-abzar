import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { inflateRawSync } from "node:zlib";

test("the initial Flow homepage has its final structure without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/flow-preview.html");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(3, 19, 25)");
  await expect(page.locator(".flow-wordmark")).toHaveAttribute("alt", "Flow");
  await expect(page.locator(".flow-hero-copy #search-form")).toBeVisible();
  await expect(page.locator(".flow-hero-copy #province-search-form")).toBeVisible();
  await expect(page.locator(".flow-hero-image")).toHaveCount(1);
  await expect(page.locator(".flow-supports")).toHaveCount(1);
  await context.close();
});

test("a blocked deferred script cannot expose the legacy major reader", async ({ page }) => {
  await page.route("**/flow/theme.js", (route) => route.abort());
  await page.route("**/flow/reader.js", (route) => route.abort());
  await page.goto("/flow-preview.html#major=computer-engineering");
  await expect(page.locator("body")).toHaveAttribute("data-flow-reader", "major");
  await expect(page.locator("#major-document .hero")).toHaveCSS("background-color", "rgb(10, 32, 40)");
  await expect(page.locator("#aris-selection-module")).toBeHidden();
});

test("legacy major and province layouts share Flow surfaces without enabling the pilot", async ({ page }) => {
  for (const hash of ["major=electrical-engineering", "province=gilan"]) {
    await page.goto(`/flow-preview.html#${hash}`);
    const surface = hash.startsWith("major") ? "#major-document .hero" : "#province-document .province-chapter";
    await expect(page.locator(surface).first()).toBeVisible();
    await expect(page.locator(surface).first()).toHaveCSS("background-color", "rgb(10, 32, 40)");
    await expect(page.locator("body")).not.toHaveAttribute("data-flow-reader");
    await expect(page.locator("#aris-selection-module")).toBeHidden();
  }
});

test("the compass srcdoc starts with Flow tokens and keeps the native bridge", async ({ page }) => {
  await page.goto("/flow-preview.html");
  await page.locator("#aris-psych-test-launch").click();
  const frame = page.frameLocator("#aris-compass-frame");
  await expect(frame.locator("body")).toHaveCSS("background-color", "rgb(3, 19, 25)");
  await expect(frame.locator("html")).toHaveCSS("color-scheme", "dark");
  const source = await page.locator("#aris-compass-frame").getAttribute("srcdoc");
  expect(source?.includes("data-flow-theme")).toBe(true);
  expect(source?.includes("--flow-bg")).toBe(true);
  // A representative score bar uses the real report stylesheet without
  // answering a quiz or touching persisted user data.
  const bar = await frame.locator("body").evaluate((body) => {
    const track = document.createElement("div");
    track.className = "bar-track";
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = "50%";
    track.append(fill); body.append(track);
    const result = getComputedStyle(fill).backgroundImage;
    track.remove();
    return result;
  });
  expect(bar).not.toContain("rgb(10, 32, 40)");
  await page.locator("#aris-compass-close").click();
  await expect(page.locator("#aris-psych-test-launch")).toBeFocused();
});

test("filled accent buttons in the boomi guide keep a readable dark label", async ({ page }) => {
  await page.goto("/flow-preview.html");
  await page.locator("#boomi-guide-spotlight").click();
  const frame = page.frameLocator("#guide-reader-frame");
  await expect(frame.locator(".btn.primary").first()).toHaveCSS("color", "rgb(3, 19, 25)");
});

test("every guide receives a dark document before srcdoc navigation", async ({ page }) => {
  const canonical = await readFile("public/index.html", "utf8");
  const encodedGuides = canonical.match(/<script\b[^>]*\bid="aris-selection-guides-data"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  expect(encodedGuides).toBeTruthy();
  const originalGuides: { id: string; document: string }[] = JSON.parse(encodedGuides!);
  await page.goto("/flow-preview.html");
  await page.waitForFunction(() => Boolean((window as unknown as { ArisSelectionModule?: unknown }).ArisSelectionModule));
  const guides = await page.evaluate(() => {
    const data = JSON.parse(document.getElementById("aris-selection-guides-data")!.textContent!);
    return data.map((guide: { id: string }) => ({ id: guide.id }));
  });
  expect(guides).toHaveLength(22);
  for (const guide of guides) {
    await page.evaluate((id) => (window as unknown as { ArisSelectionModule: { open(id: string): Promise<void> } }).ArisSelectionModule.open(id), guide.id);
    const original = await page.evaluate((id) => {
      const data = JSON.parse(document.getElementById("aris-selection-guides-data")!.textContent!);
      return data.find((guide: { id: string }) => guide.id === id).document as string;
    }, guide.id);
    // Network hydration must return the authored source byte for byte, not a
    // rewritten substitute that would make the srcdoc comparison tautological.
    expect(original, guide.id).toBe(originalGuides.find((item) => item.id === guide.id)!.document);
    const expectedTitle = await page.evaluate((html) => (window as unknown as { FlowBranding: { text(value: string): string } }).FlowBranding.text(new DOMParser().parseFromString(html, "text/html").title), original);
    const source = await page.locator("#guide-reader-frame").getAttribute("srcdoc");
    expect(source?.includes("data-flow-theme"), guide.id).toBe(true);
    expect(source?.includes("--flow-bg"), guide.id).toBe(true);
    // Compare the inert documents before their own search/UI scripts run.
    const preserved = await page.evaluate(({ id, source }) => {
      const data = JSON.parse(document.getElementById("aris-selection-guides-data")!.textContent!);
      const original = data.find((guide: { id: string }) => guide.id === id).document;
      const branding = (window as unknown as { FlowBranding: { text(value: string): string; code(value: string): string } }).FlowBranding;
      const authored = (html: string, original = false) => {
        const doc = new DOMParser().parseFromString(html, "text/html");
        return Array.from(doc.body.querySelectorAll("h1,h2,h3,p,li,th,td,a,script"))
          .map((node) => ({ tag: node.tagName, text: original ? (node.tagName === "SCRIPT" ? branding.code(node.textContent || "") : branding.text(node.textContent || "")) : node.textContent, href: original && node.hasAttribute("href") ? branding.code(node.getAttribute("href")!) : node.getAttribute("href") }));
      };
      return JSON.stringify(authored(original, true)) === JSON.stringify(authored(source!));
    }, { id: guide.id, source });
    expect(preserved, guide.id).toBe(true);
    const frame = page.frameLocator("#guide-reader-frame");
    await expect.poll(() => frame.locator("html").evaluate((element) => element.ownerDocument.title)).toBe(expectedTitle);
    await expect(frame.locator("body")).toHaveCSS("background-color", "rgb(3, 19, 25)");
    await expect(frame.locator("html")).toHaveCSS("color-scheme", "dark");
    const bright = await frame.locator("body").evaluate((body) => Array.from(body.querySelectorAll("*"))
      .filter((element) => {
        const bounds = element.getBoundingClientRect();
        const color = getComputedStyle(element).backgroundColor.match(/[\d.]+/g)?.map(Number);
        return bounds.width >= 70 && bounds.height >= 24 && color && color[0] > 225 && color[1] > 225 && color[2] > 225 && (color[3] ?? 1) > .5;
      }).map((element) => element.className).slice(0, 5));
    expect(bright, guide.id).toEqual([]);
  }
});

test("all indexed majors and provinces open with dark surfaces on mobile", async ({ page }) => {
  test.setTimeout(180_000);
  const source = await readFile("public/index.html", "utf8");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/flow-preview.html");
  for (const kind of ["major", "province"]) {
    const index = kind === "major" ? "ARIS_MAJORS" : "ARIS_PROVINCES";
    const encoded = source.match(new RegExp(`var ${index} = decodeArisData\\("([A-Za-z0-9+/=]+)"\\)`))?.[1];
    expect(encoded, index).toBeTruthy();
    const items: { id: string; name: string }[] = JSON.parse(inflateRawSync(Buffer.from(encoded!, "base64")).toString());
    expect(items.length).toBeGreaterThan(kind === "major" ? 300 : 30);
    for (const item of items) {
      await page.evaluate(({ kind, id }) => { location.hash = `${kind}=${id}`; }, { kind, id: item.id });
      await expect(page.locator(`#${kind}-viewer-title`), item.id).toHaveText(item.name);
      await expect(page.locator(`#${kind}-viewer-error`), item.id).toBeHidden();
      const surface = kind === "major" ? "#major-document .hero" : "#province-document .province-chapter";
      await expect(page.locator(surface).first(), item.id).toHaveCSS("background-color", "rgb(10, 32, 40)");
      expect(await page.evaluate(() => document.documentElement.scrollWidth), item.id).toBeLessThanOrEqual(390);
      const oldBrand = await page.locator(`#${kind}-document`).evaluate((root) => {
        const bad = /\bAris(?:[\s_-]*Academy)?\b|(?<![\p{L}])[اآ]ریس(?![\p{L}])/iu;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) if (!walker.currentNode.parentElement?.closest("style,script") && bad.test(walker.currentNode.textContent || "")) return true;
        return Array.from(root.querySelectorAll("a[href],[aria-label],[alt]")).some((node) => ["href", "aria-label", "alt"].some((attr) => bad.test(node.getAttribute(attr) || "")));
      });
      expect(oldBrand, item.id).toBe(false);
      await expect(page.locator(`#${kind}-document .aris-footer-join`), item.id).toHaveAttribute("href", "https://t.me/Flow_KonKour");
      await expect(page.locator(`#${kind}-document .flow-footer-logo`), item.id).toHaveCount(1);
    }
  }
});

test("guide screen theming preserves the original print colors", async ({ page }) => {
  await page.goto("/flow-preview.html");
  await page.emulateMedia({ media: "print" });
  for (const id of ["rahnamaye-karbordi-entekhab-reshte", "nezam-vazifeh-mafiyat-tahsili"]) {
    const original = await page.evaluate(async (id) => {
      await (window as unknown as { FlowPayloads: { ensure(id: string): Promise<unknown> } }).FlowPayloads.ensure(id);
      const data = JSON.parse(document.getElementById("aris-selection-guides-data")!.textContent!);
      return data.find((guide: { id: string }) => guide.id === id).document as string;
    }, id);
    const frameElement = page.locator("#guide-reader-frame");
    const expectedTitle = await page.evaluate((html) => new DOMParser().parseFromString(html, "text/html").title, original);
    const colors = async (title = expectedTitle) => {
      const frame = await (await frameElement.elementHandle())!.contentFrame();
      await frame!.waitForFunction((title) => document.title === title, title);
      return frame!.evaluate(() => Array.from(document.querySelectorAll("body,p,th,td,.section,.aris-source-doc"))
        .slice(0, 50).map((node) => {
          const style = getComputedStyle(node);
          return { text: style.color, background: style.backgroundColor, border: style.borderColor };
        }));
    };
    await frameElement.evaluate((node, html) => { (node as HTMLIFrameElement).srcdoc = html; }, original);
    const before = await colors();
    await frameElement.evaluate((node, html) => {
      (node as HTMLIFrameElement).srcdoc = (window as unknown as { FlowDocuments: { theme(html: string): string } }).FlowDocuments.theme(html);
    }, original);
    // A different document title prevents accidentally reading the previous frame.
    await expect.poll(() => frameElement.getAttribute("srcdoc")).toContain("data-flow-document-theme");
    await page.waitForFunction(() => (document.getElementById("guide-reader-frame") as HTMLIFrameElement).contentDocument?.documentElement.hasAttribute("data-flow-theme"));
    const brandedTitle = await page.evaluate((title) => (window as unknown as { FlowBranding: { text(value: string): string } }).FlowBranding.text(title), expectedTitle);
    expect(await colors(brandedTitle), id).toEqual(before);
    const frame = await (await frameElement.elementHandle())!.contentFrame();
    const watermarks = await frame!.evaluate(() => Array.from(document.querySelectorAll(".intro-badge,.final-note,.share-panel"))
      .flatMap((node) => [getComputedStyle(node, "::before").content, getComputedStyle(node, "::after").content]));
    expect(watermarks, id).not.toContain('"A"');
    if (id === "rahnamaye-karbordi-entekhab-reshte") expect(watermarks.length).toBeGreaterThan(0);
  }
});
