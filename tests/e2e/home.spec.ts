import { expect, test } from "@playwright/test";

test("home opens the active Flow toolbox", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBe(true);
  await expect(page).toHaveURL(/\/flow-preview\.html$/);
  await expect(page).toHaveTitle(/Flow/);
  await expect(page.locator("html")).toHaveAttribute("lang", "fa");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("#page-title")).toBeVisible();
});
