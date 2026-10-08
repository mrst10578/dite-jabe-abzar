import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { capacityTotals, normalizeUniversity } from "../public/capacity/model.js";

const root = "public/capacity/data";
const catalog = JSON.parse(readFileSync(`${root}/catalog.json`, "utf8"));
const math = catalog.groups.find((group) => group.id === "math");

function mathRecords(label) {
  const major = math.majors.find((item) => item.label === label);
  if (!major) throw new Error(`Missing math major: ${label}`);
  return JSON.parse(readFileSync(`${root}/${major.path}`, "utf8")).records
    .filter((row) => String(row.source_id || "").includes("math"));
}

it.each([
  ["مهندسی برق", "دانشگاه خوارزمی (محل تحصیل کرج)", [35, 35, 30, 30, 29]],
  ["مهندسی صنایع", "دانشگاه خوارزمی (محل تحصیل کرج)", [35, 35, 30, 30, 34]],
  ["مهندسی عمران", "دانشگاه خوارزمی (محل تحصیل کرج)", [40, 35, 30, 35, 34]],
  ["مهندسی کامپیوتر", "دانشگاه خوارزمی (محل تحصیل کرج)", [35, 35, 30, 30, 29]],
  ["مهندسی معماری", "دانشگاه خوارزمی (محل تحصیل تهران)", [20, 20, 16, 27, 25]],
  ["مهندسی شهرسازی", "دانشگاه خوارزمی (محل تحصیل تهران)", [25, 20, 20, 27, 26]],
])("keeps Kharazmi %s on one verified campus history", (major, university, capacities) => {
  const [row] = capacityTotals(mathRecords(major), [university], { major });
  expect([1401, 1402, 1403, 1404, 1405].map((year) => row.years[year])).toEqual(capacities);
});

it.each([
  ["مهندسی شیمی", [20, 20, 25, 25, 30]],
  ["مهندسی مکانیک", [30, 30, 30, 30, 30]],
  ["مهندسی نفت", [25, 30, 30, 30, 30]],
])("recovers the Abadan Petroleum University campus for %s", (major, capacities) => {
  const [row] = capacityTotals(mathRecords(major), ["دانشگاه صنعت نفت (محل تحصیل واحد آبادان)"], { major });
  expect([1401, 1402, 1403, 1404, 1405].map((year) => row.years[year])).toEqual(capacities);
});

it("keeps University of Art architecture campuses distinct with recovered history", () => {
  const records = mathRecords("مهندسی معماری");
  const rows = capacityTotals(records, [
    "دانشگاه هنر ایران (محل تحصیل کرج)",
    "دانشگاه هنر ایران (محل تحصیل تهران)",
  ], { major: "مهندسی معماری" });
  expect(rows.find((row) => row.university.includes("کرج"))?.years).toEqual({
    1401: 34, 1402: 35, 1403: 35, 1404: 33, 1405: 32,
  });
  expect(rows.find((row) => row.university.includes("تهران"))?.years).toEqual({
    1401: null, 1402: 1, 1403: 35, 1404: 33, 1405: 32,
  });
});

it.each([
  ["مرکز آموزش عالی فنی و مهندسی بویین زهرا", "مرکز آموزش عالی فنی و مهندسی بوئینزهرا"],
  ["دانشگاه بزرگمهر قاینات", "دانشگاه بزرگمهر قائنات"],
  ["دانشگاه حضرت معصومه(س) (ویژه خواهران) - قم", "دانشگاه حضرت معصومه (س) (ویژه خواهران) - قم"],
])("normalizes verified math institution rename %s", (input, expected) => {
  expect(normalizeUniversity(input)).toBe(expected);
});
