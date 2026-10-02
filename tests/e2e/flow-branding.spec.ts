import { expect, test, type Locator } from "@playwright/test";

const channel = "https://t.me/Flow_KonKour";
const wordmark = "/flow/assets/flow-wordmark.webp";

// Compatibility IDs and embedded application data are not public branding.
// Inspect every authored text node, including hidden dialogs, plus the labels
// and outbound URLs a user or assistive technology can encounter.
async function brandingFindings(html: Locator) {
  return html.evaluate((root) => {
    const oldBrand = /(?:\baris(?:[\s_-]*academy)?\b|(?<![\p{L}])[اآ]ر[یي]س(?![\p{L}]))/iu;
    const findings: string[] = [];
    const record = (kind: string, value: string | null) => {
      if (value && oldBrand.test(value)) findings.push(`${kind}: ${value.trim().slice(0, 120)}`);
    };
    const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.parentElement?.closest("script,style,template")) record("text", node.textContent);
    }
    for (const element of root.querySelectorAll("[alt],[title],[aria-label],[aria-description],[placeholder],a[href],meta[content]")) {
      for (const name of ["alt", "title", "aria-label", "aria-description", "placeholder"]) {
        record(name, element.getAttribute(name));
      }
      if (element.tagName === "META") {
        const name = element.getAttribute("name") ?? element.getAttribute("property") ?? "";
        if (/^(?:description$|application-name$|copyright$|og:|twitter:)/i.test(name)) {
          record(`meta ${name}`, element.getAttribute("content"));
        }
      }
      const href = element.getAttribute("href");
      if (href && !href.startsWith("#")) record("href", href);
    }
    for (const use of root.querySelectorAll("use")) {
      const href = use.getAttribute("href") ?? use.getAttribute("xlink:href");
      if (href?.includes("aris-sigil-shape")) findings.push("logo: legacy A sigil");
    }
    return findings.slice(0, 12);
  });
}

async function expectFlowChannel(join: Locator) {
  await expect(join).toHaveAttribute("href", channel);
  await expect(join).toHaveAttribute("target", "_blank");
  await expect(join).toHaveAttribute("rel", /\bnoopener\b/);
  await expect(join).toHaveText(/عضویت در کانال فلو/);
}

test("the no-JavaScript homepage already contains only Flow branding", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto("/flow-preview.html");
    expect(await brandingFindings(page.locator("html"))).toEqual([]);
    await expect(page.locator(".flow-wordmark")).toHaveAttribute("alt", /flow/i);
    await expectFlowChannel(page.locator(".aris-home-footer .flow-channel-join"));
    await expect(page.locator(".aris-home-footer")).toContainText("@Flow_KonKour");
  } finally {
    await context.close();
  }
});

test("healthcare, engineering and province reader footers use the Flow logo and channel", async ({ page }) => {
  for (const hash of ["major=occupational-therapy", "major=electrical-engineering", "province=gilan"]) {
    await page.goto(`/flow-preview.html#${hash}`);
    const kind = hash.startsWith("major=") ? "major" : "province";
    const document = page.locator(`#${kind}-document`);
    const footer = document.locator(".aris-dossier-footer");
    await expect(footer).toBeAttached();
    await expect(footer.locator("img.flow-footer-logo")).toHaveAttribute("src", wordmark);
    await expect(footer.locator("img.flow-footer-logo")).toHaveAttribute("alt", /flow/i);
    await expect(footer.locator(".aris-footer-mark")).toHaveCount(0);
    await expectFlowChannel(footer.locator(".flow-channel-join"));
    await expect(footer).toContainText("@Flow_KonKour");
    await expect.poll(() => brandingFindings(page.locator("html")), { message: hash }).toEqual([]);
  }
});

test("every guide is branded before iframe execution and stays branded after its UI scripts", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/flow-preview.html");
  await page.waitForFunction(() => Boolean((window as unknown as { ArisSelectionModule?: unknown }).ArisSelectionModule));
  const guides = await page.evaluate(() => {
    const data = JSON.parse(document.getElementById("aris-selection-guides-data")!.textContent!);
    const branding = (window as unknown as { FlowBranding: { text(value: string): string } }).FlowBranding;
    return data.map((guide: { id: string; document: string }) => ({
      id: guide.id,
      title: branding.text(new DOMParser().parseFromString(guide.document, "text/html").title),
    }));
  });
  expect(guides).toHaveLength(22);
  for (const guide of guides) {
    await page.evaluate((id) => (window as unknown as { ArisSelectionModule: { open(id: string): void } }).ArisSelectionModule.open(id), guide.id);
    const iframe = page.locator("#guide-reader-frame");
    const source = await iframe.getAttribute("srcdoc");
    expect(source, guide.id).toBeTruthy();
    // Parsing srcdoc inertly catches a legacy brand before any observer has an
    // opportunity to hide it in the running child document.
    const authored = await page.evaluate((html) => {
      const doc = new DOMParser().parseFromString(html!, "text/html");
      const oldBrand = /(?:\baris(?:[\s_-]*academy)?\b|(?<![\p{L}])[اآ]ر[یي]س(?![\p{L}]))/iu;
      const walker = doc.createTreeWalker(doc.documentElement, NodeFilter.SHOW_TEXT);
      const findings: string[] = [];
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (!node.parentElement?.closest("script,style,template") && oldBrand.test(node.textContent ?? "")) {
          findings.push(node.textContent!.trim().slice(0, 120));
        }
      }
      return findings.slice(0, 5);
    }, source);
    expect(authored, guide.id).toEqual([]);
    const frame = page.frameLocator("#guide-reader-frame");
    await expect.poll(() => frame.locator("html").evaluate((element) => element.ownerDocument.title)).toBe(guide.title);
    await expect.poll(() => brandingFindings(frame.locator("html")), { message: guide.id }).toEqual([]);
    const flowLinks = frame.locator(`a[href="${channel}"]`);
    for (const link of await flowLinks.all()) {
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /\bnoopener\b/);
    }
    if (guide.id === "boomi-gozini-entekhab-reshte") {
      await expect(flowLinks).not.toHaveCount(0);
    }
  }
});

test("pilot channel buttons keep dark readable labels on the bright accent", async ({ page }) => {
  await page.goto("/flow-preview.html#major=medicine");
  const buttons = page.locator("#major-document .flow-channel-join");
  await expect(buttons).toHaveCount(2);
  for (const button of await buttons.all()) {
    await expect(button).toHaveCSS("color", "rgb(3, 19, 25)");
    await expect(button).toHaveCSS("background-image", /linear-gradient/);
    await expectFlowChannel(button);
  }
});

test("the compass header and dynamically generated report contain only Flow branding", async ({ page }) => {
  await page.goto("/flow-preview.html");
  await page.locator("#aris-psych-test-launch").click();
  const frame = page.frameLocator("#aris-compass-frame");
  await expect(frame.locator(".brand-mark img.flow-footer-logo")).toHaveAttribute("src", wordmark);
  await expect(frame.locator(".brand-mark svg")).toHaveCount(0);
  await expect.poll(() => brandingFindings(frame.locator("html"))).toEqual([]);
  await expect(frame.locator("#homeView")).toContainText("فلو");
  // The native report entry point supports a partial report. Exercise its
  // actual renderer without creating answers or altering persisted user data.
  await frame.locator("#reportBtn").evaluate((button) => (button as HTMLButtonElement).click());
  await expect(frame.locator("#reportView")).toHaveClass(/\bactive\b/);
  await expect(frame.locator("#reportView .report-hero")).toBeAttached();
  await expect.poll(() => brandingFindings(frame.locator("html"))).toEqual([]);
  await page.locator("#aris-compass-close").click();
  await page.locator("#aris-psych-test-launch").click();
  await expect.poll(() => brandingFindings(frame.locator("html"))).toEqual([]);
});

for (const width of [320, 390]) {
  test(`the channel CTA fits and remains keyboard accessible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/flow-preview.html#major=occupational-therapy");
    const footer = page.locator("#major-document .aris-dossier-footer");
    const join = footer.locator(".flow-channel-join");
    await expectFlowChannel(join);
    await join.scrollIntoViewIfNeeded();
    await expect(join).toBeVisible();
    const bounds = await join.boundingBox();
    expect(bounds).toBeTruthy();
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    expect(bounds!.x).toBeGreaterThanOrEqual(-1);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.keyboard.press("Tab");
    await join.focus();
    await expect(join).toBeFocused();
    const paint = await join.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        color: style.color,
        background: style.backgroundColor,
        opacity: Number(style.opacity),
        focused: element.matches(":focus-visible"),
        focusPaint: parseFloat(style.outlineWidth) > 0 || style.boxShadow !== "none",
      };
    });
    expect(paint.opacity).toBeGreaterThanOrEqual(.95);
    expect(paint.color).not.toBe("rgba(0, 0, 0, 0)");
    expect(paint.color).not.toBe(paint.background);
    expect(paint.focused).toBe(true);
    expect(paint.focusPaint).toBe(true);
  });
}
