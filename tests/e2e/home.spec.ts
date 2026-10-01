import { expect, test } from "@playwright/test";

test("home page renders the starter baseline", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Build client websites from a clean baseline.",
    }),
  ).toBeVisible();

  await expect(page.getByText("Starter is running")).toBeVisible();
});
