"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { chromium } = require("playwright-core");
const html = fs.readFileSync(
  path.join(__dirname, "..", "audit-google-auto.html"),
  "utf8",
);
const executablePath = process.env.CHROMIUM_PATH;
async function setup(browser) {
  const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("https://mw.test/**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: html,
    }),
  );
  await page.goto("https://mw.test/");
  await page.evaluate(() => {
    document.getElementById("projectMeta").hidden = true;
    document.body.classList.remove("meta-stage-active");
    SHEET_CFG.company = "شرکت آزمایشی";
    SHEET_CFG.year = "۱۴۰۴";
    currentHeaders = ["x"];
    FULL_ROWS = [];
    ACCOUNT_ROWS = [
      {
        "شماره سند": "1",
        "نوع سند": "ابتدای سال",
        "کد حساب کل": "01",
        "عنوان حساب کل": "موجودی نقد",
        "کد حساب معین": "001",
        "عنوان حساب معین": "بانک",
        بدهکار: "۱۰۰",
        بستانکار: "",
        تاریخ: "1404/01/01",
      },
      {
        "شماره سند": "2",
        "نوع سند": "سند جاری",
        "کد حساب کل": "01",
        "عنوان حساب کل": "موجودی نقد",
        "کد حساب معین": "001",
        "عنوان حساب معین": "بانک",
        بدهکار: "50",
        بستانکار: "30",
      },
      {
        "شماره سند": "3",
        "نوع سند": "سند جاری",
        "کد حساب کل": "01",
        "عنوان حساب کل": "موجودی نقد",
        "کد حساب معین": "",
        بدهکار: "10",
        بستانکار: "",
      },
      {
        "شماره سند": "4",
        "نوع سند": "سند جاری",
        "کد حساب کل": "02",
        "عنوان حساب کل": "هزینه",
        "کد حساب معین": "01",
        "عنوان حساب معین": "هزینه اداری",
        بدهکار: "اشتباه",
        بستانکار: "",
      },
    ];
    gotoModule("mainWorkpaper");
  });
  await page.evaluate(() => document.fonts.ready);
  return { page, context, errors };
}
test(
  "main workpaper selection, current balances, explicit mapping and inert classification on mobile",
  { skip: !executablePath && "Set CHROMIUM_PATH" },
  async () => {
    const browser = await chromium.launch({
      executablePath,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    try {
      const { page, context, errors } = await setup(browser);
      const h = page.locator("#mainWorkpaperModule");
      assert.equal(await h.isVisible(), true);
      await h.locator("[data-balance-open]").click();
      const dlg = page.locator("#mwDialog");
      assert(await dlg.isVisible());
      await dlg.locator("#mwSearch").fill("موجودی");
      assert.equal(
        await dlg.locator('[data-mw-account="02"]').isVisible(),
        false,
      );
      await dlg.locator('[data-mw-account="01"]').check();
      await dlg.locator("[data-mw-done]").click();
      assert.equal(await dlg.isVisible(), false);
      assert.match(await h.locator(".mw-paper-table").innerText(), /۱۲۵|۱۳۰/);
      assert.match(await h.locator(".mw-paper-table").innerText(), /۱۳۰/);
      assert.match(await h.innerText(), /ثبت مستقیم در حساب کل/);
      const sel = h.locator("[data-mw-link]").nth(1);
      await sel.selectOption("A-70|1|5");
      await h.locator('[data-mw-view="A-70"]').click();
      const cash = h
        .locator(".mw-paper-table tr")
        .filter({ hasText: "موجودی نقد" });
      assert.match(await cash.innerText(), /۱۲۰/);
      await h.locator('[data-mw-view="accounts"]').click();
      await h.locator("[data-mw-link]").first().selectOption("A-70|1|5");
      await h.locator('[data-mw-view="A-70"]').click();
      assert.match(await cash.innerText(), /۱۳۰/);
      const cells = cash.locator("td");
      assert.equal(await cells.count(), 13);
      for (let i = 3; i < 13; i++)
        assert.equal((await cells.nth(i).innerText()).trim(), "");
      assert.match(await h.innerText(), /طبقه‌بندی و سال قبل محاسبه نمی‌شوند/);
      assert.equal(
        await h
          .locator(".mw-paper-table input, .mw-paper-table select")
          .count(),
        0,
      );
      assert.equal(
        await h
          .locator(
            ".mw-classification input, .mw-classification select, .mw-classification button",
          )
          .count(),
        0,
      );
      assert.equal(
        (await h.locator(".mw-classification tbody").innerText()).trim(),
        "",
      );
      assert.deepEqual(errors, []);
      await context.close();
    } finally {
      await browser.close();
    }
  },
);
test(
  "invalid amounts do not silently become zero and changes to source clear selections",
  { skip: !executablePath && "Set CHROMIUM_PATH" },
  async () => {
    const browser = await chromium.launch({
      executablePath,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    try {
      const { page, context, errors } = await setup(browser);
      const h = page.locator("#mainWorkpaperModule");
      await h.locator("[data-balance-open]").click();
      await page.locator('#mwDialog [data-mw-account="02"]').check();
      await page.locator("#mwDialog [data-mw-done]").click();
      assert.match(await h.innerText(), /نامعتبر/);
      let row = h.locator(".mw-paper-table tbody tr").last();
      assert.equal((await row.locator("td").nth(2).innerText()).trim(), "");
      await page.evaluate(() => {
        ACCOUNT_ROWS = [
          {
            "کد حساب کل": "77",
            "عنوان حساب کل": "جدید",
            بدهکار: "1",
            بستانکار: "",
          },
        ];
        gotoModule("mainWorkpaper");
      });
      assert.match(await h.innerText(), /هنوز حسابی انتخاب نشده/);
      assert.deepEqual(errors, []);
      await context.close();
    } finally {
      await browser.close();
    }
  },
);
test(
  "multi-page A4 preview and PDF fit, with page numbers and repeated headers",
  { skip: !executablePath && "Set CHROMIUM_PATH" },
  async () => {
    const browser = await chromium.launch({
      executablePath,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    try {
      const { page, context, errors } = await setup(browser);
      await page.evaluate(() => {
        ACCOUNT_ROWS = Array.from({ length: 90 }, (_, i) => ({
          "شماره سند": String(i + 2),
          "نوع سند": "سند جاری",
          "کد حساب کل": "01",
          "عنوان حساب کل": "هزینه اداری",
          "کد حساب معین": String(i),
          "عنوان حساب معین": "معین " + i + " هزینه عمومی",
          بدهکار: String(i + 1),
          بستانکار: "",
        }));
        gotoModule("mainWorkpaper");
      });
      await page.locator("[data-balance-open]").click();
      await page.locator('[data-mw-account="01"]').check();
      await page.locator("[data-mw-done]").click();
      await page.evaluate(() => document.fonts.ready);
      const pages = page.locator("#mwPreview .mw-paper");
      const count = await pages.count();
      assert(count >= 2);
      for (let i = 0; i < count; i++) {
        const p = pages.nth(i);
        assert.match(await p.innerText(), /شرکت آزمایشی/);
        assert.match(await p.locator(".mw-paper-foot").innerText(), /صفحه/);
        assert(
          await p
            .locator(".mw-inside")
            .evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
        );
      }
      assert.equal(await page.locator("#mwPrint").isEnabled(), true);
      await page.evaluate(() => {
        window.print = () => {};
      });
      await page.locator("#mwPrint").click();
      await page.emulateMedia({ media: "print" });
      const pdf = await page.pdf({
        format: "A4",
        landscape: true,
        printBackground: true,
      });
      const { PDFDocument } = require("pdf-lib");
      assert.equal((await PDFDocument.load(pdf)).getPageCount(), count);
      fs.writeFileSync(".arena/main-workpaper-check.pdf", pdf);
      assert.deepEqual(errors, []);
      await context.close();
    } finally {
      await browser.close();
    }
  },
);

test(
  "real CSV import, opening confirmation, home entry and module navigation",
  { skip: !executablePath && "Set CHROMIUM_PATH" },
  async () => {
    const browser = await chromium.launch({
      executablePath,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    try {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      });
      const page = await context.newPage(),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.route("https://mw.test/**", (r) =>
        r.fulfill({
          status: 200,
          contentType: "text/html; charset=utf-8",
          body: html,
        }),
      );
      await page.goto("https://mw.test/");
      await page.locator("#metaCompany").fill("آزمایشی");
      await page.locator("#metaYear").fill("۱۴۰۴");
      await page.locator("#metaContinue").click();
      const csv =
        "\ufeffشماره سند,تاریخ,شرح سند,شرح ردیف,بدهکار,بستانکار,کد حساب کل,عنوان حساب کل,کد حساب معین,عنوان حساب معین,کد حساب تفصیلی,عنوان حساب تفصیلی\n1,1404/01/01,مانده ابتدای سال,افتتاحیه,100,,100,بانک,1001,بانک الف,1,شخص الف\n2,1404/02/01,سند جاری,گردش,40,10,100,بانک,1001,بانک الف,1,شخص الف\n";
      await page.locator("#homeFile").setInputFiles({
        name: "ledger.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(csv),
      });
      await page
        .locator("#confirmBtn")
        .waitFor({ state: "visible", timeout: 20000 });
      await page.locator("#confirmBtn").click();
      await page
        .locator("#openingContinueBtn")
        .waitFor({ state: "visible", timeout: 20000 });
      await page.locator("#openingContinueBtn").click();
      await page.locator('[data-open="mainWorkpaper"]').click();
      await page.locator("#mainWorkpaperModule [data-balance-open]").click();
      await page.locator('#mwDialog [data-mw-account="100"]').check();
      await page.locator("#mwDialog [data-mw-done]").click();
      assert.match(await page.locator("#mwPreview").innerText(), /۱۳۰/);
      assert.deepEqual(errors, []);
      await context.close();
    } finally {
      await browser.close();
    }
  },
);

test(
  "oversized account amounts block printing rather than overflow",
  { skip: !executablePath && "Set CHROMIUM_PATH" },
  async () => {
    const browser = await chromium.launch({
      executablePath,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    try {
      const { page, context, errors } = await setup(browser);
      await page.evaluate(() => {
        ACCOUNT_ROWS = [
          {
            "شماره سند": "1",
            "نوع سند": "سند جاری",
            "کد حساب کل": "10",
            "عنوان حساب کل": "آزمایش",
            "کد حساب معین": "1",
            "عنوان حساب معین": "حساب",
            بدهکار: "1234567890123456789012345678901234567890",
            بستانکار: "",
          },
        ];
        gotoModule("mainWorkpaper");
      });
      await page.locator("[data-balance-open]").click();
      await page.locator('[data-mw-account="10"]').check();
      await page.locator("[data-mw-done]").click();
      assert(await page.locator("#mwPrint").isDisabled());
      assert.match(
        await page.locator("#mwPaginationWarning").innerText(),
        /بریدگی/,
      );
      assert.deepEqual(errors, []);
      await context.close();
    } finally {
      await browser.close();
    }
  },
);
