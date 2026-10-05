import { expect, test } from "@playwright/test";

test("Flow retains independent major and province searches", async ({ page }) => {
  await page.goto("/flow-preview.html");
  await expect(page.locator("html")).toHaveAttribute("data-flow-ready", "true");
  await expect(page.locator(".brand-lockup img")).toHaveAttribute("alt", "Flow");
  await expect(page.locator(".brand-lockup")).not.toContainText("فلو");
  await expect(page.locator("#search-form")).toBeVisible();
  await expect(page.locator("#province-search-form")).toBeVisible();
  await page.locator("#major-search").fill("مهندسی کامپیوتر");
  await expect(page.locator("#major-results")).toBeVisible();
  await expect(page.locator("#major-results")).toContainText("کامپیوتر");
  await page.locator("#province-search").fill("گیلان");
  await expect(page.locator("#province-results")).toBeVisible();
  await expect(page.locator("#province-results")).toContainText("گیلان");
  await expect(page.locator("#major-search")).toHaveValue("مهندسی کامپیوتر");
  const major = await page.locator("#search-form").boundingBox();
  const province = await page.locator("#province-search-form").boundingBox();
  expect(province?.y).toBeGreaterThan((major?.y ?? 0) + (major?.height ?? 0));
});

test("Flow exposes Flow metadata instead of legacy Aris sharing metadata", async ({ page }) => {
  await page.goto("/flow-preview.html");
  await expect(page).toHaveTitle("Flow | جعبه ابزار انتخاب رشته");
  await expect(page.locator('meta[name="application-name"]')).toHaveAttribute("content", "Flow");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Flow/);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#031319");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "Flow | جعبه ابزار انتخاب رشته");
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", /Flow/);
  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute("content", "Flow");
});

test("Flow search controls fit a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/flow-preview.html");
  await expect(page.locator("html")).toHaveAttribute("data-flow-ready", "true");
  for (const id of ["#search-form", "#province-search-form"]) {
    const box = await page.locator(id).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  }
  for (const id of ["#major-search", "#province-search"]) {
    const box = await page.locator(id).boundingBox();
    expect(box?.width).toBeGreaterThan(120);
  }
});

test("active Flow assets load without placeholders", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-flow-ready", "true");
  await expect(page.locator("body")).toHaveAttribute("data-flow-assets", "ready");
  await page.locator(".flow-other-tools").evaluate((node) => ((node as HTMLDetailsElement).open = true));
  const assets = page.locator(".flow-wordmark, .flow-hero-image, .flow-support-art, .flow-botanical-divider, .flow-data-card__art, .flow-decision-core, .flow-province-art, .flow-future-capsule");
  await expect(assets).toHaveCount(13);
  for (const asset of await assets.all()) await asset.scrollIntoViewIfNeeded();
  await expect.poll(() => assets.evaluateAll((images) => images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  const sources = await assets.evaluateAll((images) => images.map((image) => (image as HTMLImageElement).currentSrc));
  expect(sources.every((src) => !src.includes("-source.webp"))).toBe(true);
  for (const filename of ["flow-data-archive.png", "flow-acceptance-gate.png", "flow-capacity-garden.png", "flow-iran-atlas.png", "flow-decision-core.png", "flow-divider-direct.png", "flow-divider-split.png", "flow-divider-knot.png", "flow-future-capsule.png"]) {
    expect(sources.some((src) => src.includes(filename)), filename).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.locator(".flow-hero-image").evaluate((image) => (image as HTMLImageElement).currentSrc)).toContain("hero-mobile.webp");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
