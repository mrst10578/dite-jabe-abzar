import { expect, test } from "@playwright/test";

test("whole-domain searches stay bounded and keyboard choices remain visible", async ({ page }) => {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/flow-preview.html");
    await page.locator("#filter-toggle").click();
    await page.locator("#filter-options button").filter({ hasText: "فنی و مهندسی" }).click();
    const panel = page.locator("#suggestion-panel");
    const results = page.locator("#major-results");
    await expect.poll(() => results.locator(".result-item").count()).toBeGreaterThan(20);
    const dimensions = await results.evaluate((node) => ({ height: node.clientHeight, content: node.scrollHeight }));
    expect(dimensions.content).toBeGreaterThan(dimensions.height);
    expect((await panel.boundingBox())!.height).toBeLessThanOrEqual(442);
    await page.locator("#major-search").focus();
    for (let step = 0; step < 9; step++) await page.locator("#major-search").press("ArrowDown");
    const active = page.locator("#major-results .is-active");
    await expect(active).toBeInViewport();
    const visible = await active.evaluate((node) => {
      const bounds = node.getBoundingClientRect();
      const parent = node.parentElement!.getBoundingClientRect();
      return bounds.top >= parent.top - 1 && bounds.bottom <= parent.bottom + 1;
    });
    expect(visible).toBe(true);
    await page.locator("#major-search").press("Enter");
    await expect(page.locator("#major-viewer")).toBeVisible();
    await expect(panel).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});

test("major and province panels close cleanly and leave the input in view", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/flow-preview.html");
  await page.locator("#major-search").fill("مهندسی");
  await expect(page.locator("#suggestion-panel")).toBeVisible();
  await expect(page.locator("#major-search")).toBeInViewport();
  await page.locator("#province-search").fill("گیلان");
  await expect(page.locator("#suggestion-panel")).toBeHidden();
  await expect(page.locator("#province-suggestion-panel")).toBeVisible();
  await page.locator("#province-search").press("Escape");
  await expect(page.locator("#province-suggestion-panel")).toBeHidden();
  await expect(page.locator("#province-search")).toBeFocused();
});

test("search keeps a full choice visible with a keyboard-sized viewport", async ({ page }) => {
  for (const size of [{ width: 390, height: 300 }, { width: 390, height: 360 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(size);
    await page.goto("/flow-preview.html");
    await page.locator("#major-search").fill("مهندسی");
    await expect(page.locator("body")).toHaveAttribute("data-flow-search-compact");
    await expect(page.locator("#major-results .result-item").first()).toBeInViewport({ ratio: 1 });
    await page.locator("#filter-toggle").click();
    await expect(page.locator("#filter-options")).toBeVisible();
    await expect(page.locator("#major-results .result-item").first()).toBeInViewport({ ratio: 1 });
    await page.locator("#major-search").press("Escape");
    await expect(page.locator("body")).not.toHaveAttribute("data-flow-search-compact");
    await expect(page.locator(".flow-navigation")).toBeVisible();
    await page.locator("#province-search").fill("گیلان");
    await expect(page.locator("body")).toHaveAttribute("data-flow-search-compact");
    await expect(page.locator("#province-results button").first()).toBeInViewport({ ratio: 1 });
    for (const selector of ["#province-search", "#province-search-clear", ".province-search-submit"]) {
      const visible = await page.locator(selector).evaluate((node) => {
        const rect = node.getBoundingClientRect();
        const header = document.querySelector(".site-header")!.getBoundingClientRect();
        return rect.top >= header.bottom && rect.bottom <= window.innerHeight;
      });
      expect(visible).toBe(true);
    }
  }
});

test("homepage media stays out of the critical response and province images load on demand", async ({ page }) => {
  const media: string[] = [];
  page.on("request", (request) => { if (request.url().includes("/flow/generated/")) media.push(request.url()); });
  await page.goto("/flow-preview.html");
  expect(await page.evaluate(() => (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming).decodedBodySize)).toBeLessThan(6_500_000);
  expect(media).toEqual([]);
  await expect(page.locator("#ambient-audio")).toHaveAttribute("preload", "none");
  await page.evaluate(() => { location.hash = "province=gilan"; });
  await expect(page.locator("#province-viewer-title")).toHaveText("گیلان");
  const images = page.locator('#province-document img[src^="/flow/generated/"]');
  await expect(images).toHaveCount(4);
  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0)).toBe(true);
  }
  expect(media.filter((url) => url.includes("/province-images/")).length).toBe(4);
});
