# جعبه ابزار انتخاب رشته آریس

فایل ارسالی اصلی از دراپ‌باکس وارد این پروژه شده است. این نسخه مبنای بازطراحی کامل رابط و تجربه کاربری خواهد بود؛ بازطراحی هنوز انجام نشده است.

- فایل کامل سایت: `public/index.html`
- صفحه اصلی Next.js به نسخه اصلی هدایت می‌شود.
- تصاویر، فونت‌ها، داده‌ها و قابلیت‌های فایل ارسالی حفظ شده‌اند.
- خروجی انتشار فعلی: `dist/index.html`؛ پیکربندی در `.openai/hosting.json`.
- ساختار Next.js و TypeScript برای ساخت نسخه جدید حفظ شده است.
- نسخه پشتیبان در دراپ‌باکس: `/Aris-Toolbox.html`

## اجرا و بررسی

```bash
npm ci
npm run dev
npm run verify
npm run test:e2e
```

گردش‌کار انتقال اولیه، قطعات فایل را با بررسی تعداد بایت و SHA-256 بازسازی می‌کند، فایل کامل را ثبت و قطعات موقت را حذف می‌کند. این قطعات فقط محدودیت اندازه ورودی اتصال را دور می‌زنند.

اثر انگشت فایل اصلی:

```text
ebb69da2b9154a4ad1ca578bf6bb9409aba4846715260cd7d706964b35dfdee2
```

## مرحله بعد

بازطراحی ساختار صفحات، پیمایش موبایل، خوانایی، جست‌وجو و فیلترها با حفظ محتوای موجود.

## دیپلوی روی Cloudflare Workers

این نسخه با Workers Static Assets منتشر می‌شود. `wrangler.jsonc` خروجی `dist/` را معرفی می‌کند؛ فایل اصلی، تصاویر، فونت‌ها و جست‌وجوی داخل آن بدون تغییر می‌مانند. Next.js برای توسعهٔ بعدی حفظ شده، اما در این مسیر به‌عنوان سرور روی Cloudflare اجرا نمی‌شود.

### اتصال ریپو در داشبورد

در Cloudflare از Workers & Pages یک Worker متصل به GitHub بساز و ریپوی `mrst10578/dite-jabe-abzar` را انتخاب کن. تنظیمات:

| گزینه | مقدار |
|---|---|
| Worker name | `entekhab-reshte` |
| Production branch | `main` |
| Root directory | ریشهٔ ریپو؛ خالی یا `/` |
| Build command | `npm run build:cloudflare` |
| Deploy command | `npm run deploy:cloudflare` |
| Node.js | `22`؛ مطابق `.nvmrc` |

نام Worker باید با `name` در `wrangler.jsonc` یکی باشد. Worker متصل فعلی Cloudflare برای این ریپو `entekhab-reshte` است؛ برای اسم دیگر، هر دو را هماهنگ کن. پیش‌نمایش شاخه‌های دیگر را فعلاً غیرفعال بگذار؛ شاخهٔ بازطراحی Flow هنوز تصاویر نهایی ندارد. برای این سایت استاتیک، D1، R2، متغیر محیطی یا کلید API داخل ریپو لازم نیست؛ احراز هویت انتشار را اتصال Cloudflare به GitHub فراهم می‌کند.

ساخت مخصوص Cloudflare از خروجی تمیز شروع می‌کند، فقط فایل‌های `public/` را کپی می‌کند و اندازهٔ هر فایل و تعداد فایل‌ها را با سقف پلن رایگان کنترل می‌کند. فایل اصلی فعلی ۲۰٬۲۶۴٬۶۰۴ بایت است و از سقف ۲۵ MiB کمتر است. روت `/` سایت را باز می‌کند؛ `/index.html` به `/` هدایت می‌شود و آدرس ناموجود ۴۰۴ می‌گیرد. تولید و فعال‌سازی ظاهر نهایی Flow کار جداگانه‌ای است.

### بررسی و انتشار با خط فرمان

```bash
npm ci
npm run check:cloudflare  # ساخت و dry-run؛ چیزی منتشر نمی‌کند
npm run test:cloudflare  # تست HTTP روی runtime محلی Workers
npm run dev:cloudflare   # پیش‌نمایش محلی

npx wrangler login
npm run deploy:cloudflare
```

تست HTTP تطابق کامل فایل تحویل‌شده با `public/index.html`، هدایت آدرس قدیمی و ۴۰۴ واقعی را بررسی می‌کند. CI علاوه بر تست‌های قبلی، dry-run و همین تست Workers را بدون توکن انتشار اجرا می‌کند.

مراجع: [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)، [تنظیمات Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/) و [محدودیت فایل‌ها](https://developers.cloudflare.com/workers/platform/limits/).

## ابزار مستقل ظرفیت پذیرش

ابزار در `/capacity/` منتشر می‌شود. بازدیدکننده ابتدا تجربی، ریاضی یا انسانی
را انتخاب می‌کند؛ سپس رشتهٔ دانشگاهی و یک یا چند دانشگاه را برمی‌گزیند و ظرفیت
سال‌های ۱۴۰۴ تا ۱۴۰۱ را می‌بیند. سال ۱۴۰۵ فعلاً «به‌زودی» است. کارت صفحهٔ اصلی
به صفحهٔ مستقل ابزار لینک می‌دهد.

snapshot ثبت‌شده: `52ff02d0dcfd4e11` از commit
`e48c51abb5511b9d36a5594f96dfff3817f4192a` مخزن `mrst10578/Entekhab-Reshte`؛
۳۳٬۳۲۶ ردیف ظرفیت و ۸۳ رشته/خانواده. `public/capacity/data/manifest.json`
هش‌های SHA-256، شمار ردیف‌ها و منشأ فایل‌ها را نگه می‌دارد. فایل‌های CSV نهایی
چهار سال عیناً در `public/capacity/data/source/` هستند. build فقط اعتبارسنجی
می‌کند و داده‌ها را خودکار به‌روز نمی‌کند.

همگام‌سازی صریح از checkout تمیز منبع:

```bash
CAPACITY_SOURCE_ROOT=../Entekhab-Reshte npm run data:capacity
```

جزئیات پوشش، اعتبارسنجی و به‌روزرسانی در [گزارش ظرفیت](docs/flow/CAPACITY_REPORT_FA.md).

## ظاهر فعال Flow

هر شش تصویر در `public/flow/assets` فعال هستند. لوگوی سربرگ فقط انگلیسی است و استان‌شناسی زیر رشته‌شناسی قرار دارد.

`npm run build:cloudflare` صفحه اصلی Flow را در `dist/index.html` می‌سازد. فایل اصلی `public/index.html` برای حفظ محتوای کامل دست‌نخورده می‌ماند؛ ورودی توسعه Next به همان خروجی طراحی در `/flow-preview.html` هدایت می‌شود.

برای دیپلوی متصل به گیت، شاخه `main` و دستورهای ساخت و انتشار کلادفلر بالا را استفاده کنید.
