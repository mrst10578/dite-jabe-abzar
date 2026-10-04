import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { normalizeUniversity, universityNames } from "../../public/capacity/model.js";

type Record = { year: number; university: string; capacity: number };
type Major = { id: string; label: string; universities: string[]; path: string };
const catalog = JSON.parse(readFileSync("public/capacity/data/catalog.json", "utf8")) as {
  groups: { id: string; label: string; majors: Major[] }[];
};
const rawMedicine = catalog.groups[0].majors.find((major) => major.label === "پزشکی")!;
const medicine = { ...rawMedicine, universities: universityNames(rawMedicine.universities) };
const records: Record[] = JSON.parse(readFileSync(`public/capacity/data/${medicine.path}`, "utf8")).records;
const persian = (value: number) => new Intl.NumberFormat("fa-IR").format(value);
async function enter(page: Page, group = "تجربی") {
  await page.goto("/capacity/");
  await page.locator("#group-picker").getByRole("button", { name: group, exact: true }).click();
  await expect(page.locator("#capacity-explorer")).toBeVisible();
}

test("capacity has its own route and requires a group before showing selectors", async ({ page }) => {
  await page.goto("/capacity/");
  await expect(page).toHaveTitle(/ظرفیت پذیرش/);
  await expect(page.locator("#group-picker")).toBeVisible();
  await expect(page.locator("#capacity-explorer")).toBeHidden();
  await page.getByRole("button", { name: "تجربی", exact: true }).click();
  await expect(page.locator("#capacity-explorer")).toBeVisible();
  await expect(page.locator("#capacity-group-label")).toHaveText("تجربی");
  const labels = await page.locator("#capacity-major option:not([value=''])").allTextContents();
  expect(labels).toEqual([...labels].sort(new Intl.Collator("fa", { sensitivity: "base", numeric: true }).compare));
  await expect(page.getByLabel("جست‌وجوی دانشگاه")).toBeDisabled();
});

test("multiple selected universities show exact snapshot sums in descending years", async ({ page }) => {
  await enter(page);
  await page.locator("#capacity-major").selectOption(medicine.id);
  for (const university of medicine.universities.slice(0, 2)) await page.locator("#university-options").getByRole("checkbox", { name: university, exact: true }).check();
  const table = page.getByRole("table", { name: "ظرفیت پذیرش به تفکیک سال" });
  await expect(table).toBeVisible();
  expect(await table.locator("thead th").allTextContents()).toEqual(["دانشگاه", "۱۴۰۵", "۱۴۰۴", "۱۴۰۳", "۱۴۰۲", "۱۴۰۱"]);
  for (const university of medicine.universities.slice(0, 2)) {
    const row = table.locator("tbody tr").filter({ has: page.getByRole("rowheader", { name: university, exact: true }) });
    const cells = ["به‌زودی", ...[1404, 1403, 1402, 1401].map((year) => {
      const matching = records.filter((record) => record.year === year && normalizeUniversity(record.university) === university);
      return matching.length ? persian(matching.reduce((sum, record) => sum + record.capacity, 0)) : "ثبت نشده";
    })];
    expect(await row.locator("td").allTextContents()).toEqual(cells);
  }
  await page.getByText("جزئیات ظرفیت و منابع", { exact: true }).click();
  await expect(page.getByRole("table", { name: "جزئیات ردیف‌های ظرفیت" })).toBeVisible();
  await expect(page.locator("#capacity-source-note")).toContainText("ظرفیت اعلام‌شده");
});

test("major and group changes reset dependent universities and results", async ({ page }) => {
  await enter(page);
  await page.locator("#capacity-major").selectOption(medicine.id);
  await page.locator("#university-options").getByRole("checkbox").first().check();
  await expect(page.locator("#capacity-results")).toBeVisible();
  const nursing = catalog.groups[0].majors.find((major) => major.label === "پرستاری")!;
  await page.locator("#capacity-major").selectOption(nursing.id);
  await expect(page.locator("#capacity-results")).toBeHidden();
  await expect(page.locator("#university-options input:checked")).toHaveCount(0);
  const labels = await page.locator("#university-options label").allTextContents();
  expect(labels).toEqual(universityNames(nursing.universities));
  await page.getByRole("button", { name: "تغییر گروه" }).click();
  await expect(page.locator("#group-picker")).toBeVisible();
  await page.getByRole("button", { name: "انسانی", exact: true }).click();
  await expect(page.locator("#capacity-major")).not.toContainText("پزشکی");
  await expect(page.locator("#capacity-results")).toBeHidden();
});

test("university spelling variants share one option and one complete year history", async ({ page }) => {
  await enter(page);
  await page.locator("#capacity-major").selectOption(medicine.id);
  await expect(page.locator("#university-options")).not.toContainText("گیالن");
  await expect(page.locator("#university-options")).not.toContainText("اسالمی");
  const university = "دانشگاه علوم پزشکی گیلان";
  const option = page.locator("#university-options").getByRole("checkbox", { name: university, exact: true });
  await expect(option).toHaveCount(1);
  await option.check();
  const row = page.getByRole("table", { name: "ظرفیت پذیرش به تفکیک سال" }).locator("tbody tr");
  await expect(row).toHaveCount(1);
  await expect(row.locator("td")).toHaveText(["به‌زودی", "۳۴۷", "۲۹۷", "۲۵۸", "۲۲۵"]);
  await page.getByLabel("جست‌وجوی دانشگاه").fill("گیالن");
  await expect(option).toBeVisible();
  await page.getByText("جزئیات ظرفیت و منابع", { exact: true }).click();
  const detailNames = page.locator("#capacity-detail-rows tr td:nth-child(2)");
  for (const label of await detailNames.allTextContents()) expect(label).not.toContain("گیالن");
  await expect(detailNames.first()).toHaveText(university);
});

test("details correct the university and campus names without joining campuses", async ({ page }) => {
  const major = catalog.groups[0].majors.find((entry) => entry.label === "اتاق عمل")!;
  await enter(page);
  await page.locator("#capacity-major").selectOption(major.id);
  await page.locator("#university-options").getByRole("checkbox", { name: "دانشگاه علوم پزشکی گیلان", exact: true }).check();
  await page.getByText("جزئیات ظرفیت و منابع", { exact: true }).click();
  const names = page.locator("#capacity-detail-rows tr td:nth-child(2)");
  await expect(names.filter({ hasText: "محل تحصیل دانشکده پیراپزشکی گیلان" })).not.toHaveCount(0);
  for (const name of await names.allTextContents()) expect(name).not.toContain("گیالن");
});

test("failed shard fetch can be retried without losing university selections", async ({ page }) => {
  let fail = true;
  await page.route(`**/capacity/data/${medicine.path}*`, async (route) => {
    if (fail) await route.fulfill({ status: 503, body: "unavailable" }); else await route.continue();
  });
  await enter(page);
  await page.locator("#capacity-major").selectOption(medicine.id);
  await page.locator("#university-options").getByRole("checkbox").first().check();
  await expect(page.locator("#capacity-message")).toContainText("دریافت داده‌ها");
  await expect(page.getByRole("button", { name: "تلاش دوباره" })).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "تلاش دوباره" }).click();
  await expect(page.locator("#capacity-results")).toBeVisible();
  await expect(page.locator("#university-options input:checked")).toHaveCount(1);
});

test("stale shard responses cannot override a newly selected major", async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route(`**/capacity/data/${medicine.path}*`, async (route) => { await pending; await route.continue().catch(() => {}); });
  await enter(page);
  await page.locator("#capacity-major").selectOption(medicine.id);
  const nursing = catalog.groups[0].majors.find((major) => major.label === "پرستاری")!;
  await page.locator("#capacity-major").selectOption(nursing.id);
  await page.locator("#university-options").getByRole("checkbox").first().check();
  await expect(page.locator("#capacity-results")).toBeVisible();
  release();
  await expect(page.locator("#capacity-major")).toHaveValue(nursing.id);
  await expect(page.locator("#capacity-results-title")).toContainText("پرستاری");
});

test("capacity page fits phone widths and university search preserves selections", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enter(page);
  await page.locator("#capacity-major").selectOption(medicine.id);
  await page.locator("#university-options").getByRole("checkbox").first().check();
  await page.getByLabel("جست‌وجوی دانشگاه").fill("تهران");
  await expect(page.locator("#university-options input:checked")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test("homepage capacity card links to the independent tool", async ({ page }) => {
  await page.goto("/flow-preview.html");
  await expect(page.locator("#admission-count-tool").getByRole("link", { name: "ورود به ابزار ظرفیت پذیرش" })).toHaveAttribute("href", "/capacity/");
  await expect(page.locator("#admission-count-tool input")).toHaveCount(0);
});
