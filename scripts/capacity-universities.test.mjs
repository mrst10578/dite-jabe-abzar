import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { capacityTotals, normalizeUniversity, recordUniversity, universityNames } from "../public/capacity/model.js";

it("combines the Gilan spelling variants across years and duplicate selections", () => {
  const records = [
    { university: "دانشگاه علوم پزشکی گیالن", year: 1404, capacity: 347 },
    { university: "دانشگاه علوم پزشکی گیلان", year: 1403, capacity: 297 },
    { university: "دانشگاه علوم پزشکی گیلان", year: 1402, capacity: 258 },
    { university: "دانشگاه علوم پزشکی گیلان", year: 1401, capacity: 225 },
  ];
  const original = JSON.stringify(records);
  expect(capacityTotals(records, records.map((row) => row.university))).toEqual([
    { university: "دانشگاه علوم پزشکی گیلان - رشت", years: { 1404: 347, 1403: 297, 1402: 258, 1401: 225 } },
  ]);
  expect(JSON.stringify(records)).toBe(original);
});

it("combines Islamic Azad spelling, Arabic letters, spacing and separator variants", () => {
  expect(capacityTotals([
    { university: "دانشگاه آزاد اسالمی استان گیالن–واحد رشت", year: 1404, capacity: 20 },
    { university: "دانشگاه آزاد اسلامی استان گیلان - واحد رشت", year: 1403, capacity: 30 },
    { university: "دانشگاه آزاد اسلامي استان گيلان-واحد رشت", year: 1402, capacity: 40 },
  ], ["دانشگاه آزاد اسلامی استان گیلان - واحد رشت"])).toEqual([
    { university: "دانشگاه آزاد اسلامی استان گیلان - واحد رشت", years: { 1404: 20, 1403: 30, 1402: 40, 1401: null } },
  ]);
});

it.each([
  ["دانشگاه ایالم", "دانشگاه ایلام"],
  ["دانشگاه مالیر", "دانشگاه ملایر"],
  ["دانشگاه عالمه طباطبائی", "دانشگاه علامه طباطبائی"],
  ["دانشگاه والیت", "دانشگاه ولایت"],
  ["دانشکده علوم پزشکی و خدمات بهداشتی درمانی الرستان", "دانشکده علوم پزشکی و خدمات بهداشتی درمانی لارستان"],
  ["آموزشکده محالت", "آموزشکده محلات"],
  ["مرکز علمی کاربردی هالل احمر", "مرکز علمی کاربردی هلال احمر"],
  ["دانشگاه اطالعات و امنیت ملی", "دانشگاه اطلاعات و امنیت ملی"],
  ["دانشکده انقالب اسالمی", "دانشکده انقلاب اسلامی"],
  ["موسسه آموزش عالی سالمت", "موسسه آموزش عالی سلامت"],
  ["آموزشکده الر", "آموزشکده لار"],
  ["دانشگاه اسالمآباد", "دانشگاه اسلام آباد"],
  ["دانش گاه علوم پزشکی همد ان", "دانشگاه علوم پزشکی همدان"],
  ["دانشگاه کردس تان", "دانشگاه کردستان"],
  ["دانشگا ه اصفها ن", "دانشگاه اصفهان"],
  ["موسسه آموزش عال ی بزرگمه ر", "موسسه آموزش عالی بزرگمهر"],
  ["دانشگ اه خوار زمی - ت هران", "دانشگاه خوارزمی - تهران"],
  ["د انشگاه چا بهار", "دانشگاه چابهار"],
  ["دا نشگاه کرما نشاه", "دانشگاه کرمانشاه"],
  ["دان شگاه سم نان", "دانشگاه سمنان"],
  ["دانشگاه سیستان و بلوچست ان", "دانشگاه سیستان و بلوچستان"],
  ["دانشگاه شهید ب هشتی", "دانشگاه شهید بهشتی"],
  ["دانشگاه شاهرو د", "دانشگاه شاهرود"],
  ["دانشگاه لرس تان", "دانشگاه لرستان"],
  ["دانشگاه ه رمزگان", "دانشگاه هرمزگان"],
  ["دانشگاه علوم پز شکی جندیشاپور", "دانشگاه علوم پزشکی جندی شاپور - اهواز"],
  ["دانشگاه عالمه طباط بایی", "دانشگاه علامه طباطبایی"],
  ["دانشگاه صنعتی خواجه نصیر الدین طوسی", "دانشگاه صنعتی خواجه نصیرالدین طوسی"],
  ["دانشگاه علوم پزشکی بقیة اله", "دانشگاه علوم پزشکی بقیه اله"],
  ["دانشگاه علوم پزشکی بقیهاله", "دانشگاه علوم پزشکی بقیه اله"],
  ["دانشگاه علوم )پزشکی ارومیه", "دانشگاه علوم پزشکی ارومیه"],
  ["دانشگاه الزهرا )س( )ویژه خواهران( - تهران", "دانشگاه الزهرا (س) (ویژه خواهران) - تهران"],
  ["دانشگاه خوارزمی )محل تحصیل کرج(", "دانشگاه خوارزمی (محل تحصیل کرج)"],
  ["دانشگاه صنعتی شریف - تهران )محل تحصیل پردیس خودگردان مهندسی و علوم در جزیره کیش(", "دانشگاه صنعتی شریف - تهران (محل تحصیل پردیس خودگردان مهندسی و علوم در جزیره کیش)"],
])("corrects a confirmed university spelling: %s", (raw, university) => {
  expect(capacityTotals([{ university: raw, year: 1404, capacity: 10 }], [university])[0]).toEqual({
    university, years: { 1404: 10, 1403: null, 1402: null, 1401: null },
  });
});

it("keeps different campuses, institutions and valid similar words separate", () => {
  const universities = [
    "دانشگاه آزاد اسلامی - واحد رشت", "دانشگاه آزاد اسلامی - واحد لاهیجان",
    "دانشگاه گیلان", "دانشگاه علوم پزشکی گیلان - رشت", "دانشگاه تهران", "دانشگاه تهران - پردیس کیش",
    "دانشگاه پیام نور تالش", "دانشگاه پیام نور تلاش",
    "دانشگاه خوارزمی", "دانشگاه خوارزمی (محل تحصیل کرج)",
    "دانشگاه آل طه",
  ];
  const records = universities.map((university, i) => ({ university, year: 1404, capacity: i + 1 }));
  const result = capacityTotals(records, universities);
  expect(result).toHaveLength(universities.length);
  for (const [i, university] of universities.entries()) {
    expect(result.find((row) => row.university === university)?.years[1404]).toBe(i + 1);
  }
});

it("keeps all pinned records and capacities intact after university grouping", () => {
  const root = "public/capacity/data";
  const catalog = JSON.parse(readFileSync(`${root}/catalog.json`, "utf8"));
  const records = catalog.groups.flatMap((group) => group.majors.flatMap((major) =>
    JSON.parse(readFileSync(`${root}/${major.path}`, "utf8")).records));
  expect(records).toHaveLength(33326);
  const names = universityNames(records.map((row) => recordUniversity(row)));
  for (const name of names) expect(normalizeUniversity(name)).toBe(name);
  const totals = capacityTotals(records, names);
  for (const year of [1401, 1402, 1403, 1404]) {
    expect(totals.reduce((sum, row) => sum + (row.years[year] ?? 0), 0)).toBe(
      records.filter((row) => row.year === year).reduce((sum, row) => sum + row.capacity, 0));
  }
});
