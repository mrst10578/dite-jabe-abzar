import { expect, test } from "@playwright/test";

const homeTitle = "Flow | جعبه ابزار انتخاب رشته";
const profiles = [
  { slug: "computer-engineering", title: "مهندسی کامپیوتر", family: "engineering", minTables: 5 },
  { slug: "medicine", title: "پزشکی", family: "health", minTables: 7 },
  { slug: "law", title: "حقوق", family: "humanities", minTables: 5 },
  { slug: "graphic-design", title: "گرافیک", family: "art", minTables: 5 },
  { slug: "psychology", title: "روان‌شناسی", family: "humanities", minTables: 4 },
] as const;

const authoredContent = (page: import("@playwright/test").Page) =>
  page.locator("#major-document .page").evaluate((root) =>
    Array.from(root.querySelectorAll("h2,h3,p,li,th,td,a"))
      .filter((node) => !node.closest(".hero,.aris-inline-invite"))
      .map((node) => ({ tag: node.tagName, text: node.textContent?.trim(), href: node.getAttribute("href") }))
  );

test("five representative Flow readers preserve authored content and sources", async ({ page }) => {
  for (const profile of profiles) {
    await page.goto(`/index.html#major=${profile.slug}`);
    await expect(page.locator("#major-document .page")).toBeVisible();
    const original = await authoredContent(page);
    expect(original.length, profile.slug).toBeGreaterThan(100);

    await page.goto(`/flow-preview.html#major=${profile.slug}`);
    await expect(page.locator("body")).toHaveAttribute("data-flow-reader", "major");
    await expect(page.locator("body")).toHaveAttribute("data-flow-reader-family", profile.family);
    await expect(page.locator("#major-document .page")).toHaveAttribute("data-flow-reader-adapter", profile.family);
    await expect(page).toHaveTitle(`${profile.title} | Flow`);
    expect(await authoredContent(page), profile.slug).toEqual(original);
    expect(await page.locator("#major-document table").count(), profile.slug).toBeGreaterThanOrEqual(profile.minTables);
    await expect(page.locator(".aris-footer-credit")).toContainText("آریس آکادمی");
    await expect(page.locator(".aris-footer-join")).toHaveAttribute("href", "https://t.me/Flow_Konkour");
    await expect(page.locator(".flow-reader-art")).toHaveCount(1);
  }
});

test("pilot navigation, details, close and browser history keep working", async ({ page }) => {
  await page.goto("/flow-preview.html");
  await expect(page).toHaveTitle(homeTitle);
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
  await expect(page.locator("body")).not.toHaveAttribute("data-flow-reader-family");
  await expect(page).toHaveTitle(homeTitle);
  await page.goForward();
  await expect(page.locator("body")).toHaveAttribute("data-flow-reader", "major");
  await expect(page).toHaveTitle("مهندسی کامپیوتر | Flow");
  await expect(page.locator(".flow-reader-art")).toHaveCount(1);
  await page.locator('.flow-navigation a[href="#province-search"]').click();
  await expect(page.locator("#province-search")).toBeFocused();
  await expect(page.locator("body")).not.toHaveAttribute("data-flow-reader");
  await expect(page).toHaveTitle(homeTitle);
  await page.goto("/flow-preview.html#province=gilan");
  await expect(page.locator("#province-viewer")).toBeVisible();
  await expect(page.locator("body")).not.toHaveAttribute("data-flow-reader");

  // A real holdout remains on the legacy reader. This guards against accidental
  // all-major rollout before the next family audit.
  await page.goto("/flow-preview.html");
  await page.locator("#major-search").fill("مهندسی برق");
  await page.locator("#major-option-0").click();
  await expect(page.locator("#major-viewer")).toBeVisible();
  await expect(page.locator("body")).not.toHaveAttribute("data-flow-reader");
});

for (const width of [320, 390, 768]) {
  test(`five validated readers fit ${width}px and keep market jumps below navigation`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const profile of profiles) {
      await page.goto(`/flow-preview.html#major=${profile.slug}`);
      await expect(page.locator("body")).toHaveAttribute("data-flow-reader", "major");
      expect(await page.evaluate(() => document.documentElement.scrollWidth), profile.slug).toBeLessThanOrEqual(width);

      const marketButton = page.locator('[data-aris-jump="market"]');
      await expect(marketButton).toBeVisible();
      await marketButton.click();
      await expect.poll(() => marketButton.getAttribute("class")).toContain("is-active");
      await expect.poll(async () => page.evaluate(() => {
        const nav = document.querySelector(".aris-quick-nav")?.getBoundingClientRect();
        const market = document.querySelector('[data-aris-section="market"]')?.getBoundingClientRect();
        return Boolean(nav && market && market.top >= nav.bottom - 2 && market.top < window.innerHeight);
      })).toBe(true);

      const evidence = page.locator(".aris-evidence");
      if (await evidence.count()) {
        await evidence.locator("summary").click();
        await expect(evidence).toHaveAttribute("open", "");
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth), profile.slug).toBeLessThanOrEqual(width);
    }
  });
}
