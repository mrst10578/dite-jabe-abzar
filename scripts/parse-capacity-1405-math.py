#!/usr/bin/env python3
import argparse, csv, json, re, subprocess, tempfile
from collections import Counter
from pathlib import Path

COLUMNS = [
    "year","major","university","campus","province","program_type","program_type_raw",
    "admission_category","capacity","gender","intake","admission_conditions","source_id",
    "source_page","base_source_id","base_source_page","notes"
]

MAJOR_ALIASES = {
    "آمار": ["آمار"],
    "ریاضیات و کاربردها / ریاضی محض": ["ریاضیات و کاربردها", "ریاضی محض"],
    "شیمی کاربردی": ["شیمی کاربردی"],
    "شیمی محض": ["شیمی محض"],
    "علوم کامپیوتر": ["علوم کامپیوتر"],
    "فیزیک": ["فیزیک"],
    "مهندسی انرژی": ["مهندسی انرژی"],
    "مهندسی برق": ["مهندسی برق"],
    "مهندسی پزشکی": ["مهندسی پزشکی"],
    "مهندسی پلیمر": ["مهندسی پلیمر"],
    "مهندسی دریا / کشتی": ["مهندسی دریا", "مهندسی کشتی"],
    "مهندسی راه‌آهن": ["مهندسی راه آهن", "مهندسی راهآهن", "مهندسی خط و سازه های ریلی", "مهندسی خط و سازههای ریلی", "مهندسی ماشین های ریلی", "مهندسی ماشینهای ریلی", "مهندسی حمل و نقل ریلی"],
    "مهندسی ساخت و تولید": ["مهندسی ساخت و تولید"],
    "مهندسی شهرسازی": ["مهندسی شهرسازی"],
    "مهندسی شیمی": ["مهندسی شیمی"],
    "مهندسی صنایع": ["مهندسی صنایع", "مهندسی صنایع و سیستمها", "مهندسی صنایع و سیستم ها"],
    "مهندسی عمران": ["مهندسی عمران"],
    "مهندسی کامپیوتر": ["مهندسی کامپیوتر"],
    "مهندسی معدن": ["مهندسی معدن"],
    "مهندسی معماری": ["مهندسی معماری"],
    "مهندسی مکانیک": ["مهندسی مکانیک"],
    "مهندسی مواد و متالورژی": ["مهندسی مواد و متالورژی", "مهندسی و علم مواد", "مهندسی مواد"],
    "مهندسی نساجی": ["مهندسی نساجی"],
    "مهندسی نفت": ["مهندسی نفت", "مهندسی نفت و زمینانرژی", "مهندسی نفت و زمین انرژی"],
    "مهندسی نقشه‌برداری / ژئوماتیک": ["مهندسی نقشه برداری", "مهندسی نقشهبرداری", "مهندسی ژئوماتیک"],
    "مهندسی هوافضا": ["مهندسی هوافضا"],
}

INSTITUTION_MARKERS = ("دانشگاه", "دانشکده", "آموزشکده", "موسسه", "مؤسسه", "مرکز آموزش", "مجتمع آموزش", "پژوهشگاه")
PROGRAM_TYPES = ("پردیس خودگردان", "شهریه پرداز", "نوبت دوم", "روزانه", "پیام نور", "غیرانتفاعی", "مجازی")
EXCLUDED_INSTITUTIONS = ("پیام نور", "غیرانتفاعی", "غیر انتفاعی")
SPECIAL_WORDS = ("تعهد", "بورس", "شرایط خاص", "مناطق محروم")
TRANS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")

def clean(value):
    for ch in ("‫","‬","‪","‭","‮","‏","‎","﻿"):
        value = value.replace(ch, "")
    value = value.translate(TRANS).replace("ي", "ی").replace("ك", "ک").replace("ۀ", "ه").replace("ة", "ه").replace("‌", " ")
    return re.sub(r"[ \t]+", " ", value).strip()

ALIASES = [(clean(alias), major) for major, aliases in MAJOR_ALIASES.items() for alias in aliases]

def match_major(title):
    title = clean(title)
    matches = [(len(alias), major) for alias, major in ALIASES if title == alias or title.startswith(alias + " ") or alias in title]
    return max(matches)[1] if matches else None

def extract_pages(path):
    if path.suffix.lower() == ".txt":
        return path.read_text(encoding="utf-8", errors="ignore").split("\f")
    with tempfile.NamedTemporaryFile(suffix=".txt") as tmp:
        subprocess.run(["pdftotext", "-layout", str(path), tmp.name], check=True)
        return Path(tmp.name).read_text(encoding="utf-8", errors="ignore").split("\f")

def parse(path):
    pages = extract_pages(path)
    records, rejected, excluded = [], Counter(), Counter()
    current_province = current_university = ""

    for page_no, page in enumerate(pages, start=1):
        lines = page.splitlines()
        for line_no, raw in enumerate(lines):
            line = clean(raw)
            if not line:
                continue

            heading = re.search(r"(?:ادامه )?استان ([^-]+?)\s*-\s*(.+)$", line)
            if heading:
                province, tail = clean(heading.group(1)), clean(heading.group(2))
                if any(marker in tail for marker in INSTITUTION_MARKERS):
                    current_province, current_university = province, tail
                    if current_university.count("(") > current_university.count(")"):
                        for continuation in lines[line_no + 1:line_no + 4]:
                            continuation = clean(continuation)
                            if not continuation:
                                continue
                            if any(header in continuation for header in ("ظرفیت", "جنس پذیرش", "توضیحات")):
                                break
                            current_university += " " + continuation
                            if current_university.count("(") <= current_university.count(")"):
                                break
                    continue

            code_match = re.search(r"(?<!\d)(\d{5})(?!\d)", line)
            if not code_match:
                continue
            code = code_match.group(1)
            left, right = line[:code_match.start()].strip(), line[code_match.end():].strip()

            if "صرفا با سوابق تحصیلی" in right:
                admission, body = "صرفاً با سوابق تحصیلی", right.split("صرفا با سوابق تحصیلی", 1)[0].strip()
            elif "صرفاً با سوابق تحصیلی" in right:
                admission, body = "صرفاً با سوابق تحصیلی", right.split("صرفاً با سوابق تحصیلی", 1)[0].strip()
            elif "با آزمون" in right:
                admission, body = "با آزمون", right.split("با آزمون", 1)[0].strip()
            else:
                rejected["no_admission_mode"] += 1
                continue

            program_type, title = "", body
            for candidate in PROGRAM_TYPES:
                if title.endswith(candidate):
                    program_type, title = candidate, title[:-len(candidate)].strip()
                    break
            major = match_major(title)
            if not major:
                continue

            if program_type in ("پیام نور", "غیرانتفاعی") or any(marker in current_university for marker in EXCLUDED_INSTITUTIONS):
                excluded[major] += 1
                continue
            if not current_university or not current_province:
                raise RuntimeError(f"Missing university/province for code {code} on PDF page {page_no}")

            tokens = left.split()
            if len(tokens) < 2:
                raise RuntimeError(f"Cannot parse capacity columns for code {code} on PDF page {page_no}: {left}")

            def capacity(token):
                return int(token) if token.isdigit() else None

            semester2, semester1 = capacity(tokens[-2]), capacity(tokens[-1])
            if semester1 is None and semester2 is None:
                values = [token for token in tokens[-8:] if token == "-" or token.isdigit()]
                if len(values) >= 2:
                    semester2, semester1 = capacity(values[-2]), capacity(values[-1])
            if semester1 is None and semester2 is None:
                raise RuntimeError(f"No numeric capacity for code {code} on PDF page {page_no}: {left}")

            gender_text = " ".join(tokens[:-2])
            has_male, has_female = "مرد" in gender_text, "زن" in gender_text
            gender = "زن و مرد" if has_male and has_female else ("مرد" if has_male else ("زن" if has_female else "در جدول ذکر نشده"))
            conditions = clean(gender_text.replace("مرد", "").replace("زن", "").replace("-", " "))
            admission_category = "شرایط خاص" if any(word in line + " " + current_university for word in SPECIAL_WORDS) else "عادی"

            for intake, seats in (("نیمسال اول", semester1), ("نیمسال دوم", semester2)):
                if seats is None:
                    continue
                records.append({
                    "year": 1405, "major": major, "university": current_university, "campus": "", "province": current_province,
                    "program_type": program_type or "در جدول ذکر نشده", "program_type_raw": program_type,
                    "admission_category": admission_category, "capacity": seats, "gender": gender, "intake": intake,
                    "admission_conditions": conditions, "source_id": "1405-math-booklet", "source_page": page_no,
                    "base_source_id": "1405-math-booklet", "base_source_page": page_no,
                    "notes": f"کدرشته‌محل منبع: {code}؛ عنوان رشته در منبع: {title}؛ نحوه پذیرش: {admission}",
                })

    def row_code(row):
        return re.search(r"کدرشته‌محل منبع: (\d+)", row["notes"]).group(1)

    records.sort(key=lambda row: (row["major"], row["province"], row["university"], row["source_page"], row_code(row)))
    codes = [row_code(row) for row in records]
    duplicates = [item for item, count in Counter(codes).items() if count > 1]
    if duplicates:
        raise RuntimeError(f"Duplicate course-location codes: {duplicates[:20]}")

    found = set(row["major"] for row in records)
    missing = sorted(set(MAJOR_ALIASES) - found)
    unknown = sorted(found - set(MAJOR_ALIASES))
    if missing or unknown:
        raise RuntimeError(f"Major coverage mismatch; missing={missing}; unknown={unknown}")

    summary = {
        "year": 1405, "group": "math", "rows": len(records), "capacity": sum(row["capacity"] for row in records),
        "course_location_codes": len(codes), "unique_course_location_codes": len(set(codes)), "major_families": len(found),
        "majors": {major: {"rows": sum(1 for row in records if row["major"] == major), "capacity": sum(row["capacity"] for row in records if row["major"] == major)} for major in sorted(found)},
        "program_types": dict(Counter(row["program_type"] for row in records)),
        "excluded_payam_noor_or_nonprofit_rows": sum(excluded.values()), "excluded_by_major": dict(excluded),
        "parser_rejections": dict(rejected),
    }
    return records, summary

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("--csv", required=True)
    parser.add_argument("--summary", required=True)
    parser.add_argument("--expect-rows", type=int, default=2003)
    parser.add_argument("--expect-capacity", type=int, default=52310)
    args = parser.parse_args()

    records, summary = parse(Path(args.input))
    if summary["rows"] != args.expect_rows or summary["capacity"] != args.expect_capacity:
        raise SystemExit(f"QA mismatch: rows={summary['rows']} capacity={summary['capacity']}")
    Path(args.csv).parent.mkdir(parents=True, exist_ok=True)
    with open(args.csv, "w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=COLUMNS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(records)
    Path(args.summary).write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False))

if __name__ == "__main__":
    main()
