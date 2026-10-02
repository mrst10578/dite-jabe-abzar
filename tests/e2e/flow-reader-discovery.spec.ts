import { test } from "@playwright/test";

const queries = ["پزشکی", "حقوق", "گرافیک", "روانشناسی", "پرستاری", "مهندسی برق"];

test("discover representative major reader structures", async ({ page }) => {
  for (const query of queries) {
    await page.goto("/flow-preview.html");
    await page.locator("#major-search").fill(query);
    const options = page.locator('[id^="major-option-"]');
    const count = await options.count();
    if (!count) {
      console.log("DISCOVERY", JSON.stringify({ query, found: false }));
      continue;
    }
    const label = (await options.first().innerText()).trim();
    await options.first().click();
    await page.locator("#major-viewer").waitFor({ state: "visible" });
    const data = await page.locator("#major-document").evaluate((root) => {
      const pageEl = root.querySelector(".page");
      return {
        found: true,
        profile: pageEl?.getAttribute("data-aris-profile") ?? null,
        pageClass: pageEl?.className ?? null,
        directChildren: pageEl ? Array.from(pageEl.children).map((el) => el.tagName + "." + el.className).slice(0, 40) : [],
        h2Count: root.querySelectorAll("h2").length,
        h3Count: root.querySelectorAll("h3").length,
        tableCount: root.querySelectorAll("table").length,
        detailsCount: root.querySelectorAll("details").length,
        imageCount: root.querySelectorAll("img").length,
        quickNav: Boolean(root.querySelector("[data-aris-quick-nav]")),
        footer: Boolean(root.querySelector(".aris-dossier-footer")),
        invite: Boolean(root.querySelector(".aris-inline-invite")),
      };
    });
    console.log("DISCOVERY", JSON.stringify({ query, label, ...data }));
  }
});
