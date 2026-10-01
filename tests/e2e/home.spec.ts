import { expect, test } from "@playwright/test";

test("home opens the original Aris toolbox", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBe(true);
  await expect(page).toHaveURL(/\/index\.html$/);
  await expect(page).toHaveTitle(/آریس آکادمی/);
  await expect(page.locator("html")).toHaveAttribute("lang", "fa");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("#page-title")).toBeVisible();
});
