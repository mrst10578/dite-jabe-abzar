import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { capacityTotals, normalizeUniversity, recordUniversity } from "../public/capacity/model.js";

// The snapshot is immutable. These regressions correct its presentation, not its capacities.
const root = "public/capacity/data";
const experimental = JSON.parse(readFileSync(`${root}/catalog.json`, "utf8")).groups
  .find((group) => group.id === "experimental");

function recordsFor(label) {
  const major = experimental.majors.find((item) => item.label === label);
  if (!major) throw new Error(`Missing experimental major: ${label}`);
  return JSON.parse(readFileSync(`${root}/${major.path}`, "utf8")).records;
}

it.each([
  ["زیست‌شناسی جانوری", 35],
  ["زیست‌شناسی سلولی و مولکولی", 35],
  ["زیست‌شناسی گیاهی", 35],
  ["زیست‌فناوری", 35],
  ["شیمی محض", 28],
  ["شیمی کاربردی", 28],
])("repairs 1405 Karaj OCR without losing %s capacity", (major, expected1405) => {
  const records = recordsFor(major);
  const raw = records.filter((row) => row.year === 1405 &&
    row.university === "دانشگاه)خوارزمی (محل تحصیل کرج");
  expect(raw.length).toBeGreaterThan(0);
  expect(raw.map((row) => recordUniversity(row))).toEqual(
    raw.map(() => "دانشگاه خوارزمی (محل تحصیل کرج)"),
  );
  const [row] = capacityTotals(records, ["دانشگاه خوارزمی (محل تحصیل کرج)"], { major });
  expect(row.years[1405]).toBe(expected1405);
});

it("joins Bu-Ali Sina main campus across years but preserves the other campus sites", () => {
  const major = "علوم و صنایع غذایی / علوم و مهندسی صنایع غذایی";
  const records = recordsFor(major);
  const before = JSON.stringify(records);
  const names = [
    "دانشگاه بوعلی سینا - همدان",
    "دانشگاه بوعلی سینا (محل تحصیل دانشکده کشاورزی و منابع طبیعی تویسرکان)",
    "دانشگاه بوعلی سینا (محل تحصیل دانشکده صنایع غذایی بهار (ویژه خواهران))",
  ];
  const result = capacityTotals(records, names, { major });
  expect(result).toHaveLength(3);
  expect(result.find((row) => row.university === names[0])?.years).toEqual({
    1405: 25, 1404: 43, 1403: 53, 1402: 50, 1401: 55,
  });
  expect(result.find((row) => row.university === names[1])?.years[1405]).toBe(8);
  expect(result.find((row) => row.university === names[2])?.years[1405]).toBe(28);
  expect(JSON.stringify(records)).toBe(before);
});

it.each([
  ["دانشگاه بوعلی سینا", "دانشگاه بوعلی سینا - همدان"],
  ["دانشگاه شهید بهشتی", "دانشگاه شهید بهشتی - تهران"],
  ["دانشگاه صنعتی شریف", "دانشگاه صنعتی شریف - تهران"],
  ["دانشگاه صنعتی خواجه نصیرالدین طوسی", "دانشگاه صنعتی خواجه نصیرالدین طوسی - تهران"],
  ["دانشگاه هرمزگان", "دانشگاه هرمزگان - بندرعباس"],
  ["دانشگاه الزهرا (س) (ویژه خواهران)", "دانشگاه الزهرا (س) (ویژه خواهران) - تهران"],
])("unifies the institution heading %s with its city-qualified main campus", (oldName, official) => {
  expect(normalizeUniversity(oldName)).toBe(official);
});

it("does not merge a new named campus or separate university with its parent", () => {
  expect(normalizeUniversity("دانشگاه خوارزمی")).toBe("دانشگاه خوارزمی");
  expect(normalizeUniversity("دانشگاه خوارزمی (محل تحصیل کرج)")).not.toBe("دانشگاه خوارزمی");
  const rows = capacityTotals([
    { year: 1405, university: "دانشگاه خوارزمی", capacity: 10 },
    { year: 1405, university: "دانشگاه)خوارزمی (محل تحصیل کرج", capacity: 28 },
    { year: 1405, university: "دانشگاه علوم پزشکی بوعلی سینا", capacity: 17 },
  ], ["دانشگاه خوارزمی", "دانشگاه خوارزمی (محل تحصیل کرج)", "دانشگاه علوم پزشکی بوعلی سینا"]);
  expect(rows).toHaveLength(3);
  expect(rows.reduce((sum, row) => sum + row.years[1405], 0)).toBe(55);
});
