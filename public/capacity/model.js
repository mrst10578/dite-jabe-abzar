import { UNIVERSITY_ALIASES } from "./university-aliases.js";

const collator = new Intl.Collator("fa", { sensitivity: "base", numeric: true });
export const YEARS = [1404, 1403, 1402, 1401];
export const GROUPS = [
  { id: "experimental", label: "تجربی" },
  { id: "math", label: "ریاضی" },
  { id: "humanities", label: "انسانی" },
];

export function normalizePersian(value) {
  return String(value).normalize("NFKC").replace(/ي/g, "ی").replace(/ك/g, "ک")
    .replace(/[\u200c\u200e\u200f]/g, " ").replace(/\s+/g, " ").trim();
}
export function compareLabels(left, right) { return collator.compare(left, right); }

// Confirmed OCR errors in the pinned source. Match complete words only: a
// generic ال/لا swap would corrupt valid names such as تالش.
const universitySpelling = new Map(Object.entries({
  اسالمی: "اسلامی", گیالن: "گیلان", ایالم: "ایلام", مالیر: "ملایر",
  عالمه: "علامه", والیت: "ولایت", سالمت: "سلامت", الرستان: "لارستان",
  الر: "لار", محالت: "محلات", هالل: "هلال", اطالعات: "اطلاعات",
  انقالب: "انقلاب", اسالمآباد: "اسلام آباد",
}));
const splitUniversityWords = new Map(Object.entries({
  "د انشگاه": "دانشگاه", "دا نشگاه": "دانشگاه", "دان شگاه": "دانشگاه",
  "دانش گاه": "دانشگاه", "دانشگا ه": "دانشگاه", "دانشگ اه": "دانشگاه",
  "همد ان": "همدان", "کردس تان": "کردستان", "اصفها ن": "اصفهان",
  "عال ی": "عالی", "بزرگمه ر": "بزرگمهر", "ت هران": "تهران",
  "خوار زمی": "خوارزمی", "چا بهار": "چابهار", "کرما نشاه": "کرمانشاه",
  "سم نان": "سمنان", "بلوچست ان": "بلوچستان", "ب هشتی": "بهشتی",
  "شاهرو د": "شاهرود", "لرس تان": "لرستان", "ه رمزگان": "هرمزگان",
  "آموزش کده": "آموزشکده", "ف نی": "فنی", "شهی د": "شهید",
  "ع لوم": "علوم", "سیدجما ل": "سیدجمال", "طباط بایی": "طباطبایی",
  "طباطبای ی": "طباطبایی", "پز شکی": "پزشکی", "خر م": "خرم",
  "وال یت": "ولایت", "شیرا ز": "شیراز", "عدم ت عهد": "عدم تعهد",
  "واگذا ری": "واگذاری", "دا رای": "دارای", "دار ای": "دارای",
  "خوابگا ه": "خوابگاه",
  "تربتجام": "تربت جام", "بویینزهرا": "بویین زهرا", "جندیشاپور": "جندی شاپور",
  "بندر عباس": "بندرعباس", "خرمآباد": "خرم آباد", "اسد آباد": "اسدآباد",
  "اسد آبادی": "اسدآبادی", "شاهیندژ": "شاهین دژ", "شاهینشهر": "شاهین شهر",
  "فیروز آباد": "فیروزآباد", "محمود آباد": "محمودآباد", "چهار محال": "چهارمحال",
  "فرخشهر": "فرخ شهر", "صداو سیما": "صداوسیما", "ولیعصر": "ولی عصر",
  "خواجه نصیر الدین": "خواجه نصیرالدین", "بقیهاله": "بقیه اله", "بقیة اله": "بقیه اله",
  "آیتاله": "آیت اله", "خاتمالانبیاء": "خاتم الانبیاء", "فنّاوریهای": "فنّاوری های",
  "سیدجمالالدین": "سیدجمال الدین", "نفت وگاز": "نفت و گاز", "نجف اباد": "نجفآباد",
}));
const splitUniversityPattern = new RegExp(`(^|[^\\p{L}\\p{M}])(${[...splitUniversityWords.keys()].join("|")})(?=$|[^\\p{L}\\p{M}])`, "gu");

export function normalizeUniversity(value) {
  const normalized = normalizePersian(value)
    .replace(/[\p{L}\p{M}]+/gu, (word) => universitySpelling.get(word) ?? word)
    .replace(splitUniversityPattern, (_, prefix, word) => prefix + splitUniversityWords.get(word))
    .replace(/[-‐‑‒–—−]/g, " - ").replace(/\s+/g, " ").trim();
  return Object.hasOwn(UNIVERSITY_ALIASES, normalized) ? UNIVERSITY_ALIASES[normalized] : normalized;
}

export function universityNames(values) {
  return [...new Set(values.map(normalizeUniversity))].sort(compareLabels);
}

export function capacityTotals(records, universities) {
  const result = new Map(universityNames(universities).map((university) => [university, {
    university, years: Object.fromEntries(YEARS.map((year) => [year, null])),
  }]));
  for (const record of records) {
    const target = result.get(normalizeUniversity(record.university));
    if (target && YEARS.includes(record.year)) {
      target.years[record.year] = (target.years[record.year] ?? 0) + record.capacity;
    }
  }
  return [...result.values()];
}

export function bookletGroup(sourceId) {
  if (sourceId.includes("humanities")) return "humanities";
  if (sourceId.includes("math")) return "math";
  if (/^140[1-4]-booklet$/.test(sourceId)) return "experimental";
  return null;
}
