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
  "automatic main workpapers, current balances, explicit mapping and inert classification on mobile",
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
      assert.equal(await h.locator('[data-balance-open], #mwDialog').count(),0);
      assert.equal(await h.locator('.mw-nav [data-mw-view="accounts"]').count(),2);
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
      await h.locator('[data-mw-view="accounts"][data-mw-active="01"]').click();
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
  "invalid amounts do not silently become zero and a new source opens its own workpapers",
  { skip: !executablePath && "Set CHROMIUM_PATH" },
  async () => {
    const browser = await chromium.launch({
      executablePath,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    try {
      const { page, context, errors } = await setup(browser);
      const h = page.locator("#mainWorkpaperModule");
      await h.locator('[data-mw-view="accounts"][data-mw-active="02"]').click();
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
      assert.match(await h.locator('#mwPreview').innerText(), /جدید/);
      assert.equal(await h.locator('.mw-nav [data-mw-view="accounts"]').count(),1);
      assert.equal(await h.locator('[data-mw-active="77"]').count(),1);
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
        "\ufeffشماره سند,تاریخ,شرح سند,شرح ردیف,بدهکار,بستانکار,کد حساب کل,عنوان حساب کل,کد حساب معین,عنوان حساب معین,کد حساب تفصیلی,عنوان حساب تفصیلی\n1,1404/01/01,مانده ابتدای سال,افتتاحیه,100,,100,بانک,1001,بانک الف,1,شخص الف\n2,1404/02/01,سند جاری,گردش,40,10,100,بانک,1001,بانک الف,1,شخص الف\n3,1404/02/01,سند جاری,گردش,25,,200,هزینه اداری,2001,هزینه,1,شخص ب\n";
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
      assert.match(await page.locator("#mwPreview").innerText(), /۱۳۰/);
      assert.equal(await page.locator('.mw-nav [data-mw-view="accounts"]').count(),2);
      await page.locator('[data-mw-active="200"]').click();
      assert.match(await page.locator("#mwPreview").innerText(), /۲۵/);
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

test("all accounts appear automatically in a single horizontal mobile strip beneath the preview", {skip:!executablePath && 'Set CHROMIUM_PATH'}, async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const {page,context,errors}=await setup(browser);
  await page.evaluate(()=>{ACCOUNT_ROWS=Array.from({length:65},(_,i)=>({'کد حساب کل':String(i+1),'عنوان حساب کل':i===64?'آخرین حساب':'حساب هم‌نام','کد حساب معین':'1','عنوان حساب معین':'معین','بدهکار':String(i+1),'بستانکار':''}));gotoModule('mainWorkpaper');});
  const nav=page.locator('#mainWorkpaperModule .mw-nav'),preview=page.locator('#mwPreview');
  assert.equal(await page.locator('#mwDialog, #mwSelectAll, #mainWorkpaperModule [data-balance-open]').count(),0);
  assert.equal(await nav.locator('[data-mw-view="accounts"]').count(),65);assert.equal(await nav.locator('[data-mw-view^="A-"]').count(),4);
  assert(await nav.evaluate(el=>el.scrollWidth>el.clientWidth&&getComputedStyle(el).flexWrap==='nowrap'));
  assert(await page.evaluate(()=>document.querySelector('#mwPreview').compareDocumentPosition(document.querySelector('.mw-nav'))&Node.DOCUMENT_POSITION_FOLLOWING));
  assert.match(await preview.innerText(),/حساب هم‌نام/);assert.match(await preview.innerText(),/۱/);
  const left=page.locator('[data-mw-scroll="left"]'),right=page.locator('[data-mw-scroll="right"]');
  assert(await left.isEnabled());assert(await right.isDisabled());
  assert((await left.boundingBox()).x < (await nav.boundingBox()).x);
  assert((await right.boundingBox()).x > (await nav.boundingBox()).x);
  await left.click();await page.waitForFunction(()=>document.querySelector('.mw-nav').scrollLeft < -20);
  await page.waitForFunction(()=>!document.querySelector('[data-mw-scroll="right"]').disabled);
  await right.click();await page.waitForFunction(()=>document.querySelector('.mw-nav').scrollLeft >= -1);
  await nav.locator('[data-mw-active="65"]').click();
  assert.match(await preview.innerText(),/آخرین حساب/);assert.match(await preview.innerText(),/۶۵/);
  assert.equal(await page.locator('.mw-nav [aria-current="page"]').getAttribute('data-mw-active'),'65');
  assert(await nav.evaluate(el=>Math.abs(el.scrollLeft)>0));
  await nav.locator('[data-mw-active="64"]').scrollIntoViewIfNeeded();
  const before=await nav.evaluate(el=>({left:el.scrollLeft,top:el.getBoundingClientRect().top}));
  await nav.locator('[data-mw-active="64"]').click();
  const after=await nav.evaluate(el=>({left:el.scrollLeft,top:el.getBoundingClientRect().top}));
  assert(Math.abs(after.left-before.left)<3,'horizontal position remains after changing workpaper');
  assert(Math.abs(after.top-before.top)<3,'navigation remains in view after changing workpaper');
  assert.match(await preview.innerText(),/۶۴/);
  await page.locator('.mw-nav-wrap').screenshot({path:'.arena/main-nav-mobile.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  await page.locator('[data-mw-view="A-70"]').click();assert.match(await preview.innerText(),/دارایی‌های جاری/);
  await page.locator('[data-mw-active="65"]').click();assert.match(await preview.innerText(),/آخرین حساب/);
  assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
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

test("A-family and GL retain the correct control texts with adaptive layout", { skip: !executablePath && "Set CHROMIUM_PATH" }, async () => {
  const browser = await chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const {page,context,errors}=await setup(browser);
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
        const compact=await p.evaluate(el=>el.classList.contains('mw-controls-compact'));
        assert.equal(new Set(top).size,compact?2:5);
        if(compact){assert.equal(top[0],top[2]);assert.equal(top[2],top[4]);assert.equal(top[1],top[3]);}
        else assert(top.every((x,i)=>i===0||x>top[i-1]));
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
    await page.locator('[data-mw-link]').first().selectOption('A-70|0|0');
    await page.locator('[data-mw-link]').nth(1).selectOption('A-70|1|5');
    await page.locator('[data-mw-view="A-70"]').click();
    const pages=page.locator('#mwPreview .mw-paper');
    assert.equal(await pages.count(),1);
    assert.equal(await pages.locator('tbody tr').count(),21);
    const boxes=await pages.locator('.mw-control-items > div').evaluateAll(els=>els.map(e=>({top:Math.round(e.getBoundingClientRect().top),bottom:e.getBoundingClientRect().bottom,height:e.getBoundingClientRect().height,scroll:e.scrollHeight})));
    assert.equal(new Set(boxes.map(b=>b.top)).size,2);
    assert(boxes.every(b=>b.scroll<=b.height+1));
    assert((await pages.locator('tbody tr:not(.mw-group):not(.mw-total)').first().evaluate(el=>el.getBoundingClientRect().height)) >= 23);
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
    for(const [id,terms] of [['A-70',['دارایی‌های غیرجاری','دارایی‌های جاری']],['A-71',['حقوق مالکانه','بدهی‌های غیرجاری','بدهی‌های جاری']],['A-72',['عملیات در حال تداوم','سود / زیان خالص']],['A-73',['سود و زیان جامع','جمع مانده دفتر']]]){
      await page.locator(`[data-mw-view="${id}"]`).click();
      const pages=page.locator('#mwPreview .mw-paper');
      const count=await pages.count();assert(count>=1);
      const table=pages.first().locator('.mw-paper-table');assert.equal(await table.locator('col').count(),13);
      assert(await pages.locator('tbody tr').evaluateAll(rows=>rows.every(row=>row.getBoundingClientRect().height>=23)),`${id} rows should be at least 6.2 mm`);
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

test('model titles, automatic mapping, review and debit-credit signs', {skip:!executablePath&&'Set CHROMIUM_PATH'}, async()=>{
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
  assert.equal(await page.locator('[data-mw-link]').first().inputValue(),'A-70|1|5');
  assert.match(await page.locator('.mw-match-origin').first().innerText(),/تطبیق خودکار/);
  await page.locator('[data-mw-view="A-70"]').click();
  assert.equal(await page.locator('.mw-paper-table tbody tr').filter({hasText:'موجودی نقد'}).getAttribute('data-mw-amount'),'950');
  await page.locator('[data-mw-view="A-71"]').click();
  assert.equal(await page.locator('.mw-paper-table tbody tr').filter({hasText:'تسهیلات مالی'}).last().getAttribute('data-mw-amount'),'400');
  assert.equal(await page.locator('.mw-paper-table tbody tr').filter({hasText:'سهام خزانه'}).last().getAttribute('data-mw-amount'),'-50');
  assert.equal(await page.locator('#mwPreview .mw-summary-note, #mwPreview .mw-balance-print').count(),0);
  await page.locator('[data-mw-view="A-72"]').click();
  assert.equal(await page.locator('.mw-paper-table tbody tr').filter({hasText:'درآمدهای عملیاتی'}).first().getAttribute('data-mw-amount'),'400');
  assert.equal(await page.locator('.mw-paper-table tbody tr').filter({hasText:'بهای تمام‌شده درآمدهای عملیاتی'}).first().getAttribute('data-mw-amount'),'-100');
  await page.locator('[data-mw-view="accounts"][data-mw-active="1"]').click();
  assert.match(await page.locator('h2').filter({hasText:'موجودی نقد و بانک'}).first().innerText(),/موجودی نقد و بانک/);
  await page.locator('[data-mw-link]').selectOption('');
  assert.equal(await page.locator('[data-mw-link]').inputValue(),'');
  assert.deepEqual(errors,[]);await context.close();
 } finally {await browser.close();}
});

test('ambiguous and unknown titles remain unassigned; invalid data stays visible', {skip:!executablePath&&'Set CHROMIUM_PATH'}, async()=>{
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
  assert.equal(await page.locator('[data-mw-link]').inputValue(),'');
  await page.locator('[data-mw-view="accounts"][data-mw-active="2"]').click();assert.equal(await page.locator('[data-mw-link]').inputValue(),'');
  assert.match(await page.locator('#mainWorkpaperModule > .err').innerText(),/نامعتبر/);await page.locator('[data-mw-view="accounts"][data-mw-active="3"]').click();assert.equal(await page.locator('#mwPreview tbody tr').first().getAttribute('data-mw-amount'),'');
  assert.deepEqual(errors,[]);await context.close();
 } finally {await browser.close();}
});

test('broader semantic matches, maturity assumptions and conflicting names are reviewable', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try {
  const {page,context,errors}=await setup(browser);
  const names=['بستانکاران تجاری','حسابهای پرداختنی و سایر بستانکاران','بستانکاران بلند مدت','بدهکاران تجاری','حساب های دریافتنی بلندمدت','حساب جاری بانک ملت','هزینه های اداری و عمومی','بهای تمام شده فروش کالا','مالیات پرداختنی','فروش دارایی ثابت','دریافتنی و پرداختنی','سپرده بیمه پیمانکاران','تسهیلات دریافتی بلند مدت','استهلاک انباشته دارایی ثابت','بدهی مالیات انتقالی شرکت','دارایی مالیات انتقالی شرکت','هزینه استهلاک دارایی ثابت','دارایی غیرجاری نگهداری شده برای فروش شرکت','پیش پرداخت مالیات عملکرد','سود تسهیلات پرداختنی','فروش خدمات پشتیبانی','دائنین تجاری'];
  await page.evaluate(names=>{ACCOUNT_ROWS=names.map((name,i)=>({'کد حساب کل':String(i+1),'عنوان حساب کل':name,'کد حساب معین':'1','عنوان حساب معین':name,'بدهکار':'100','بستانکار':''}));gotoModule('mainWorkpaper');},names);
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
  ].map(([code,parent,child])=>({'کد حساب کل':code,'عنوان حساب کل':parent,'کد حساب معین':'1','عنوان حساب معین':child,'بدهکار':'1','بستانکار':''}));gotoModule('mainWorkpaper');});await page.locator('#mwMatching summary').click();await page.locator('.mw-map-item').first().waitFor();
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
  await page.evaluate(()=>{ACCOUNT_ROWS=Array.from({length:85},(_,i)=>({'کد حساب کل':String(i+1),'عنوان حساب کل':'حساب ویژه '+String(i+1),'کد حساب معین':'1','عنوان حساب معین':'مورد ناشناخته '+String(i+1),'بدهکار':'1','بستانکار':''}));gotoModule('mainWorkpaper');});await page.locator('#mwMatching summary').click();await page.locator('.mw-map-item').first().waitFor();
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
  });await page.locator('[data-mw-view="A-70"]').click();
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
  await page.evaluate(()=>{ACCOUNT_ROWS=Array.from({length:18},(_,i)=>({'کد حساب کل':String(100+i),'عنوان حساب کل':'بدهکاران تجاری '+String(i),'کد حساب معین':'1','عنوان حساب معین':'بدهکاران تجاری '+String(i),'بدهکار':'100','بستانکار':''}));gotoModule('mainWorkpaper');});await page.locator('[data-mw-view="A-70"]').click();
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

test('topic-first mobile selection, reassignment, deletion and restoration preserve ledger and disclose unassigned accounts', {skip:!executablePath && 'Set CHROMIUM_PATH'}, async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const {page,context,errors}=await setup(browser);
  await page.evaluate(()=>{ACCOUNT_ROWS=[
   ['1','موجودی نقد','11','بانک','100'],['1','موجودی نقد','12','صندوق','50'],
   ['2','حساب ناشناس','21','نام اختصاصی','25'],['3','انتخاب نشده','31','حساب دیگر','5']
  ].map(([k,kt,m,mt,n])=>({'کد حساب کل':k,'عنوان حساب کل':kt,'کد حساب معین':m,'عنوان حساب معین':mt,'بدهکار':n,'بستانکار':''}));gotoModule('mainWorkpaper');});
  await page.locator('[data-mw-view="A-70"]').click();
  const row=label=>page.locator('#mwPreview tbody tr').filter({has:page.locator('.mw-description', {hasText:label})}).first();
  assert.equal(await row('موجودی نقد').getAttribute('data-mw-amount'),'150');
  assert.equal(await page.locator('.mw-number').first().evaluate(el=>getComputedStyle(el).textAlign),'center');
  const previewChoice=page.locator('#mwPreview .mw-paper-table [data-mw-topic-choose="A-70|1|0"]');
  assert.equal(await previewChoice.count(),1);
  assert.equal(await page.locator('.mw-topics').count(),0);
  await page.evaluate(()=>{window.print=()=>{};});await page.locator('#mwPrint').click();
  assert.equal(await page.locator('#printHost .mw-row-actions, #printHost [data-mw-topic-remove], #printHost [data-mw-topic-choose]').count(),0);
  await page.evaluate(()=>window.__activePrintRestore());
  await previewChoice.click();
  const dialog=page.locator('#mwTopicDialog');assert(await dialog.isVisible());
  await dialog.locator('#mwTopicSearch').fill('نام اختصاصی');
  assert.equal(await dialog.locator('[data-topic-account]').count(),1);
  await dialog.locator('[data-topic-account]').check();
  await dialog.locator('#mwTopicSearch').fill('بانک');await dialog.locator('[data-topic-transfer]').click();
  page.once('dialog',d=>d.dismiss());await dialog.locator('[data-topic-save]').click();assert(await dialog.isVisible());
  page.once('dialog',d=>d.accept());await dialog.locator('[data-topic-save]').click();
  assert.equal(await row('پیش‌پرداخت‌ها').getAttribute('data-mw-amount'),'125');
  assert.equal(await row('موجودی نقد').getAttribute('data-mw-amount'),'50');
  await page.locator('[data-mw-topic-choose="A-70|1|0"]').click();
  await dialog.locator('#mwTopicSearch').fill('نام اختصاصی');assert(await dialog.locator('[data-topic-account]').isChecked());
  await dialog.locator('[data-topic-account]').uncheck();await dialog.locator('[data-topic-cancel]').first().click();
  assert.equal(await row('پیش‌پرداخت‌ها').getAttribute('data-mw-amount'),'125');
  page.once('dialog',d=>d.dismiss());await page.locator('[data-mw-topic-remove="A-70|1|0"]').click();
  assert.equal(await row('پیش‌پرداخت‌ها').count(),1);
  page.once('dialog',d=>d.accept());await page.locator('[data-mw-topic-remove="A-70|1|0"]').click();
  assert.equal(await row('پیش‌پرداخت‌ها').count(),0);
  assert.equal(await row('جمع کل').getAttribute('data-mw-amount'),'50');
  await page.locator('#mwMatching summary').click();
  assert.equal(await page.locator('select[data-mw-map-link] option[value="A-70|1|0"]').count(),0);
  await page.locator('#mwPreview .mw-preview-tools summary').click();
  await page.locator('[data-mw-topic-restore="A-70|1|0"]').click();
  assert.equal(await row('پیش‌پرداخت‌ها').getAttribute('data-mw-amount'),'');
  await page.locator('[data-mw-view="accounts"][data-mw-active="1"]').click();
  assert.equal(await row('جمع حساب کل').getAttribute('data-mw-amount'),'150');
  assert.equal(await page.locator('#mwPreview .mw-number').first().evaluate(el=>getComputedStyle(el).textAlign),'center');
  assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('topic picker preserves selections across searches and pages', {skip:!executablePath && 'Set CHROMIUM_PATH'}, async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const {page,context,errors}=await setup(browser);
  await page.evaluate(()=>{ACCOUNT_ROWS=Array.from({length:105},(_,i)=>({'کد حساب کل':'1','عنوان حساب کل':'متفرقه','کد حساب معین':String(i+1),'عنوان حساب معین':'عنوان اختصاصی '+(i+1),'بدهکار':'1','بستانکار':''}));gotoModule('mainWorkpaper');});await page.locator('[data-mw-view="A-70"]').click();
  await page.locator('[data-mw-topic-choose="A-70|1|5"]').click();const d=page.locator('#mwTopicDialog');
  assert.equal(await d.locator('[data-topic-account]').count(),0);await d.locator('[data-topic-expand]').click();
  assert.equal(await d.locator('[data-topic-account]').count(),100);await d.locator('[data-topic-page-all]').check();await d.locator('[data-topic-child-next]').click();
  assert.equal(await d.locator('[data-topic-account]').count(),5);await d.locator('#mwTopicSearch').fill('عنوان اختصاصی 105');
  assert(await d.locator('[data-topic-account]').isChecked());await d.locator('[data-topic-account]').uncheck();await d.locator('[data-topic-save]').click();
  assert.equal(await page.locator('#mwPreview tbody tr').filter({has:page.locator('.mw-description',{hasText:'موجودی نقد'})}).first().getAttribute('data-mw-amount'),'104');
  assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('statement topics follow the reference order and maintain stable destination keys', {skip:!executablePath && 'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const {page,context,errors}=await setup(browser);
  const expected={
   'A-70':[['A-70|0|0','A-70|0|1','A-70|0|2','A-70|0|3','A-70|0|4','A-70|0|7','A-70|0|8','A-70|0|5','A-70|0|6'],['A-70|1|0','A-70|1|2','A-70|1|1','A-70|1|3','A-70|1|4','A-70|1|5','A-70|1|6']],
   'A-71':[[0,1,2,3,4,5,6,7,8].map(i=>`A-71|0|${i}`),[0,1,2,3].map(i=>`A-71|1|${i}`),[0,1,2,3,4,5,6,7].map(i=>`A-71|2|${i}`)],
   'A-72':[[0,1,2,3,4,5,6,7,8,9].map(i=>`A-72|0|${i}`)],
   'A-73':[['A-73|0|0','A-73|0|1'],['A-73|1|0']]
  };
  for(const id of Object.keys(expected)){await page.locator(`[data-mw-view="${id}"]`).click();const keys=await page.locator('#mwPreview [data-mw-topic-choose]').evaluateAll(xs=>xs.map(x=>x.dataset.mwTopicChoose));assert.deepEqual(keys,expected[id].flat());}
  assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('intangible details, current and long-term names and conflicts are matched safely', {skip:!executablePath && 'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const {page,context,errors}=await setup(browser);
  const input=[
   ['دارایی ثابت','دارایی نامشهود','A-70|0|2'],['دارایی های ثابت','دارایی غیرمشهود','A-70|0|2'],
   ['دارایی نامشهود','نرم افزار','A-70|0|2'],['دارایی ثابت','سرقفلی','A-70|0|2'],
   ['دارایی نامشهود','پیش پرداخت سرمایه ای نرم افزار','A-70|0|2'],['دارایی نامشهود','استهلاک انباشته دارایی نامشهود','A-70|0|2'],
   ['دارایی ثابت مشهود','دارایی نامشهود',''],['دارایی نامشهود','هزینه استهلاک دارایی نامشهود',''],
   ['دریافتنی تجاری','مطالبات مشتریان','A-70|1|3'],['حساب های دریافتنی بلندمدت','بدهکاران تجاری','A-70|0|4'],
   ['دارایی های جاری','دریافتنی بلندمدت',''],['دارایی های غیر جاری','دریافتنی کوتاه مدت',''],
   ['بستانکاران تجاری','حساب های پرداختنی','A-71|2|0'],['بدهی های غیر جاری','پرداختنی بلند مدت','A-71|1|0'],
   ['بدهی های جاری','تسهیلات بلند مدت',''],['پرداختنی بلندمدت','پرداختنی جاری',''],
   ['دارایی های غیر جاری','موجودی نقد',''],['بدهی های جاری','دریافتنی تجاری',''],['بدهی های جاری','سرمایه',''],['دارایی های جاری','بستانکاران',''],['درآمد','درآمد فروش','A-72|0|0'],
   ['دارایی نامشهود','فروش نرم افزار',''],['حساب نامشخص','نرم افزار','A-70|0|2'],
   ['هزینه کاهش ارزش مطالبات','هزینه مطالبات مشکوک الوصول','A-72|0|3'],['سایر درآمدهای عملیاتی','فروش ضایعات','A-72|0|4'],['سایر هزینه های غیرعملیاتی','سایر هزینه های غیرعملیاتی','A-72|0|7'],
   ['فروشندگان','فروشندگان','A-71|2|0'],['هزینه های پرداختنی','هزینه مالی پرداختنی','A-71|2|0'],['درآمد خدمات شرکت','درآمد خدمات مشاوره','A-72|0|0'],
   ['استهلاک انباشته ماشین آلات','استهلاک انباشته ماشین آلات','A-70|0|0']
  ];
  await page.evaluate(input=>{ACCOUNT_ROWS=input.map(([parent,child],i)=>({'کد حساب کل':String(i+1),'عنوان حساب کل':parent,'کد حساب معین':'1','عنوان حساب معین':child,'بدهکار':'1','بستانکار':''}));gotoModule('mainWorkpaper');},input);await page.locator('#mwMatching summary').click();
  const values=await page.locator('[data-mw-map-link]').evaluateAll(els=>Object.fromEntries(els.map(el=>[el.dataset.mwMapLink,el.value])));
  for(let i=0;i<input.length;i++){
   const id=JSON.stringify([String(i+1),'1']);
   assert.equal(values[id],input[i][2],`${input[i][0]} / ${input[i][1]}`);
  }
  const conflict=page.locator('.mw-map-item').filter({has:page.locator('b').filter({hasText:'کل ۷ —'})});assert.match(await conflict.innerText(),/متفاوت یا مبهم/);
  assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('statement asset and liability groups follow sample order with separate current and long-term balances', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const {page,context,errors}=await setup(browser);
  await page.evaluate(()=>{ACCOUNT_ROWS=[
   ['1','دریافتنی کوتاه مدت','100',''],['2','دریافتنی بلندمدت','200',''],
   ['3','پرداختنی کوتاه مدت','','300'],['4','پرداختنی بلندمدت','','400']
  ].map(([code,title,debit,credit])=>({'کد حساب کل':code,'عنوان حساب کل':title,'کد حساب معین':code,'عنوان حساب معین':title,'بدهکار':debit,'بستانکار':credit}));gotoModule('mainWorkpaper');});
  await page.locator('[data-mw-view="A-70"]').click();
  const groups=await page.locator('#mwPreview tbody').evaluateAll(bodies=>{const groups=[];let current;for(const body of bodies)for(const row of body.rows){if(row.classList.contains('mw-group')){current={group:row.textContent.trim(),items:[]};groups.push(current);}else if(row.querySelector('.mw-editable-topic'))current.items.push({name:row.querySelector('.mw-editable-topic').childNodes[0].textContent.trim(),amount:row.dataset.mwAmount});}return groups;});
  assert.deepEqual(groups.map(g=>g.group),['دارایی‌های غیرجاری','دارایی‌های جاری']);
  assert.deepEqual(groups[0].items.map(x=>x.name),['دارایی‌های ثابت مشهود','سرمایه‌گذاری در املاک','دارایی‌های نامشهود','سرمایه‌گذاری‌های بلندمدت','دریافتنی‌های تجاری و سایر دریافتنی‌ها','دارایی‌های زیستی مولد','دارایی‌های زیستی غیرمولد','دارایی مالیات انتقالی','سایر دارایی‌ها']);
  assert.deepEqual(groups[1].items.map(x=>x.name),['پیش‌پرداخت‌ها','موجودی مواد و کالا','دارایی‌های حاصل از قرارداد','دریافتنی‌های تجاری و سایر دریافتنی‌ها','سرمایه‌گذاری‌های کوتاه‌مدت','موجودی نقد','دارایی‌های غیرجاری نگهداری‌شده برای فروش']);
  assert.equal(groups[0].items[4].amount,'200');assert.equal(groups[1].items[3].amount,'100');
  await page.locator('[data-mw-view="A-71"]').click();
  const items=await page.locator('#mwPreview [data-mw-topic-choose]').evaluateAll(els=>els.map(el=>({dest:el.dataset.mwTopicChoose,amount:el.closest('tr').dataset.mwAmount})));
  assert.equal(items.find(x=>x.dest==='A-71|1|0').amount,'400');assert.equal(items.find(x=>x.dest==='A-71|2|0').amount,'300');
  assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('all main and A workpapers print bold enlarged headers and centered amounts', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const {page,context,errors}=await setup(browser);
  await page.evaluate(()=>{ACCOUNT_ROWS=[
   ['1','موجودی نقد','001','بانک','1234567',''],['2','تسهیلات مالی','002','تسهیلات','0','800'],['3','فروش','003','فروش','','70'],['4','بهای تمام شده فروش','004','بهای تمام شده فروش','42','']
  ].map(([k,t,m,mt,d,c])=>({'کد حساب کل':k,'عنوان حساب کل':t,'کد حساب معین':m,'عنوان حساب معین':mt,'بدهکار':d,'بستانکار':c}));gotoModule('mainWorkpaper');});
  await page.evaluate(()=>{window.print=()=>{};});
  for(const id of ['accounts','A-70','A-71','A-72','A-73']){
   if(id==='accounts')await page.locator('[data-mw-view="accounts"][data-mw-active="1"]').click();else await page.locator(`[data-mw-view="${id}"]`).click();
   assert(await page.locator('#mwPrint').isEnabled(),id);
   await page.locator('#mwPrint').click();await page.emulateMedia({media:'print'});
   const pages=page.locator('#printHost .mw-paper');
   const styles=await pages.first().evaluate(el=>{
    const meta=el.querySelector('.mw-meta'),sign=el.querySelector('.mw-sign'),heads=[...el.querySelectorAll('thead th')];
    const info=node=>({size:parseFloat(getComputedStyle(node).fontSize),weight:parseInt(getComputedStyle(node).fontWeight)});
    return {meta:info(meta),sign:info(sign),metaChildren:[...meta.querySelectorAll('div,b')].map(info),signChildren:[...sign.querySelectorAll('div,b')].map(info),heads:heads.map(info)};
   });
   assert(styles.meta.size>=15.4&&styles.sign.size>=14.1,id);
   assert([...styles.metaChildren,...styles.signChildren].every(s=>s.weight>=700),id);
   assert(styles.heads.every(s=>s.weight>=700&&s.size>=16),id);
   const distances=await pages.locator('.mw-number-text').evaluateAll(nodes=>nodes.filter(n=>n.textContent.trim()).map(n=>{const cell=n.parentElement.getBoundingClientRect(),text=n.getBoundingClientRect();return Math.abs((cell.left+cell.right-text.left-text.right)/2);}));
   assert(distances.length>0,id);assert(distances.every(d=>d<1.1),`${id}: ${distances}`);
   if(id==='A-72')assert(await pages.locator('.mw-number-text').evaluateAll(ns=>ns.some(n=>n.textContent.includes('('))));
   const centering=id==='A-70'?await pages.locator('.mw-number').filter({hasText:'۱٬۲۳۴٬۵۶۷'}).first().evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right};}):null;
   const ink=await pages.locator('.mw-number-text').evaluateAll(nodes=>nodes.filter(n=>n.textContent.trim()).map(n=>{
    const text=n.textContent,style=getComputedStyle(n),ctx=document.createElement('canvas').getContext('2d');ctx.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;ctx.direction='ltr';
    const m=ctx.measureText(text),marker=document.createElement('span');marker.style.cssText='display:inline-block;width:0;height:0;vertical-align:baseline';n.appendChild(marker);
    const base=marker.getBoundingClientRect().top,cell=n.parentElement.getBoundingClientRect();marker.remove();
    return {text,above:base-m.actualBoundingBoxAscent-cell.top,below:cell.bottom-(base+m.actualBoundingBoxDescent),asc:m.actualBoundingBoxAscent,desc:m.actualBoundingBoxDescent};
   }));assert(ink.length>0,id);for(const m of ink){assert(m.above>=4&&m.below>=4,`${id} ${m.text}: ${JSON.stringify(m)}`);assert(Math.abs(m.above-m.below)<2.5,`${id} ${m.text}: ${JSON.stringify(m)}`);}
   const pageCount=await pages.count();const pdf=await page.pdf({format:'A4',landscape:true,printBackground:true});assert.equal((await require('pdf-lib').PDFDocument.load(pdf)).getPageCount(),pageCount,id);
   if(id==='A-70'){fs.writeFileSync('.arena/main-centered-print.pdf',pdf);fs.writeFileSync('.arena/main-centered-cell.json',JSON.stringify(centering));}
   await page.emulateMedia({media:'screen'});await page.evaluate(()=>window.__activePrintRestore?.());
  }
  assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('keyword matching handles standalone intangible names, accounting context and equity aliases', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const {page,context,errors}=await setup(browser);
  const cases=[
   ['دارایی ثابت','نامشهود','A-70|0|2'],['دارایی های ثابت','نام شهود','A-70|0|2'],['دارایی ثابت','غیر مشهود','A-70|0|2'],
   ['دارائی های ثابت','نامشهود','A-70|0|2'],['نامشهود','نامشهود','A-70|0|2'],
   ['دارایی ثابت مشهود','نامشهود',''],['هزینه های عمومی','نامشهود','A-72|0|2'],['دارایی نامشهود','هزینه نرم افزار',''],
   ['دارایی های جاری','نامشهود',''],['حساب خاص','نرم افزار','A-70|0|2'],['هزینه اداری','نرم افزار','A-72|0|2'],
   ['حساب خاص','نقد','A-70|1|5'],['حساب خاص','سرمایه ثبت شده','A-71|0|0'],
   ['حساب خاص','افزایش سرمایه ثبت نشده','A-71|0|1'],['حساب خاص','صرف سهام خزانه شرکت','A-71|0|3'],
   ['حساب خاص','سهام خزانه شرکت','A-71|0|8'],['حساب خاص','اندوخته احتیاطی','A-71|0|5'],
   ['حساب خاص','بستانکاران بلند مدت','A-71|1|0'],['حساب خاص','دریافتنی کوتاه مدت','A-70|1|3'],
   ['حساب خاص','دریافتنی و پرداختنی',''],['حساب خاص','پیش پرداخت مالیات','A-70|1|0']
  ];
  await page.evaluate(cases=>{ACCOUNT_ROWS=cases.map(([p,c],i)=>({'کد حساب کل':String(i+1),'عنوان حساب کل':p,'کد حساب معین':'1','عنوان حساب معین':c,'بدهکار':'100','بستانکار':''}));gotoModule('mainWorkpaper');},cases);
  await page.locator('#mwMatching summary').click();
  const values=await page.locator('[data-mw-map-link]').evaluateAll(els=>Object.fromEntries(els.map(el=>[el.dataset.mwMapLink,el.value])));
  cases.forEach(([parent,child,expected],i)=>assert.equal(values[JSON.stringify([String(i+1),'1'])],expected,`${parent} / ${child}`));
  await page.locator('[data-mw-view="A-70"]').click();
  assert.equal(await page.locator('#mwPreview tbody tr').filter({has:page.locator('.mw-description',{hasText:'دارایی‌های نامشهود'})}).getAttribute('data-mw-amount'),'600');
  assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('floating trial balance starts at major accounts and reflects partial, previous and cross-topic choices', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const {page,context,errors}=await setup(browser);
  await page.evaluate(()=>{ACCOUNT_ROWS=[
   ['10','موجودی نقد','1','بانک الف','100',''],['10','موجودی نقد','2','نامشخص','20',''],['10','موجودی نقد','','','10',''],
   ['20','حساب های پرداختنی','1','بستانکار تجاری','','75'],['30','حساب ویژه','1','نامعلوم','bad','']
  ].map(([k,kt,m,mt,d,c])=>({'کد حساب کل':k,'عنوان حساب کل':kt,'کد حساب معین':m,'عنوان حساب معین':mt,'بدهکار':d,'بستانکار':c}));gotoModule('mainWorkpaper');});
  await page.locator('[data-mw-view="A-70"]').click();await page.locator('[data-mw-topic-choose="A-70|1|5"]').click();
  const d=page.locator('#mwTopicDialog'),g=d.locator('[data-topic-group="10"]'),other=d.locator('[data-topic-group="20"]');
  assert.equal(await d.locator('[data-topic-group]').count(),3);assert.equal(await d.locator('[data-topic-account]').count(),0);
  assert(await other.locator('[data-topic-major]').isChecked());assert(await other.locator('[data-topic-major]').isDisabled());assert.doesNotMatch(await d.innerText(),/دارای مقصد|قبلاً متصل/);
  assert.match(await g.innerText(),/۳ از ۳ معین انتخاب‌شده/);assert.match(await g.innerText(),/بدهکار: ۱۳۰/);assert.match(await other.innerText(),/بستانکار: ۷۵/);assert.match(await d.innerText(),/مانده نامشخص/);
  assert(await g.locator('[data-topic-major]').isChecked());await g.locator('[data-topic-expand]').click();assert.equal(await g.locator('[data-topic-account]').count(),3);
  assert.equal(await g.locator('[data-topic-account]:checked').count(),3);assert.doesNotMatch(await g.innerText(),/دارای مقصد|قبلاً متصل/);assert.match(await g.innerText(),/ثبت مستقیم در حساب کل/);
  await g.locator('[data-topic-account]').first().uncheck();assert(await g.locator('[data-topic-major]').evaluate(x=>x.indeterminate));assert.match(await g.innerText(),/۲ از ۳/);
  await other.locator('[data-topic-expand]').click();assert(await other.locator('[data-topic-account]').isChecked());assert(await other.locator('[data-topic-account]').isDisabled());await other.locator('[data-topic-transfer]').click();
  page.once('dialog',x=>x.dismiss());await d.locator('[data-topic-save]').click();assert(await d.isVisible());
  await d.locator('[data-topic-cancel]').first().click();
  await page.locator('[data-mw-topic-choose="A-70|1|5"]').click();assert.equal(await d.locator('[data-topic-account]').count(),0);assert(await d.locator('[data-topic-major="10"]').isChecked());
  await d.locator('#mwTopicSearch').fill('بانک الف');assert.equal(await d.locator('[data-topic-account]').count(),1);assert(await d.locator('[data-topic-account]').isChecked());
  await d.locator('[data-topic-major]').uncheck();assert.match(await d.innerText(),/۲ از ۳/);await d.locator('#mwTopicSearch').fill('');
  assert(await d.locator('[data-topic-major="10"]').evaluate(x=>x.indeterminate));await d.locator('[data-topic-save]').click();
  await page.locator('[data-mw-topic-choose="A-70|1|5"]').click();assert.match(await d.locator('[data-topic-group="10"]').innerText(),/۲ از ۳/);await d.locator('[data-topic-expand="10"]').click();
  const states=await d.locator('[data-topic-account]').evaluateAll(xs=>xs.map(x=>x.checked));assert.deepEqual(states,[true,false,true]);
  assert(await d.evaluate(el=>el.scrollWidth<=el.clientWidth+1));await d.locator('[data-topic-cancel]').first().click();assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('floating trial balance paginates major accounts and group selections persist across navigation', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const {page,context,errors}=await setup(browser);
  await page.evaluate(()=>{ACCOUNT_ROWS=Array.from({length:42},(_,i)=>({'کد حساب کل':String(i+1),'عنوان حساب کل':'حساب متفرقه '+(i+1),'کد حساب معین':'1','عنوان حساب معین':'معین ویژه '+(i+1),'بدهکار':'1','بستانکار':''}));gotoModule('mainWorkpaper');});
  await page.locator('[data-mw-view="A-70"]').click();await page.locator('[data-mw-topic-choose="A-70|1|5"]').click();const d=page.locator('#mwTopicDialog');
  assert.equal(await d.locator('[data-topic-group]').count(),40);await d.locator('[data-topic-major="1"]').check();await d.locator('[data-topic-next]').click();assert.equal(await d.locator('[data-topic-group]').count(),2);
  await d.locator('[data-topic-major="42"]').check();await d.locator('[data-topic-prev]').click();assert(await d.locator('[data-topic-major="1"]').isChecked());
  await d.locator('#mwTopicSearch').fill('ویژه 42');assert(await d.locator('[data-topic-account]').isChecked());await d.locator('#mwTopicSearch').fill('');await d.locator('[data-topic-save]').click();
  assert.equal(await page.locator('#mwPreview tbody tr').filter({has:page.locator('.mw-description',{hasText:'موجودی نقد'})}).getAttribute('data-mw-amount'),'2');assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('audit controls use the same reference styling and adapt only when vertical controls do not fit', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const {page,context,errors}=await setup(browser);await page.evaluate(()=>document.fonts.ready);
  const sheet=()=>page.locator('#mwPreview .mw-paper').first();
  async function measure(){return sheet().evaluate(p=>{const items=[...p.querySelectorAll('.mw-control-items > div')];return {compact:p.classList.contains('mw-controls-compact'),titleHeight:p.querySelector('.mw-control-title').getBoundingClientRect().height,titleFont:getComputedStyle(p.querySelector('.mw-control-title')).fontSize,itemFont:getComputedStyle(p.querySelector('.mw-control-items')).fontSize,lineHeight:getComputedStyle(p.querySelector('.mw-control-items')).lineHeight,squareWidth:items[0].querySelector('span').getBoundingClientRect().width,top:items.map(x=>x.getBoundingClientRect().top),within:items.every(x=>x.scrollHeight<=x.clientHeight+1&&x.scrollWidth<=x.clientWidth+1),controlWidth:p.querySelector('.mw-controls').getBoundingClientRect().width};});}
  const gl=await measure();assert.equal(gl.compact,false);assert.equal(new Set(gl.top).size,5);
  await page.locator('[data-mw-view="A-73"]').click();const short=await measure();assert.equal(short.compact,false);assert.equal(new Set(short.top).size,5);
  await page.evaluate(()=>{window.print=()=>{};});await page.locator('#mwPrint').click();await page.emulateMedia({media:'print'});
  const shortPrint=page.locator('#printHost .mw-paper');assert.equal(await shortPrint.count(),1);assert.equal(await shortPrint.locator('.mw-controls-compact').count(),0);
  assert(await shortPrint.evaluate(p=>{const c=p.querySelector('.mw-card').getBoundingClientRect();return [...p.querySelectorAll('.mw-control-items > div')].every(el=>{const r=el.getBoundingClientRect();return r.bottom<=c.bottom&&r.left>=c.left&&r.right<=c.right;});}));
  const shortPdf=await page.pdf({format:'A4',landscape:true,printBackground:true});assert.equal((await require('pdf-lib').PDFDocument.load(shortPdf)).getPageCount(),1);
  await page.emulateMedia({media:'screen'});await page.evaluate(()=>window.__activePrintRestore?.());
  await page.locator('[data-mw-view="A-70"]').click();const long=await measure();assert.equal(long.compact,true);assert.equal(new Set(long.top).size,2);assert.equal(await page.locator('#mwPreview .mw-paper').count(),1);
  for(const v of [short,long])for(const prop of ['titleHeight','titleFont','itemFont','lineHeight','squareWidth','controlWidth'])assert.equal(v[prop],gl[prop],prop);
  assert(gl.within&&short.within&&long.within);assert.equal(await page.locator('#mwPrint').isEnabled(),true);
  await page.evaluate(()=>{window.print=()=>{};});await page.locator('#mwPrint').click();await page.emulateMedia({media:'print'});
  assert.equal(await page.locator('#printHost .mw-controls-compact').count(),1);const pdf=await page.pdf({format:'A4',landscape:true,printBackground:true});assert.equal((await require('pdf-lib').PDFDocument.load(pdf)).getPageCount(),1);
  await page.emulateMedia({media:'screen'});await page.evaluate(()=>window.__activePrintRestore?.());assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('long GL workpaper repeats compact controls on all pages without losing rows', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const {page,context,errors}=await setup(browser);
  await page.evaluate(()=>{ACCOUNT_ROWS=Array.from({length:35},(_,i)=>({'کد حساب کل':'10','عنوان حساب کل':'موجودی نقد','کد حساب معین':String(i+1),'عنوان حساب معین':'حساب ویژه '+(i+1),'بدهکار':'1','بستانکار':''}));gotoModule('mainWorkpaper');});await page.evaluate(()=>document.fonts.ready);
  const pages=page.locator('#mwPreview .mw-paper');assert((await pages.count())>1);assert.equal(await pages.locator('.mw-control-items').count(),await pages.count());
  assert(await pages.evaluateAll(xs=>xs.every(x=>x.classList.contains('mw-controls-compact'))));assert.equal(await pages.locator('tbody tr').count(),36);
  assert.equal(await page.locator('#mwPrint').isEnabled(),true);await page.evaluate(()=>{window.print=()=>{};});await page.locator('#mwPrint').click();await page.emulateMedia({media:'print'});
  const pdf=await page.pdf({format:'A4',landscape:true,printBackground:true});assert.equal((await require('pdf-lib').PDFDocument.load(pdf)).getPageCount(),await pages.count());
  assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('control layout recalculates after hiding and restoring statement topics', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const {page,context,errors}=await setup(browser);await page.locator('[data-mw-view="A-70"]').click();await page.evaluate(()=>document.fonts.ready);
  const sheet=()=>page.locator('#mwPreview .mw-paper').first();assert(await sheet().evaluate(el=>el.classList.contains('mw-controls-compact')));
  const removed=[];
  for(let i=0;i<12;i++){
   if(!await sheet().evaluate(el=>el.classList.contains('mw-controls-compact')))break;
   const button=page.locator('#mwPreview [data-mw-topic-remove]').first();removed.push(await button.getAttribute('data-mw-topic-remove'));page.once('dialog',d=>d.accept());await button.click();
  }
  assert(removed.length>0);assert.equal(await sheet().evaluate(el=>el.classList.contains('mw-controls-compact')),false);assert.equal(await page.locator('#mwPrint').isEnabled(),true);
  for(const key of removed){await page.locator('#mwPreview .mw-preview-tools summary').click();await page.locator(`[data-mw-topic-restore="${key}"]`).click();}
  assert(await sheet().evaluate(el=>el.classList.contains('mw-controls-compact')));assert.equal(await page.locator('#mwPreview .mw-paper').count(),1);assert.equal(await page.locator('#mwPrint').isEnabled(),true);assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('all previous automatic and manual mappings are ticked as status, bulk selection does not move them', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const {page,context,errors}=await setup(browser);
  await page.evaluate(()=>{ACCOUNT_ROWS=[
   ['1','نامشهود','100'],['2','نقد','20'],['3','عنوان نامعلوم','30'],['4','حساب ناشناخته','40']
  ].map(([m,title,amount])=>({'کد حساب کل':'11','عنوان حساب کل':'حساب خاص','کد حساب معین':m,'عنوان حساب معین':title,'بدهکار':amount,'بستانکار':''}));gotoModule('mainWorkpaper');});
  await page.locator('select[data-mw-link]').nth(3).selectOption('A-71|2|0');
  await page.locator('[data-mw-view="A-70"]').click();await page.locator('[data-mw-topic-choose="A-70|1|0"]').click();
  const d=page.locator('#mwTopicDialog'),g=d.locator('[data-topic-group="11"]');assert.match(await g.innerText(),/۳ از ۴ معین انتخاب‌شده/);
  await g.locator('[data-topic-expand]').click();const rows=g.locator('.mw-topic-account');assert.equal(await rows.count(),4);
  const intangible=rows.nth(0),cash=rows.nth(1),unknown=rows.nth(2),manual=rows.nth(3);
  for(const r of [intangible,cash,manual]){assert(await r.locator('[data-topic-account]').isChecked());assert(await r.locator('[data-topic-account]').isDisabled());assert.equal(await r.locator('input[type=checkbox]').count(),1);}
  assert.doesNotMatch(await g.innerText(),/دارای مقصد|قبلاً متصل|خودکار، نیازمند بازبینی/);
  assert.equal(await unknown.locator('[data-topic-account]').isChecked(),false);assert(await g.locator('[data-topic-major]').evaluate(x=>x.indeterminate));
  await g.locator('[data-topic-major]').check();assert(await unknown.locator('[data-topic-account]').isChecked());assert(await cash.locator('[data-topic-account]').isChecked());assert(await cash.locator('[data-topic-account]').isDisabled());
  await d.locator('[data-topic-save]').click();
  const amount=label=>page.locator('#mwPreview tbody tr').filter({has:page.locator('.mw-description',{hasText:label})}).first().getAttribute('data-mw-amount');
  assert.equal(await amount('پیش‌پرداخت‌ها'),'30');assert.equal(await amount('موجودی نقد'),'20');assert.equal(await amount('دارایی‌های نامشهود'),'100');
  await page.locator('[data-mw-topic-choose="A-70|1|0"]').click();await d.locator('#mwTopicUnlinked').check();assert.equal(await d.locator('[data-topic-group]').count(),0);
  await d.locator('#mwTopicUnlinked').uncheck();await d.locator('[data-topic-expand]').click();
  assert(await d.locator('.mw-topic-account').nth(2).locator('[data-topic-account]').isChecked());assert(await d.locator('.mw-topic-account').nth(2).locator('[data-topic-account]').isEnabled());
  await d.locator('.mw-topic-account').nth(1).locator('[data-topic-transfer]').click();assert(await d.locator('.mw-topic-account').nth(1).locator('[data-topic-account]').isEnabled());
  page.once('dialog',x=>x.dismiss());await d.locator('[data-topic-save]').click();assert(await d.isVisible());
  await d.locator('[data-topic-cancel]').first().click();assert.equal(await amount('موجودی نقد'),'20');
  await page.locator('[data-mw-topic-choose="A-70|1|0"]').click();await d.locator('[data-topic-expand]').click();await d.locator('.mw-topic-account').nth(1).locator('[data-topic-transfer]').click();
  page.once('dialog',x=>x.accept());await d.locator('[data-topic-save]').click();assert.equal(await amount('پیش‌پرداخت‌ها'),'50');assert.equal(await amount('موجودی نقد'),'');
  await page.locator('[data-mw-topic-choose="A-70|1|0"]').click();await d.locator('[data-topic-expand]').click();const moved=d.locator('.mw-topic-account').nth(1);
  assert(await moved.locator('[data-topic-account]').isChecked());assert(await moved.locator('[data-topic-account]').isEnabled());
  await moved.locator('[data-topic-account]').uncheck();assert.equal(await moved.locator('[data-topic-account]').isChecked(),false);await d.locator('[data-topic-save]').click();
  assert.equal(await amount('پیش‌پرداخت‌ها'),'30');await page.locator('#mwMatching summary').click();assert.match(await page.locator('.mw-map-item').nth(1).innerText(),/انتخاب نشده/);assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('unassigned filter, page and group selection only affect eligible accounts and preserve draft on filtering', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const {page,context,errors}=await setup(browser);
  await page.evaluate(()=>{ACCOUNT_ROWS=[['1','نامشهود','10'],['2','اول نامعلوم','20'],['3','دوم نامعلوم','30']].map(([m,t,n])=>({'کد حساب کل':'1','عنوان حساب کل':'حساب متفرقه','کد حساب معین':m,'عنوان حساب معین':t,'بدهکار':n,'بستانکار':''}));gotoModule('mainWorkpaper');});
  await page.locator('[data-mw-view="A-70"]').click();await page.locator('[data-mw-topic-choose="A-70|1|5"]').click();const d=page.locator('#mwTopicDialog');
  await d.locator('#mwTopicUnlinked').check();await d.locator('[data-topic-expand]').click();assert.equal(await d.locator('[data-topic-account]').count(),2);
  await d.locator('[data-topic-account]').first().check();assert.equal(await d.locator('[data-topic-account]').count(),2);
  await d.locator('#mwTopicSearch').fill('دوم');await d.locator('[data-topic-page-all]').check();await d.locator('#mwTopicSearch').fill('');
  assert.equal(await d.locator('[data-topic-account]:checked').count(),2);await d.locator('#mwTopicUnlinked').uncheck();
  assert.equal(await d.locator('[data-topic-account]').count(),3);assert(await d.locator('.mw-topic-account').first().locator('[data-topic-account]').isChecked());assert(await d.locator('.mw-topic-account').first().locator('[data-topic-account]').isDisabled());
  await d.locator('[data-topic-save]').click();const row=label=>page.locator('#mwPreview tbody tr').filter({has:page.locator('.mw-description',{hasText:label})}).first();
  assert.equal(await row('موجودی نقد').getAttribute('data-mw-amount'),'50');assert.equal(await row('دارایی‌های نامشهود').getAttribute('data-mw-amount'),'10');assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('removed results and balance panels stay absent while selection and invalid input warnings remain', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const {page,context,errors}=await setup(browser);
  await page.evaluate(()=>{ACCOUNT_ROWS=[
   {'کد حساب کل':'1','عنوان حساب کل':'حساب خاص','کد حساب معین':'1','عنوان حساب معین':'مورد ناشناس','بدهکار':'40','بستانکار':''},
   {'کد حساب کل':'2','عنوان حساب کل':'موجودی نقد','کد حساب معین':'1','عنوان حساب معین':'بانک الف','بدهکار':'bad','بستانکار':''},
   {'کد حساب کل':'','عنوان حساب کل':'کل بدون کد','کد حساب معین':'5','عنوان حساب معین':'بی کل','بدهکار':'9','بستانکار':''}
  ];gotoModule('mainWorkpaper');});
  const mod=page.locator('#mainWorkpaperModule');assert.doesNotMatch(await mod.innerText(),/کنترل توازن|نتیجه بررسی حساب‌ها/);assert.equal(await mod.locator('.mw-balance-control,.mw-unresolved').count(),0);assert.match(await mod.locator(':scope > .err').innerText(),/فاقد کد کل/);
  await page.locator('[data-mw-view="A-70"]').click();await page.locator('[data-mw-topic-choose="A-70|1|5"]').click();const picker=page.locator('#mwTopicDialog');
  await picker.locator('#mwTopicUnlinked').check();await picker.locator('[data-topic-expand]').click();assert.match(await picker.innerText(),/مورد ناشناس/);await picker.locator('[data-topic-account]').check();await picker.locator('[data-topic-save]').click();
  assert.equal(await page.locator('#mwPreview tbody tr').filter({has:page.locator('.mw-description',{hasText:'موجودی نقد'})}).getAttribute('data-mw-amount'),'');
  await page.evaluate(()=>{ACCOUNT_ROWS=[{'کد حساب کل':'','عنوان حساب کل':'بی کد','بدهکار':'5','بستانکار':''}];gotoModule('mainWorkpaper');});
  assert.match(await mod.innerText(),/هیچ حساب کل معتبری/);assert.match(await mod.innerText(),/فاقد کد کل/);assert.doesNotMatch(await mod.innerText(),/کنترل توازن|نتیجه بررسی حساب‌ها/);assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});


test('dark and light themes keep preview tools, picker, selected rows and printed paper readable', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const {page,context,errors}=await setup(browser);
  async function contrast(selector){return page.locator(selector).first().evaluate(el=>{
   const rgb=s=>{const n=s.match(/[\d.]+/g).map(Number);return n;};
   const fg=rgb(getComputedStyle(el).color);let bg;for(let p=el;p;p=p.parentElement){const c=rgb(getComputedStyle(p).backgroundColor);if(c.length===3||c[3]>.99){bg=c;break;}}
   bg??=[255,255,255];const lum=c=>c.slice(0,3).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);const a=lum(fg),b=lum(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  });}
  await page.locator('[data-mw-view="A-70"]').click();
  for(const mode of ['dark','light','system-dark']){
   if(mode==='system-dark'){await page.emulateMedia({colorScheme:'dark'});await page.evaluate(()=>document.documentElement.removeAttribute('data-theme'));}else await page.evaluate(mode=>applyTheme(mode),mode);
   for(const selector of ['#mwPreview .mw-preview-tools p','#mwMatching summary','#mwPreview .mw-paper tbody td.mw-description'])assert((await contrast(selector))>=4.5,`${mode}: ${selector}`);
   await page.locator('[data-mw-topic-choose="A-70|1|0"]').click();const dialog=page.locator('#mwTopicDialog');await dialog.locator('[data-topic-expand]').first().click();
   for(const selector of ['#mwTopicDialog','#mwTopicDialog .mw-topic-major-info b','#mwTopicDialog .mw-topic-major-info small','#mwTopicDialog .mw-topic-choice b','#mwTopicDialog .mw-topic-transfer'])assert((await contrast(selector))>=4.5,`${mode}: ${selector}`);
   await dialog.locator('[data-topic-transfer]').first().click();assert((await contrast('#mwTopicDialog .mw-topic-account.is-selected .mw-topic-choice b'))>=4.5,`${mode}: selected`);
   await dialog.locator('[data-topic-cancel]').first().click();
  }
  await page.evaluate(()=>{window.print=()=>{};});await page.locator('#mwPrint').click();await page.emulateMedia({media:'print'});
  assert((await contrast('#printHost .mw-paper tbody td.mw-description'))>=4.5);assert((await contrast('#printHost .mw-paper th'))>=4.5);
  const pdf=await page.pdf({format:'A4',landscape:true,printBackground:true});assert((await require('pdf-lib').PDFDocument.load(pdf)).getPageCount()>=1);
  assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('biological producer and non-producer titles map separately, respect conflicts and support manual choice', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const {page,context,errors}=await setup(browser);
  const cases=[
   ['حساب خاص','دارایی زیستی مولد','A-70|0|7'],['حساب خاص','دارایی زیستی غیرمولد','A-70|0|8'],
   ['دارایی ثابت','دارایی های زیستی مولد شرکت','A-70|0|7'],['دارایی های زیستی','غیر مولد','A-70|0|8'],
   ['دارایی های زیستی','مولد','A-70|0|7'],['حساب خاص','دارایی های زیستی غیر مولد بلندمدت','A-70|0|8'],
   ['حساب خاص','دارایی های زیستی',''],['حساب خاص','دارایی زیستی مولد و غیرمولد',''],
   ['دارایی ثابت','دارایی زیستی مولد و غیرمولد',''],['دارایی ثابت','دارایی زیستی مولد جاری',''],
   ['دارایی های جاری','دارایی زیستی غیرمولد',''],['دارایی زیستی مولد','دارایی زیستی غیرمولد',''],
   ['حساب ناشناخته','مولد',''],['حساب خاص','هزینه نگهداری دارایی زیستی مولد',''],
   ['حساب خاص','مورد بدون تطبیق',''],['حساب خاص','دارایی زیستی غیر‌مولد','A-70|0|8'],
   ['دارایی زیستی مولد','باغات','A-70|0|7'],['دارایی ثابت مشهود','دارایی زیستی مولد','']
  ];
  await page.evaluate(cases=>{ACCOUNT_ROWS=cases.map(([p,c],i)=>({'کد حساب کل':String(i+1),'عنوان حساب کل':p,'کد حساب معین':'1','عنوان حساب معین':c,'بدهکار':String(i>=15?0:(i+1)*10),'بستانکار':''}));gotoModule('mainWorkpaper');},cases);
  await page.locator('#mwMatching summary').click();const values=await page.locator('[data-mw-map-link]').evaluateAll(xs=>Object.fromEntries(xs.map(x=>[x.dataset.mwMapLink,x.value])));
  cases.forEach(([p,c,want],i)=>assert.equal(values[JSON.stringify([String(i+1),'1'])],want,`${p} / ${c}`));
  await page.locator('[data-mw-view="A-70"]').click();const row=key=>page.locator(`[data-mw-topic-choose="${key}"]`).locator('xpath=ancestor::tr');
  assert.equal(await row('A-70|0|7').getAttribute('data-mw-amount'),'90');assert.equal(await row('A-70|0|8').getAttribute('data-mw-amount'),'120');
  await page.locator('[data-mw-topic-choose="A-70|0|8"]').click();const dialog=page.locator('#mwTopicDialog');await dialog.locator('#mwTopicSearch').fill('مورد بدون تطبیق');await dialog.locator('[data-topic-account]').check();await dialog.locator('[data-topic-save]').click();
  assert.equal(await row('A-70|0|8').getAttribute('data-mw-amount'),'270');assert.equal(await row('A-70|0|7').getAttribute('data-mw-amount'),'90');
  assert.equal(await page.locator('#mwPreview tbody tr.mw-total').filter({hasText:'جمع دارایی‌های غیرجاری'}).getAttribute('data-mw-amount'),'360');assert.equal(await page.locator('#mwPreview .mw-paper').count(),1);
  await page.evaluate(()=>{window.print=()=>{};});await page.locator('#mwPrint').click();await page.emulateMedia({media:'print'});const printed=page.locator('#printHost .mw-paper');assert.match(await printed.innerText(),/دارایی‌های زیستی مولد/);assert.match(await printed.innerText(),/دارایی‌های زیستی غیرمولد/);const pdf=await page.pdf({format:'A4',landscape:true,printBackground:true});assert.equal((await require('pdf-lib').PDFDocument.load(pdf)).getPageCount(),1);await page.emulateMedia({media:'screen'});await page.evaluate(()=>window.__activePrintRestore?.());
  page.once('dialog',d=>d.accept());await page.locator('[data-mw-topic-remove="A-70|0|8"]').click();assert.equal(await row('A-70|0|8').count(),0);
  await page.locator('#mwPreview .mw-preview-tools summary').click();await page.locator('[data-mw-topic-restore="A-70|0|8"]').click();assert.equal(await row('A-70|0|8').getAttribute('data-mw-amount'),'');
  assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});
