import { devices, expect, test, type Page } from "@playwright/test";

const home = () => new URL("/flow-preview.html", test.info().project.use.baseURL ?? "http://127.0.0.1:3000").href;

async function ready(page: Page, suffix = "") {
  await page.goto(`${home()}${suffix}`);
  await expect(page.locator("html")).toHaveAttribute("data-flow-ready", "true");
  await page.evaluate(() => document.fonts.ready);
}

async function homepageLayout(page: Page) {
  return page.evaluate(() => {
    const style = (selector: string) => getComputedStyle(document.querySelector(selector)!);
    const bounds = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
    const copy = bounds(".flow-hero-copy");
    const hero = bounds(".main > .hero");
    const compass = bounds(".flow-supports #aris-smart-tools");
    const guide = bounds(".flow-supports .flow-guide-entry");
    const image = document.querySelector<HTMLImageElement>(".flow-hero-image")!;
    return {
      headerColumns: style(".site-header").gridTemplateColumns,
      navigationRow: style(".flow-navigation").gridRow,
      navigationFont: style(".flow-navigation a").fontSize,
      channelLabel: style(".site-header .channel-link span").display,
      soundLabel: style(".site-header .sound-label").display,
      wordmark: [style(".flow-wordmark").width, style(".flow-wordmark").height],
      heroCopyRatio: Math.round(copy.width / hero.width * 1000),
      heroPadding: style(".main > .hero").padding,
      titleFont: style("#page-title").fontSize,
      heroSource: new URL(image.currentSrc).pathname,
      heroPosition: style(".flow-hero-image").objectPosition,
      majorColumns: style(".search-field").gridTemplateColumns,
      majorInputRow: style("#major-search").gridRow,
      majorSubmitRow: style(".search-submit").gridRow,
      provinceColumns: style(".province-search-field").gridTemplateColumns,
      provinceInputRow: style("#province-search").gridRow,
      provinceSubmitRow: style(".province-search-submit").gridRow,
      supportColumns: style(".flow-supports").gridTemplateColumns,
      supportsShareRow: Math.abs(compass.top - guide.top) < 1,
      compassRightOfGuide: compass.left > guide.left,
      guideColumns: style(".selection-guide-grid").gridTemplateColumns,
    };
  });
}

test("real phones use the same homepage layout and artwork as a 1440px desktop", async ({ browser }) => {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const desktopPage = await desktop.newPage();
  await ready(desktopPage);
  const expected = await homepageLayout(desktopPage);
  expect(expected.supportsShareRow).toBe(true);
  expect(expected.compassRightOfGuide).toBe(true);
  expect(expected.guideColumns.split(" ")).toHaveLength(3);

  for (const name of ["iPhone 13", "iPhone SE"]) {
    const context = await browser.newContext({ ...devices[name] });
    const page = await context.newPage();
    await ready(page);
    await expect(page.locator("html"), name).toHaveAttribute("data-flow-viewport", "desktop");
    const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
    expect(viewport, name).toContain("width=1440");
    expect(viewport, name).toContain("viewport-fit=cover");
    expect(viewport, name).not.toMatch(/initial-scale|maximum-scale|user-scalable/i);
    // Chromium's default .25 zoom floor otherwise crops 320px phones.
    expect(viewport, name).toContain("minimum-scale=0.1");
    expect(await page.evaluate(() => window.innerWidth), name).toBe(1440);
    expect(await homepageLayout(page), name).toEqual(expected);
    await context.close();
  }
  await desktop.close();
});

test("desktop controls remain usable by touch for searches, articles and the native compass", async ({ browser }) => {
  test.setTimeout(120_000);
  for (const name of ["iPhone 13", "iPhone SE"]) {
    const context = await browser.newContext({ ...devices[name] });
    const page = await context.newPage();
    await ready(page);
    await page.locator("#major-search").tap();
    await page.locator("#major-search").fill("مهندسی کامپیوتر");
    await page.locator("#major-option-0").tap();
    await expect(page.locator("body"), name).toHaveAttribute("data-flow-reader", "major");
    await expect(page.locator("#major-document .page")).toBeVisible();
    await expect(page.locator("#major-document table").first()).toBeVisible();
    await page.locator("#major-viewer-close").tap();
    await expect(page.locator("#major-viewer")).toBeHidden();

    await page.locator("#province-search").tap();
    await page.locator("#province-search").fill("گیلان");
    await page.locator("#province-results button").first().tap();
    await expect(page.locator("#province-viewer-title")).toHaveText("گیلان");
    await expect(page.locator("#province-document .province-chapter").first()).toBeVisible();
    await page.locator("#province-viewer-close").tap();
    await expect(page.locator("#province-viewer")).toBeHidden();

    const card = page.locator("#guide-grid .guide-card__hit").first();
    await card.tap();
    await expect(page.locator("#guide-reader-title")).toContainText("نقشه راه");
    const guideFrame = page.frameLocator("#guide-reader-frame");
    await expect(guideFrame.locator("body")).toHaveCSS("background-color", "rgb(3, 19, 25)");
    expect(await guideFrame.locator("html").evaluate(() => window.innerWidth), name).toBe(1440);
    await expect(guideFrame.locator('meta[name="viewport"]')).toHaveAttribute("content", "width=device-width,initial-scale=1,viewport-fit=cover");
    await page.locator("#guide-reader-next").tap();
    await expect(page.locator("#guide-reader-title")).toContainText("اشتباهات");
    await expect.poll(() => page.frameLocator("#guide-reader-frame").locator("html").evaluate((element) => element.ownerDocument.title)).toContain("اشتباهات");
    await page.locator("#guide-reader-close").tap();
    await expect(page.locator("#guide-reader")).toBeHidden();
    await expect(card).toBeFocused();

    await page.locator("#aris-psych-test-launch").tap();
    const compass = page.frameLocator("#aris-compass-frame");
    await expect(compass.locator("#startBtn")).toBeVisible();
    expect(await compass.locator("html").evaluate(() => window.innerWidth), name).toBe(1440);
    await expect(compass.locator('meta[name="viewport"]')).toHaveAttribute("content", "width=device-width,initial-scale=1,viewport-fit=cover");
    await compass.locator("#startBtn").tap();
    await expect(compass.locator("#nextPageBtn")).toHaveText("شروع سؤال‌ها");
    await expect(compass.locator("select")).not.toHaveCount(0);
    await page.locator("#aris-compass-close").tap();
    await expect(page.locator("#aris-compass-dialog")).toBeHidden();
    await expect(page.locator("#aris-psych-test-launch")).toBeFocused();
    await context.close();
  }
});

test("orientation and pinch zoom keep the desktop layout without activating compact search", async ({ browser, browserName }) => {
  const context = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await context.newPage();
  await ready(page);
  const portrait = await homepageLayout(page);
  await page.setViewportSize({ width: 844, height: 390 });
  await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(1440);
  await expect.poll(() => homepageLayout(page)).toEqual(portrait);
  await page.locator("#major-search").tap();
  await page.locator("#major-search").fill("مهندسی");
  await expect(page.locator("#suggestion-panel")).toBeVisible();
  const filledColumns = await page.locator(".search-field").evaluate((node) => getComputedStyle(node).gridTemplateColumns);

  if (browserName === "chromium") {
    const session = await context.newCDPSession(page);
    // Zoom the real mobile viewport instead of shrinking a desktop window.
    // Its CSS layout must stay at desktop width while the visual area shrinks.
    await session.send("Emulation.setPageScaleFactor", { pageScaleFactor: 2 });
    await expect.poll(() => page.evaluate(() => window.visualViewport!.height)).toBeLessThan(500);
    await expect.poll(() => page.evaluate(() => window.visualViewport!.scale)).toBeGreaterThan(1);
    await expect(page.locator("body")).not.toHaveAttribute("data-flow-search-compact");
    await expect(page.locator("body")).not.toHaveAttribute("data-flow-search-tight");
    await expect(page.locator(".flow-navigation")).toHaveCSS("display", "flex");
    expect(await page.locator(".search-field").evaluate((node) => getComputedStyle(node).gridTemplateColumns)).toBe(filledColumns);
    expect(await page.locator(".search-submit").evaluate((node) => getComputedStyle(node).gridRow)).toBe(portrait.majorSubmitRow);
    await session.detach();
  }
  await context.close();
});

test("direct major and province links keep desktop reader columns and text sizes on phones", async ({ browser }) => {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const desktopPage = await desktop.newPage();
  const phone = await browser.newContext({ ...devices["iPhone SE"] });
  const phonePage = await phone.newPage();
  for (const profile of [
    { hash: "major=computer-engineering", container: "#major-document .page", heading: "#major-document h1", grid: "#major-document .aris-snapshot-grid" },
    { hash: "province=gilan", container: "#province-document .province-chapter", heading: "#province-viewer-title", grid: "#province-document .province-card-row--compact-grid" },
  ]) {
    const snapshot = async (page: Page) => page.evaluate(({ container, heading, grid }) => {
      const root = document.querySelector(container)!;
      const title = document.querySelector(heading)!;
      const columns = document.querySelector(grid)!;
      return {
        width: Math.round(root.getBoundingClientRect().width),
        textSize: getComputedStyle(root).fontSize,
        headingSize: getComputedStyle(title).fontSize,
        headingText: title.textContent,
        display: getComputedStyle(columns).display,
        columns: getComputedStyle(columns).gridTemplateColumns,
      };
    }, profile);
    await ready(desktopPage, `#${profile.hash}`);
    await expect(desktopPage.locator(profile.container).first()).toBeVisible();
    const expected = await snapshot(desktopPage);
    await ready(phonePage, `#${profile.hash}`);
    await expect(phonePage.locator(profile.container).first()).toBeVisible();
    expect(await snapshot(phonePage), profile.hash).toEqual(expected);
    expect(await phonePage.evaluate(() => window.innerWidth)).toBe(1440);
  }
  await phone.close();
  await desktop.close();
});
