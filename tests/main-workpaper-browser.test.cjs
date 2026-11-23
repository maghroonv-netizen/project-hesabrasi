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
      assert.match(await h.locator(".mw-match-origin").first().innerText(), /تطبیق خودکار/);
      await h.locator("[data-mw-link]").first().selectOption("");
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
      assert.equal((await h.locator(".mw-ref").first().innerText()).trim(), "");
      assert(await h.locator(".mw-paper-table td, .mw-paper-table th").evaluateAll(cells => cells.every(cell => getComputedStyle(cell).color === "rgb(0, 0, 0)")));
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
  "multi-page A4 preview and PDF fit, without page numbers and with repeated headers",
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
      assert(await pages.first().locator(".mw-paper-table tbody tr").count() >= 8, "compact controls leave room for at least eight item rows");
      for (let i = 0; i < count; i++) {
        const p = pages.nth(i);
        assert.match(await p.innerText(), /شرکت آزمایشی/);
        assert.equal((await p.locator(".mw-paper-foot").innerText()).trim(), "");
        assert.equal((await p.locator(".mw-ref").innerText()).trim(), "");
        assert.equal((await p.locator(".mw-refbox").innerText()).trim(), "");
        assert(await p.locator(".mw-paper-table td, .mw-paper-table th").evaluateAll(cells => cells.every(cell => getComputedStyle(cell).color === "rgb(0, 0, 0)")));
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

test("select all includes filtered-out accounts and can be cleared on mobile", { skip: !executablePath && "Set CHROMIUM_PATH" }, async () => {
  const browser = await chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const {page,context,errors}=await setup(browser);
    await page.locator('[data-balance-open]').click();
    await page.locator('#mwSearch').fill('موجودی');
    await page.locator('#mwSelectAll').check();
    assert.equal(await page.locator('[data-mw-account="02"]').isChecked(),true);
    await page.locator('#mwSelectAll').uncheck();
    assert.equal(await page.locator('[data-mw-account="01"]').isChecked(),false);
    await page.locator('[data-mw-account="01"]').check();
    assert.equal(await page.locator('#mwSelectAll').evaluate(el=>el.indeterminate),true);
    await page.locator('#mwSelectAll').check();
    await page.locator('[data-mw-done]').click();
    assert.match(await page.locator('.balance-picker-launch').innerText(),/۲ حساب/);
    await page.locator('[data-balance-open]').click();
    assert.equal(await page.locator('#mwSelectAll').isChecked(),true);
    await page.locator('#mwSelectAll').uncheck();
    await page.locator('[data-mw-done]').click();
    assert.match(await page.locator('#mainWorkpaperModule').innerText(),/هنوز حسابی انتخاب نشده/);
    assert.deepEqual(errors,[]);await context.close();
  } finally { await browser.close(); }
});

test("summary arithmetic is signed partial ledger data and invalid entries propagate", { skip: !executablePath && "Set CHROMIUM_PATH" }, async () => {
  const browser = await chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const {page,context,errors}=await setup(browser);
    await page.evaluate(()=>{
      ACCOUNT_ROWS=[
        ['1','درآمد','0','1000'],['2','بهای تمام شده','400','0'],['3','هزینه اداری','100','0'],['4','سود جامع','0','30'],['5','نامعتبر','bad','0'],['6','دارایی','200','0']
      ].map(([code,title,debit,credit])=>({'کد حساب کل':code,'عنوان حساب کل':title,'کد حساب معین':code,'عنوان حساب معین':title,'بدهکار':debit,'بستانکار':credit}));
      gotoModule('mainWorkpaper');
    });
    await page.locator('[data-balance-open]').click();await page.locator('#mwSelectAll').check();await page.locator('[data-mw-done]').click();
    const map=async (code,dest)=>{await page.locator(`[data-mw-view="accounts"][data-mw-active="${code}"]`).click();await page.locator('[data-mw-link]').selectOption(dest);};
    await map('1','A-72|0|0');await map('2','A-72|0|1');await map('3','A-72|0|2');await map('4','A-73|0|0');await map('6','A-70|1|5');
    await page.locator('[data-mw-view="A-72"]').click();
    const amount=async label=>page.locator('.mw-paper-table tbody tr').filter({hasText:label}).first().getAttribute('data-mw-amount');
    assert.equal(await amount('جمع مانده دفتر سود / زیان ناخالص'),'600');
    assert.equal(await amount('جمع مانده دفتر سود / زیان عملیاتی'),'500');
    assert.equal(await page.locator('#mwPreview .mw-summary-note, #mwPreview .mw-balance-print').count(),0);
    assert.equal(await page.locator('#mwPrint').isEnabled(),true);
    await page.locator('[data-mw-view="A-73"]').click();
    assert.equal(await amount('جمع مانده دفتر سود و زیان'),'500');
    assert.equal(await amount('جمع مانده دفتر سود و زیان جامع'),'530');
    assert.equal(await page.locator('#mwPrint').isEnabled(),true);
    const count=await page.locator('#mwPreview .mw-paper').count();
    await page.evaluate(()=>{window.print=()=>{};});await page.locator('#mwPrint').click();
    await page.emulateMedia({media:'print'});
    const pdf=await page.pdf({format:'A4',landscape:true,printBackground:true});
    assert.equal((await require('pdf-lib').PDFDocument.load(pdf)).getPageCount(),count);
    await page.emulateMedia({media:'screen'});await page.evaluate(()=>window.__activePrintRestore?.());
    await page.locator('[data-mw-view="A-70"]').click();
    assert.equal(await amount('جمع دارایی‌های جاری'),'200');
    assert.equal(await amount('جمع کل'),'200');
    assert.equal(await page.locator('#mwPrint').isEnabled(),true);
    await map('5','A-70|1|5');await page.locator('[data-mw-view="A-70"]').click();
    assert.equal(await amount('موجودی نقد'),'');assert.equal(await amount('جمع دارایی‌های جاری'),'');assert.equal(await amount('جمع کل'),'');
    assert.deepEqual(errors,[]);await context.close();
  } finally { await browser.close(); }
});

test("A-family controls match the template without changing GL controls", { skip: !executablePath && "Set CHROMIUM_PATH" }, async () => {
  const browser = await chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const {page,context,errors}=await setup(browser);
    await page.locator('[data-balance-open]').click();
    await page.locator('[data-mw-account="01"]').check();
    await page.locator('[data-mw-done]').click();
    const controls=()=>page.locator('#mwPreview .mw-paper').first().locator('.mw-control-items > div');
    const expectedGL=['کنترل جمع عمودی','کنترل جمع (محاسبات) افقی','کنترل مطابقت با تراز آزمایشی سال جاری','کنترل مطابقت با اقلام سال جاری کاربرگ نهایی','کنترل مطابقت با اقلام مقایسه‌ای کاربرگ نهایی'];
    for(let i=0;i<5;i++) assert.equal((await controls().nth(i).innerText()).replace('□','').trim(),expectedGL[i]);
    await page.locator('[data-mw-link]').first().selectOption('A-72|0|0');
    for(let i=0;i<5;i++) assert.equal((await controls().nth(i).innerText()).replace('□','').trim(),expectedGL[i]);
    const expected=['کنترل مطابقت با کاربرگ‌های مربوطه','کنترل جمع عمودی','کنترل جمع (محاسبات) افقی','کنترل مطابقت با اقلام صورت‌های مالی سال جاری','کنترل مطابقت با اقلام صورت‌های مالی سال مقایسه‌ای'];
    for(const id of ['A-70','A-71','A-72','A-73']) {
      await page.locator(`[data-mw-view="${id}"]`).click();
      for(const p of await page.locator('#mwPreview .mw-paper').all()) {
        const rows=p.locator('.mw-control-items > div');
        assert.equal(await rows.count(),5);
        const titleHeight=await p.locator('.mw-control-title').evaluate(el=>el.getBoundingClientRect().height);assert(titleHeight>=17.5 && titleHeight<=21);
        const top=await rows.evaluateAll(els=>els.map(el=>Math.round(el.getBoundingClientRect().top)));
        assert.equal(new Set(top).size,2);
        assert.equal(top[0],top[2]);assert.equal(top[2],top[4]);assert.equal(top[1],top[3]);
        assert(await p.evaluate(el => parseFloat(getComputedStyle(el.querySelector(".mw-control-items")).fontSize) >= parseFloat(getComputedStyle(el.querySelector(".mw-paper-table td")).fontSize)));
        for(let i=0;i<5;i++) { assert.equal((await rows.nth(i).innerText()).replace('□','').trim(),expected[i]);assert.equal((await rows.nth(i).locator('span').innerText()).trim(),'□'); }
      }
      assert.equal(await page.locator('#mwPrint').isEnabled(),true);
    }
    assert.deepEqual(errors,[]);await context.close();
  } finally { await browser.close(); }
});

test("A-70 current and noncurrent asset headings fit on one real PDF page", { skip: !executablePath && "Set CHROMIUM_PATH" }, async () => {
  const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
  try {
    const {page,context,errors}=await setup(browser);
    await page.locator('[data-balance-open]').click();
    await page.locator('[data-mw-account="01"]').check();
    await page.locator('[data-mw-done]').click();
    await page.locator('[data-mw-link]').first().selectOption('A-70|0|0');
    await page.locator('[data-mw-link]').nth(1).selectOption('A-70|1|5');
    await page.locator('[data-mw-view="A-70"]').click();
    const pages=page.locator('#mwPreview .mw-paper');
    assert.equal(await pages.count(),1);
    assert.equal(await pages.locator('tbody tr').count(),19);
    const boxes=await pages.locator('.mw-control-items > div').evaluateAll(els=>els.map(e=>({top:Math.round(e.getBoundingClientRect().top),bottom:e.getBoundingClientRect().bottom,height:e.getBoundingClientRect().height,scroll:e.scrollHeight})));
    assert.equal(new Set(boxes.map(b=>b.top)).size,2);
    assert(boxes.every(b=>b.scroll<=b.height+1));
    assert((await pages.locator('tbody tr:not(.mw-group):not(.mw-total)').first().evaluate(el=>el.getBoundingClientRect().height)) >= 21.5);
    assert.match(await pages.innerText(),/دارایی‌های غیرجاری/);
    assert.match(await pages.innerText(),/دارایی‌های جاری/);
    assert.match(await pages.innerText(),/جمع کل/);
    assert.equal(await page.locator('#mwPrint').isEnabled(),true);
    await page.evaluate(()=>{window.print=()=>{};});await page.locator('#mwPrint').click();
    await page.emulateMedia({media:'print'});
    const pdf=await page.pdf({format:'A4',landscape:true,printBackground:true});
    assert.equal((await require('pdf-lib').PDFDocument.load(pdf)).getPageCount(),1);
    fs.writeFileSync('.arena/main-a70-single-page.pdf',pdf);
    assert.deepEqual(errors,[]);await context.close();
  } finally {await browser.close();}
});

test("all A-family sheets use the A-70 layout and produce complete PDFs", {skip: !executablePath && 'Set CHROMIUM_PATH'}, async()=>{
  const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
  try {
    const {page,context,errors}=await setup(browser);
    await page.locator('[data-balance-open]').click();await page.locator('[data-mw-account="01"]').check();await page.locator('[data-mw-done]').click();
    for(const [id,terms] of [['A-70',['دارایی‌های غیرجاری','دارایی‌های جاری']],['A-71',['حقوق مالکانه','بدهی‌های غیرجاری','بدهی‌های جاری']],['A-72',['عملیات در حال تداوم','سود / زیان خالص']],['A-73',['سود و زیان جامع','جمع مانده دفتر']]]){
      await page.locator(`[data-mw-view="${id}"]`).click();
      const pages=page.locator('#mwPreview .mw-paper');
      const count=await pages.count();assert(count>=1);
      const table=pages.first().locator('.mw-paper-table');assert.equal(await table.locator('col').count(),13);
      assert.equal((await table.locator('thead th').first().innerText()).trim(),'شرح');
      for(const term of terms)assert.match((await pages.allInnerTexts()).join(" "),new RegExp(term));
      assert.equal(await pages.locator('.mw-summary-note, .mw-balance-print').count(),0);
      assert(await pages.locator('.mw-reference').evaluateAll(cells=>cells.every(c=>c.textContent.trim()==='')));
      assert(await pages.locator('.mw-total .mw-description').evaluateAll(cells=>cells.every(c=>!/[()（）]/.test(c.textContent))));
      assert.doesNotMatch((await pages.allInnerTexts()).join(' '),/GL-\d+/);
      assert.doesNotMatch((await pages.allInnerTexts()).join(' '),/برای A-73 و اسناد اختتامیه بررسی لازم است|پیش‌نمایش مانده‌های تخصیص‌یافته/);
      assert.equal(await page.locator('#mwPrint').isEnabled(),true);
      await page.evaluate(()=>{window.print=()=>{};});await page.locator('#mwPrint').click();
      await page.emulateMedia({media:'print'});const pdf=await page.pdf({format:'A4',landscape:true,printBackground:true});
      assert.equal((await require('pdf-lib').PDFDocument.load(pdf)).getPageCount(),count,id);
      fs.writeFileSync(`.arena/${id}-single-page.pdf`,pdf);
      await page.emulateMedia({media:'screen'});await page.evaluate(()=>window.__activePrintRestore?.());
    }
    assert.deepEqual(errors,[]);await context.close();
  } finally {await browser.close();}
});

test('model titles, automatic mapping, review, debit-credit signs and honest balance control', {skip:!executablePath&&'Set CHROMIUM_PATH'}, async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try {
  const {page,context,errors}=await setup(browser);
  await page.evaluate(()=>{
   ACCOUNT_ROWS=[
    ['1','موجودی نقد و بانک','950','0'], ['2','تسهیلات مالی','0','400'],
    ['3','سرمایه','0','300'], ['4','فروش','0','400'], ['5','بهای تمام شده فروش','100','0'], ['6','سهام خزانه','50','0']
   ].map(([code,title,debit,credit])=>({'کد حساب کل':code,'عنوان حساب کل':title,'کد حساب معین':code,'عنوان حساب معین':title,'بدهکار':debit,'بستانکار':credit}));
   gotoModule('mainWorkpaper');
  });
  await page.locator('[data-balance-open]').click();await page.locator('#mwSelectAll').check();await page.locator('[data-mw-done]').click();
  assert.equal(await page.locator('[data-mw-link]').first().inputValue(),'A-70|1|5');
  assert.match(await page.locator('.mw-match-origin').first().innerText(),/تطبیق خودکار/);
  assert.equal((await page.locator('[data-mw-ledger]').innerText()).trim(),'۰');
  assert.equal((await page.locator('[data-mw-equation]').innerText()).trim(),'۳۰۰');
  assert.equal((await page.locator('[data-mw-profit-equation]').innerText()).trim(),'۰');
  await page.locator('[data-mw-view="A-70"]').click();
  assert.equal(await page.locator('.mw-paper-table tbody tr').filter({hasText:'موجودی نقد'}).getAttribute('data-mw-amount'),'950');
  await page.locator('[data-mw-view="A-71"]').click();
  assert.equal(await page.locator('.mw-paper-table tbody tr').filter({hasText:'تسهیلات مالی'}).last().getAttribute('data-mw-amount'),'400');
  assert.equal(await page.locator('.mw-paper-table tbody tr').filter({hasText:'سهام خزانه'}).last().getAttribute('data-mw-amount'),'-50');
  assert.equal(await page.locator('#mwPreview .mw-summary-note, #mwPreview .mw-balance-print').count(),0);
  assert.equal((await page.locator('[data-mw-ledger]').innerText()).trim(),'۰');
  assert.equal((await page.locator('[data-mw-profit-equation]').innerText()).trim(),'۰');
  await page.locator('[data-mw-view="A-72"]').click();
  assert.equal(await page.locator('.mw-paper-table tbody tr').filter({hasText:'درآمدهای عملیاتی'}).first().getAttribute('data-mw-amount'),'400');
  assert.equal(await page.locator('.mw-paper-table tbody tr').filter({hasText:'بهای تمام‌شده درآمدهای عملیاتی'}).first().getAttribute('data-mw-amount'),'-100');
  await page.locator('[data-mw-view="accounts"][data-mw-active="1"]').click();
  assert.match(await page.locator('h2').filter({hasText:'موجودی نقد و بانک'}).first().innerText(),/موجودی نقد و بانک/);
  await page.locator('[data-mw-link]').selectOption('');
  assert.equal(await page.locator('[data-mw-link]').inputValue(),'');
  assert.match(await page.locator('.mw-balance-control').innerText(),/ناقص/);
  assert.equal((await page.locator('[data-mw-equation]').innerText()).trim(),'نامشخص');
  assert.deepEqual(errors,[]);await context.close();
 } finally {await browser.close();}
});

test('ambiguous and unknown titles remain unassigned; missing and invalid data cannot certify balance', {skip:!executablePath&&'Set CHROMIUM_PATH'}, async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try {
  const {page,context,errors}=await setup(browser);
  await page.evaluate(()=>{
   ACCOUNT_ROWS=[
    {'کد حساب کل':'1','عنوان حساب کل':'دریافتنی و پرداختنی','کد حساب معین':'1','عنوان حساب معین':'دریافتنی و پرداختنی','بدهکار':'100','بستانکار':''},
    {'کد حساب کل':'2','عنوان حساب کل':'حساب خاص نامشخص','کد حساب معین':'1','عنوان حساب معین':'حساب خاص نامشخص','بدهکار':'100','بستانکار':''},
    {'کد حساب کل':'3','عنوان حساب کل':'سرمایه','کد حساب معین':'1','عنوان حساب معین':'سرمایه','بدهکار':'خطا','بستانکار':''}
   ];gotoModule('mainWorkpaper');
  });
  await page.locator('[data-balance-open]').click();await page.locator('#mwSelectAll').check();await page.locator('[data-mw-done]').click();
  assert.equal(await page.locator('[data-mw-link]').inputValue(),'');
  assert.match(await page.locator('.mw-balance-control').innerText(),/ناقص/);
  assert.equal((await page.locator('[data-mw-ledger]').innerText()).trim(),'نامشخص');
  await page.locator('[data-mw-view="accounts"][data-mw-active="2"]').click();assert.equal(await page.locator('[data-mw-link]').inputValue(),'');
  assert.deepEqual(errors,[]);await context.close();
 } finally {await browser.close();}
});

test('broader semantic matches, maturity assumptions and conflicting names are reviewable', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try {
  const {page,context,errors}=await setup(browser);
  const names=['بستانکاران تجاری','حسابهای پرداختنی و سایر بستانکاران','بستانکاران بلند مدت','بدهکاران تجاری','حساب های دریافتنی بلندمدت','حساب جاری بانک ملت','هزینه های اداری و عمومی','بهای تمام شده فروش کالا','مالیات پرداختنی','فروش دارایی ثابت','دریافتنی و پرداختنی','سپرده بیمه پیمانکاران','تسهیلات دریافتی بلند مدت','استهلاک انباشته دارایی ثابت','بدهی مالیات انتقالی شرکت','دارایی مالیات انتقالی شرکت','هزینه استهلاک دارایی ثابت','دارایی غیرجاری نگهداری شده برای فروش شرکت','پیش پرداخت مالیات عملکرد','سود تسهیلات پرداختنی','فروش خدمات پشتیبانی','دائنین تجاری'];
  await page.evaluate(names=>{ACCOUNT_ROWS=names.map((name,i)=>({'کد حساب کل':String(i+1),'عنوان حساب کل':name,'کد حساب معین':'1','عنوان حساب معین':name,'بدهکار':'100','بستانکار':''}));gotoModule('mainWorkpaper');},names);
  await page.locator('[data-balance-open]').click();await page.locator('#mwSelectAll').check();await page.locator('[data-mw-done]').click();
  await page.locator('#mwMatching summary').click();
  const row=name=>page.locator('.mw-map-item').filter({has:page.locator('b').filter({hasText:name})}).first();
  const dest=async name=>row(name).locator('select').inputValue();
  assert.equal(await dest('بستانکاران تجاری'),'A-71|2|0');
  assert.match(await row('بستانکاران تجاری').innerText(),/فرض جاری/);
  assert.equal(await dest('حسابهای پرداختنی و سایر بستانکاران'),'A-71|2|0');
  assert.equal(await dest('بستانکاران بلند مدت'),'A-71|1|0');
  assert.equal(await dest('بدهکاران تجاری'),'A-70|1|3');
  assert.equal(await dest('حساب های دریافتنی بلندمدت'),'A-70|0|4');
  assert.equal(await dest('حساب جاری بانک ملت'),'A-70|1|5');
  assert.equal(await dest('هزینه های اداری و عمومی'),'A-72|0|2');
  assert.equal(await dest('بهای تمام شده فروش کالا'),'A-72|0|1');
  assert.equal(await dest('مالیات پرداختنی'),'A-71|2|1');
  assert.equal(await dest('فروش دارایی ثابت'),'');
  assert.equal(await dest('دریافتنی و پرداختنی'),'');
  assert.equal(await dest('سپرده بیمه پیمانکاران'),'');
  assert.equal(await dest('تسهیلات دریافتی بلند مدت'),'A-71|1|1');
  assert.equal(await dest('استهلاک انباشته دارایی ثابت'),'A-70|0|0');
  assert.equal(await dest('بدهی مالیات انتقالی شرکت'),'A-71|1|2');
  assert.equal(await dest('دارایی مالیات انتقالی شرکت'),'A-70|0|5');
  assert.equal(await dest('هزینه استهلاک دارایی ثابت'),'');
  assert.equal(await dest('دارایی غیرجاری نگهداری شده برای فروش شرکت'),'A-70|1|6');
  assert.equal(await dest('پیش پرداخت مالیات عملکرد'),'A-70|1|0');
  assert.equal(await dest('سود تسهیلات پرداختنی'),'A-71|2|0');
  assert.equal(await dest('فروش خدمات پشتیبانی'),'A-72|0|0');
  assert.equal(await dest('دائنین تجاری'),'A-71|2|0');
  assert.deepEqual(errors,[]);await context.close();
 } finally {await browser.close();}
});

test('central mobile mapping editor searches, changes, clears and aggregates multiple accounts', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try {
  const {page,context,errors}=await setup(browser);
  await page.evaluate(()=>{ACCOUNT_ROWS=[['1','بستانکاران تجاری','0','100'],['2','حسابهای پرداختنی','0','200'],['3','حساب ناشناخته','50','0']].map(([code,name,debit,credit])=>({'کد حساب کل':code,'عنوان حساب کل':name,'کد حساب معین':'1','عنوان حساب معین':name,'بدهکار':debit,'بستانکار':credit}));gotoModule('mainWorkpaper');});
  await page.locator('[data-balance-open]').click();await page.locator('#mwSelectAll').check();await page.locator('[data-mw-done]').click();
  await page.locator('#mwMatching summary').click();
  await page.locator('.mw-map-item').first().waitFor();
  assert.equal(await page.locator('.mw-map-item').count(),3);
  await page.locator('#mwMapStatus').selectOption('missing');assert.equal(await page.locator('.mw-map-item').count(),1);
  await page.locator('#mwMapSearch').fill('ناشناخته');
  await page.locator('.mw-map-item select').selectOption('A-71|2|0');
  assert.equal(await page.locator('#mwMatching').evaluate(el=>el.open),true);
  assert.equal(await page.locator('.mw-map-item').count(),0);
  await page.locator('#mwMapStatus').selectOption('manual');assert.equal(await page.locator('.mw-map-item').count(),1);
  assert.match(await page.locator('.mw-map-item').innerText(),/انتخاب دستی/);
  await page.locator('#mwMapSearch').fill('');await page.locator('#mwMapStatus').selectOption('all');
  await page.locator('[data-mw-view="A-71"]').click();
  assert.equal(await page.locator('.mw-paper-table tbody tr').filter({hasText:'پرداختنی‌های تجاری و سایر پرداختنی‌ها'}).last().getAttribute('data-mw-amount'),'250');
  await page.locator('#mwMapSearch').fill('بستانکاران');
  await page.locator('.mw-map-item [data-mw-map-approve]').click();
  assert.match(await page.locator('.mw-map-item .mw-match-origin').innerText(),/تأییدشده/);
  await page.locator('.mw-map-item select').selectOption('');
  assert.equal(await page.locator('.mw-map-item select').inputValue(),'');
  await page.locator('[data-mw-view="A-70"]').click();
  assert.equal(await page.locator('.mw-map-item select').inputValue(),'');
  await page.screenshot({path:'.arena/main-matching-mobile.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true);
  assert.deepEqual(errors,[]);await context.close();
 } finally {await browser.close();}
});

test('parent and child context preserve maturity and reject conflicts', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try {
  const {page,context,errors}=await setup(browser);
  await page.evaluate(()=>{ACCOUNT_ROWS=[
   ['1','بستانکاران','بستانکاران بلند مدت'],['2','دریافتنی بلندمدت','دریافتنی تجاری'],
   ['3','فروش دارایی ثابت','فروش'],['4','موجودی نقد','دریافتنی تجاری'],['5','پرداختنی جاری و بلند مدت','پرداختنی جاری و بلند مدت'],['6','تسهیلات مالی','تسهیلات مالی بلندمدت']
  ].map(([code,parent,child])=>({'کد حساب کل':code,'عنوان حساب کل':parent,'کد حساب معین':'1','عنوان حساب معین':child,'بدهکار':'1','بستانکار':''}));gotoModule('mainWorkpaper');});
  await page.locator('[data-balance-open]').click();await page.locator('#mwSelectAll').check();await page.locator('[data-mw-done]').click();await page.locator('#mwMatching summary').click();await page.locator('.mw-map-item').first().waitFor();
  const select=code=>page.locator('.mw-map-item').filter({has:page.locator('b').filter({hasText:`کل ${'۰۱۲۳۴۵۶۷۸۹'[Number(code)]} —`})}).locator('select');
  assert.equal(await select('1').inputValue(),'A-71|1|0');assert.equal(await select('2').inputValue(),'A-70|0|4');
  assert.equal(await select('3').inputValue(),'');assert.equal(await select('4').inputValue(),'');assert.equal(await select('5').inputValue(),'');assert.equal(await select('6').inputValue(),'A-71|1|1');
  assert.deepEqual(errors,[]);await context.close();
 } finally {await browser.close();}
});

test('mapping editor paginates many accounts and retains search when a mapping changes', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try {
  const {page,context,errors}=await setup(browser);
  await page.evaluate(()=>{ACCOUNT_ROWS=Array.from({length:85},(_,i)=>({'کد حساب کل':String(i+1),'عنوان حساب کل':'حساب ویژه '+String(i+1),'کد حساب معین':'1','عنوان حساب معین':'مورد ناشناخته '+String(i+1),'بدهکار':'1','بستانکار':''}));gotoModule('mainWorkpaper');});
  await page.locator('[data-balance-open]').click();await page.locator('#mwSelectAll').check();await page.locator('[data-mw-done]').click();await page.locator('#mwMatching summary').click();await page.locator('.mw-map-item').first().waitFor();
  assert.equal(await page.locator('.mw-map-item').count(),40);
  await page.locator('[data-mw-map-next]').click();assert.equal(await page.locator('.mw-map-item').count(),40);
  await page.locator('[data-mw-map-next]').click();assert.equal(await page.locator('.mw-map-item').count(),5);
  await page.locator('#mwMapSearch').fill('ویژه 85');assert.equal(await page.locator('.mw-map-item').count(),1);
  await page.locator('.mw-map-item select').selectOption('A-71|2|0');
  assert.equal(await page.locator('#mwMapSearch').inputValue(),'ویژه 85');assert.equal(await page.locator('.mw-map-item select').inputValue(),'A-71|2|0');
  assert.deepEqual(errors,[]);await context.close();
 } finally {await browser.close();}
});

test('A-70 keeps reference cells blank when aggregating accounts and large amounts', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try {
  const {page,context,errors}=await setup(browser);
  await page.evaluate(()=>{
   ACCOUNT_ROWS=[['210','دارایی‌های ثابت مشهود','1157197412444'],['195','پیش پرداخت ها','47619741246'],['170','موجودی کالا','22655501000'],['150','حسابهای دریافتنی','12345678901'],['160','بدهکاران تجاری','2211040800'],['110','موجودی نقد','1726971789']].map(([code,title,amount])=>({'کد حساب کل':code,'عنوان حساب کل':title,'کد حساب معین':'1','عنوان حساب معین':title,'بدهکار':amount,'بستانکار':''}));
   gotoModule('mainWorkpaper');
  });
  await page.locator('[data-balance-open]').click();await page.locator('#mwSelectAll').check();await page.locator('[data-mw-done]').click();await page.locator('[data-mw-view="A-70"]').click();
  await page.evaluate(()=>document.fonts.ready);
  const diagnostic=await page.locator('#mwPreview').evaluate(el=>[...el.querySelectorAll('td,th')].filter(c=>c.scrollWidth>c.clientWidth+1).map(c=>({text:c.textContent,scroll:c.scrollWidth,client:c.clientWidth})));
  assert.equal(await page.locator('#mwPrint').isEnabled(),true,JSON.stringify(diagnostic));
  const row=page.locator('.mw-paper-table tbody tr').filter({hasText:'دریافتنی‌های تجاری و سایر دریافتنی‌ها'}).last();
  assert.equal((await row.locator('.mw-reference').innerText()).trim(),'');
  assert.doesNotMatch(await page.locator('#mwPreview').innerText(),/GL-150|GL-160/);
  assert(await page.locator('#mwPreview .mw-reference').evaluateAll(cells=>cells.every(c=>c.textContent.trim()==='')));
  assert.equal(await row.getAttribute('data-mw-amount'),'14556719701');
  assert.deepEqual(diagnostic,[]);
  const count=await page.locator('#mwPreview .mw-paper').count();
  await page.evaluate(()=>{window.print=()=>{};});await page.locator('#mwPrint').click();await page.emulateMedia({media:'print'});
  const pdf=await page.pdf({format:'A4',landscape:true,printBackground:true});assert.equal((await require('pdf-lib').PDFDocument.load(pdf)).getPageCount(),count);
  fs.writeFileSync('.arena/a70-multiple-ref.pdf',pdf);assert.deepEqual(errors,[]);await context.close();
 } finally {await browser.close();}
});

test('many accounts aggregate without creating references and paginate safely', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try {
  const {page,context,errors}=await setup(browser);
  await page.evaluate(()=>{ACCOUNT_ROWS=Array.from({length:18},(_,i)=>({'کد حساب کل':String(100+i),'عنوان حساب کل':'بدهکاران تجاری '+String(i),'کد حساب معین':'1','عنوان حساب معین':'بدهکاران تجاری '+String(i),'بدهکار':'100','بستانکار':''}));gotoModule('mainWorkpaper');});
  await page.locator('[data-balance-open]').click();await page.locator('#mwSelectAll').check();await page.locator('[data-mw-done]').click();await page.locator('[data-mw-view="A-70"]').click();
  const row=page.locator('.mw-paper-table tbody tr').filter({hasText:'دریافتنی‌های تجاری و سایر دریافتنی‌ها'}).last();
  assert.equal(await row.getAttribute('data-mw-amount'),'1800');assert.equal((await row.locator('.mw-reference').innerText()).trim(),'');
  assert.equal(await page.locator('#mwPreview .mw-ref-token').count(),0);
  const pages=page.locator('#mwPreview .mw-paper');const count=await pages.count();
  for(const p of await pages.all())assert(await p.evaluate(el=>{const c=el.querySelector('.mw-card');return c.scrollHeight<=c.clientHeight+1&&[...el.querySelectorAll('td,th')].every(x=>x.scrollWidth<=x.clientWidth+1);}));
  assert.equal(await page.locator('#mwPrint').isEnabled(),true);
  await page.evaluate(()=>{window.print=()=>{};});await page.locator('#mwPrint').click();await page.emulateMedia({media:'print'});
  const pdf=await page.pdf({format:'A4',landscape:true,printBackground:true});assert.equal((await require('pdf-lib').PDFDocument.load(pdf)).getPageCount(),count);
  assert.deepEqual(errors,[]);await context.close();
 } finally {await browser.close();}
});
