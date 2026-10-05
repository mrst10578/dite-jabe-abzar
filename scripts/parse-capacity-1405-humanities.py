#!/usr/bin/env python3
import argparse
import csv
import json
import re
import subprocess
import tempfile
from collections import Counter, defaultdict
from pathlib import Path

COLUMNS = [
    "year", "major", "university", "campus", "province", "program_type", "program_type_raw",
    "admission_category", "capacity", "gender", "intake", "admission_conditions", "source_id",
    "source_page", "base_source_id", "base_source_page", "notes",
]

MAJOR_ALIASES = {
    "حقوق": ["حقوق"],
    "روان‌شناسی": ["روانشناسی", "روان شناسی"],
    "مشاوره": ["مشاوره"],
    "علوم تربیتی": ["علوم تربیتی"],
    "آموزش ابتدایی": ["آموزش ابتدایی"],
    "حسابداری": ["حسابداری"],
    "اقتصاد": ["اقتصاد"],
    "مدیریت بازرگانی": ["مدیریت بازرگانی"],
    "مدیریت دولتی": ["مدیریت دولتی"],
    "مدیریت صنعتی": ["مدیریت صنعتی"],
    "مدیریت مالی": ["مدیریت مالی"],
    "علوم سیاسی": ["علوم سیاسی"],
    "جامعه‌شناسی": ["جامعهشناسی", "جامعه شناسی"],
    "مددکاری اجتماعی": ["مددکاری اجتماعی"],
    "علوم ورزشی": ["علوم ورزشی"],
    "زبان و ادبیات فارسی": ["زبان و ادبیات فارسی"],
    "جغرافیا": ["جغرافیا"],
    "تاریخ": ["تاریخ"],
    "گردشگری": ["گردشگری"],
    "علم اطلاعات و دانش‌شناسی": [
        "علم اطلاعات و دانششناسی",
        "علم اطلاعات و دانش شناسی",
        "علم اطالعات و دانششناسی",
        "علم اطالعات و دانش شناسی",
    ],
}
REGULAR_MAJORS = {key: value for key, value in MAJOR_ALIASES.items() if key != "آموزش ابتدایی"}
TEACHER_MAJORS = {
    "آموزش ابتدایی": MAJOR_ALIASES["آموزش ابتدایی"],
    "علوم ورزشی": MAJOR_ALIASES["علوم ورزشی"],
}

TRANS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")
BIDI = ("\u202b", "\u202c", "\u202a", "\u202d", "\u202e", "\u200f", "\u200e", "\ufeff",
        "\u2066", "\u2067", "\u2068", "\u2069")
PROGRAMS = [
    "پردیس خودگردان", "شهریه پرداز",
    "روزانه - غیردولتی", "روزانه- غیردولتی", "روزانه -غیردولتی", "روزانه-غیردولتی",
    "نوبت دوم", "روزانه", "مجازی", "پیام نور", "غیرانتفاعی",
]
ADMISSIONS = ["صرفا با سوابق تحصیلی", "صرفاً با سوابق تحصیلی", "با آزمون"]
INST_MARKERS = ("دانشگاه", "دانشکده", "آموزشکده", "موسسه", "مؤسسه", "مرکز", "مجتمع", "پژوهشگاه")
PROVINCES = [
    "آذربایجان شرقی", "آذربایجان غربی", "اردبیل", "اصفهان", "البرز", "ایلام", "بوشهر", "تهران",
    "خراسان جنوبی", "خراسان رضوی", "خراسان شمالی", "خوزستان", "زنجان", "سمنان", "سیستان و بلوچستان",
    "فارس", "قزوین", "قم", "لرستان", "مازندران", "مرکزی", "هرمزگان", "همدان", "چهارمحال و بختیاری",
    "کردستان", "کرمان", "کرمانشاه", "کهگیلویه و بویراحمد", "گلستان", "گیلان", "یزد",
]
PROVINCE_VARIANTS = {"ایالم": "ایلام", "گیالن": "گیلان"}

def clean(value):
    for ch in BIDI:
        value = value.replace(ch, "")
    value = (value.translate(TRANS)
             .replace("ي", "ی").replace("ك", "ک").replace("ۀ", "ه").replace("ة", "ه")
             .replace("‌", " ").replace("غيردولتی", "غیردولتی").replace("غيردولتي", "غیردولتی"))
    return re.sub(r"[ \t]+", " ", value).strip()

def norm(value):
    return clean(value).replace("ـ", "").strip(" .،؛:-")

ALIASES = {major: [norm(alias) for alias in aliases] for major, aliases in MAJOR_ALIASES.items()}

def province_name(value):
    normalized = norm(value)
    for bad, good in PROVINCE_VARIANTS.items():
        normalized = normalized.replace(bad, good)
    for province in sorted(PROVINCES, key=len, reverse=True):
        if normalized.startswith(province) or province in normalized:
            return province
    return normalized

def exact_major_from_sides(left, right, allowed):
    left_normalized, right_normalized = norm(left), norm(right)
    for phrase in ADMISSIONS + PROGRAMS:
        phrase = norm(phrase)
        left_normalized = left_normalized.replace(phrase, " ")
        right_normalized = right_normalized.replace(phrase, " ")
    left_normalized = re.sub(r"\s+", " ", left_normalized).strip()
    right_normalized = re.sub(r"\s+", " ", right_normalized).strip()
    matches = []
    for major in allowed:
        for alias in ALIASES[major]:
            if right_normalized == alias or right_normalized.startswith(alias + " ("):
                matches.append((len(alias), major, alias, "right"))
            if left_normalized == alias or left_normalized.endswith(" " + alias):
                matches.append((len(alias), major, alias, "left"))
    return max(matches, default=None)

def extract_pages(path):
    with tempfile.NamedTemporaryFile(suffix=".txt") as temp:
        subprocess.run(["pdftotext", "-layout", str(path), temp.name], check=True)
        return Path(temp.name).read_text(encoding="utf-8", errors="ignore").split("\f")

def parse_regular(pages):
    records, excluded, rejected = [], Counter(), Counter()
    current_province = current_university = ""

    # PDF pages 42-146 are the government/public + teacher-prelude part.
    # Nonprofit and Payam Noor sections start later and are intentionally not parsed.
    for page_no in range(42, 147):
        if page_no > len(pages):
            break
        lines = pages[page_no - 1].splitlines()
        for line_no, raw in enumerate(lines):
            line = clean(raw)
            if not line:
                continue

            heading = re.search(r"(?:ادامه )?استان ([^-]+?)\s*-\s*(.+)$", line)
            if heading:
                province, tail = province_name(heading.group(1)), norm(heading.group(2))
                if any(marker in tail for marker in INST_MARKERS):
                    current_province, current_university = province, tail
                    if current_university.count("(") > current_university.count(")"):
                        for continuation in lines[line_no + 1:line_no + 4]:
                            continuation = clean(continuation)
                            if not continuation or any(header in continuation for header in ("ظرفیت", "جنس پذیرش", "توضیحات", "کدرشته")):
                                continue
                            current_university += " " + continuation
                            if current_university.count("(") <= current_university.count(")"):
                                break
                    continue

            code_match = re.search(r"(?<!\d)(\d{5})(?!\d)", line)
            if not code_match:
                continue
            code = code_match.group(1)
            left, right = line[:code_match.start()].strip(), line[code_match.end():].strip()
            major_match = exact_major_from_sides(left, right, REGULAR_MAJORS)
            if not major_match:
                continue
            _, major, alias, side = major_match

            normalized_line = norm(line)
            if "صرفا با سوابق تحصیلی" in normalized_line or "صرفاً با سوابق تحصیلی" in normalized_line:
                admission = "صرفاً با سوابق تحصیلی"
            elif "با آزمون" in normalized_line:
                admission = "با آزمون"
            else:
                rejected["no_admission_mode"] += 1
                continue

            program = ""
            for candidate in PROGRAMS:
                if norm(candidate) in normalized_line:
                    program = norm(candidate)
                    break

            if (program in ("پیام نور", "غیرانتفاعی")
                    or "غیردولتی" in program
                    or any(marker in current_university for marker in ("پیام نور", "غیرانتفاعی", "غیر انتفاعی", "غیردولتی"))):
                excluded[major] += 1
                continue

            if not current_university or not current_province:
                rejected["missing_heading"] += 1
                continue

            core = clean(left)
            for phrase in ADMISSIONS + PROGRAMS:
                core = core.replace(norm(phrase), " ")
            if side == "left":
                position = core.rfind(alias)
                if position >= 0:
                    core = core[:position] + core[position + len(alias):]
            core = re.sub(r"\s+", " ", core).strip()
            values = [token for token in core.split()[-10:] if token == "-" or token.isdigit()]
            if len(values) < 2:
                rejected["no_capacity_pair"] += 1
                continue

            semester2 = None if values[-2] == "-" else int(values[-2])
            semester1 = None if values[-1] == "-" else int(values[-1])
            if semester1 is None and semester2 is None:
                rejected["empty_capacity_pair"] += 1
                continue

            has_male, has_female = "مرد" in core, "زن" in core
            capacity_tail_slots = 2
            if has_male or has_female:
                gender = "زن و مرد" if has_male and has_female else ("مرد" if has_male else "زن")
            elif len(values) >= 4:
                male_capacity = None if values[-4] == "-" else int(values[-4])
                female_capacity = None if values[-3] == "-" else int(values[-3])
                if (male_capacity or 0) > 0 and (female_capacity or 0) > 0:
                    gender = "زن و مرد"
                elif (male_capacity or 0) > 0:
                    gender = "مرد"
                elif (female_capacity or 0) > 0:
                    gender = "زن"
                else:
                    gender = "در جدول ذکر نشده"
                capacity_tail_slots = 4
            else:
                gender = "در جدول ذکر نشده"

            conditions_core = re.sub(r"\b(?:مرد|زن)\b", " ", core)
            tail_pattern = r"(?:^|\s)(?:-|\d+)" + r"(?:\s+(?:-|\d+))" * (capacity_tail_slots - 1) + r"\s*$"
            conditions_core = re.sub(tail_pattern, " ", conditions_core)
            conditions = norm(conditions_core)
            category = "شرایط خاص" if any(word in normalized_line + " " + current_university
                                           for word in ("تعهد", "بورس", "مصاحبه", "شرایط خاص", "مناطق محروم")) else "عادی"

            for intake, seats in (("نیمسال اول", semester1), ("نیمسال دوم", semester2)):
                if seats is None:
                    continue
                records.append({
                    "year": 1405, "major": major, "university": current_university, "campus": "",
                    "province": current_province, "program_type": program or "در جدول ذکر نشده",
                    "program_type_raw": program, "admission_category": category, "capacity": seats,
                    "gender": gender, "intake": intake, "admission_conditions": conditions,
                    "source_id": "1405-humanities-booklet", "source_page": page_no,
                    "base_source_id": "1405-humanities-booklet", "base_source_page": page_no,
                    "notes": f"کدرشته‌محل منبع: {code}؛ عنوان رشته در منبع: {alias}؛ نحوه پذیرش: {admission}",
                })
    return records, excluded, rejected

def teacher_title(right):
    right = norm(right)
    for major in TEACHER_MAJORS:
        for alias in ALIASES[major]:
            if right == alias or right.startswith(alias + " "):
                return major, alias
    return None

def extract_campus(line):
    normalized = norm(line)
    if "دانشگاه تربیت دبیر شهید رجایی" in normalized:
        return "دانشگاه تربیت دبیر شهید رجایی - تهران", ""
    position = normalized.find("پردیس ")
    if position >= 0:
        tail = normalized[position:]
        cut = len(tail)
        for marker in (" /", "/", " اولویت", " مخصوص"):
            found = tail.find(marker)
            if found >= 0:
                cut = min(cut, found)
        campus = tail[:cut].strip(" -")
        if campus and len(campus) < 140:
            while campus.count("(") > campus.count(")"):
                campus += ")"
            return "دانشگاه فرهنگیان", campus
    return None

def parse_teacher(pages):
    records, rejected = [], Counter()
    current_province = ""
    current_university, current_campus = "دانشگاه فرهنگیان", ""

    # PDF pages 147-400 are the Farhangian / Shahid Rajaei section.
    for page_no in range(147, 401):
        if page_no > len(pages):
            break
        for raw in pages[page_no - 1].splitlines():
            line = clean(raw)
            if not line:
                continue

            province_match = re.search(r"(?:ادامه )?مخصوص متقاضیان بومی استان (.+?)$", line)
            if province_match:
                current_province = province_name(province_match.group(1))

            campus_match = extract_campus(line)
            if campus_match:
                current_university, current_campus = campus_match

            code_match = re.search(r"(?<!\d)(\d{5})(?!\d)", line)
            if not code_match:
                continue
            code = code_match.group(1)
            left, right = line[:code_match.start()].strip(), line[code_match.end():].strip()
            matched = teacher_title(right)
            if not matched:
                continue
            major, alias = matched

            numbers = re.findall(r"(?<!\d)(\d+)(?!\d)", clean(left))
            if not numbers:
                rejected["teacher_no_capacity"] += 1
                continue
            seats = int(numbers[-1])
            if seats <= 0:
                rejected["teacher_nonpositive_capacity"] += 1
                continue

            left_normalized = norm(left)
            has_male, has_female = "مرد" in left_normalized, "زن" in left_normalized
            gender = "زن و مرد" if has_male and has_female else ("مرد" if has_male else ("زن" if has_female else "در جدول ذکر نشده"))

            row_campus = extract_campus(line)
            if row_campus:
                current_university, current_campus = row_campus

            if not current_province:
                rejected["teacher_missing_province"] += 1
                continue

            university = current_university if major == "علوم ورزشی" and current_university.startswith("دانشگاه تربیت") else "دانشگاه فرهنگیان"
            campus = current_campus if university == "دانشگاه فرهنگیان" else ""
            conditions = ((campus + "؛ ") if campus else "") + "پذیرش دانشجو‌معلم با تعهد خدمت؛ استان مربوط به بومی‌گزینی/محل خدمت است"
            records.append({
                "year": 1405, "major": major, "university": university, "campus": campus,
                "province": current_province, "program_type": "در جدول ذکر نشده", "program_type_raw": "",
                "admission_category": "تعهد خدمت", "capacity": seats, "gender": gender,
                "intake": "در جدول ذکر نشده", "admission_conditions": conditions,
                "source_id": "1405-humanities-teacher-booklet", "source_page": page_no,
                "base_source_id": "1405-humanities-teacher-booklet", "base_source_page": page_no,
                "notes": f"کدرشته‌محل منبع: {code}؛ عنوان رشته در منبع: {alias}؛ نحوه پذیرش: آزمون اختصاصی دانشجو‌معلم، گروه علوم انسانی؛ استان در این ردیف مربوط به بومی‌گزینی/محل خدمت است",
            })
    return records, rejected

def parse(path):
    pages = extract_pages(path)
    regular, excluded, regular_rejected = parse_regular(pages)
    teacher, teacher_rejected = parse_teacher(pages)
    records = regular + teacher

    def row_code(row):
        return re.search(r"کدرشته‌محل منبع: (\d+)", row["notes"]).group(1)

    keys = [(row_code(row), row["major"], row["gender"], row["intake"], row["capacity"]) for row in records]
    duplicates = [key for key, count in Counter(keys).items() if count > 1]
    if duplicates:
        raise RuntimeError(f"Duplicate record keys: {duplicates[:20]}")

    found = set(row["major"] for row in records)
    missing = sorted(set(MAJOR_ALIASES) - found)
    if missing:
        raise RuntimeError(f"Missing major families: {missing}")

    records.sort(key=lambda row: (
        row["major"], row["province"], row["university"], int(row["source_page"]),
        row_code(row), row["intake"], row["gender"],
    ))

    by_major = defaultdict(lambda: {"rows": 0, "capacity": 0, "codes": set()})
    for row in records:
        item = by_major[row["major"]]
        item["rows"] += 1
        item["capacity"] += row["capacity"]
        item["codes"].add(row_code(row))

    summary = {
        "year": 1405,
        "group": "humanities",
        "rows": len(records),
        "capacity": sum(row["capacity"] for row in records),
        "unique_course_location_codes": len(set(row_code(row) for row in records)),
        "major_families": len(found),
        "majors": {
            major: {"rows": item["rows"], "capacity": item["capacity"], "codes": len(item["codes"])}
            for major, item in sorted(by_major.items())
        },
        "program_types": dict(Counter(row["program_type"] for row in records)),
        "sources": dict(Counter(row["source_id"] for row in records)),
        "excluded_ambiguous_nongovernmental_rows": sum(excluded.values()),
        "excluded_by_major": dict(excluded),
        "parser_rejections": dict(regular_rejected + teacher_rejected),
    }
    return records, summary

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("--csv", required=True)
    parser.add_argument("--summary", required=True)
    parser.add_argument("--expect-rows", type=int, default=2513)
    parser.add_argument("--expect-capacity", type=int, default=23226)
    args = parser.parse_args()

    records, summary = parse(Path(args.input))
    if summary["rows"] != args.expect_rows or summary["capacity"] != args.expect_capacity:
        raise SystemExit(f"QA mismatch: rows={summary['rows']} capacity={summary['capacity']}")
    if summary["major_families"] != 20 or summary["unique_course_location_codes"] != 2513:
        raise SystemExit(f"QA mismatch: {summary}")
    if summary["parser_rejections"]:
        raise SystemExit(f"Parser rejections remain: {summary['parser_rejections']}")
    if any(any(token in row["university"] + " " + row["program_type"]
               for token in ("پیام نور", "غیرانتفاعی", "غیر انتفاعی", "غیردولتی")) for row in records):
        raise SystemExit("Forbidden institution/program leaked into output")
    if {row["province"] for row in records} != set(PROVINCES):
        raise SystemExit("Province coverage mismatch")

    Path(args.csv).parent.mkdir(parents=True, exist_ok=True)
    with open(args.csv, "w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=COLUMNS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(records)
    Path(args.summary).write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False))

if __name__ == "__main__":
    main()
