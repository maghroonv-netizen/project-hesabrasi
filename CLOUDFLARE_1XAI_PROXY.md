# پراکسی ابری 1xAi برای نسخهٔ موبایلی

نسخهٔ GitHub Pages صفحه را میزبانی می‌کند، اما خودش سرور ندارد. فایل `1xai-cloudflare-worker.js` یک Worker محدود برای رفع درخواست مستقیم مرورگر است. Worker فقط از Origin برنامهٔ حسابرسی می‌پذیرد، برای درخواست‌های `OPTIONS` پاسخ CORS می‌دهد و کلید اصلی 1xAi را از Secret سمت‌سرور به API می‌فرستد.

Origin پیش‌فرضی که باید مجاز شود:

```text
https://maghroonv-netizen.github.io
```

## راه‌اندازی از داشبورد Cloudflare با گوشی

۱. در Cloudflare Dashboard وارد **Workers & Pages** شو و **Create application → Create Worker → Deploy** را بزن.

۲. نام Worker را انتخاب کن؛ مثلاً `hesabrasi-1xai-proxy`. بعد **Edit code** را بزن و محتوای فایل `1xai-cloudflare-worker.js` را جایگزین کد نمونه کن و **Deploy** بزن.

۳. در **Worker → Settings → Variables and Secrets** این مقادیر را اضافه کن:

| نام | نوع | مقدار |
|---|---|---|
| `ONE_XAI_API_KEY` | Secret | کلید تازهٔ 1xAi؛ کلید قبلاً افشاشده را باطل کن |
| `APP_ACCESS_TOKEN` | Secret | رشتهٔ تصادفی دست‌کم ۳۲ حرفی که خودت تولید می‌کنی |
| `ALLOWED_ORIGIN` | Variable (متن عادی) | `https://maghroonv-netizen.github.io` |

پس از ذخیرهٔ متغیرها دوباره **Deploy** کن. کلید 1xAi را در چت، GitHub یا برنامهٔ مرورگر وارد نکن.

۴. Worker نشانی‌ای شبیه این می‌گیرد:

```text
https://hesabrasi-1xai-proxy.ACCOUNT-SUBDOMAIN.workers.dev
```

نشانی واقعی را از صفحهٔ Worker بردار.

۵. در برنامهٔ حسابرسی، کارت **1xAi** را باز کن و تنظیم کن:

- **نشانی پایه:** نشانی Worker به‌اضافهٔ `/v1`؛ مثلاً `https://hesabrasi-1xai-proxy.ACCOUNT-SUBDOMAIN.workers.dev/v1`
- **کلید API:** مقدار `APP_ACCESS_TOKEN`؛ نه کلید اصلی 1xAi
- **شناسهٔ مدل:** همان شناسهٔ دقیق از پنل 1xAi، مثلاً `gpt-4o-mini`

سپس **ذخیره** و **آزمایش اتصال** را بزن. برنامه این توکن دسترسی را در حافظهٔ محلی همان مرورگر ذخیره می‌کند؛ آن را در خروجی تنظیمات یا پیام عمومی منتشر نکن.

## آزمایش و عیب‌یابی

- نشانی `https://نشانی-واقعی-worker/health` باید JSON با `"ok":true` نشان دهد.
- `401 Invalid proxy access token`: مقدار فیلد کلید برنامه با `APP_ACCESS_TOKEN` یکسان نیست.
- `403 Origin not allowed`: مقدار `ALLOWED_ORIGIN` باید دقیقاً `https://maghroonv-netizen.github.io` باشد، بدون مسیر `/project-hesabrasi/`.
- `502`: Worker به خود 1xAi دسترسی ندارد؛ اتصال/VPN/DNS سمت Cloudflare یا پاسخ بالادستی را بررسی کن.
- اگر خطای CORS باقی است، Base URL را بررسی کن که به Worker واقعی ختم شود و مسیر `/v1` را داشته باشد.
