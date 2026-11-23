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

test("A-family controls match the template without changing GL controls", { skip: !executablePath && "Set CHROMIUM_PATH" }, async () => {
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
    await page.locator('[data-mw-link]').first().selectOption('A-70|0|0');
    await page.locator('[data-mw-link]').nth(1).selectOption('A-70|1|5');
    await page.locator('[data-mw-view="A-70"]').click();
    const pages=page.locator('#mwPreview .mw-paper');
    assert.equal(await pages.count(),1);
    assert.equal(await pages.locator('tbody tr').count(),19);
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
  await dialog.locator('#mwTopicSearch').fill('بانک');await dialog.locator('[data-topic-account]').check();
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
  assert.match(await page.locator('.mw-balance-control').innerText(),/۳ معین بدون مقصد/);
  assert.match(await page.locator('.mw-unresolved').innerText(),/نام اختصاصی/);
  assert.match(await page.locator('.mw-unresolved').innerText(),/بانک/);
  await page.locator('#mwMatching summary').click();
  assert.equal(await page.locator('select[data-mw-map-link] option[value="A-70|1|0"]').count(),0);
  await page.locator('#mwPreview .mw-preview-tools summary').click();
  await page.locator('[data-mw-topic-restore="A-70|1|0"]').click();
  assert.equal(await row('پیش‌پرداخت‌ها').getAttribute('data-mw-amount'),'');
  assert.match(await page.locator('.mw-balance-control').innerText(),/۳ معین بدون مقصد/);
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
  assert.equal(await d.locator('[data-topic-account]').count(),100);await d.locator('[data-topic-page-all]').check();await d.locator('[data-topic-next]').click();
  assert.equal(await d.locator('[data-topic-account]').count(),5);await d.locator('[data-topic-page-all]').check();await d.locator('#mwTopicSearch').fill('عنوان اختصاصی 105');
  assert(await d.locator('[data-topic-account]').isChecked());await d.locator('[data-topic-account]').uncheck();await d.locator('[data-topic-save]').click();
  assert.equal(await page.locator('#mwPreview tbody tr').filter({has:page.locator('.mw-description',{hasText:'موجودی نقد'})}).first().getAttribute('data-mw-amount'),'104');
  assert.match(await page.locator('.mw-balance-control').innerText(),/۱ معین بدون مقصد/);assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('statement topics follow the reference order and maintain stable destination keys', {skip:!executablePath && 'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const {page,context,errors}=await setup(browser);
  const expected={
   'A-70':[['A-70|0|0','A-70|0|1','A-70|0|2','A-70|0|3','A-70|0|4','A-70|0|5','A-70|0|6'],['A-70|1|0','A-70|1|2','A-70|1|1','A-70|1|3','A-70|1|4','A-70|1|5','A-70|1|6']],
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
  assert.deepEqual(groups[0].items.map(x=>x.name),['دارایی‌های ثابت مشهود','سرمایه‌گذاری در املاک','دارایی‌های نامشهود','سرمایه‌گذاری‌های بلندمدت','دریافتنی‌های تجاری و سایر دریافتنی‌ها','دارایی مالیات انتقالی','سایر دارایی‌ها']);
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

test('unresolved conclusion shows actual items, missing codes and invalid balances; updates after choosing from preview', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const {page,context,errors}=await setup(browser);
  await page.evaluate(()=>{ACCOUNT_ROWS=[
   {'کد حساب کل':'1','عنوان حساب کل':'دارایی ثابت','کد حساب معین':'1','عنوان حساب معین':'نامشهود','بدهکار':'120','بستانکار':''},
   {'کد حساب کل':'2','عنوان حساب کل':'حساب خاص آلفا','کد حساب معین':'2','عنوان حساب معین':'مورد ناشناخته','بدهکار':'40','بستانکار':''},
   {'کد حساب کل':'3','عنوان حساب کل':'موجودی نقد','کد حساب معین':'3','عنوان حساب معین':'بانک الف','بدهکار':'bad','بستانکار':''},
   {'کد حساب کل':'4','عنوان حساب کل':'حساب مجهول','کد حساب معین':'4','عنوان حساب معین':'فاقد مقدار','بدهکار':'','بستانکار':''},
   {'کد حساب کل':'','عنوان حساب کل':'کل بدون کد','کد حساب معین':'5','عنوان حساب معین':'معین بدون کل','بدهکار':'9','بستانکار':''}
  ];gotoModule('mainWorkpaper');});
  const report=page.locator('.mw-unresolved');assert(await report.isVisible());
  assert.match(await report.innerText(),/۲ معین بدون مقصد/);assert.match(await report.innerText(),/۲ معین با مانده نامشخص/);assert.match(await report.innerText(),/۱ ردیف فاقد کد کل/);
  assert.equal(await report.locator('[data-unresolved-item]').count(),4);
  assert.match(await report.innerText(),/حساب خاص آلفا/);assert.match(await report.innerText(),/۴۰/);assert.match(await report.innerText(),/بانک الف/);
  assert.match(await report.innerText(),/مقصد: A-70/);assert.match(await report.innerText(),/نامشخص/);assert.match(await report.innerText(),/کل بدون کد/);assert.match(await report.innerText(),/بدهکار: ۹/);
  await report.locator('#mwUnresolvedSearch').fill('آلفا');assert.equal(await report.locator('[data-unresolved-item]').count(),1);
  await page.locator('[data-mw-view="A-70"]').click();await page.locator('[data-mw-topic-choose="A-70|1|5"]').click();
  const picker=page.locator('#mwTopicDialog');await picker.locator('#mwTopicSearch').fill('آلفا');await picker.locator('[data-topic-account]').check();await picker.locator('[data-topic-save]').click();
  assert.equal(await report.locator('#mwUnresolvedSearch').inputValue(),'آلفا');assert.equal(await report.locator('[data-unresolved-item]').count(),0);
  await report.locator('#mwUnresolvedSearch').fill('');assert.match(await report.innerText(),/۱ معین بدون مقصد/);assert.equal(await report.locator('[data-unresolved-item]').count(),3);
  assert.equal(await page.locator('#mwPreview tbody tr').filter({has:page.locator('.mw-description',{hasText:'موجودی نقد'})}).getAttribute('data-mw-amount'),'');
  assert.match(await page.locator('.mw-balance-control').innerText(),/ناقص/);
  await page.evaluate(()=>{window.print=()=>{};});await page.locator('#mwPrint').click();
  assert.equal(await page.locator('#printHost .mw-unresolved').count(),0);await page.evaluate(()=>window.__activePrintRestore?.());
  assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('unresolved conclusion paginates, searches and resets on loading a new source', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const {page,context,errors}=await setup(browser);
  await page.evaluate(()=>{ACCOUNT_ROWS=Array.from({length:85},(_,i)=>({'کد حساب کل':String(i+1),'عنوان حساب کل':'حساب اختصاصی '+(i+1),'کد حساب معین':'1','عنوان حساب معین':'معین ناشناخته '+(i+1),'بدهکار':'1','بستانکار':''}));gotoModule('mainWorkpaper');});
  const report=page.locator('.mw-unresolved');assert.match(await report.innerText(),/۸۵ معین بدون مقصد/);assert.equal(await report.locator('[data-unresolved-item]').count(),40);
  await report.locator('[data-unresolved-next]').click();assert.equal(await report.locator('[data-unresolved-item]').count(),40);
  await report.locator('[data-unresolved-next]').click();assert.equal(await report.locator('[data-unresolved-item]').count(),5);
  await report.locator('#mwUnresolvedSearch').fill('اختصاصی 85');assert.equal(await report.locator('[data-unresolved-item]').count(),1);
  await page.evaluate(()=>{ACCOUNT_ROWS=[{'کد حساب کل':'99','عنوان حساب کل':'موجودی نقد','کد حساب معین':'1','عنوان حساب معین':'بانک','بدهکار':'1','بستانکار':''}];gotoModule('mainWorkpaper');});
  assert.equal(await report.locator('#mwUnresolvedSearch').inputValue(),'');assert.match(await report.innerText(),/۰ معین بدون مقصد/);assert.match(await report.innerText(),/اتصال‌های خودکار همچنان باید بازبینی شوند/);
  assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('unresolved conclusion remains available when all source rows have no account code', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const {page,context,errors}=await setup(browser);
  await page.evaluate(()=>{ACCOUNT_ROWS=[{'کد حساب کل':'','عنوان حساب کل':'کل بی کد','کد حساب معین':'1','عنوان حساب معین':'نمونه بدون کد','بدهکار':'123','بستانکار':''}];gotoModule('mainWorkpaper');});
  const report=page.locator('.mw-unresolved');assert(await report.isVisible());assert.match(await report.innerText(),/۱ ردیف فاقد کد کل/);assert.match(await report.innerText(),/نمونه بدون کد/);assert(await report.locator('[data-unresolved-preview]').isDisabled());assert.equal(await page.locator('#mwPreview').count(),0);
  assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});
