import { expect, test } from "@playwright/test";

test("Flow foundation retains independent major and province searches", async ({ page }) => {
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
