import { expect, test } from "@playwright/test";

test("dividers separate the compass, admissions cards and guide section", async ({ page }) => {
  for (const width of [1440, 980, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/flow-preview.html");
    const compass = page.locator(".flow-supports #aris-smart-tools");
    const guide = page.locator(".flow-guide-entry");
    await expect(compass).toBeVisible();
    await expect(guide).toBeVisible();
    await expect(guide.locator("a")).toHaveCount(0);
    await expect(page.locator("#aris-psych-test-launch")).toBeVisible();
    await expect(page.locator(".flow-divider-frame")).toHaveCount(2);
    const sections = [
      page.locator(".flow-supports"),
      page.locator(".flow-divider-frame").nth(0),
      page.locator("#historical-admissions"),
      page.locator("#last-admission-data"),
      page.locator("#admission-count-tool"),
      page.locator(".flow-divider-frame").nth(1),
      guide,
      page.locator("#aris-selection-module"),
    ];
    for (let index = 1; index < sections.length; index++) {
      await expect(sections[index]).toBeVisible();
      const previous = (await sections[index - 1].boundingBox())!;
      const current = (await sections[index].boundingBox())!;
      expect(previous.y + previous.height, `section order at ${width}px`).toBeLessThanOrEqual(current.y + 1);
    }
  }
});

test("header actions and the complete quiz label fit mobile, tablet and desktop", async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/flow-preview.html");
    const channel = page.locator(".site-header .channel-link");
    await expect(channel).toBeVisible();
    await expect(channel).toHaveAttribute("href", "https://t.me/Flow_KonKour");
    await expect(channel).toHaveAttribute("aria-label", /کانال تلگرام.*Flow/);
    await expect(page.locator(".site-header .sound-toggle")).toBeVisible();

    const findings = await page.evaluate(() => {
      const problems: string[] = [];
      for (const selector of [".site-header .channel-link", ".site-header .sound-toggle", ".flow-navigation a", "#aris-psych-test-launch"]) {
        for (const element of document.querySelectorAll<HTMLElement>(selector)) {
          const rect = element.getBoundingClientRect();
          if (rect.left < -1 || rect.right > window.innerWidth + 1) problems.push(`${selector}: outside viewport`);
          if (rect.height < 44) problems.push(`${selector}: small touch target`);
          if (element.scrollWidth > element.clientWidth + 1) problems.push(`${selector}: overflowing content`);
          for (let parent = element.parentElement; parent; parent = parent.parentElement) {
            const style = getComputedStyle(parent);
            if (style.display === "contents") continue;
            const bounds = parent.getBoundingClientRect();
            if (/^(hidden|clip)$/.test(style.overflowX) && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1)) {
              problems.push(`${selector}: clipped by ${parent.className}`);
            }
          }
        }
      }
      const label = document.querySelector("#aris-psych-test-launch span")!;
      const range = document.createRange();
      range.selectNodeContents(label);
      if (range.getClientRects().length !== 1) problems.push("quiz label wraps into multiple lines");
      return problems;
    });
    expect(findings, `viewport ${width}px`).toEqual([]);
    await channel.focus();
    await expect(channel).toBeFocused();
  }
});

test("the complete quiz action opens the native compass and returns focus", async ({ page }) => {
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/flow-preview.html");
    const launch = page.locator("#aris-psych-test-launch");
    await expect(launch).toHaveText(/شروع آزمون خودشناسی/);
    await launch.click();
    await expect(page.locator("#aris-compass-dialog")).toBeVisible();
    await expect(launch).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#aris-compass-frame")).toHaveAttribute("srcdoc", /قطب/);
    await page.locator("#aris-compass-close").click();
    await expect(page.locator("#aris-compass-dialog")).not.toBeVisible();
    await expect(launch).toHaveAttribute("aria-expanded", "false");
    await expect(launch).toBeFocused();
  }
});
