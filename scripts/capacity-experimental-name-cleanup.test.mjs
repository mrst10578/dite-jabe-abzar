import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { normalizeUniversity } from "../public/capacity/model.js";

const catalog = JSON.parse(readFileSync("public/capacity/data/catalog.json", "utf8"));
const experimental = catalog.groups.find((group) => group.id === "experimental");

it.each([
  ["دانشگاه علوم پزشکی و خدمات بهداشتی درمانی ارومیه (محل تحصیل دانشکده)علوم پزشکی مهاباد", "دانشگاه علوم پزشکی و خدمات بهداشتی درمانی ارومیه (محل تحصیل دانشکده علوم پزشکی مهاباد)"],
  ["دانشگاه علوم پزشکی و خدمات بهداشتی)درمانی بیرجند (محل تحصیل دانشکده علوم پزشکی قائنات", "دانشگاه علوم پزشکی و خدمات بهداشتی درمانی بیرجند (محل تحصیل دانشکده علوم پزشکی قائنات)"],
  ["دانشگاه علوم پزشکی و خدمات بهداشتی درمانی جندی)شاپور اهواز (محل تحصیل دانشکده پرستاری ایذه", "دانشگاه علوم پزشکی و خدمات بهداشتی درمانی جندی شاپور اهواز (محل تحصیل دانشکده پرستاری ایذه)"],
  ["دانشگاه علوم پزشکی و خدمات بهداشتی درمانی اراک (محل تحصیل دانشکده پرستاری)شازند", "دانشگاه علوم پزشکی و خدمات بهداشتی درمانی اراک (محل تحصیل دانشکده پرستاری شازند)"],
  ["دانشگاه علوم پزشکی و خدمات بهداشتی درمانی مازندران (محل تحصیل دانشکده)پیراپزشکی آمل", "دانشگاه علوم پزشکی و خدمات بهداشتی درمانی مازندران (محل تحصیل دانشکده پیراپزشکی آمل)"],
  ["دانشگاه علوم پزشکی و خدمات )بهداشتی درمانی شیراز (محل تحصیل مجتمع آموزش عالی سلامت کازرون", "دانشگاه علوم پزشکی و خدمات بهداشتی درمانی شیراز (محل تحصیل مجتمع آموزش عالی سلامت کازرون)"],
  ["دانشگاه علوم پزشکی و خدمات بهداشتی درمانی اصفهان (محل تحصیل مجتمع آموزش عالی سلامت خمینی)شهر", "دانشگاه علوم پزشکی و خدمات بهداشتی درمانی اصفهان (محل تحصیل مجتمع آموزش عالی سلامت خمینی شهر)"],
  ["دانشگاه صنعتی خاتم االنبیاء(ص) بهبهان", "دانشگاه صنعتی خاتم الانبیاء (ص) بهبهان"],
])("normalizes reviewed experimental OCR identity %s", (input, expected) => {
  expect(normalizeUniversity(input)).toBe(expected);
});

it("unites the Lorestan medical university heading but keeps named campuses separate", () => {
  expect(normalizeUniversity("دانشگاه علوم پزشکی و خدمات بهداشتی درمانی لرستان"))
    .toBe("دانشگاه علوم پزشکی و خدمات بهداشتی درمانی لرستان - خرم آباد");
  expect(normalizeUniversity("دانشگاه علوم پزشکی و خدمات بهداشتی درمانی لرستان (محل تحصیل دانشکده پرستاری پلدختر)"))
    .toBe("دانشگاه علوم پزشکی و خدمات بهداشتی درمانی لرستان (محل تحصیل دانشکده پرستاری پلدختر)");
});

it("normalizes every experimental catalog university without an alias cycle", () => {
  expect(experimental).toBeTruthy();
  for (const major of experimental.majors) {
    for (const university of major.universities) {
      expect(() => normalizeUniversity(university, { major: major.label })).not.toThrow();
    }
  }
});
