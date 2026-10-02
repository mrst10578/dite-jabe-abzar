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

## Flow visual foundation

The selected dark Flow design is recorded in [the design brief](docs/flow/DESIGN_BRIEF_FA.md).
[The asset prompt pack](docs/flow/ASSET_PROMPTS_FA.md) specifies six separate images, exact target sizes, composition, transparency, output paths, and acceptance checks.

Run `npm run preview:flow` to generate `/flow-preview.html` from the preserved original HTML plus `public/flow/theme.js` and `theme.css`. Major and province searches reuse the original inputs, result panels, data and event listeners. The header uses only the English Flow identity. This preliminary shell uses the supplied source images until the final asset set is approved in `manifest.json`.

The original root page remains active during this preparation stage. Full visual QA and activation are deferred until final assets and remaining reader/footer presentation are ready. See `design-qa.md` for current evidence and outstanding visual work.
