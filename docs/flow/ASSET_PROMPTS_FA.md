# پرامپت‌های تصاویر Flow

این بسته برای طرح تیرهٔ انتخاب‌شده آماده شده است. دو اصلاح قطعی: نشان بالای راست فقط Flow، و دو جست‌وجوی مستقل رشته‌شناسی و استان‌شناسی زیر هم.

## روش استفاده

هر پرامپت را جدا اجرا کن؛ خروجی‌ها نباید در یک تصویر یا شیت ترکیب شوند. در هر اجرا، تصویر `references/selected.webp` و تصویر `references/revised.webp` را ضمیمه کن. تصاویر اصلی کانال که کاربر فرستاده نیز برای حفظ شکل پرنده و DNA مرجع هستند.

پرامپت‌ها فقط تصویر می‌سازند؛ عنوان، توضیح، فرم، دکمه و جست‌وجو باید با کد ساخته شوند. هیچ متن رابط کاربری در تصویر اصلی، تصویر موبایل، کتاب یا قطب‌نما تولید نشود. تنها تصویر دارای نوشته، نشان انگلیسی Flow است.

برای خروجی‌های شفاف، گزینهٔ `transparent_background: true` را فعال کن. اگر ابزار شفافیت واقعی نمی‌دهد، خروجی را تأیید نکن؛ پس‌زمینهٔ چهارخانهٔ نقاشی‌شده شفافیت نیست.

ابعاد زیر هدف تولید و تحویل هستند. اگر ابزار اندازهٔ دیگری داد، تناسب و نقطهٔ تمرکز را بررسی کن؛ تصویر را با کشیدن و فشردن به اندازهٔ هدف نرسان. تغییر اندازهٔ متناسب و تبدیل فرمت، پس از تأیید ترکیب‌بندی انجام می‌شود.

| تصویر | اندازهٔ هدف | زمینه | مسیر نهایی | اولویت |
|---|---|---|---|---|
| پرنده و فضای اصلی دسکتاپ | ۲۵۶۰ × ۱۶۰۰ | سرمه‌ای یکپارچه با صفحه | `hero-desktop.webp` | ضروری |
| ترکیب اختصاصی موبایل | ۱۰۸۰ × ۷۲۰ | سرمه‌ای یکپارچه با صفحه | `hero-mobile.webp` | ضروری |
| نشان Flow | ۷۲۰ × ۳۰۰ | شفاف | `flow-wordmark.webp` | ضروری |
| قطب‌نما | ۷۶۸ × ۷۶۸ | شفاف | `compass.webp` | پشتیبان |
| کتاب راهنما | ۷۶۸ × ۷۶۸ | شفاف | `guide-book.webp` | پشتیبان |
| جداکنندهٔ گیاهی | ۲۴۰۰ × ۱۰۰ | شفاف | `botanical-divider.webp` | جزئیات |

همهٔ مسیرها زیر `public/flow/assets/` هستند. برای صفحه‌های داخلی، در این مرحله تصویر اضافه تولید نمی‌شود.

## زبان تصویری مشترک

رنگ پایه سرمه‌ای بسیار تیره، فیروزه‌ای درخشان، سبز برگ و طلایی محدود است. جنس پرها نیمه‌بلوری و طبیعی، برگ‌ها با رگبرگ قابل‌تشخیص و فلز طلایی با انعکاس کنترل‌شده باشد. DNA و رگه‌های نور با موضوع رشد هماهنگ‌اند؛ خوانایی فرم و متن اولویت دارد. کیفیت و زاویهٔ نور میان تصاویر ثابت بماند.

## ۱. تصویر اصلی دسکتاپ

این تصویر به‌صورت یک لایهٔ تصویری پشت ناحیهٔ اصلی استفاده می‌شود. سمت راست باید برای تیتر، توضیح و دو فرم مستقل کاملاً خلوت باشد. تصویر پرنده نباید پشت ورودی‌ها، دکمه‌ها یا متن قرار بگیرد.

```text
Create one production-quality cinematic WEBSITE HERO ART ASSET, not a website screenshot and not a UI mockup. Target 2560 x 1600 pixels, landscape 8:5. Use the attached selected Flow website and its revised mockup as strict art-direction references. Preserve the supplied majestic feathered mythical bird's anatomy, head silhouette, turquoise and emerald crystalline feathers, botanical leaf tendrils and tiny warm-gold details.

Composition is a hard constraint: the bird and detailed landscape occupy the LEFT 40-42 percent. Bird head sits near x=28%, y=27%; wings rise toward the upper-left and extend off-canvas intentionally; talons and foliage anchor the lower-left. A small luminous floating-island castle with subtle waterfalls may sit around x=37%, y=45%, entirely away from the text zone. Flowing cyan-green leaf ribbons surround the bird without entering the interface area.

The RIGHT 55-58 percent must be calm, nearly uniform midnight navy #031319, with extremely subtle dark botanical atmosphere only near the bottom edge. Reserve x=46%-96%, y=10%-86% for real coded Persian heading, explanatory text, and TWO stacked search forms. No bright particles, DNA strands, branches, feathers or castle silhouettes behind this reserved area. Let the artwork naturally dissolve into the midnight background within the actual image; do not leave a visible rectangular edge.

Lighting: luminous turquoise feather rims and controlled emerald leaf glow; rich restrained gold in feather structure, never a yellow floodlight. Deep midnight values compatible with #031319 around every external edge. Sophisticated cinematic fantasy-botanical realism with exceptionally sharp hero subject, soft atmospheric depth behind it, elegant restrained sparkles near the bird only. Match the selected DARK reference, not the bright original bird poster.

No text, no Flow lettering, no Persian writing, no logo, no watermark, no controls, no search fields, no cards, no icons, no frame, no border. A single reusable artwork only. Do not embed typography or UI into the image. Avoid excessive bloom, neon noise, cartoon treatment, extra birds, malformed wings, duplicated talons and blurry feathers.
```

معیار پذیرش: محل نوک و چشم پرنده واضح، نیمهٔ راست خلوت، لبه‌ها هم‌رنگ بدنهٔ صفحه، و کنترل‌های واقعی سایت خوانا باشند. اندازهٔ فایل هدف پس از تبدیل، حداکثر حدود ۷۰۰ کیلوبایت؛ کیفیت را صرفاً برای رسیدن به این عدد خراب نکن.

## ۲. تصویر اختصاصی موبایل

این تصویر بالای متن قرار می‌گیرد؛ تیتر و دو فرم پایین آن هستند. نسخهٔ موبایل با بریدن تصادفی تصویر دسکتاپ ساخته نمی‌شود.

```text
Create one responsive MOBILE WEBSITE HERO ART ASSET for the same Flow botanical fantasy identity shown in the attached selected dark website reference. Target 1080 x 720 pixels, landscape 3:2. This is artwork only, not a mobile UI screenshot, not a phone mockup.

Recompose the SAME turquoise-emerald-gold feathered mythical bird from the source specifically for a shallow mobile hero slot. Show a majestic clear three-quarter head and upper chest with a controlled sweep of wing feathers, centered slightly left at x=43%. Preserve correct anatomy and enough surrounding space that the beak, eye and leaf crest survive a 390px-wide display. A compact floating-island silhouette and soft waterfall atmosphere can sit in the distance. Keep decorative botanical light ribbons sparse.

Midnight navy background #031319; cyan feather highlights, fresh emerald leaves and tiny gold structural accents. The lower 15% and side edges must settle into almost uniform midnight #031319, making a clean join to the coded page below. Do not require overlay text on the image. Rich cinematic depth, premium realism, same rendering materials and light direction as the desktop asset; reduce busy micro-detail at small sizes.

No text, no logo, no slogans, no watermark, no search controls, no UI, no decorative frame, no device chrome. One image only. No extra bird heads, clipped eyes, bright white sky, overly saturated lime haze or dense sparkles.
```

معیار پذیرش: پرنده در عرض ۳۹۰ پیکسل قابل‌تشخیص باشد؛ بالای فرم‌ها تصویر جدا بماند و در ارتفاع حدود ۲۱۶ پیکسل، جزئیات کلیدی حذف نشوند. اندازهٔ فایل هدف حدود ۲۰۰ کیلوبایت یا کمتر.

## ۳. نشان فقط انگلیسی Flow

تصویر نشان باید شفاف باشد و واژهٔ انگلیسی Flow به‌تنهایی در آن دیده شود. کنار یا زیر آن «فلو» نوشته نشود؛ نام کانال و شعار نیز داخل نشان کوچک سربرگ قرار نگیرند.

```text
Create one isolated, compact horizontal BRAND WORDMARK for a website header. Exact visible text: "Flow". Case-sensitive spelling: capital F followed by lowercase l, o, w. Absolutely NO Persian transliteration, NO "فلو", NO other words, NO channel handle, NO Telegram badge, NO slogan and NO watermark.

Use the attached original Flow botanical DNA logo and the selected dark website header as the visual reference. Faithfully preserve the elegant flowing letter silhouette: decorative readable F, refined l, rounded o containing a clean restrained DNA double-helix motif, and an elegant w with a restrained green leaf flourish. Cyan/turquoise crystalline metallic lettering transitions gently to emerald in the organic flourishes, with very small gold detail. Keep the word readable at 150-180 CSS pixels wide; do not allow tendrils, leaves or the DNA to obscure the letter shapes.

Target 720 x 300 pixels, horizontal 12:5, TRUE TRANSPARENT ALPHA background. Wordmark occupies approximately 86% of the width, vertically centered, with safe whitespace around leaf tips and descenders. Small delicate botanical accents only; remove the giant circular wreath, poster layout and background scenery. Sharp edges, controlled glow constrained close to the lettering, no dark rectangular background, no checkerboard painted into the image, no heavy fog or drop shadow.

Output one logo asset only, not a logo sheet, not a website, not a business card and not a device mockup. Preserve exact Latin spelling "Flow".
```

معیار پذیرش: املای دقیق Flow، نبود هرگونه نوشتهٔ فارسی، نبود کادر سرمه‌ای، خوانایی در اندازهٔ کوچک و لبهٔ شفاف بدون هالهٔ خاکستری. اندازهٔ فایل هدف حدود ۸۰ کیلوبایت یا کمتر.

## ۴. قطب‌نمای انتخاب رشته

برای کنار متن قطب‌نما در بخش پشتیبان؛ متن و دکمه با کد ساخته می‌شوند.

```text
Create one isolated BOTANICAL COMPASS illustration matching the attached selected Flow midnight website. Target 768 x 768 pixels, square, TRUE TRANSPARENT ALPHA background. One antique precision compass with refined brushed gold housing, a readable elegant needle, deep forest-teal dial and tiny turquoise light accents. View from a gentle three-quarter frontal angle, compass facing the viewer, anchored in a compact small mound of dark moss, polished stones and a few emerald leaves.

Preserve the selected reference's premium cinematic fantasy-nature rendering, cyan-green botanical light strands and restrained gold craftsmanship. Strong simple silhouette usable at 180-220 CSS pixels, compass face fills around 60% of the canvas width; clean safe whitespace around the tallest leaf and the base. Light from upper left with subtle cyan rim light consistent with the hero bird. Glow only close to the object, no large halo.

The base must have a natural finite silhouette with transparent space all around; no full scenery, no solid rectangular black background, no flat platform extending to edges. No text, no numbers, no cardinal letters, no logo, no UI button, no frame, no watermark, no checkerboard rendered as content, no extra compasses and no unintelligible pseudo-lettering.
```

معیار پذیرش: عقربه و بدنه در اندازهٔ کوچک واضح، برگ‌ها محدود، تصویر با کتاب هماهنگ و زمینه واقعاً شفاف باشد. اندازهٔ فایل هدف حدود ۱۶۰ کیلوبایت یا کمتر.

## ۵. کتاب راهنمای انتخاب رشته

برای کنار متن راهنما، با نور و اندازهٔ بصری هماهنگ با قطب‌نما.

```text
Create one isolated BOTANICAL OPEN-BOOK illustration matching the attached selected Flow midnight website and its gold compass spot illustration. Target 768 x 768 pixels, square, TRUE TRANSPARENT ALPHA background. A single beautiful open guidebook with warm ivory pages, a refined gold-edged dark teal binding and a few emerald leaves growing organically behind and beside it. Gentle cyan-green wisps arc around the book, subtle not explosive. The book rests on a compact finite mound of dark moss and small stones.

Premium cinematic fantasy-botanical realism. View at a gentle three-quarter angle with readable page structure, natural page thickness and convincing spine, illuminated from upper left with a delicate cyan rim light. The open book is the main subject, approximately 66% of canvas width, clearly identifiable at 180-220 CSS pixels. Similar visual mass, base height and material quality to the compass. Leave safe transparent space around leaf tips and the base; trim the imaginary environment to a natural object silhouette.

No legible text or pseudo-text on the pages, no letters, no symbols masquerading as writing, no Flow wordmark, no Persian text, no slogan, no UI, no button, no watermark, no full landscape, no rectangular background and no painted checkerboard. One illustration only, no collage. Restrained glow, no blinding white page hotspot, no deformed duplicated pages or extra books.
```

معیار پذیرش: شکل کتاب در اندازهٔ کوچک واضح باشد، صفحات بیش از حد روشن نشوند، و جنس برگ و نور با قطب‌نما یکی باشد. اندازهٔ فایل هدف حدود ۱۶۰ کیلوبایت یا کمتر.

## ۶. جداکنندهٔ گیاهی طلایی

بین ناحیهٔ اصلی و دو بخش پشتیبان قرار می‌گیرد. این تصویر جایگزین خط موقت پوسته می‌شود.

```text
Create one very slim horizontal BOTANICAL SECTION DIVIDER asset for the attached selected Flow midnight website. Target 2400 x 100 pixels, aspect ratio 24:1, TRUE TRANSPARENT ALPHA background.

At the exact horizontal center, a small graceful three-leaf gold botanical sprout with a restrained emerald accent, around 75 pixels high in this canvas. Two delicate continuous brushed-gold hairline flourishes extend left and right with smooth low-amplitude organic curvature, settling into thin quiet lines and fading naturally near the outer edges. Keep nearly all visual detail close to the center. Match the selected dark website's subtle gold craftsmanship, never a thick bright ribbon or an ornate wedding frame.

Use precise premium rendered metallic detail with extremely restrained highlights. This must sit naturally over midnight navy #031319 with true alpha outside the ornament. No background field, no vertical border, no text, no logo, no symbols, no buttons, no UI, no watermark, no excessive glow and no checkerboard painted into the image. Exactly one horizontal divider, not a sprite sheet and not a set of alternatives.
```

معیار پذیرش: در عرض موبایل هم یک خط شلوغ و ضخیم نشود؛ برگ مرکزی خوانا و حاشیهٔ شفاف تمیز باشد. اندازهٔ فایل هدف حدود ۴۰ کیلوبایت یا کمتر.

## بررسی نهایی و اتصال به کد

- هر شش فایل را در مسیر مشخص‌شده قرار بده؛ نام فایل‌ها دقیقاً با manifest برابر باشد.
- شفافیت نشان، کتاب، قطب‌نما و جداکننده روی زمینهٔ سرمه‌ای و سفید بررسی شود.
- هیچ واژهٔ فارسی در نشان سربرگ وجود نداشته باشد.
- فرم‌ها و نوشته‌ها داخل تصویر اصلی تولید نشده باشند.
- تصویر موبایل جدا بررسی شود؛ نسبت تصویر تغییر شکل ندهد.
- در `manifest.json` وضعیت هر تصویر بعد از تأیید به `ready` تغییر کند؛ سپس `productionReady` فعال شود.
- رنگ، اندازه و موقعیت تصاویر کنار مرجع اصلاح‌شده مقایسه شود؛ تأیید فایل به‌تنهایی تأیید ظاهر سایت نیست.
- نسخهٔ آماده پیش از فعال‌شدن روی صفحهٔ اصلی باید در مرورگر، موبایل، صفحه‌کلید و جست‌وجوی واقعی بررسی شود.
