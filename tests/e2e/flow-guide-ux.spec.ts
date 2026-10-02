import { expect, test } from "@playwright/test";

// Exercise the real browsing and reader controls rather than a second copy of
// their implementation. The preserved guide corpus remains covered separately.
test("article browsing pages through all guides and keeps its category choice accessible", async ({ page }) => {
  await page.goto("/flow-preview.html");
  const cards = page.locator("#guide-grid .guide-card");
  await expect(cards).toHaveCount(6);
  for (const count of [12, 18, 22]) {
    await page.locator("#guide-reveal").click();
    await expect(cards).toHaveCount(count);
    await expect(cards.locator(".guide-card__hit").nth(count === 22 ? 18 : count - 6)).toBeFocused();
  }
  await expect(page.locator("#guide-reveal")).toBeHidden();
  const ids = await cards.locator("[data-guide-id]").evaluateAll((buttons) => buttons.map((button) => (button as HTMLElement).dataset.guideId));
  expect(new Set(ids).size).toBe(22);
  const future = page.locator('#guide-filters [data-category="future"]');
  await future.focus();
  await page.keyboard.press("Enter");
  await expect(future).toHaveAttribute("aria-pressed", "true");
  await expect(future).toBeFocused();
  await expect(cards).toHaveCount(3);
  await page.locator("#flow-guide-reset").click();
  await expect(cards).toHaveCount(6);
  await expect(page.locator("#guide-search")).toBeFocused();
});

test("article search includes full document text and provides recovery from empty results", async ({ page }) => {
  await page.goto("/flow-preview.html");
  const search = page.locator("#guide-search");
  // This phrase is inside the system-of-duty article, outside its title,
  // description and keyword metadata. Build-time indexing must keep it.
  await search.fill("ترخیص برای ادامه تحصیل");
  await expect(page.locator('[data-guide-id="nezam-vazifeh-mafiyat-tahsili"]')).toBeVisible();
  await search.fill("flow-no-such-guide-12345");
  await expect(page.locator("#guide-empty")).toBeVisible();
  await expect(page.locator("#guide-reveal")).toBeHidden();
  await page.locator("#flow-guide-reset").click();
  await expect(page.locator("#guide-empty")).toBeHidden();
  await expect(page.locator("#guide-grid .guide-card")).toHaveCount(6);
  await expect(search).toBeEmpty();
  await expect(search).toBeFocused();
});

test("article controls and reading navigation fit small screens and return focus to the selected article", async ({ page }) => {
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/flow-preview.html");
    const card = page.locator("#guide-grid .guide-card__hit").first();
    await card.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `library at ${width}px`).toBeLessThanOrEqual(width);
    const filters = page.locator("#guide-filters .guide-filter");
    for (const filter of await filters.all()) {
      const bounds = await filter.boundingBox();
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    }
    await card.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#guide-reader")).toBeVisible();
    await expect(page.locator("#guide-reader-title")).toContainText("نقشه راه");
    for (const id of ["guide-reader-close", "guide-reader-prev", "guide-reader-next"]) {
      const bounds = await page.locator(`#${id}`).boundingBox();
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
      expect(bounds!.width).toBeGreaterThanOrEqual(44);
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    }
    await page.locator("#guide-reader-next").click();
    await expect(page.locator("#guide-reader-title")).toContainText("اشتباهات");
    await page.locator("#guide-reader-close").click();
    await expect(page.locator("#guide-reader")).toBeHidden();
    await expect(card).toBeFocused();
  }
});

test("prepared article search indexes match the original full document corpus", async ({ page }) => {
  await page.goto("/flow-preview.html");
  const differences = await page.evaluate(() => {
    const guides: { id: string; document: string }[] = JSON.parse(document.getElementById("aris-selection-guides-data")!.textContent!);
    const index: Record<string, string> = JSON.parse(document.getElementById("flow-guide-search-index")!.textContent!);
    const normalize = (value: string) => value.toLowerCase().replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/[أإ]/g, "ا").replace(/ة/g, "ه").replace(/[^\u0600-\u06ff0-9a-z]+/gi, " ").trim();
    return {
      count: Object.keys(index).length,
      mismatches: guides.filter((guide) => {
        const doc = new DOMParser().parseFromString(guide.document, "text/html");
        doc.querySelectorAll("style,script,noscript,.aris-inline-search-tools,.aris-article-tools").forEach((node) => node.remove());
        return index[guide.id] !== normalize(doc.body.textContent ?? "");
      }).map((guide) => guide.id),
    };
  });
  expect(differences.count).toBe(22);
  expect(differences.mismatches).toEqual([]);
});
