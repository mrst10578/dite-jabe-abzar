import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { capacityTotals, normalizeUniversity, recordUniversity } from "../public/capacity/model.js";
import { UNIVERSITY_ROW_CORRECTIONS } from "../public/capacity/university-identities.js";
import { parseCsv } from "./capacity-snapshot.mjs";

const directory = "public/capacity/data";
const catalog = JSON.parse(readFileSync(`${directory}/catalog.json`, "utf8"));
const medicine = catalog.groups[0].majors.find((major) => major.label === "پزشکی");
const records = JSON.parse(readFileSync(`${directory}/${medicine.path}`, "utf8")).records;

it.each([
  ["دانشگاه آزاد اسلامی واحد علوم پزشکی تبریز", "دانشگاه آزاد اسلامی استان آذربایجان شرقی - واحد تبریز", [75, 80, 110, 132]],
  ["دانشگاه آزاد اسلامی واحد خودگردان قشم", "دانشگاه آزاد اسلامی استان هرمزگان - مرکز آموزش بین المللی قشم", [45, 55, 79, 91]],
  ["دانشگاه شاهد - تهران", "دانشگاه شاهد - ان ) رشته های پزشکی(تهر", [62, 72, 86, 88]],
])("unites the verified four-year identity of %s", (university, oldName, capacities) => {
  const [total] = capacityTotals(records, [university, oldName], { major: "پزشکی" });
  expect(total.university).toBe(university);
  expect(Object.fromEntries([1401, 1402, 1403, 1404].map((year) => [year, total.years[year]]))).toEqual(
    Object.fromEntries([1401, 1402, 1403, 1404].map((year, i) => [year, capacities[i]])),
  );
});

it("assigns the source-proven misplaced Arak medicine row to Zabol", () => {
  expect(capacityTotals(records, ["دانشگاه علوم پزشکی زابل"])[0].years[1402]).toBe(105);
  expect(records.find((row) => row.source_id === "1402-correction-5" && row.notes.includes("39521"))).toMatchObject({
    university: "دانشگاه اراک", capacity: 5,
  });
});

it("keeps general Arak, Arak medical, and the veterinary Tabriz unit distinct", () => {
  const rows = [
    { year: 1402, major: "مهندسی برق", university: "دانشگاه اراک", capacity: 40 },
    { year: 1402, major: "پزشکی", university: "دانشگاه علوم پزشکی اراک", capacity: 200 },
    { year: 1402, major: "دکتری عمومی دامپزشکی", university: "دانشگاه آزاد اسلامی استان آذربایجان شرقی - واحد تبریز", capacity: 30 },
  ];
  const result = capacityTotals(rows, rows.map((row) => row.university));
  expect(result).toHaveLength(3);
  expect(result.find((row) => row.university === "دانشگاه اراک")?.years[1402]).toBe(40);
  expect(result.find((row) => row.university === "دانشگاه علوم پزشکی اراک")?.years[1402]).toBe(200);
  expect(result.some((row) => row.university === "دانشگاه آزاد اسلامی واحد علوم پزشکی تبریز")).toBe(false);
});

it("limits source correction to the verified year, major, source, page, code and capacity", () => {
  const raw = records.find((row) => row.university === "دانشگاه اراک");
  for (const change of [
    { year: 1403 }, { major: "مهندسی برق" }, { source_id: "1402-booklet" },
    { source_page: "4" }, { notes: "کدرشته‌محل منبع: 39526" }, { capacity: 6 },
  ]) {
    const altered = { ...raw, ...change };
    expect(capacityTotals([altered], ["دانشگاه اراک"])[0].years[altered.year]).toBe(altered.capacity);
  }
});

it("applies all 31 source-proven corrections to existing rows with pinned PDF provenance", () => {
  const allRecords = catalog.groups.flatMap((group) => group.majors.flatMap((major) =>
    JSON.parse(readFileSync(`${directory}/${major.path}`, "utf8")).records));
  const sources = parseCsv(readFileSync(`${directory}/source/sources.csv`, "utf8"));
  expect(UNIVERSITY_ROW_CORRECTIONS).toHaveLength(54);
  for (const correction of UNIVERSITY_ROW_CORRECTIONS) {
    const matching = allRecords.filter((row) => row.year === correction.year && row.major === correction.major
      && row.source_id === correction.source_id && row.notes.includes(` ${correction.code}`));
    expect(matching).toHaveLength(1);
    expect(recordUniversity(matching[0])).toBe(normalizeUniversity(correction.target));
    expect(sources.find((source) => source.source_id === correction.source_id)?.sha256).toBe(correction.evidence.sha256);
  }
});
