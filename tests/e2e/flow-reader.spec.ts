import { expect, test } from "@playwright/test";

const pilot = "/flow-preview.html#major=computer-engineering";

test("Flow pilot retains the authored dossier, tables and source links", async ({ page }) => {
  await page.goto("/index.html#major=computer-engineering");
  await expect(page.locator("#major-document .page")).toBeVisible();
  const content = () => page.locator("#major-document .page").evaluate((root) =>
    Array.from(root.querySelectorAll("h2,h3,p,li,th,td,a"))
      .filter((node) => !node.closest(".hero,.aris-inline-invite"))
      .map((node) => ({ tag: node.tagName, text: node.textContent?.trim(), href: node.getAttribute("href") }))
  );
  const original = await content();
  expect(original.length).toBeGreaterThan(100);
  await page.goto(pilot);
  await expect(page.locator("body")).toHaveAttribute("data-flow-reader", "major");
  await expect(page).toHaveTitle("مهندسی کامپیوتر | Flow");
  expect(await content()).toEqual(original);
  await expect(page.locator(".aris-footer-credit")).toContainText("آریس آکادمی");
  await expect(page.locator(".aris-footer-join")).toHaveAttribute("href", "https://t.me/Flow_Konkour");
});

test("pilot navigation, details, close and browser history keep working", async ({ page }) => {
  await page.goto("/flow-preview.html");
  await page.locator("#major-search").fill("مهندسی کامپیوتر");
  await page.locator("#major-option-0").click();
  await expect(page.locator("body")).toHaveAttribute("data-flow-reader", "major");
  await page.locator('[data-aris-jump="comparison"]').click();
  await expect(page.locator(".aris-comparison-details")).toHaveAttribute("open", "");
  await expect(page.locator(".aris-compare-card")).toHaveCount(3);
  await page.locator(".aris-comparison-details summary").click();
  await expect(page.locator(".aris-comparison-details")).not.toHaveAttribute("open", "");
  await page.locator("#major-viewer-close").click();
  await expect(page.locator("#search-form")).toBeVisible();
  await expect(page.locator("body")).not.toHaveAttribute("data-flow-reader");
  await page.goForward();
  await expect(page.locator("body")).toHaveAttribute("data-flow-reader", "major");
  await expect(page.locator(".flow-reader-art")).toHaveCount(1);
  await page.locator('.flow-navigation a[href="#province-search"]').click();
  await expect(page.locator("#province-search")).toBeFocused();
  await expect(page.locator("body")).not.toHaveAttribute("data-flow-reader");
  await page.goto("/flow-preview.html#province=gilan");
  await expect(page.locator("#province-viewer")).toBeVisible();
  await expect(page.locator("body")).not.toHaveAttribute("data-flow-reader");
  await page.goto("/flow-preview.html");
  await page.locator("#major-search").fill("مهندسی برق");
  await page.locator("#major-option-0").click();
  await expect(page.locator("#major-viewer")).toBeVisible();
  await expect(page.locator("body")).not.toHaveAttribute("data-flow-reader");
});

for (const width of [320, 390, 768]) {
  test(`reader fits ${width}px and keeps jump targets below the sticky navigation`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(pilot);
    await expect(page.locator("body")).toHaveAttribute("data-flow-reader", "major");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.locator('[data-aris-jump="market"]').click();
    await expect.poll(() => page.locator('[data-aris-jump="market"]').getAttribute("class")).toContain("is-active");
    await expect.poll(async () => page.evaluate(() => {
      const nav = document.querySelector(".aris-quick-nav")!.getBoundingClientRect();
      const heading = Array.from(document.querySelectorAll("#major-document h2"))
        .find((node) => node.textContent === "درآمد و عوامل مؤثر بر آن")!;
      const top = heading.getBoundingClientRect().top;
      return top >= nav.bottom - 2 && top < window.innerHeight;
    })).toBe(true);
    await page.locator(".aris-evidence summary").click();
    await expect(page.locator(".aris-evidence")).toHaveAttribute("open", "");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}
