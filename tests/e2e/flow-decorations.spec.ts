import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("all article documents remove academy watermarks and use Flow card accents on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const original = await readFile("public/index.html", "utf8");
  const encoded = original.match(/<script\b[^>]*id="aris-selection-guides-data"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  expect(encoded).toBeTruthy();
  const guides: { id: string; document: string }[] = JSON.parse(encoded!);
  expect(guides).toHaveLength(22);
  await page.goto("/flow-preview.html");
  expect(await page.locator("#guide-reader-progress").evaluate((node) => getComputedStyle(node).backgroundImage)).toContain("rgb(49, 221, 237)");
  await page.waitForFunction(() => Boolean((window as unknown as { ArisSelectionModule?: unknown }).ArisSelectionModule));
  let decorated = 0;
  for (const guide of guides) {
    const expectedTitle = await page.evaluate((html) => {
      const title = new DOMParser().parseFromString(html, "text/html").title;
      return (window as unknown as { FlowBranding: { text(value: string): string } }).FlowBranding.text(title);
    }, guide.document);
    await page.evaluate(async (id) => {
      await (window as unknown as { ArisSelectionModule: { open(id: string): void | Promise<void> } }).ArisSelectionModule.open(id);
    }, guide.id);
    const frame = page.frameLocator("#guide-reader-frame");
    await expect.poll(() => frame.locator("html").evaluate((element) => element.ownerDocument.title)).toBe(expectedTitle);
    await expect(frame.locator("html")).toHaveAttribute("data-flow-theme", "midnight");
    const decorations = await frame.locator("body").evaluate((body) => {
      const branded = [];
      for (const node of body.querySelectorAll("*")) {
        if (node.matches("style,script")) continue;
        for (const pseudo of ["::before", "::after"]) {
          if (getComputedStyle(node, pseudo).content === '"A"') branded.push(node.className + pseudo);
        }
      }
      const bars = Array.from(body.querySelectorAll(".intro,.section"))
        .map((node) => getComputedStyle(node, "::before").backgroundImage);
      const watermarks = Array.from(body.querySelectorAll(".intro-badge,.final-note,.share-panel"))
        .map((node) => [getComputedStyle(node, "::before").content, getComputedStyle(node, "::after").content]);
      return { branded, bars, watermarks, width: body.ownerDocument.documentElement.scrollWidth };
    });
    expect(decorations.branded, guide.id).toEqual([]);
    expect(decorations.width, guide.id).toBeLessThanOrEqual(390);
    const bars = decorations.bars.filter((background) => background !== "none");
    if (bars.length) {
      decorated += 1;
      for (const background of bars) {
        expect(background, guide.id).toContain("rgb(162, 232, 135)");
        expect(background, guide.id).toContain("rgb(49, 221, 237)");
      }
      for (const watermarks of decorations.watermarks) expect(watermarks, guide.id).not.toContain('"A"');
    }
  }
  expect(decorated).toBe(10);
});
