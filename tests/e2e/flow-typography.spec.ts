import { expect, test, type Browser, type Frame, type Page } from "@playwright/test";

type Metric = {
  key: string;
  text: string;
  tag: string;
  color: string;
  parentColor: string;
  parentSize: number;
  size: number;
  weight: string;
  wrapped: boolean;
};

const mutedColors = new Set([
  "rgb(182, 203, 212)", "rgb(145, 170, 181)", "rgb(209, 224, 226)",
  "rgb(172, 191, 196)", "rgb(170, 189, 194)", "rgb(160, 185, 186)", "rgb(184, 212, 211)",
]);

async function pair(browser: Browser, width = 980) {
  const baseline = await browser.newContext({ viewport: { width, height: 900 } });
  const current = await browser.newContext({ viewport: { width, height: 900 } });
  await baseline.route("**/flow-preview.html*", async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    // Remove only the startup runtime. Keep its CSS and every native script so
    // both pages use the same application, document theme and authored sizes.
    const runtime = /<script\b[^>]*\bdata-flow-typography\b[^>]*>[\s\S]*?<\/script>/g;
    expect(html.match(runtime)).toHaveLength(1);
    await route.fulfill({ response, body: html.replace(runtime, "") });
  });
  const before = await baseline.newPage();
  const after = await current.newPage();
  await Promise.all([before.goto("/flow-preview.html"), after.goto("/flow-preview.html")]);
  await expect(after.locator("html")).toHaveAttribute("data-flow-typography", "ready");
  for (const page of [before, after]) {
    await expect(page.locator("html")).toHaveAttribute("data-flow-ready", "true");
    await page.evaluate(() => document.fonts.ready);
  }
  await before.evaluate(() => { (window as unknown as { FlowDocuments: { typography: string } }).FlowDocuments.typography = ""; });
  expect(await before.locator("[data-flow-muted-text]").count()).toBe(0);
  return { before, after, close: () => Promise.all([baseline.close(), current.close()]) };
}

async function settled(target: Page | Frame) {
  await target.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

async function metrics(target: Page | Frame, selector = "body"): Promise<Metric[]> {
  return target.locator(selector).evaluate((root) => {
    // Finish finite intro reveals and color fades so both documents are sampled
    // after their authored animation, with the same final text visibility.
    document.getAnimations().filter((animation) => (animation instanceof CSSTransition && animation.transitionProperty === "color")
      || (animation instanceof CSSAnimation && Number.isFinite(animation.effect?.getComputedTiming().iterations ?? Infinity)))
      .forEach((animation) => animation.finish());
    const marker = "[data-flow-muted-text]";
    const excluded = "script,style,noscript,template,textarea,input,select,option,pre,code,svg,canvas,[aria-hidden='true']";
    const paths = new Map<Element, string>();
    function path(element: Element): string {
      if (element === root) return "root";
      if (!paths.has(element)) {
        const parent = element.parentElement!;
        const peers = Array.from(parent.children).filter((node) => !node.matches(marker) && node.tagName === element.tagName);
        paths.set(element, `${path(parent)}/${element.tagName.toLowerCase()}[${peers.indexOf(element)}]`);
      }
      return paths.get(element)!;
    }
    const result: Metric[] = [];
    for (const element of [root, ...Array.from(root.querySelectorAll("*"))]) {
      if (element.matches(marker) || element.closest(excluded)) continue;
      const direct = Array.from(element.childNodes).flatMap((child) => {
        if (child.nodeType === Node.TEXT_NODE) return [child];
        return child instanceof Element && child.matches(marker) ? Array.from(child.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE) : [];
      }).filter((node) => node.textContent?.trim());
      direct.forEach((node, index) => {
        const range = document.createRange();
        range.selectNodeContents(node);
        if (!Array.from(range.getClientRects()).some((rect) => rect.width > 0 && rect.height > 0)) return;
        const appearance = getComputedStyle(node.parentElement!);
        const parent = getComputedStyle(element);
        // Opacity is composited by the original parent; it is not inherited by
        // a neutral span, so test the same authored element in both documents.
        if (parent.visibility === "hidden" || parent.opacity === "0") return;
        result.push({
          key: `${path(element)}:text[${index}]`, text: node.textContent!, tag: element.tagName,
          color: appearance.color, parentColor: parent.color, parentSize: parseFloat(parent.fontSize),
          size: parseFloat(appearance.fontSize), weight: appearance.fontWeight,
          wrapped: node.parentElement!.matches(marker),
        });
      });
    }
    return result;
  });
}

function compare(before: Metric[], after: Metric[], label: string, print = false) {
  expect(after.map(({ key, text, tag, parentSize, parentColor, weight }) => ({ key, text, tag, parentSize, parentColor, weight })), label)
    .toEqual(before.map(({ key, text, tag, parentSize, parentColor, weight }) => ({ key, text, tag, parentSize, parentColor, weight })));
  let larger = 0;
  after.forEach((actual, index) => {
    const authored = before[index];
    const context = `${label}: ${actual.tag} ${actual.text.trim().slice(0, 90)}`;
    expect(actual.color, context).toBe(authored.color);
    const difference = actual.size - authored.size;
    if (print || !mutedColors.has(authored.color) || /^H[1-6]$/.test(authored.tag) || authored.size > 24) {
      expect(actual.size, context).toBe(authored.size);
    } else {
      expect(difference, context).toBeGreaterThanOrEqual(0);
      expect(difference, context).toBeLessThanOrEqual(2.0001);
      if (difference > .001) {
        expect(actual.wrapped, context).toBe(true);
        larger++;
      }
    }
  });
  return larger;
}

async function guide(page: Page, id: string, enlarged: boolean) {
  await page.evaluate((id) => (window as unknown as { ArisSelectionModule: { open(id: string): Promise<void> } }).ArisSelectionModule.open(id), id);
  const title = await page.locator("#guide-reader-frame").evaluate((element) => new DOMParser().parseFromString((element as HTMLIFrameElement).srcdoc, "text/html").title);
  const frame = await (await page.locator("#guide-reader-frame").elementHandle())!.contentFrame();
  await frame!.waitForFunction((title) => document.title === title && document.readyState === "complete", title);
  if (enlarged) await expect(frame!.locator("html")).toHaveAttribute("data-flow-typography", "ready");
  await frame!.evaluate(() => document.fonts.ready);
  await settled(frame!);
  return frame!;
}

test("pictured gray copy grows by two pixels while white headings and original parent sizes stay unchanged", async ({ browser }) => {
  const pages = await pair(browser);
  try {
    for (const width of [980, 320, 1440, 980]) {
      await Promise.all([pages.before.setViewportSize({ width, height: 900 }), pages.after.setViewportSize({ width, height: 900 })]);
      await settled(pages.after);
      const larger = compare(await metrics(pages.before), await metrics(pages.after), `homepage ${width}px`);
      expect(larger).toBeGreaterThan(10);
    }
    for (const [selector, authored, enlarged] of [
      [".hero__lead", 20, 22],
      ["#province-search-help > span", 11, 13],
      ["#aris-smart-tools .smart-tool__beta-main > p", 15, 17],
      [".flow-guide-entry p", 15, 17],
      [".guide-card__desc", 13, 15],
    ] as const) {
      await expect(pages.before.locator(selector).first()).toHaveCSS("font-size", `${authored}px`);
      await expect(pages.after.locator(selector).first()).toHaveCSS("font-size", `${authored}px`);
      await expect(pages.after.locator(selector).first().locator("[data-flow-muted-text]")).toHaveCSS("font-size", `${enlarged}px`);
    }
    for (const [selector, size] of [["#page-title", 40], [".smart-tool__beta-main > h3", 24], [".flow-guide-entry h2", 24], [".guide-card__title", 16]] as const) {
      await expect(pages.after.locator(selector).first()).toHaveCSS("font-size", `${size}px`);
      await expect(pages.after.locator(selector).first().locator("[data-flow-muted-text]")).toHaveCount(0);
    }
    await Promise.all([pages.before.emulateMedia({ media: "print" }), pages.after.emulateMedia({ media: "print" })]);
    await Promise.all([settled(pages.before), settled(pages.after)]);
    compare(await metrics(pages.before), await metrics(pages.after), "homepage print", true);
  } finally { await pages.close(); }
});

test("new article renders enlarge gray text once while white search results and selected filter labels retain their size", async ({ browser }) => {
  const pages = await pair(browser);
  try {
    for (const page of [pages.before, pages.after]) {
      await page.locator("#major-search").fill("مهندسی");
      await expect(page.locator("#major-results .result-item").first()).toBeVisible();
    }
    await settled(pages.after);
    const results = await metrics(pages.before, "#major-results");
    expect(results.some((item) => mutedColors.has(item.color))).toBe(false);
    expect(compare(results, await metrics(pages.after, "#major-results"), "white major results")).toBe(0);
    expect(compare(await metrics(pages.before, ".panel-head"), await metrics(pages.after, ".panel-head"), "gray live suggestion count")).toBeGreaterThan(0);
    await expect(pages.before.locator("#panel-status")).toHaveCSS("font-size", "11px");
    await expect(pages.after.locator("#panel-status [data-flow-muted-text]")).toHaveCSS("font-size", "12px");
    await expect(pages.after.locator("#panel-title")).toHaveCSS("font-size", "12px");
    for (const page of [pages.before, pages.after]) await page.locator("#major-search").fill("");
    for (const category of ["future", "all", "future", "all"]) {
      for (const page of [pages.before, pages.after]) await page.locator(`#guide-filters [data-category="${category}"]`).click();
      await settled(pages.after);
      compare(await metrics(pages.before, "#guide-filters"), await metrics(pages.after, "#guide-filters"), `filters ${category}`);
      expect(compare(await metrics(pages.before, "#guide-grid"), await metrics(pages.after, "#guide-grid"), `cards ${category}`)).toBeGreaterThan(0);
    }
    for (const page of [pages.before, pages.after]) await page.locator("#guide-reveal").click();
    await settled(pages.after);
    expect(compare(await metrics(pages.before, "#guide-grid"), await metrics(pages.after, "#guide-grid"), "revealed article cards")).toBeGreaterThan(6);
  } finally { await pages.close(); }
});

test("all 22 guide documents preserve their text, white emphasis and complete print typography", async ({ browser }) => {
  test.setTimeout(180_000);
  const pages = await pair(browser);
  try {
    const ids: string[] = await pages.before.evaluate(() => JSON.parse(document.getElementById("aris-selection-guides-data")!.textContent!).map((item: { id: string }) => item.id));
    expect(ids).toHaveLength(22);
    let documentsWithLargerCopy = 0;
    let documentsWithoutGrayCopy = 0;
    for (const id of ids) {
      await Promise.all([pages.before.emulateMedia({ media: "screen" }), pages.after.emulateMedia({ media: "screen" })]);
      const [before, after] = await Promise.all([guide(pages.before, id, false), guide(pages.after, id, true)]);
      const original = await metrics(before);
      if (compare(original, await metrics(after), id) > 0) documentsWithLargerCopy++;
      if (!original.some((item) => mutedColors.has(item.color))) documentsWithoutGrayCopy++;
      if (id === "boomi-gozini-entekhab-reshte") {
        const inlineCaps = await after.locator("body").evaluate((root, gray) => Array.from(root.querySelectorAll("p,li"))
          .filter((element) => gray.includes(getComputedStyle(element).color))
          .flatMap((element) => {
            const white = Array.from(element.querySelectorAll("b,strong")).filter((emphasis) => {
              const channels = getComputedStyle(emphasis).color.match(/[\d.]+/g)?.map(Number);
              return channels && channels.slice(0, 3).every((value) => value >= 220) && (channels[3] ?? 1) >= .9;
            }).map((emphasis) => parseFloat(getComputedStyle(emphasis).fontSize));
            const base = parseFloat(getComputedStyle(element).fontSize);
            if (!white.length || white.some((size) => base > size)) return [];
            return Array.from(element.childNodes).flatMap((child) => {
              const text = child.nodeType === Node.TEXT_NODE ? child : child instanceof Element && child.matches("[data-flow-muted-text]") ? child.firstChild : null;
              return text?.textContent?.trim() ? [{ gray: parseFloat(getComputedStyle(text.parentElement!).fontSize), white: Math.min(...white) }] : [];
            });
          }), [...mutedColors]);
        expect(inlineCaps.length, "Boomi contains real mixed gray and white inline copy").toBeGreaterThan(0);
        for (const item of inlineCaps) expect(item.gray, "Boomi gray copy stays below unchanged white emphasis").toBeLessThanOrEqual(item.white);
      }
      await Promise.all([pages.before.emulateMedia({ media: "print" }), pages.after.emulateMedia({ media: "print" })]);
      await Promise.all([settled(before), settled(after)]);
      compare(await metrics(before), await metrics(after), `${id} print`, true);
    }
    expect(documentsWithLargerCopy).toBeGreaterThan(0);
    expect(documentsWithoutGrayCopy).toBeGreaterThan(0);
  } finally { await pages.close(); }
});

test("native pilot and legacy reader injection keeps white copy unchanged and caps gray text at a nearby heading", async ({ browser }) => {
  test.setTimeout(120_000);
  const pages = await pair(browser);
  try {
    let pilotCopyGrows = 0;
    for (const hash of ["major=computer-engineering", "major=medicine", "major=law", "major=graphic-design", "major=psychology", "major=electrical-engineering", "province=gilan"]) {
      const kind = hash.startsWith("major") ? "major" : "province";
      for (const page of [pages.before, pages.after]) {
        await page.evaluate((hash) => { location.hash = hash; }, hash);
        await expect(page.locator(`#${kind}-document .${kind === "major" ? "page" : "province-chapter"}`).first()).toBeVisible();
      }
      await settled(pages.after);
      const original = await metrics(pages.before, `#${kind}-document`);
      const actual = await metrics(pages.after, `#${kind}-document`);
      if (compare(original, actual, hash) > 0 && kind === "major" && hash !== "major=electrical-engineering") pilotCopyGrows++;
      expect(original.some((item) => !mutedColors.has(item.color))).toBe(true);
      if (hash === "major=medicine") {
        const careers = pages.after.locator("#major-document .flow-reader-section")
          .filter({ has: pages.after.getByRole("heading", { name: "مسیرهای شغلی پزشک عمومی", exact: true }) });
        await expect(careers.locator(":scope > p").first()).toHaveCSS("font-size", "16px");
        await expect(careers.locator(":scope > p > [data-flow-muted-text]").first()).toHaveCSS("font-size", "17px");
        await expect(careers.locator("h3").first()).toHaveCSS("font-size", "17px");
        await expect(careers.locator("h3 [data-flow-muted-text]")).toHaveCount(0);
      }
    }
    expect(pilotCopyGrows).toBe(5);
    await Promise.all([pages.before.emulateMedia({ media: "print" }), pages.after.emulateMedia({ media: "print" })]);
    await Promise.all([settled(pages.before), settled(pages.after)]);
    compare(await metrics(pages.before, "#province-document"), await metrics(pages.after, "#province-document"), "native province print", true);
  } finally { await pages.close(); }
});

test("native compass views and a dynamically rendered report preserve white typography and original print sizes", async ({ browser }) => {
  const pages = await pair(browser);
  try {
    for (const page of [pages.before, pages.after]) await page.locator("#aris-psych-test-launch").click();
    const frames = await Promise.all([pages.before, pages.after].map(async (page) => {
      const frame = await (await page.locator("#aris-compass-frame").elementHandle())!.contentFrame();
      await expect(frame!.locator("#homeView")).toHaveClass(/active/);
      await frame!.evaluate(() => document.fonts.ready);
      return frame!;
    }));
    await expect(frames[1].locator("html")).toHaveAttribute("data-flow-typography", "ready");
    await settled(frames[1]);
    expect(compare(await metrics(frames[0]), await metrics(frames[1]), "compass home")).toBeGreaterThan(0);
    for (const frame of frames) await frame.locator("#reportBtn").evaluate((button) => (button as HTMLButtonElement).click());
    for (const frame of frames) await expect(frame.locator("#reportView")).toHaveClass(/active/);
    await settled(frames[1]);
    expect(compare(await metrics(frames[0], "#reportView"), await metrics(frames[1], "#reportView"), "dynamic native report")).toBeGreaterThan(0);
    await Promise.all([pages.before.emulateMedia({ media: "print" }), pages.after.emulateMedia({ media: "print" })]);
    await Promise.all(frames.map(settled));
    compare(await metrics(frames[0]), await metrics(frames[1]), "compass report print", true);
  } finally { await pages.close(); }
});
