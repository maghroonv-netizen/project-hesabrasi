"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { chromium } = require("playwright-core");
// Test-only access exposes mapping and synthetic source figures; user selection uses the real picker.
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
      body: html.replace("MODULES.push({id:'mainWorkpaper'", "window.__mwTestSnapshot=()=>({links:Object.fromEntries(MW.model.accounts.flatMap(a=>a.children.map(c=>[c.id,MW.links.get(c.id)||'']))),reasons:Object.fromEntries(MW.reasons)});window.__mwTestSyntheticEdits=(id,fields)=>{MW.edits.set(id,fields);render()};MODULES.push({id:'mainWorkpaper'"),
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
async function snapshot(page){return page.evaluate(()=>window.__mwTestSnapshot());}
async function assignTopic(page,major,minor,dest,selected=true){
 await page.locator(`[data-mw-view="${dest.split('|')[0]}"]`).click();await page.locator(`[data-mw-topic-choose="${dest}"]`).click();const d=page.locator('#mwTopicDialog'),g=d.locator(`[data-topic-group="${major}"]`);await g.locator('[data-topic-expand]').click();const id=JSON.stringify([major,minor]),input=g.locator(`input[data-topic-account='${id}']`);const locked=await input.isDisabled();if(locked&&selected){await g.locator(`button[data-topic-transfer='${id}']`).click();}else if(selected){await input.check();}else{await input.uncheck();}if(locked&&selected)page.once('dialog',x=>x.accept());await d.locator('[data-topic-save]').click();
}
async function sheetAction(page,view,code,hidden,action){
 const key=JSON.stringify([view,code||'']);const zone=hidden?'.mw-hidden-nav':'.mw-nav';
 await page.locator(`${zone} [data-mw-sheet-more='${key}']`).click();const button=page.locator('#mwSheetMenu [data-mw-sheet-action]');assert.equal((await button.innerText()).trim(),action);await button.click();
}
test(
  "automatic main workpapers, current balances and explicit mapping on mobile",
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
      assert.equal((await snapshot(page)).links[JSON.stringify(['01',''])], 'A-70|1|5');
      await assignTopic(page,'01','','A-70|1|5',false);
      await h.locator('[data-mw-view="A-70"]').click();
      const cash = h
        .locator(".mw-paper-table tr")
        .filter({ hasText: "موجودی نقد" });
      assert.match(await cash.innerText(), /۱۲۰/);
      await assignTopic(page,'01','','A-70|1|5');
      await h.locator('[data-mw-view="A-70"]').click();
      assert.match(await cash.innerText(), /۱۳۰/);
      assert.equal((await h.locator(".mw-ref").first().innerText()).trim(), "");
      assert(await h.locator(".mw-paper-table td, .mw-paper-table th").evaluateAll(cells => cells.every(cell => getComputedStyle(cell).color === "rgb(0, 0, 0)")));
      const cells = cash.locator("td");
      assert.equal(await cells.count(), 13);
      assert.equal((await cells.nth(5).innerText()).trim(), "۱۳۰");
      assert.equal((await cells.nth(8).innerText()).trim(), "۱۳۰");
      assert.match(await h.innerText(), /ورود مستقیم بدهکار و بستانکار در کاربرگ حساب و A غیرفعال است/);
      assert.equal(await h.locator(".mw-paper-table input").count(),0);
      assert.equal(await h.locator(".mw-paper-table select").count(),0);
      assert.equal(await h.locator('.mw-classification, [data-mw-detail], [data-mw-link]').count(), 0);
      assert.doesNotMatch(await h.innerText(), /خلاصه حساب کل|اتصال معین‌های|ردیابی اسناد|بخش طبقه‌بندی — غیرفعال/);
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
  "multi-page A4 preview and PDF fit with page numbers and repeated headers",
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
      assert(await pages.first().locator(".mw-paper-table tbody tr").count() >= 8, "earlier pages leave room for at least eight item rows");
      for (let i = 0; i < count; i++) {
        const p = pages.nth(i);
        assert.match(await p.innerText(), /شرکت آزمایشی/);
        assert.equal((await p.locator(".mw-paper-foot").innerText()).trim(), `صفحه ${String(i+1).replace(/[0-9]/g,d=>"۰۱۲۳۴۵۶۷۸۹"[d])} از ${String(count).replace(/[0-9]/g,d=>"۰۱۲۳۴۵۶۷۸۹"[d])}`);
        assert.equal(await p.locator(".mw-controls").count(),i===count-1?1:0);
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
          body: html.replace("MODULES.push({id:'mainWorkpaper'", "window.__mwTestSnapshot=()=>({links:Object.fromEntries(MW.model.accounts.flatMap(a=>a.children.map(c=>[c.id,MW.links.get(c.id)||'']))),reasons:Object.fromEntries(MW.reasons)});window.__mwTestSyntheticEdits=(id,fields)=>{MW.edits.set(id,fields);render()};MODULES.push({id:'mainWorkpaper'"),
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
    const map=async (code,dest)=>assignTopic(page,code,code,dest);
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
    await assignTopic(page,'01','','A-72|0|0');await page.locator('[data-mw-view="accounts"][data-mw-active="01"]').click();
    for(let i=0;i<5;i++) assert.equal((await controls().nth(i).innerText()).replace('□','').trim(),expectedGL[i]);
    const expected=['کنترل مطابقت با کاربرگ‌های مربوطه','کنترل جمع عمودی','کنترل جمع (محاسبات) افقی','کنترل مطابقت با اقلام صورت‌های مالی سال جاری','کنترل مطابقت با اقلام صورت‌های مالی سال مقایسه‌ای'];
    for(const id of ['A-70','A-71','A-72','A-73']) {
      await page.locator(`[data-mw-view="${id}"]`).click();
      for(const p of await page.locator('#mwPreview .mw-paper').all()) {
        const rows=p.locator('.mw-control-items > div');
        if(!await rows.count()){assert.notEqual(p,undefined);continue;}
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
    await assignTopic(page,'01','','A-70|0|0');
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
      assert(await pages.locator('.mw-reference').evaluateAll(cells=>cells.every(c=>{const clone=c.cloneNode(true);clone.querySelectorAll('.mw-row-actions').forEach(a=>a.remove());return clone.textContent.trim()==='';})));
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
  assert.equal((await snapshot(page)).links[JSON.stringify(['1','1'])],'A-70|1|5');
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
  assert.match(await page.locator('#mwPreview').innerText(),/موجودی نقد و بانک/);
  await assignTopic(page,'1','1','A-70|1|5',false);
  assert.equal((await snapshot(page)).links[JSON.stringify(['1','1'])],'');
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
  assert.equal((await snapshot(page)).links[JSON.stringify(['1','1'])],'');
  await page.locator('[data-mw-view="accounts"][data-mw-active="2"]').click();assert.equal((await snapshot(page)).links[JSON.stringify(['2','1'])],'');
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
  const state=await snapshot(page);const dest=async name=>state.links[JSON.stringify([String(names.indexOf(name)+1),'1'])];
  assert.equal(await dest('بستانکاران تجاری'),'A-71|2|0');
  assert.match(state.reasons[JSON.stringify(['1','1'])],/فرض جاری/);
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

test('parent and child context preserve maturity and reject conflicts', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try {
  const {page,context,errors}=await setup(browser);
  await page.evaluate(()=>{ACCOUNT_ROWS=[
   ['1','بستانکاران','بستانکاران بلند مدت'],['2','دریافتنی بلندمدت','دریافتنی تجاری'],
   ['3','فروش دارایی ثابت','فروش'],['4','موجودی نقد','دریافتنی تجاری'],['5','پرداختنی جاری و بلند مدت','پرداختنی جاری و بلند مدت'],['6','تسهیلات مالی','تسهیلات مالی بلندمدت']
  ].map(([code,parent,child])=>({'کد حساب کل':code,'عنوان حساب کل':parent,'کد حساب معین':'1','عنوان حساب معین':child,'بدهکار':'1','بستانکار':''}));gotoModule('mainWorkpaper');});const state=await snapshot(page);
  const select=code=>({inputValue:async()=>state.links[JSON.stringify([code,'1'])]});
  assert.equal(await select('1').inputValue(),'A-71|1|0');assert.equal(await select('2').inputValue(),'A-70|0|4');
  assert.equal(await select('3').inputValue(),'');assert.equal(await select('4').inputValue(),'');assert.equal(await select('5').inputValue(),'');assert.equal(await select('6').inputValue(),'A-71|1|1');
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
  assert.equal(await page.locator('#mwPrint').isDisabled(),true,JSON.stringify(diagnostic));assert.match(await page.locator('#mwPaginationWarning').innerText(),/حفظ اندازه قلم/);
  const row=page.locator('.mw-paper-table tbody tr').filter({hasText:'دریافتنی‌های تجاری و سایر دریافتنی‌ها'}).last();
  assert.equal(await row.locator('.mw-reference').evaluate(c=>{const clone=c.cloneNode(true);clone.querySelectorAll('.mw-row-actions').forEach(a=>a.remove());return clone.textContent.trim();}),'');
  assert.doesNotMatch(await page.locator('#mwPreview').innerText(),/GL-150|GL-160/);
  assert(await page.locator('#mwPreview .mw-reference').evaluateAll(cells=>cells.every(c=>{const clone=c.cloneNode(true);clone.querySelectorAll('.mw-row-actions').forEach(a=>a.remove());return clone.textContent.trim()==='';})));
  assert.equal(await row.getAttribute('data-mw-amount'),'14556719701');
  assert(diagnostic.length>0);const large=page.locator('#mwPreview .mw-number-text').filter({hasText:'۱٬۱۵۷٬۱۹۷٬۴۱۲٬۴۴۴'});assert(await large.count()>0);assert(await large.evaluateAll(xs=>xs.every(x=>!x.style.fontSize&&Math.abs(parseFloat(getComputedStyle(x).fontSize)-12.533)<0.1)));
  assert.deepEqual(errors,[]);await context.close();
 } finally {await browser.close();}
});

test('many accounts aggregate without creating references and paginate safely', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try {
  const {page,context,errors}=await setup(browser);
  await page.evaluate(()=>{ACCOUNT_ROWS=Array.from({length:18},(_,i)=>({'کد حساب کل':String(100+i),'عنوان حساب کل':'بدهکاران تجاری '+String(i),'کد حساب معین':'1','عنوان حساب معین':'بدهکاران تجاری '+String(i),'بدهکار':'100','بستانکار':''}));gotoModule('mainWorkpaper');});await page.locator('[data-mw-view="A-70"]').click();
  const row=page.locator('.mw-paper-table tbody tr').filter({hasText:'دریافتنی‌های تجاری و سایر دریافتنی‌ها'}).last();
  assert.equal(await row.getAttribute('data-mw-amount'),'1800');assert.equal(await row.locator('.mw-reference').evaluate(c=>{const clone=c.cloneNode(true);clone.querySelectorAll('.mw-row-actions').forEach(a=>a.remove());return clone.textContent.trim();}),'');
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
  assert.equal(await page.locator('[data-mw-topic-choose="A-70|1|0"]').count(),0);
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
  await page.evaluate(input=>{ACCOUNT_ROWS=input.map(([parent,child],i)=>({'کد حساب کل':String(i+1),'عنوان حساب کل':parent,'کد حساب معین':'1','عنوان حساب معین':child,'بدهکار':'1','بستانکار':''}));gotoModule('mainWorkpaper');},input);
  const state=await snapshot(page),values=state.links;
  for(let i=0;i<input.length;i++){
   const id=JSON.stringify([String(i+1),'1']);
   assert.equal(values[id],input[i][2],`${input[i][0]} / ${input[i][1]}`);
  }
  assert.match(state.reasons[JSON.stringify(['7','1'])],/متفاوت یا مبهم/);
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
  const groups=await page.locator('#mwPreview tbody').evaluateAll(bodies=>{const groups=[];let current;for(const body of bodies)for(const row of body.rows){if(row.classList.contains('mw-group')){current={group:row.textContent.trim(),items:[]};groups.push(current);}else if(row.querySelector('[data-mw-topic-choose]'))current.items.push({name:row.querySelector('.mw-description').textContent.trim(),amount:row.dataset.mwAmount});}return groups;});
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

test('all main and A workpapers print proportionate bold headers and centered amounts', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
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
   assert(Math.abs(styles.meta.size-styles.heads[0].size)<0.1&&Math.abs(styles.sign.size-styles.heads[0].size)<0.1,id);
   assert([...styles.metaChildren,...styles.signChildren].every(s=>s.weight>=700),id);
   assert(styles.heads.every(s=>s.weight>=700&&s.size>=13&&s.size<15),id);
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
  const values=(await snapshot(page)).links;
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

test('long GL workpaper shows controls only on the last page without losing rows', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const {page,context,errors}=await setup(browser);
  await page.evaluate(()=>{ACCOUNT_ROWS=Array.from({length:35},(_,i)=>({'کد حساب کل':'10','عنوان حساب کل':'موجودی نقد','کد حساب معین':String(i+1),'عنوان حساب معین':'حساب ویژه '+(i+1),'بدهکار':'1','بستانکار':''}));gotoModule('mainWorkpaper');});await page.evaluate(()=>document.fonts.ready);
  const pages=page.locator('#mwPreview .mw-paper');assert((await pages.count())>1);assert.equal(await pages.locator('.mw-control-items').count(),1);assert.equal(await pages.last().locator('.mw-control-items').count(),1);assert.equal(await pages.locator('tbody tr').count(),36);
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
  await assignTopic(page,'11','4','A-71|2|0');
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
  assert.equal(await amount('پیش‌پرداخت‌ها'),'30');assert.equal((await snapshot(page)).links[JSON.stringify(['11','2'])],'');assert.deepEqual(errors,[]);await context.close();
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
   for(const selector of ['#mwPreview .mw-preview-tools p','#mwPreview .mw-paper tbody td.mw-description'])assert((await contrast(selector))>=4.5,`${mode}: ${selector}`);
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
  const values=(await snapshot(page)).links;
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

test('audit controls appear only on the final page of each main-module workpaper', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{
  const {page,context,errors}=await setup(browser);await page.evaluate(()=>{ACCOUNT_ROWS=[[1,1],[2,12],[3,24],[4,38]].flatMap(([g,n])=>Array.from({length:n},(_,i)=>({'کد حساب کل':String(g),'عنوان حساب کل':'حساب '+g,'کد حساب معین':String(i+1),'عنوان حساب معین':'معین '+(i+1),'بدهکار':'1','بستانکار':''})));gotoModule('mainWorkpaper');});await page.evaluate(()=>document.fonts.ready);
  for(const item of [{view:'accounts',code:'1',rows:2},{view:'accounts',code:'2',rows:13},{view:'accounts',code:'3',rows:25},{view:'accounts',code:'4',rows:39},{view:'A-70'},{view:'A-71'},{view:'A-72'},{view:'A-73'}]){
   await page.locator(item.code?`[data-mw-view="accounts"][data-mw-active="${item.code}"]`:`[data-mw-view="${item.view}"]`).click();const pages=page.locator('#mwPreview .mw-paper'),count=await pages.count();assert(count>0);if(item.rows)assert.equal(await pages.locator('tbody tr').count(),item.rows);
   assert.equal(await pages.locator('.mw-controls').count(),1);assert.equal(await pages.last().locator('.mw-controls').count(),1);
   for(let i=0;i<count;i++){const p=pages.nth(i);assert.equal(await p.locator('.mw-controls').count(),i===count-1?1:0);const number=(await p.locator('.mw-paper-foot').innerText()).trim();assert.equal(number,count===1?'':`صفحه ${String(i+1).replace(/[0-9]/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d])} از ${String(count).replace(/[0-9]/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d])}`);assert(await p.evaluate(el=>{const c=el.querySelector('.mw-card'),f=el.querySelector('.mw-paper-foot');return c.scrollHeight<=c.clientHeight+1&&f.getBoundingClientRect().bottom<=c.getBoundingClientRect().bottom+1;}));}
   assert(await page.locator('#mwPrint').isEnabled());await page.evaluate(()=>{window.print=()=>{};});await page.locator('#mwPrint').click();await page.emulateMedia({media:'print'});const printed=page.locator('#printHost .mw-paper');assert.equal(await printed.count(),count);assert.equal(await printed.locator('.mw-controls').count(),1);assert.equal(await printed.last().locator('.mw-controls').count(),1);const pdf=await require('pdf-lib').PDFDocument.load(await page.pdf({format:'A4',landscape:true,printBackground:true}));assert.equal(pdf.getPageCount(),count);await page.emulateMedia({media:'screen'});await page.evaluate(()=>window.__activePrintRestore?.());
  }assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('move whole or partial ledger accounts among GL workpapers without altering final sheets or ledger', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const {page,context,errors}=await setup(browser);
  await page.evaluate(()=>{ACCOUNT_ROWS=[
   {'کد حساب کل':'10','عنوان حساب کل':'دارایی ثابت','کد حساب معین':'1','عنوان حساب معین':'زمین','بدهکار':'100','بستانکار':''},
   {'کد حساب کل':'10','عنوان حساب کل':'دارایی ثابت','کد حساب معین':'2','عنوان حساب معین':'ساختمان','بدهکار':'200','بستانکار':''},
   {'کد حساب کل':'20','عنوان حساب کل':'استهلاک انباشته','کد حساب معین':'1','عنوان حساب معین':'استهلاک ساختمان','بدهکار':'','بستانکار':'40'},
   {'کد حساب کل':'20','عنوان حساب کل':'استهلاک انباشته','کد حساب معین':'2','عنوان حساب معین':'استهلاک تجهیزات','بدهکار':'','بستانکار':'60'},
   {'کد حساب کل':'30','عنوان حساب کل':'پرداختنی','کد حساب معین':'1','عنوان حساب معین':'سایر پرداختنی','بدهکار':'','بستانکار':'50'}];gotoModule('mainWorkpaper');});await page.evaluate(()=>document.fonts.ready);
  const ledgerBefore=await page.evaluate(()=>JSON.stringify(ACCOUNT_ROWS));
  const select=async id=>page.locator(`[data-mw-view="accounts"][data-mw-active="${id}"]`).click();
  const rows=()=>page.locator('#mwPreview .mw-paper tbody tr:not(.mw-total):not(.mw-group)');
  const total=()=>page.locator('#mwPreview .mw-total').getAttribute('data-mw-amount');
  await page.locator('[data-mw-view="A-70"]').click();const beforeA=await page.locator('#mwPreview tbody').innerText();
  await select('10');assert.equal(await total(),'300');
  await page.locator('[data-mw-paper-choose]').click();const d=page.locator('#mwPaperDialog');assert(await d.isVisible());
  await d.locator('[data-paper-expand="20"]').click();
  const child=d.locator('label').filter({hasText:'استهلاک ساختمان'}).locator('input');await child.check();
  await d.locator('[data-paper-cancel]').last().click();assert.equal(await total(),'300');
  await page.locator('[data-mw-paper-choose]').click();await d.locator('[data-paper-expand="20"]').click();await d.locator('label').filter({hasText:'استهلاک ساختمان'}).locator('input').check();page.once('dialog',x=>x.accept());await d.locator('[data-paper-save]').click();
  assert.equal(await total(),'260');assert.match(await rows().allTextContents().then(x=>x.join(' ')),/استهلاک ساختمان/);assert.match(await page.locator('#mwPreview .mw-total').innerText(),/ارزش دفتری/);
  await page.evaluate(()=>{window.print=()=>{};});await page.locator('#mwPrint').click();await page.emulateMedia({media:'print'});assert.equal(await page.locator('#printHost [data-mw-paper-choose]').count(),0);assert.match(await page.locator('#printHost').innerText(),/استهلاک ساختمان/);const count=await page.locator('#printHost .mw-paper').count();assert.equal((await require('pdf-lib').PDFDocument.load(await page.pdf({format:'A4',landscape:true,printBackground:true}))).getPageCount(),count);await page.emulateMedia({media:'screen'});await page.evaluate(()=>window.__activePrintRestore?.());
  await select('20');assert.equal(await total(),'-60');assert.equal(await rows().count(),1);assert.match(await rows().innerText(),/استهلاک تجهیزات/);assert.equal(await page.evaluate(()=>JSON.stringify(ACCOUNT_ROWS)),ledgerBefore);
  await page.locator('[data-mw-view="A-70"]').click();assert.equal(await page.locator('#mwPreview tbody').innerText(),beforeA,'A-70 mappings and balances do not change');
  await select('10');await page.locator('[data-mw-paper-choose]').click();await d.locator('[data-paper-major="20"]').check();page.once('dialog',x=>x.accept());await d.locator('[data-paper-save]').click();assert.equal(await total(),'200');
  assert.equal(await page.locator('[data-mw-view="accounts"][data-mw-active="20"]').count(),0,'empty source is hidden');await sheetAction(page,'accounts','20',true,'بازگرداندن');assert.equal(await total(),'');assert.equal(await rows().count(),0);assert.equal(await page.locator('[data-mw-view="accounts"][data-mw-active="20"]').count(),1,'empty workpaper can be restored');
  await select('30');await page.locator('[data-mw-paper-choose]').click();await d.locator('[data-paper-expand="20"]').click();assert.match(await d.innerText(),/کاربرگ فعلی: دارایی ثابت/);await d.locator('label').filter({hasText:'استهلاک ساختمان'}).locator('input').check();page.once('dialog',x=>x.accept());await d.locator('[data-paper-save]').click();assert.equal(await total(),'-90');
  await select('10');assert.equal(await total(),'240');await page.locator('[data-mw-paper-choose]').click();await d.locator('[data-paper-expand="20"]').click();await d.locator('label').filter({hasText:'استهلاک تجهیزات'}).locator('input').uncheck();page.once('dialog',x=>x.accept());await d.locator('[data-paper-save]').click();assert.equal(await total(),'300');
  await select('20');assert.equal(await total(),'-60');await page.locator('[data-mw-paper-choose]').click();await d.locator('[data-paper-expand="20"]').click();await d.locator('label').filter({hasText:'استهلاک ساختمان'}).locator('input').check();page.once('dialog',x=>x.accept());await d.locator('[data-paper-save]').click();assert.equal(await total(),'-100');
  await select('30');assert.equal(await total(),'-50');await page.locator('[data-mw-view="A-70"]').click();assert.equal(await page.locator('#mwPreview tbody').innerText(),beforeA);
  assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('workpaper moves handle invalid amounts, large groups, search and new ledgers safely', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const {page,context,errors}=await setup(browser);
  await page.evaluate(()=>{ACCOUNT_ROWS=[{'کد حساب کل':'1','عنوان حساب کل':'مقصد','کد حساب معین':'1','عنوان حساب معین':'نخست','بدهکار':'999999999999999999999','بستانکار':''},...Array.from({length:103},(_,i)=>({'کد حساب کل':'2','عنوان حساب کل':'منبع','کد حساب معین':String(i+1),'عنوان حساب معین':'جزء '+(i+1),'بدهکار':i===0?'نامعتبر':'1','بستانکار':''}))];gotoModule('mainWorkpaper');});
  await page.locator('[data-mw-paper-choose]').click();const d=page.locator('#mwPaperDialog');await d.locator('[data-paper-expand="2"]').click();assert.equal(await d.locator('[data-paper-account]').count(),100);await d.locator('[data-paper-child-next="2"]').click();assert.equal(await d.locator('[data-paper-account]').count(),3);
  await d.locator('#mwPaperSearch').fill('جزء 1');assert(await d.locator('[data-paper-account]').count()>0);await d.locator('#mwPaperSearch').fill('');await d.locator('[data-paper-major="2"]').check();page.once('dialog',x=>x.accept());await d.locator('[data-paper-save]').click();
  assert.equal(await page.locator('#mwPreview tbody tr:not(.mw-total)').count(),104);assert.equal(await page.locator('#mwPreview .mw-total').getAttribute('data-mw-amount'),'','invalid moved amount propagates instead of becoming zero');
  assert.equal(await page.locator('[data-mw-view="accounts"][data-mw-active="2"]').count(),0);await sheetAction(page,'accounts','2',true,'بازگرداندن');assert.equal(await page.locator('#mwPreview tbody tr:not(.mw-total)').count(),0);
  await page.evaluate(()=>{ACCOUNT_ROWS=[{'کد حساب کل':'1','عنوان حساب کل':'مقصد جدید','کد حساب معین':'1','عنوان حساب معین':'نخست','بدهکار':'900719925474099300001','بستانکار':''},{'کد حساب کل':'2','عنوان حساب کل':'منبع جدید','کد حساب معین':'1','عنوان حساب معین':'جدید','بدهکار':'3','بستانکار':''}];gotoModule('mainWorkpaper');});
  assert.equal(await page.locator('#mwPreview .mw-total').getAttribute('data-mw-amount'),'900719925474099300001');await page.locator('[data-mw-view="accounts"][data-mw-active="2"]').click();assert.equal(await page.locator('#mwPreview .mw-total').getAttribute('data-mw-amount'),'3','assignments do not leak into a new source');assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('workpaper transfer picker is usable in dark mode on a short mobile screen', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{
  const {page,context,errors}=await setup(browser);await page.setViewportSize({width:390,height:580});await page.evaluate(()=>applyTheme('dark'));await page.locator('[data-mw-paper-choose]').click();const dialog=page.locator('#mwPaperDialog');assert(await dialog.isVisible());await dialog.locator('[data-paper-expand]').first().click();
  const metrics=await dialog.evaluate(el=>{const rgb=s=>s.match(/[\d.]+/g).map(Number),lum=c=>c.slice(0,3).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0);return [...el.querySelectorAll('h2,.mw-topic-major-info b,.mw-topic-account b,.mw-topic-account small,.mw-topic-expand')].map(x=>{const fg=rgb(getComputedStyle(x).color);let bg;for(let p=x;p;p=p.parentElement){const c=rgb(getComputedStyle(p).backgroundColor);if(c.length===3||c[3]>.99){bg=c;break;}}const a=lum(fg),b=lum(bg||[255,255,255]);return {text:x.textContent,contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};});});
  for(const x of metrics)assert(x.contrast>=4.5,`${x.text}: ${x.contrast}`);assert(await dialog.locator('[data-paper-save]').isVisible());assert(await dialog.locator('#mwPaperSearch').isVisible());const box=await dialog.boundingBox(),save=await dialog.locator('[data-paper-save]').boundingBox();assert(save.y+save.height<=box.y+box.height+1&&save.y+save.height<=581,'save button remains within short mobile screen');assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('empty workpapers are hidden and can be shown and have their original accounts restored', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{
  const {page,context,errors}=await setup(browser);
  await page.evaluate(()=>{ACCOUNT_ROWS=[
   {'کد حساب کل':'1','عنوان حساب کل':'مقصد','کد حساب معین':'1','عنوان حساب معین':'مبنا','بدهکار':'100','بستانکار':''},
   {'کد حساب کل':'2','عنوان حساب کل':'مبدأ','کد حساب معین':'1','عنوان حساب معین':'جزء اول','بدهکار':'20','بستانکار':''},
   {'کد حساب کل':'2','عنوان حساب کل':'مبدأ','کد حساب معین':'2','عنوان حساب معین':'جزء دوم','بدهکار':'','بستانکار':'20'},
   {'کد حساب کل':'3','عنوان حساب کل':'مانده صفر','کد حساب معین':'1','عنوان حساب معین':'صفر','بدهکار':'0','بستانکار':'0'},
   {'کد حساب کل':'4','عنوان حساب کل':'مقصد دوم','کد حساب معین':'1','عنوان حساب معین':'مبنا دوم','بدهکار':'50','بستانکار':''}];gotoModule('mainWorkpaper');});await page.evaluate(()=>document.fonts.ready);
  const tab=id=>page.locator(`[data-mw-view="accounts"][data-mw-active="${id}"]`),dialog=page.locator('#mwPaperDialog'),total=()=>page.locator('#mwPreview .mw-total').getAttribute('data-mw-amount');
  await page.locator('[data-mw-view="A-70"]').click();const baseline=await page.locator('#mwPreview tbody').innerText();await tab('1').click();
  await page.locator('[data-mw-paper-choose]').click();await dialog.locator('[data-paper-major="2"]').check();page.once('dialog',d=>d.accept());await dialog.locator('[data-paper-save]').click();assert.equal(await tab('2').count(),0);assert.equal(await tab('3').count(),1,'a zero balance with a row is not empty');assert.equal(await total(),'100');
  assert.equal(await page.locator('.mw-hidden-nav .mw-sheet-pair').count(),1);assert.equal(await total(),'100');
  await sheetAction(page,'accounts','2',true,'بازگرداندن');assert.equal(await total(),'');assert.equal(await page.locator('#mwPreview tbody tr:not(.mw-total)').count(),0);await page.locator('[data-mw-view="A-71"]').click();assert.equal(await tab('2').count(),1,'explicitly shown empty workpaper stays visible');
  await tab('4').click();await page.locator('[data-mw-paper-choose]').click();await dialog.locator('[data-paper-expand="2"]').click();await dialog.locator('label').filter({hasText:'جزء اول'}).locator('input').check();page.once('dialog',d=>d.accept());await dialog.locator('[data-paper-save]').click();assert.equal(await total(),'70');
  await tab('2').click();await page.locator('[data-mw-paper-choose]').click();await dialog.locator('[data-paper-major="2"]').check();page.once('dialog',d=>d.accept());await dialog.locator('[data-paper-save]').click();assert.equal(await total(),'0');assert.equal(await page.locator('#mwPreview tbody tr:not(.mw-total)').count(),2);
  await tab('1').click();assert.equal(await total(),'100');await tab('4').click();assert.equal(await total(),'50');
  await tab('1').click();await page.locator('[data-mw-paper-choose]').click();await dialog.locator('[data-paper-major="2"]').check();page.once('dialog',d=>d.accept());await dialog.locator('[data-paper-save]').click();assert.equal(await tab('2').count(),0,'workpaper is hidden again after being emptied again');
  await sheetAction(page,'accounts','2',true,'بازگرداندن');assert.equal(await tab('2').getAttribute('aria-current'),'page');assert.equal(await total(),'');await page.locator('[data-mw-paper-choose]').click();await dialog.locator('[data-paper-major="2"]').check();page.once('dialog',d=>d.accept());await dialog.locator('[data-paper-save]').click();assert.equal(await total(),'0');assert.equal(await page.locator('#mwPreview tbody tr:not(.mw-total)').count(),2);
  await tab('1').click();assert.equal(await total(),'100');await page.locator('[data-mw-view="A-70"]').click();assert.equal(await page.locator('#mwPreview tbody').innerText(),baseline);assert.equal(await page.locator('#mwPrint').isEnabled(),true);assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('fixed asset workpaper has reference sections and separate blank movement analysis without fabricated amounts', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{
  const {page,context,errors}=await setup(browser);await page.evaluate(()=>{ACCOUNT_ROWS=[
   {'کد حساب کل':'10','عنوان حساب کل':'دارایی ثابت مشهود','کد حساب معین':'1','عنوان حساب معین':'زمین','بدهکار':'1000','بستانکار':''},
   {'کد حساب کل':'10','عنوان حساب کل':'دارایی ثابت مشهود','کد حساب معین':'2','عنوان حساب معین':'ساختمان','بدهکار':'2000','بستانکار':''},
   {'کد حساب کل':'20','عنوان حساب کل':'استهلاک انباشته دارایی ثابت','کد حساب معین':'7','عنوان حساب معین':'استهلاک انباشته ساختمان','بدهکار':'','بستانکار':'300'},
   {'کد حساب کل':'30','عنوان حساب کل':'دارایی نامشهود','کد حساب معین':'1','عنوان حساب معین':'نرم افزار','بدهکار':'75','بستانکار':''}];gotoModule('mainWorkpaper');});await page.evaluate(()=>document.fonts.ready);
  const asset=page.locator('[data-mw-view="accounts"][data-mw-active="10"]');await asset.click();const groups=page.locator('#mwPreview tr.mw-group');assert.deepEqual(await groups.allTextContents(),['بهای تمام‌شده','استهلاک انباشته']);
  await page.locator('[data-mw-paper-choose]').click();const d=page.locator('#mwPaperDialog');await d.locator('[data-paper-major="20"]').check();page.once('dialog',x=>x.accept());await d.locator('[data-paper-save]').click();
  assert.equal(await page.locator('#mwPreview .mw-total').getAttribute('data-mw-amount'),'2700');assert.match(await page.locator('#mwPreview .mw-total').innerText(),/ارزش دفتری/);
  const texts=await page.locator('#mwPreview tbody tr').allTextContents();assert(texts.indexOf('بهای تمام‌شده')<texts.findIndex(x=>x.includes('زمین')));assert(texts.findIndex(x=>x.includes('ساختمان')&&!x.includes('استهلاک'))<texts.indexOf('استهلاک انباشته'));assert(texts.indexOf('استهلاک انباشته')<texts.findIndex(x=>x.includes('استهلاک انباشته ساختمان')));
  assert.equal(await page.locator('[data-mw-view="asset-analysis"]').count(),1,'intangible and depreciation accounts are not treated as fixed asset accounts');
  await page.evaluate(()=>{window.print=()=>{};});await page.locator('#mwPrint').click();await page.emulateMedia({media:'print'});assert.match(await page.locator('#printHost').innerText(),/ارزش دفتری/);assert.equal(await page.locator('#printHost [data-mw-paper-choose]').count(),0);const mainPdf=await page.pdf({format:'A4',landscape:true,printBackground:true});if(process.env.SAVE_FIXED_ASSET_MAIN_PDF)fs.writeFileSync(process.env.SAVE_FIXED_ASSET_MAIN_PDF,mainPdf);await page.emulateMedia({media:'screen'});await page.evaluate(()=>window.__activePrintRestore?.());
  await page.locator('[data-mw-view="asset-analysis"][data-mw-active="10"]').click();assert.match(await page.locator('#mwPreview .mw-preview-tools').innerText(),/خالی/);
  const pages=page.locator('#mwPreview .mw-paper');assert((await pages.count())>=1);assert.equal(await pages.locator('.mw-controls').count(),1);assert.equal(await pages.last().locator('.mw-controls').count(),1);
  const heads=await pages.first().locator('thead th').allTextContents();assert.deepEqual(heads,['عنوان آنالیز','عطف','زمین','ساختمان','جمع']);assert(await pages.first().locator('thead th').evaluateAll(xs=>xs.every(el=>{const s=getComputedStyle(el);return +s.fontWeight>=700&&parseFloat(s.fontSize)>=13&&parseFloat(s.fontSize)<15;})),'analysis headers use the same compact bold font');
  assert(await pages.locator('tbody tr:not(.mw-group)').evaluateAll(rs=>rs.every(r=>[...r.cells].slice(1).every(c=>c.textContent.trim()===''))),'all analytical figures remain blank');assert.equal(await page.locator('#mwPrint').isEnabled(),true);
  await page.evaluate(()=>{window.print=()=>{};});await page.locator('#mwPrint').click();await page.emulateMedia({media:'print'});const printPages=page.locator('#printHost .mw-paper'),count=await printPages.count();assert.equal(count,await pages.count());assert.equal(await printPages.locator('.mw-controls').count(),1);const bytes=await page.pdf({format:'A4',landscape:true,printBackground:true});if(process.env.SAVE_FIXED_ASSET_PDF)fs.writeFileSync(process.env.SAVE_FIXED_ASSET_PDF,bytes);const pdf=await require('pdf-lib').PDFDocument.load(bytes);assert.equal(pdf.getPageCount(),count);assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('fixed asset analysis splits many real asset columns across pages and keeps controls only at the end', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{
  const {page,context,errors}=await setup(browser);await page.evaluate(()=>{ACCOUNT_ROWS=Array.from({length:13},(_,i)=>({'کد حساب کل':'10','عنوان حساب کل':'دارایی های ثابت مشهود','کد حساب معین':String(i+1),'عنوان حساب معین':'دارایی '+(i+1),'بدهکار':String(i+1),'بستانکار':''}));gotoModule('mainWorkpaper');});await page.evaluate(()=>document.fonts.ready);
  await page.locator('[data-mw-view="asset-analysis"][data-mw-active="10"]').click();const pages=page.locator('#mwPreview .mw-paper'),count=await pages.count();assert(count>=3);assert.equal(await pages.locator('.mw-controls').count(),1);assert.equal(await pages.last().locator('.mw-controls').count(),1);
  const headers=await pages.locator('thead').allTextContents();for(let i=1;i<=13;i++)assert(headers.some(x=>new RegExp('دارایی '+i+'(?![0-9])').test(x)),`account ${i} has an analysis column`);
  assert(await pages.evaluateAll(ps=>ps.every(p=>{const c=p.querySelector('.mw-card'),inside=p.querySelector('.mw-inside');return c.scrollHeight<=c.clientHeight+1&&inside.scrollHeight<=inside.clientHeight+1;})));assert(await page.locator('#mwPrint').isEnabled());
  for(let i=0;i<count;i++)assert.match(await pages.nth(i).locator('.mw-paper-foot').innerText(),/^صفحه [۰-۹]+ از [۰-۹]+$/);
  await page.evaluate(()=>{window.print=()=>{};});await page.locator('#mwPrint').click();await page.emulateMedia({media:'print'});const printed=page.locator('#printHost .mw-paper');assert.equal(await printed.count(),count);assert.equal(await printed.locator('.mw-controls').count(),1);const pdf=await require('pdf-lib').PDFDocument.load(await page.pdf({format:'A4',landscape:true,printBackground:true}));assert.equal(pdf.getPageCount(),count);assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('fixed asset section suggestions are reviewable without changing ledger balances or final statements', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{
  const {page,context,errors}=await setup(browser);await page.evaluate(()=>{ACCOUNT_ROWS=[
   {'کد حساب کل':'10','عنوان حساب کل':'دارایی‌های ثابت مشهود','کد حساب معین':'1','عنوان حساب معین':'حساب ناشناخته','بدهکار':'500','بستانکار':''},
   {'کد حساب کل':'10','عنوان حساب کل':'دارایی‌های ثابت مشهود','کد حساب معین':'2','عنوان حساب معین':'استهلاک انباشته ماشین','بدهکار':'','بستانکار':'100'}];gotoModule('mainWorkpaper');});await page.evaluate(()=>document.fonts.ready);
  await page.locator('[data-mw-view="A-70"]').click();const original=await page.locator('#mwPreview tbody').innerText();await page.locator('[data-mw-view="accounts"][data-mw-active="10"]').click();
  await page.locator('.mw-asset-review summary').click();let item=page.locator('.mw-asset-review-item').filter({hasText:'حساب ناشناخته'});await item.locator('select').selectOption('other');assert.match(await page.locator('#mwPreview').innerText(),/سایر حساب‌های انتخاب‌شده/);assert.equal(await page.locator('#mwPreview .mw-total').last().getAttribute('data-mw-amount'),'400');assert.match(await page.locator('#mwPreview .mw-total').last().innerText(),/جمع مانده دفتر|جمع حساب کل|جمع کاربرگ/);
  item=page.locator('.mw-asset-review-item').filter({hasText:'حساب ناشناخته'});await item.locator('select').selectOption('cost');assert.equal(await page.locator('#mwPreview .mw-total').last().getAttribute('data-mw-amount'),'400');assert.match(await page.locator('#mwPreview .mw-total').last().innerText(),/ارزش دفتری/);
  await page.locator('[data-mw-view="asset-analysis"][data-mw-active="10"]').click();assert.match(await page.locator('#mwPreview thead').first().innerText(),/حساب ناشناخته/);await page.locator('[data-mw-view="A-70"]').click();assert.equal(await page.locator('#mwPreview tbody').innerText(),original);assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('fixed asset workpaper places construction and capital items after book value without changing the final total', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{
  const {page,context,errors}=await setup(browser);await page.evaluate(()=>{ACCOUNT_ROWS=[
   ['1','ساختمان','200',''],['2','استهلاک انباشته ساختمان','','50'],['3','دارایی در جریان تکمیل','80',''],['4','پیش پرداخت سرمایه ای','20','']
  ].map(([code,title,debit,credit])=>({'کد حساب کل':'10','عنوان حساب کل':'دارایی ثابت مشهود','کد حساب معین':code,'عنوان حساب معین':title,'بدهکار':debit,'بستانکار':credit}));gotoModule('mainWorkpaper');});await page.evaluate(()=>document.fonts.ready);
  const rows=page.locator('#mwPreview tbody tr'),contents=await rows.allTextContents(),book=contents.findIndex(x=>x.includes('ارزش دفتری اقلام بالا')),construction=contents.findIndex(x=>x.includes('دارایی در جریان تکمیل')),advance=contents.findIndex(x=>x.includes('پیش پرداخت سرمایه ای'));assert(book>=0&&book<construction&&construction<advance);
  assert.equal(await page.locator('#mwPreview .mw-asset-book').getAttribute('data-mw-amount'),'150');assert.equal(await page.locator('#mwPreview .mw-total').last().getAttribute('data-mw-amount'),'250');
  await page.locator('[data-mw-view="asset-analysis"][data-mw-active="10"]').click();const header=await page.locator('#mwPreview thead').first().innerText();assert.match(header,/دارایی در جریان تکمیل/);assert.match(header,/پیش پرداخت سرمایه ای/);assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('every sheet has a three-dot menu and deletion only moves it to the lower bar without losing data', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{
  const {page,context,errors}=await setup(browser);await page.evaluate(()=>{ACCOUNT_ROWS=[
   {'کد حساب کل':'10','عنوان حساب کل':'دارایی ثابت مشهود','کد حساب معین':'1','عنوان حساب معین':'زمین','بدهکار':'200','بستانکار':''},
   {'کد حساب کل':'20','عنوان حساب کل':'استهلاک انباشته','کد حساب معین':'1','عنوان حساب معین':'استهلاک ساختمان','بدهکار':'','بستانکار':'50'}];gotoModule('mainWorkpaper');});await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('.mw-nav .mw-sheet-pair').count(),7);assert.equal(await page.locator('.mw-nav .mw-sheet-more').count(),7);assert.equal(await page.locator('.mw-hidden-nav').count(),0);
  await page.locator('[data-mw-view="A-70"]').click();const before=await page.locator('#mwPreview tbody').innerText();await sheetAction(page,'A-70','',false,'حذف');assert.equal(await page.locator('.mw-nav [data-mw-view="A-70"]').count(),0);assert.equal(await page.locator('.mw-hidden-nav .mw-sheet-pair').count(),1);assert.match(await page.locator('.mw-hidden-nav').innerText(),/A-70/);
  await sheetAction(page,'accounts','20',false,'حذف');assert.equal(await page.locator('.mw-nav [data-mw-view="accounts"][data-mw-active="20"]').count(),0);assert.equal(await page.locator('.mw-hidden-nav .mw-sheet-more').count(),2);
  await page.locator('[data-mw-view="accounts"][data-mw-active="10"]').click();await page.locator('[data-mw-paper-choose]').click();const d=page.locator('#mwPaperDialog');await d.locator('[data-paper-major="20"]').check();page.once('dialog',x=>x.accept());await d.locator('[data-paper-save]').click();assert.equal(await page.locator('#mwPreview .mw-total').last().getAttribute('data-mw-amount'),'150');
  await sheetAction(page,'A-70','',true,'بازگرداندن');assert.equal(await page.locator('#mwPreview tbody').innerText(),before,'hiding and moving a sheet did not change final-statement data');
  await sheetAction(page,'asset-analysis','10',false,'حذف');assert.equal(await page.locator('.mw-nav [data-mw-view="asset-analysis"]').count(),0);await sheetAction(page,'asset-analysis','10',true,'بازگرداندن');assert.equal(await page.locator('.mw-nav [data-mw-view="asset-analysis"][aria-current="page"]').count(),1);
  await sheetAction(page,'accounts','10',false,'حذف');assert.equal(await page.locator('.mw-nav [data-mw-view="accounts"][data-mw-active="10"]').count(),0);assert.equal(await page.locator('.mw-nav [data-mw-view="asset-analysis"]').count(),1,'analysis can remain visible when its main sheet is hidden');
  await sheetAction(page,'accounts','10',true,'بازگرداندن');assert.equal(await page.locator('#mwPreview .mw-total').last().getAttribute('data-mw-amount'),'150');assert.equal(await page.locator('#printHost .mw-sheet-more').count(),0);
  await page.evaluate(()=>{window.print=()=>{};});await page.locator('#mwPrint').click();await page.emulateMedia({media:'print'});assert.equal(await page.locator('#printHost .mw-sheet-more').count(),0);const pdf=await require('pdf-lib').PDFDocument.load(await page.pdf({format:'A4',landscape:true,printBackground:true}));assert(pdf.getPageCount()>0);await page.emulateMedia({media:'screen'});await page.evaluate(()=>window.__activePrintRestore?.());
  assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('all sheets can be hidden and restored, and a new ledger resets manual visibility', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{
  const {page,context,errors}=await setup(browser);await page.evaluate(()=>{ACCOUNT_ROWS=[{'کد حساب کل':'1','عنوان حساب کل':'نقد','کد حساب معین':'1','عنوان حساب معین':'نقد','بدهکار':'42','بستانکار':''}];gotoModule('mainWorkpaper');});
  for(const view of ['A-70','A-71','A-72','A-73'])await sheetAction(page,view,'',false,'حذف');await sheetAction(page,'accounts','1',false,'حذف');
  assert.equal(await page.locator('.mw-nav .mw-sheet-pair').count(),0);assert.equal(await page.locator('.mw-hidden-nav .mw-sheet-pair').count(),5);assert.match(await page.locator('#mwPreview').innerText(),/کاربرگی برای نمایش انتخاب نشده/);assert(await page.locator('#mwPrint').isDisabled());
  await sheetAction(page,'accounts','1',true,'بازگرداندن');assert.equal(await page.locator('#mwPreview .mw-total').getAttribute('data-mw-amount'),'42');assert(await page.locator('#mwPrint').isEnabled());
  await page.evaluate(()=>{ACCOUNT_ROWS=[{'کد حساب کل':'2','عنوان حساب کل':'جدید','بدهکار':'3','بستانکار':''}];gotoModule('mainWorkpaper');});assert.equal(await page.locator('.mw-hidden-nav').count(),0);assert.equal(await page.locator('.mw-nav .mw-sheet-pair').count(),5);assert.equal(await page.locator('#mwPreview .mw-total').getAttribute('data-mw-amount'),'3');assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('sheet menus and both scrollable bars work on a short dark mobile screen', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{
  const {page,context,errors}=await setup(browser);await page.setViewportSize({width:390,height:580});await page.evaluate(()=>{applyTheme('dark');ACCOUNT_ROWS=Array.from({length:12},(_,i)=>({'کد حساب کل':String(i+1),'عنوان حساب کل':'حساب آزمایشی '+(i+1),'بدهکار':'10','بستانکار':''}));gotoModule('mainWorkpaper');});
  const nav=page.locator('.mw-nav');assert(await nav.evaluate(el=>el.scrollWidth>el.clientWidth));await page.locator('[data-mw-scroll="left"]').click();await page.waitForTimeout(500);assert((await nav.evaluate(el=>el.scrollLeft))<0);await page.locator('[data-mw-scroll="right"]').click();await page.waitForTimeout(500);
  for(const view of ['A-70','A-71','A-72','A-73'])await sheetAction(page,view,'',false,'حذف');const hidden=page.locator('.mw-hidden-nav');assert(await hidden.evaluate(el=>el.scrollWidth>el.clientWidth));await page.locator('[data-mw-hidden-scroll="left"]').click();await page.waitForTimeout(500);assert((await hidden.evaluate(el=>el.scrollLeft))<0);await page.locator('[data-mw-hidden-scroll="right"]').click();await page.waitForTimeout(500);
  const trigger=hidden.locator('.mw-sheet-more').first();await trigger.click();let menu=page.locator('#mwSheetMenu');assert(await menu.isVisible());assert.equal(await trigger.getAttribute('aria-expanded'),'true');const bounds=await menu.boundingBox();assert(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=390&&bounds.y+bounds.height<=580);const colors=await menu.evaluate(el=>({bg:getComputedStyle(el).backgroundColor,fg:getComputedStyle(el).color}));assert.notEqual(colors.bg,colors.fg);await page.keyboard.press('Escape');assert(await menu.isHidden());assert.equal(await trigger.getAttribute('aria-expanded'),'false');assert(await trigger.evaluate(el=>document.activeElement===el));
  await trigger.click();await page.locator('.mw-hidden-title').click();assert(await menu.isHidden());await trigger.click();await hidden.evaluate(el=>{el.scrollLeft=-60;});await page.waitForTimeout(100);assert(await menu.isVisible());const afterScroll=await menu.boundingBox();assert(afterScroll.x>=0&&afterScroll.x+afterScroll.width<=390);await page.keyboard.press('Escape');assert(await menu.isHidden());assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('removed account and mapping panels stay absent without changing ledger or workpaper links', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{
  const {page,context,errors}=await setup(browser);const before=await page.evaluate(()=>JSON.stringify(ACCOUNT_ROWS));const mappingBefore=(await snapshot(page)).links;const h=page.locator('#mainWorkpaperModule');
  const verify=async()=>{assert.equal(await h.locator('.mw-classification, [data-mw-detail], [data-mw-link], [data-mw-approve], #mwMatching, .mw-matching, [data-mw-map-link]').count(),0);assert.doesNotMatch(await h.innerText(),/خلاصه حساب کل|اتصال معین‌های|ردیابی اسناد|بخش طبقه‌بندی — غیرفعال|بازبینی و ویرایش اتصال همه حساب‌ها/);};
  await verify();await page.locator('[data-mw-view="accounts"][data-mw-active="02"]').click();await verify();await page.locator('[data-mw-view="A-70"]').click();await verify();
  const cash=page.locator('#mwPreview tbody tr').filter({has:page.locator('.mw-description',{hasText:'موجودی نقد'})});assert.equal(await cash.getAttribute('data-mw-amount'),'130');
  await page.locator('[data-mw-topic-choose="A-70|1|5"]').click();const d=page.locator('#mwTopicDialog');assert(await d.isVisible());await d.locator('[data-topic-expand="01"]').click();assert(await d.locator('[data-topic-account]').first().isChecked());await d.locator('[data-topic-cancel]').first().click();
  assert.equal(await page.locator('#mwMatching, .mw-matching, [data-mw-map-link]').count(),0);await verify();assert.equal(await page.evaluate(()=>JSON.stringify(ACCOUNT_ROWS)),before);assert.deepEqual((await snapshot(page)).links,mappingBefore);assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});



test('amount columns are equally wide and cannot be edited on account and A workpapers', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{
  const {page,context,errors}=await setup(browser);await page.evaluate(()=>{ACCOUNT_ROWS=[{'نوع سند':'ابتدای سال','کد حساب کل':'10','عنوان حساب کل':'دارایی ثابت مشهود','کد حساب معین':'1','عنوان حساب معین':'زمین','بدهکار':'100000000','بستانکار':''},{'نوع سند':'ابتدای سال','کد حساب کل':'10','عنوان حساب کل':'دارایی ثابت مشهود','کد حساب معین':'2','عنوان حساب معین':'ساختمان','بدهکار':'100','بستانکار':''}];gotoModule('mainWorkpaper');});await page.evaluate(()=>document.fonts.ready);const before=await page.evaluate(()=>JSON.stringify(ACCOUNT_ROWS));
  for(const view of ['accounts','A-70','A-71','A-72','A-73']){
   if(view!=='accounts')await page.locator(`[data-mw-view="${view}"]`).click();
   assert.equal(await page.locator('#mwPreview .mw-paper-table input, #mwPreview .mw-paper-table [contenteditable]').count(),0,view);
   const widths=await page.locator('#mwPreview .mw-paper').first().locator('colgroup col').evaluateAll(cs=>cs.slice(-11).map(c=>c.getBoundingClientRect().width));assert.equal(widths.length,11);assert(Math.max(...widths)-Math.min(...widths)<0.2,`${view}: ${widths}`);
   assert(await page.locator('#mwPrint').isEnabled(),view);
  }
  await page.locator('[data-mw-view="asset-analysis"]').click();const widths=await page.locator('#mwPreview .mw-paper').first().locator('colgroup col').evaluateAll(cs=>cs.slice(2).map(c=>c.getBoundingClientRect().width));assert(widths.length>1);assert(Math.max(...widths)-Math.min(...widths)<0.2,`analysis: ${widths}`);
  await page.locator('[data-mw-view="accounts"][data-mw-active="10"]').click();const first=page.locator('#mwPreview tbody tr').filter({has:page.locator('.mw-description',{hasText:'زمین'})});assert.equal((await first.locator('[data-mw-calc-col="2"]').innerText()).trim(),'۱۰۰٬۰۰۰٬۰۰۰');assert.equal((await first.locator('[data-mw-calc-col="6"]').innerText()).trim(),'۱۰۰٬۰۰۰٬۰۰۰');assert.equal(await page.evaluate(()=>JSON.stringify(ACCOUNT_ROWS)),before);
  await page.evaluate(()=>{window.print=()=>{};});await page.locator('#mwPrint').click();await page.emulateMedia({media:'print'});assert.equal(await page.locator('#printHost input').count(),0);const pdf=await require('pdf-lib').PDFDocument.load(await page.pdf({format:'A4',landscape:true,printBackground:true}));assert(pdf.getPageCount()>0);await page.emulateMedia({media:'screen'});await page.evaluate(()=>window.__activePrintRestore?.());assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('formulas retain correct signed arithmetic for synthetic source entries without exposing direct entry', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{
  const {page,context,errors}=await setup(browser);await page.evaluate(()=>{ACCOUNT_ROWS=[{'نوع سند':'ابتدای سال','کد حساب کل':'1','عنوان حساب کل':'پرداختنی تجاری','کد حساب معین':'1','عنوان حساب معین':'پرداختنی تجاری','بدهکار':'','بستانکار':'80'},{'نوع سند':'سند جاری','کد حساب کل':'1','عنوان حساب کل':'پرداختنی تجاری','کد حساب معین':'1','عنوان حساب معین':'پرداختنی تجاری','بدهکار':'','بستانکار':'20'}];gotoModule('mainWorkpaper');});
  await page.evaluate(()=>window.__mwTestSyntheticEdits(JSON.stringify(['account',JSON.stringify(['1','1'])]),{adjD:'15',adjC:'5',classC:'10',priorD:'20'}));const gl=page.locator('#mwPreview tbody tr').filter({has:page.locator('.mw-description',{hasText:'پرداختنی تجاری'})}).first();assert.equal((await gl.locator('[data-mw-calc-col="2"]').innerText()).trim(),'(۹۰)');assert.equal((await gl.locator('[data-mw-calc-col="5"]').innerText()).trim(),'(۱۰۰)');assert.equal((await gl.locator('[data-mw-calc-col="9"]').innerText()).trim(),'(۶۰)');
  await page.locator('[data-mw-view="A-71"]').click();await page.evaluate(()=>window.__mwTestSyntheticEdits('A-71|2|0',{adjD:'15',adjC:'5',classC:'10',priorD:'20'}));const row=page.locator('[data-mw-topic-choose="A-71|2|0"]').locator('xpath=ancestor::tr');assert.equal((await row.locator('[data-mw-calc-col="2"]').innerText()).trim(),'۹۰');assert.equal((await row.locator('[data-mw-calc-col="5"]').innerText()).trim(),'۱۰۰');assert.equal((await row.locator('[data-mw-calc-col="9"]').innerText()).trim(),'۶۰');assert.equal(await page.locator('#mwPreview input').count(),0);assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('code and title widths adapt to content and monetary columns keep their font size', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{
  const {page,context,errors}=await setup(browser);await page.evaluate(()=>{ACCOUNT_ROWS=[{'نوع سند':'ابتدای سال','کد حساب کل':'1','عنوان حساب کل':'موجودی نقد','کد حساب معین':'12345','عنوان حساب معین':'صندوق','بدهکار':'1726971789','بستانکار':''}];gotoModule('mainWorkpaper');});await page.evaluate(()=>document.fonts.ready);
  const cols=()=>page.locator('#mwPreview .mw-paper').first().locator('colgroup col').evaluateAll(xs=>xs.map(x=>x.getBoundingClientRect().width));const small=await cols(),sum=small.reduce((a,b)=>a+b,0);assert(small[0]<sum*.07&&small[1]<sum*.16&&small[2]<sum*.08);assert(Math.max(...small.slice(3))-Math.min(...small.slice(3))<0.2);assert(small[3]>sum*.072);assert(await page.locator('#mwPrint').isEnabled());
  const first=page.locator('#mwPreview .mw-number-text').filter({hasText:'۱٬۷۲۶٬۹۷۱٬۷۸۹'}).first();assert.equal(await first.evaluate(n=>n.style.fontSize),'');assert(Math.abs(await first.evaluate(n=>parseFloat(getComputedStyle(n).fontSize))-12.533)<0.1);
  await page.locator('[data-mw-view="A-70"]').click();const a=await cols();assert(a[0]<sum*.23&&a[1]<sum*.08);assert(Math.max(...a.slice(2))-Math.min(...a.slice(2))<0.2);assert(await page.locator('#mwPrint').isEnabled());assert.equal(await page.locator('#mwPreview .mw-paper').count(),1);
  await page.evaluate(()=>{ACCOUNT_ROWS=[{'کد حساب کل':'2','عنوان حساب کل':'سایر حساب‌ها','کد حساب معین':'123456789012','عنوان حساب معین':'حساب دریافتنی تجاری از طرف قراردادهای بلندمدت و اشخاص وابسته','بدهکار':'100','بستانکار':''}];gotoModule('mainWorkpaper');});const wide=await cols();assert(wide[0]>small[0]);assert(wide[1]>small[1]);assert(Math.max(...wide.slice(3))-Math.min(...wide.slice(3))<0.2);assert.match(await page.locator('#mwPreview').innerText(),/اشخاص وابسته/);assert(await page.locator('#mwPrint').isEnabled());assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('classification registers balanced account pairs, updates GL and A and never alters ledger', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{
  const {page,context,errors}=await setup(browser);page.on('dialog',dialog=>dialog.accept());await page.evaluate(()=>{ACCOUNT_ROWS=[{'نوع سند':'ابتدای سال','کد حساب کل':'1','عنوان حساب کل':'موجودی نقد','کد حساب معین':'1','عنوان حساب معین':'بانک','بدهکار':'100','بستانکار':''},{'نوع سند':'ابتدای سال','کد حساب کل':'2','عنوان حساب کل':'دریافتنی تجاری','کد حساب معین':'2','عنوان حساب معین':'دریافتنی تجاری','بدهکار':'50','بستانکار':''}];gotoModule('mainWorkpaper');});const before=await page.evaluate(()=>JSON.stringify(ACCOUNT_ROWS));await page.locator('#mwClassOpen').click();
  const select=async(name,[kol,minor])=>{await page.locator(`[data-class-open="${name}"]`).click();await page.locator(`#mwClassDialog [data-class-expand='${JSON.stringify(['hier',[0,kol]])}']`).click();await page.locator(`#mwClassDialog [data-class-select='${JSON.stringify([kol,minor])}']`).click();};
  await select('source',['1','1']);await select('destination',['2','2']);await page.locator('[name="sourceSide"]').selectOption('C');await page.locator('[name="amount"]').fill('۲۰');await page.locator('[name="description"]').fill('انتقال جاری');await page.locator('#mwClassForm button[type=submit]').click();
  assert.equal(await page.locator('[data-class-delete]').count(),1);const rows=page.locator('#mwPreview tbody tr:not(.mw-total)');assert.equal(await rows.count(),2);assert.equal((await rows.nth(0).locator('td').nth(5).innerText()).trim(),'۲۰');assert.equal((await rows.nth(1).locator('td').nth(4).innerText()).trim(),'۲۰');assert(await page.locator('#mwPrint').isEnabled());
  await select('source',['1','1']);await select('destination',['2','2']);await page.locator('[name="sourceSide"]').selectOption('D');await page.locator('[name="period"]').selectOption('prior');await page.locator('[name="amount"]').fill('10');await page.locator('[name="description"]').fill('تجدید ارائه');await page.locator('#mwClassForm button[type=submit]').click();assert.equal(await page.locator('[data-class-delete]').count(),2);
  await page.locator('[data-mw-view="accounts"][data-mw-active="1"]').click();const gl=page.locator('#mwPreview tbody tr').filter({has:page.locator('.mw-description',{hasText:'بانک'})}).first();for(const [idx,amount] of [[3,''],[4,'۲۰'],[5,'۸۰'],[6,'۱۰۰'],[7,'۱۰'],[9,'۱۱۰']])assert.equal((await gl.locator(`[data-mw-calc-col="${idx}"]`).innerText()).trim(),amount,`GL ${idx}`);
  await page.locator('[data-mw-view="A-70"]').click();const cash=page.locator('[data-mw-topic-choose="A-70|1|5"]').locator('xpath=ancestor::tr');for(const [idx,amount] of [[4,'۲۰'],[5,'۸۰'],[6,'۱۰۰'],[7,'۱۰'],[9,'۱۱۰']])assert.equal((await cash.locator(`[data-mw-calc-col="${idx}"]`).innerText()).trim(),amount,`A ${idx}`);
  await page.locator('#mwClassOpen').click();await page.locator('[data-class-delete="0"]').click();assert.equal(await page.locator('[data-class-delete]').count(),1);await page.locator('[data-mw-view="accounts"][data-mw-active="1"]').click();assert.equal((await page.locator('#mwPreview tbody tr').filter({has:page.locator('.mw-description',{hasText:'بانک'})}).first().locator('[data-mw-calc-col="5"]').innerText()).trim(),'۱۰۰');assert.equal(await page.evaluate(()=>JSON.stringify(ACCOUNT_ROWS)),before);
  await page.evaluate(()=>{ACCOUNT_ROWS=[{'کد حساب کل':'9','عنوان حساب کل':'حساب جدید','کد حساب معین':'1','عنوان حساب معین':'جدید','بدهکار':'1'}];gotoModule('mainWorkpaper');});await page.locator('#mwClassOpen').click();assert.equal(await page.locator('[data-class-delete]').count(),0);assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('manual column resize survives navigation, reaches print and can be reset', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{
  const {page,context,errors}=await setup(browser);await page.evaluate(()=>{ACCOUNT_ROWS=[{'کد حساب کل':'1','عنوان حساب کل':'موجودی نقد','کد حساب معین':'1','عنوان حساب معین':'بانک','بدهکار':'100','بستانکار':''}];gotoModule('mainWorkpaper');});await page.evaluate(()=>document.fonts.ready);const widths=()=>page.locator('#mwPreview .mw-paper').first().locator('colgroup col').evaluateAll(cs=>cs.map(c=>c.getBoundingClientRect().width));const initial=await widths();const handle=page.locator('#mwPreview .mw-paper').first().locator('.mw-column-handle').first();await handle.scrollIntoViewIfNeeded();const b=await handle.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2-20,b.y+b.height/2,{steps:5});await page.mouse.up();const modified=await widths();assert(modified[0]>initial[0]+10,JSON.stringify({initial,modified}));assert(modified[1]<initial[1]-10);assert.equal(await page.locator('#mwPreview .mw-paper-table input').count(),0);
  await page.locator('[data-mw-view="A-70"]').click();await page.locator('[data-mw-view="accounts"][data-mw-active="1"]').click();const again=await widths();assert(Math.abs(again[0]-modified[0])<1);assert(await page.locator('#mwPrint').isEnabled());await page.evaluate(()=>{window.print=()=>{};});await page.locator('#mwPrint').click();const printWidth=await page.locator('#printHost col').first().evaluate(c=>parseFloat(c.style.width));assert(printWidth>0);assert.equal(await page.locator('#printHost .mw-column-handle').count(),0);await page.evaluate(()=>window.__activePrintRestore?.());await page.locator('#mwResetWidths').click();const reset=await widths();assert(Math.abs(reset[0]-initial[0])<1);await page.locator('#mwPreview .mw-paper').first().locator('[data-mw-column-index="0"]').focus();await page.keyboard.press('ArrowLeft');const keyboard=await widths();assert(keyboard[0]>reset[0]+3);assert.equal(await page.evaluate(()=>document.activeElement?.dataset.mwColumnIndex),'0');assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('classification editing, validation, unmapped warnings, liability sign and PDF', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{
  const {page,context,errors}=await setup(browser);page.on('dialog',dialog=>dialog.accept());await page.evaluate(()=>{ACCOUNT_ROWS=[{'نوع سند':'ابتدای سال','کد حساب کل':'1','عنوان حساب کل':'پرداختنی تجاری','کد حساب معین':'1','عنوان حساب معین':'پرداختنی تجاری','بدهکار':'','بستانکار':'100'},{'نوع سند':'ابتدای سال','کد حساب کل':'2','عنوان حساب کل':'حساب ناشناخته','کد حساب معین':'2','عنوان حساب معین':'حساب ناشناخته','بدهکار':'50','بستانکار':''}];gotoModule('mainWorkpaper');});await page.locator('#mwClassOpen').click();const choose=async(name,[kol,minor])=>{await page.locator(`[data-class-open="${name}"]`).click();await page.locator(`#mwClassDialog [data-class-expand='${JSON.stringify(['hier',[0,kol]])}']`).click();await page.locator(`#mwClassDialog [data-class-select='${JSON.stringify([kol,minor])}']`).click();};await page.locator('[data-class-open="source"]').click();await page.locator('#mwClassDialog [data-class-filter]').fill('پرداختنی');assert.equal(await page.locator('#mwClassDialog [data-class-select]').count(),1);await page.locator('#mwClassDialog [data-class-close]').click();await choose('source',['1','1']);await choose('destination',['1','1']);await page.locator('[name=sourceSide]').selectOption('D');await page.locator('[name=amount]').fill('10');await page.locator('[name=description]').fill('شرح ثبت');await page.locator('#mwClassForm button[type=submit]').click();assert.match(await page.locator('#mwClassError').innerText(),/متفاوت/);assert.equal(await page.locator('[data-class-delete]').count(),0);
  await choose('destination',['2','2']);await page.locator('[name=amount]').fill('-10');await page.locator('#mwClassForm button[type=submit]').click();assert.match(await page.locator('#mwClassError').innerText(),/مبلغ مثبت/);await page.locator('[name=amount]').fill('10');await page.locator('#mwClassForm button[type=submit]').click();assert.equal(await page.locator('[data-class-delete]').count(),1);assert.match(await page.locator('#mainWorkpaperModule').innerText(),/فاقد اتصال یا سرفصل پنهان/);
  await page.locator('[data-class-edit="0"]').click();assert.equal(await page.locator('[name=amount]').inputValue(),'10');await page.locator('[name=amount]').fill('30');await page.locator('#mwClassForm button[type=submit]').click();assert.equal(await page.locator('[data-class-delete]').count(),1);assert.equal((await page.locator('#mwPreview tbody tr').first().locator('td').nth(4).innerText()).trim(),'۳۰');assert(await page.locator('#mwPrint').isEnabled());await page.evaluate(()=>{window.print=()=>{};});await page.locator('#mwPrint').click();const pdf=await page.pdf({format:'A4',landscape:true,printBackground:true});assert((await require('pdf-lib').PDFDocument.load(pdf)).getPageCount()>0);
  await page.locator('[data-mw-view="A-71"]').click();const liability=page.locator('[data-mw-topic-choose="A-71|2|0"]').locator('xpath=ancestor::tr');assert.equal((await liability.locator('[data-mw-calc-col="3"]').innerText()).trim(),'۳۰');assert.equal((await liability.locator('[data-mw-calc-col="5"]').innerText()).trim(),'۷۰');assert(await page.locator('#mwPrint').isDisabled());assert.match(await page.locator('#mwPaginationWarning').innerText(),/وصل نیست/);await assignTopic(page,'2','2','A-70|1|3');await page.locator('[data-mw-view="A-71"]').click();assert(await page.locator('#mwPrint').isEnabled());assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('sheet delete and restore keep the sheet bar at the same viewport position', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{
  const {page,context,errors}=await setup(browser);await page.setViewportSize({width:390,height:580});await page.evaluate(()=>{ACCOUNT_ROWS=Array.from({length:55},(_,i)=>({'کد حساب کل':'1','عنوان حساب کل':'موجودی نقد','کد حساب معین':String(i+1),'عنوان حساب معین':'حساب '+(i+1),'بدهکار':'10','بستانکار':''}));ACCOUNT_ROWS.push({'کد حساب کل':'2','عنوان حساب کل':'هزینه','کد حساب معین':'1','عنوان حساب معین':'هزینه','بدهکار':'4','بستانکار':''});gotoModule('mainWorkpaper');const spacer=document.createElement('div');spacer.id='test-tail-space';spacer.style.height='800px';document.getElementById('mainWorkpaperModule').after(spacer);});await page.evaluate(()=>document.fonts.ready);assert((await page.locator('#mwPreview .mw-paper').count())>1);
  const action=async(view,code,hidden)=>{const key=JSON.stringify([view,code||'']),zone=hidden?'.mw-hidden-nav':'.mw-nav';const trigger=page.locator(`${zone} [data-mw-sheet-more='${key}']`);await trigger.scrollIntoViewIfNeeded();await trigger.click();const oldTop=await page.locator('.mw-nav-wrap').evaluate(el=>el.getBoundingClientRect().top);await page.locator('#mwSheetMenu [data-mw-sheet-action]').click();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const newTop=await page.locator('.mw-nav-wrap').evaluate(el=>el.getBoundingClientRect().top);assert(Math.abs(newTop-oldTop)<3,`${view} ${hidden?'restore':'delete'}: ${oldTop} -> ${newTop}`);};
  await action('accounts','2',false);await action('accounts','2',true);await page.locator('[data-mw-view="accounts"][data-mw-active="1"]').click();await action('accounts','1',false);await action('accounts','1',true);assert.equal(await page.locator('[data-mw-view="accounts"][data-mw-active="1"]').getAttribute('aria-current'),'page');assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('sheet actions preserve the nearest possible bar position on real short and long pages', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{
  for(const viewport of [{width:390,height:580},{width:1366,height:768}]){
   const {page,context,errors}=await setup(browser);await page.setViewportSize(viewport);await page.evaluate(()=>{ACCOUNT_ROWS=Array.from({length:42},(_,i)=>({'کد حساب کل':'1','عنوان حساب کل':'نقد','کد حساب معین':String(i+1),'عنوان حساب معین':'حساب '+(i+1),'بدهکار':'10','بستانکار':''}));gotoModule('mainWorkpaper');});await page.evaluate(()=>document.fonts.ready);
   const run=async(hidden)=>{const trigger=page.locator(`${hidden?'.mw-hidden-nav':'.mw-nav'} [data-mw-sheet-more='["accounts","1"]']`);await trigger.scrollIntoViewIfNeeded();await trigger.click();const oldTop=await page.locator('.mw-nav-wrap').evaluate(el=>el.getBoundingClientRect().top);await page.locator('#mwSheetMenu [data-mw-sheet-action]').click();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const pos=await page.locator('.mw-nav-wrap').evaluate(el=>{const doc=document.scrollingElement,r=el.getBoundingClientRect();return {top:r.top,docTop:r.top+window.scrollY,max:doc.scrollHeight-doc.clientHeight};});const expected=pos.docTop-Math.max(0,Math.min(pos.max,pos.docTop-oldTop));assert(Math.abs(pos.top-expected)<3,`${viewport.width} ${hidden?'restore':'delete'}: ${JSON.stringify({oldTop,pos,expected})}`);assert(await page.locator(`${hidden?'.mw-nav':'.mw-hidden-nav'} [data-mw-sheet-more='["accounts","1"]']`).evaluate(el=>document.activeElement===el));};
   await run(false);await run(true);assert.deepEqual(errors,[]);await context.close();
  }
 }finally{await browser.close();}
});

test('column drag and keyboard stop before amounts overflow or titles wrap further', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{const {page,context,errors}=await setup(browser);await page.evaluate(()=>{ACCOUNT_ROWS=[{'کد حساب کل':'1','عنوان حساب کل':'موجودی نقد','کد حساب معین':'12345','عنوان حساب معین':'سپرده کوتاه مدت','بدهکار':'1726971789','بستانکار':''}];gotoModule('mainWorkpaper');});await page.evaluate(()=>document.fonts.ready);
 const metrics=()=>page.locator('#mwPreview .mw-paper').first().evaluate(el=>{const cols=[...el.querySelectorAll('col')].map(x=>x.getBoundingClientRect().width),row=el.querySelector('tbody tr:not(.mw-total)'),desc=row.querySelector('.mw-description'),text=document.createRange();text.selectNodeContents(desc);return {cols,height:row.getBoundingClientRect().height,lines:[...text.getClientRects()].filter(r=>r.width>0).length,overflow:[...el.querySelectorAll('tbody td')].map(c=>Math.max(0,c.scrollWidth-c.clientWidth))};});const before=await metrics();assert.equal(before.lines,1);
 const drag=async(idx,dx)=>{const handle=page.locator('#mwPreview .mw-paper').first().locator(`[data-mw-column-index="${idx}"]`);await handle.scrollIntoViewIfNeeded();const b=await handle.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+dx,b.y+b.height/2,{steps:5});await page.mouse.up();};
 await drag(1,65);const afterTitle=await metrics();assert(afterTitle.cols[1]<before.cols[1]-1);assert.equal(afterTitle.lines,before.lines);assert(afterTitle.height<=before.height+0.5);assert(afterTitle.overflow.every((v,i)=>v<=before.overflow[i]+1));
 await drag(3,65);const afterAmount=await metrics();assert(afterAmount.cols[3]<afterTitle.cols[3]);assert(afterAmount.cols[3]>afterTitle.cols[3]-65);assert(afterAmount.overflow.every((v,i)=>v<=before.overflow[i]+1));const h=page.locator('#mwPreview .mw-paper').first().locator('[data-mw-column-index="3"]');await h.focus();for(let i=0;i<8;i++)await page.keyboard.press('ArrowRight');const afterKeyboard=await metrics();assert(afterKeyboard.overflow.every((v,i)=>v<=before.overflow[i]+1));assert.equal(afterKeyboard.lines,before.lines);const touchHandle=page.locator('#mwPreview .mw-paper').first().locator('[data-mw-column-index="1"]');await touchHandle.scrollIntoViewIfNeeded();const tb=await touchHandle.boundingBox(),cdp=await context.newCDPSession(page),x=tb.x+tb.width/2,y=tb.y+tb.height/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-15,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});const touched=await metrics();assert(touched.cols[1]>afterKeyboard.cols[1]+3,JSON.stringify({afterKeyboard,touched,tb}));assert(touched.overflow.every((v,i)=>v<=before.overflow[i]+1));assert(await page.locator('#mwPrint').isEnabled());await page.evaluate(()=>{window.print=()=>{};});await page.locator('#mwPrint').click();await page.emulateMedia({media:'print'});assert(await page.locator('#printHost .mw-paper-table td').evaluateAll(xs=>xs.every(c=>c.scrollWidth<=c.clientWidth+1)));assert((await require('pdf-lib').PDFDocument.load(await page.pdf({format:'A4',landscape:true,printBackground:true}))).getPageCount()>0);await page.emulateMedia({media:'screen'});assert.deepEqual(errors,[]);await context.close();}finally{await browser.close();}
});

test('classification picker browses all ledger levels and handles ambiguous major accounts without splitting', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{const {page,context,errors}=await setup(browser);await page.evaluate(()=>{ACCOUNT_ROWS=[{'نوع سند':'ابتدای سال','کد حساب کل':'10','عنوان حساب کل':'دارایی‌ها','کد حساب معین':'11','عنوان حساب معین':'بانک','بدهکار':'100','بستانکار':''},{'نوع سند':'ابتدای سال','کد حساب کل':'10','عنوان حساب کل':'دارایی‌ها','کد حساب معین':'12','عنوان حساب معین':'دریافتنی تجاری','بدهکار':'50','بستانکار':''},{'نوع سند':'ابتدای سال','کد حساب کل':'20','عنوان حساب کل':'پرداختنی تجاری','کد حساب معین':'21','عنوان حساب معین':'پرداختنی تجاری','کد حساب تفصیلی':'31','عنوان حساب تفصیلی':'سایر حساب‌ها','کد تفصیلی یک':'41','عنوان تفصیلی یک':'اشخاص','کد تفصیلی دو':'51','عنوان تفصیلی دو':'آقای ایکس','بدهکار':'','بستانکار':'90'}];gotoModule('mainWorkpaper');});const before=await page.evaluate(()=>JSON.stringify(ACCOUNT_ROWS));await assignTopic(page,'10','11','A-70|1|5');await assignTopic(page,'10','12','A-70|1|3');await assignTopic(page,'20','21','A-71|2|0');await page.locator('#mwClassOpen').click();
 const dialog=page.locator('#mwClassDialog'),node=path=>JSON.stringify(['hier',...path]);await page.locator('[data-class-open="source"]').click();assert.equal(await dialog.locator('[data-class-select]').count(),2);await dialog.locator(`[data-class-select='${node([[0,'10']])}']`).click();assert.match(await page.locator('[data-class-label="source"]').innerText(),/کل ۱۰/);assert(await page.locator('[data-class-topic-wrap="source"]').isVisible());
 await page.locator('[data-class-open="destination"]').click();await dialog.locator(`[data-class-expand='${node([[0,'20']])}']`).click();await dialog.locator(`[data-class-expand='${JSON.stringify(['20','21'])}']`).click();await dialog.locator(`[data-class-expand='${node([[0,'20'],[1,'21'],[2,'31']])}']`).click();await dialog.locator(`[data-class-expand='${node([[0,'20'],[1,'21'],[2,'31'],[3,'41']])}']`).click();await dialog.locator('[data-class-filter]').fill('ایکس');assert.equal(await dialog.locator('[data-class-select]').count(),1);await dialog.locator(`[data-class-select='${node([[0,'20'],[1,'21'],[2,'31'],[3,'41'],[4,'51']])}']`).click();assert.match(await page.locator('[data-class-label="destination"]').innerText(),/تفصیلی دو ۵۱ — آقای ایکس/);
 await page.locator('[name="sourceSide"]').selectOption('C');await page.locator('[name="amount"]').fill('20');await page.locator('[name="description"]').fill('طبقه‌بندی گروهی');await page.locator('#mwClassForm button[type=submit]').click();assert.match(await page.locator('#mwClassError').innerText(),/سرفصل A/);assert.equal(await page.locator('[data-class-delete]').count(),0);await page.locator('[name="sourceTopic"]').selectOption('A-70|1|5');await page.locator('#mwClassForm button[type=submit]').click();assert.equal(await page.locator('[data-class-delete]').count(),1);assert.match(await page.locator('.mw-class-list').innerText(),/آقای ایکس/);
 await page.locator('[data-mw-view="accounts"][data-mw-active="10"]').click();const total=page.locator('#mwPreview .mw-total').last();assert.equal((await total.locator('[data-mw-calc-col="4"]').innerText()).trim(),'۲۰');assert.equal((await total.locator('[data-mw-calc-col="5"]').innerText()).trim(),'۱۳۰');const child=page.locator('#mwPreview tbody tr').filter({has:page.locator('.mw-description',{hasText:'بانک'})}).first();assert.equal((await child.locator('[data-mw-calc-col="4"]').innerText()).trim(),'');
 await page.locator('[data-mw-view="A-70"]').click();const cash=page.locator('[data-mw-topic-choose="A-70|1|5"]').locator('xpath=ancestor::tr');assert.equal((await cash.locator('[data-mw-calc-col="5"]').innerText()).trim(),'۸۰');const debtors=page.locator('[data-mw-topic-choose="A-70|1|3"]').locator('xpath=ancestor::tr');assert.equal((await debtors.locator('[data-mw-calc-col="5"]').innerText()).trim(),'۵۰');await page.locator('[data-mw-view="A-71"]').click();const creditors=page.locator('[data-mw-topic-choose="A-71|2|0"]').locator('xpath=ancestor::tr');assert.equal((await creditors.locator('[data-mw-calc-col="5"]').innerText()).trim(),'۷۰');await page.locator('#mwClassOpen').click();await page.locator('[data-class-edit="0"]').click();assert.equal(await page.locator('[name="sourceTopic"]').inputValue(),'A-70|1|5');await page.locator('[name="sourceTopic"]').selectOption('A-70|1|3');await page.locator('#mwClassForm button[type=submit]').click();await page.locator('[data-mw-view="A-70"]').click();assert.equal((await page.locator('[data-mw-topic-choose="A-70|1|5"]').locator('xpath=ancestor::tr').locator('[data-mw-calc-col="5"]').innerText()).trim(),'۱۰۰');assert.equal((await page.locator('[data-mw-topic-choose="A-70|1|3"]').locator('xpath=ancestor::tr').locator('[data-mw-calc-col="5"]').innerText()).trim(),'۳۰');await page.locator('[data-mw-view="accounts"][data-mw-active="20"]').click();await page.locator('[data-mw-paper-choose]').click();let picker=page.locator('#mwPaperDialog');await picker.locator('[data-paper-expand="10"]').click();await picker.locator('label').filter({hasText:'بانک'}).locator('input').check();page.once('dialog',d=>d.accept());await picker.locator('[data-paper-save]').click();assert.match(await page.locator('#mainWorkpaperModule').innerText(),/با انتقال نمایشی معین/);assert(await page.locator('#mwPrint').isDisabled());await page.locator('[data-mw-paper-choose]').click();picker=page.locator('#mwPaperDialog');await picker.locator('[data-paper-expand="10"]').click();await picker.locator('label').filter({hasText:'بانک'}).locator('input').uncheck();page.once('dialog',d=>d.accept());await picker.locator('[data-paper-save]').click();assert(await page.locator('#mwPrint').isEnabled());assert.equal(await page.evaluate(()=>JSON.stringify(ACCOUNT_ROWS)),before);assert.deepEqual(errors,[]);await context.close();}finally{await browser.close();}
});

test('two detail-level accounts in one minor remain distinct without duplicating their GL effect', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{const {page,context,errors}=await setup(browser);await page.evaluate(()=>{ACCOUNT_ROWS=['1','2'].map((n,i)=>({'نوع سند':'ابتدای سال','کد حساب کل':'1','عنوان حساب کل':'موجودی نقد','کد حساب معین':'1','عنوان حساب معین':'بانک','کد حساب تفصیلی':'100','عنوان حساب تفصیلی':'اشخاص','کد تفصیلی یک':n,'عنوان تفصیلی یک':'شخص '+n,'کد تفصیلی دو':'10','عنوان تفصیلی دو':'حساب '+n,'بدهکار':i?'50':'100','بستانکار':''}));gotoModule('mainWorkpaper');});const before=await page.evaluate(()=>JSON.stringify(ACCOUNT_ROWS));await page.locator('#mwClassOpen').click();const d=page.locator('#mwClassDialog'),hid=p=>JSON.stringify(['hier',...p]);
 async function choose(which,detail1,level){await page.locator(`[data-class-open="${which}"]`).click();await d.locator(`[data-class-expand='${hid([[0,'1']])}']`).click();await d.locator(`[data-class-expand='${JSON.stringify(['1','1'])}']`).click();await d.locator(`[data-class-expand='${hid([[0,'1'],[1,'1'],[2,'100']])}']`).click();const n=hid([[0,'1'],[1,'1'],[2,'100'],[3,detail1]]);if(level===4){await d.locator(`[data-class-expand='${n}']`).click();await d.locator(`[data-class-select='${hid([[0,'1'],[1,'1'],[2,'100'],[3,detail1],[4,'10']])}']`).click();}else await d.locator(`[data-class-select='${n}']`).click();}
 await choose('source','1',3);await choose('destination','2',4);await page.locator('[name=sourceSide]').selectOption('C');await page.locator('[name=amount]').fill('25');await page.locator('[name=description]').fill('انتقال بین اشخاص');await page.locator('#mwClassForm button[type=submit]').click();assert.equal(await page.locator('[data-class-delete]').count(),1);await page.locator('[data-mw-view="accounts"][data-mw-active="1"]').click();const row=page.locator('#mwPreview tbody tr').filter({has:page.locator('.mw-description',{hasText:'بانک'})}).first();assert.equal((await row.locator('[data-mw-calc-col="3"]').innerText()).trim(),'۲۵');assert.equal((await row.locator('[data-mw-calc-col="4"]').innerText()).trim(),'۲۵');assert.equal((await row.locator('[data-mw-calc-col="5"]').innerText()).trim(),'۱۵۰');assert.equal(await page.evaluate(()=>JSON.stringify(ACCOUNT_ROWS)),before);assert.deepEqual(errors,[]);await context.close();}finally{await browser.close();}
});

test('classification balance picker is usable on a short dark mobile screen with many accounts', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{const {page,context,errors}=await setup(browser);await page.setViewportSize({width:390,height:520});await page.evaluate(()=>{applyTheme('dark');ACCOUNT_ROWS=Array.from({length:75},(_,i)=>({'کد حساب کل':String(i+1),'عنوان حساب کل':'حساب '+(i+1),'بدهکار':'1','بستانکار':''}));gotoModule('mainWorkpaper');});await page.locator('#mwClassOpen').click();await page.locator('[data-class-open="source"]').click();const d=page.locator('#mwClassDialog');assert(await d.isVisible());assert.equal(await d.locator('[data-class-select]').count(),60);const layout=await d.evaluate(el=>{const b=el.getBoundingClientRect(),list=el.querySelector('.mw-class-tree-scroll'),next=el.querySelector('[data-class-next]').getBoundingClientRect(),style=getComputedStyle(el);return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,listWidth:list.clientWidth,scrollWidth:list.scrollWidth,next:next.toJSON(),bg:style.backgroundColor,fg:style.color};});assert(layout.x>=0&&layout.right<=390&&layout.y>=0&&layout.bottom<=520,JSON.stringify(layout));assert(layout.scrollWidth<=layout.listWidth+1,JSON.stringify(layout));assert(layout.next.bottom<=layout.bottom+1&&layout.next.top>=layout.y);assert.notEqual(layout.bg,layout.fg);await d.locator('[data-class-next]').click();assert.equal(await d.locator('[data-class-select]').count(),15);await d.locator('[data-class-filter]').fill('حساب 75');assert.equal(await d.locator('[data-class-select]').count(),1);await d.locator('[data-class-select]').click();assert.match(await page.locator('[data-class-label="source"]').innerText(),/۷۵/);await page.locator('[data-class-open="destination"]').click();assert.equal(await d.locator('[data-class-select]').count(),60);await d.locator('[data-class-close]').click();assert.deepEqual(errors,[]);await context.close();}finally{await browser.close();}
});

test('column minimum considers data on later workpaper pages', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{const {page,context,errors}=await setup(browser);await page.evaluate(()=>{ACCOUNT_ROWS=Array.from({length:45},(_,i)=>({'کد حساب کل':'1','عنوان حساب کل':'نقد','کد حساب معین':String(i+1),'عنوان حساب معین':'حساب '+(i+1),'بدهکار':i===44?'1726971789':'1','بستانکار':''}));gotoModule('mainWorkpaper');});await page.evaluate(()=>document.fonts.ready);assert((await page.locator('#mwPreview .mw-paper').count())>1);const measure=()=>page.locator('#mwPreview .mw-paper').evaluateAll(pages=>pages.flatMap(p=>[...p.querySelectorAll('tbody .mw-number-text')].map(n=>{const r=n.getBoundingClientRect(),c=n.parentElement.getBoundingClientRect();return {text:n.textContent,left:c.left-r.left,right:r.right-c.right};})));const before=await measure();assert(before.some(x=>x.text.includes('۱٬۷۲۶٬۹۷۱٬۷۸۹')));assert(before.every(x=>x.left<=1&&x.right<=1));const h=page.locator('#mwPreview .mw-paper').first().locator('[data-mw-column-index="3"]');await h.scrollIntoViewIfNeeded();const b=await h.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+55,b.y+b.height/2,{steps:5});await page.mouse.up();const after=await measure();assert.equal(after.length,before.length);assert(after.every(x=>x.left<=1&&x.right<=1),JSON.stringify(after.filter(x=>x.left>1||x.right>1)));assert(await page.locator('#mwPrint').isEnabled());assert.deepEqual(errors,[]);await context.close();}finally{await browser.close();}
});

test('wider reference columns are the default on account and A sheets and remain in the printed PDF', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{
  const {page,context,errors}=await setup(browser);await page.evaluate(()=>{ACCOUNT_ROWS=[{'نوع سند':'ابتدای سال','کد حساب کل':'1','عنوان حساب کل':'موجودی نقد','کد حساب معین':'12345','عنوان حساب معین':'صندوق','بدهکار':'1726971789','بستانکار':''}];gotoModule('mainWorkpaper');});await page.evaluate(()=>document.fonts.ready);
  const measure=selector=>page.locator(selector).first().evaluate(el=>{const cols=[...el.querySelectorAll('col')],widths=cols.map(c=>c.getBoundingClientRect().width),texts=[...el.querySelectorAll('tbody .mw-number .mw-number-text')].filter(n=>n.textContent.trim());return {widths,styles:cols.map(c=>parseFloat(c.style.width)),numberFont:texts.map(n=>getComputedStyle(n).fontSize),numbersFit:texts.every(n=>{const a=n.getBoundingClientRect(),b=n.parentElement.getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1;}),text:el.textContent};});
  const check=async(idx,expected)=>{const preview=await measure('#mwPreview .mw-paper');assert(Math.abs(preview.styles[idx]-expected)<0.001);assert(preview.numbersFit);assert(preview.numberFont.every(f=>Math.abs(parseFloat(f)-12.533)<0.1));assert(await page.locator('#mwPrint').isEnabled());
   await page.evaluate(()=>window.print=()=>{});await page.locator('#mwPrint').click();await page.emulateMedia({media:'print'});const printed=await measure('#printHost .mw-paper');assert(Math.abs(printed.widths[idx]-preview.widths[idx])<1);assert(printed.numbersFit);assert.equal(printed.styles[idx],expected);const pdf=await page.pdf({printBackground:true,preferCSSPageSize:true});assert(pdf.length>1000);await page.evaluate(()=>window.__activePrintRestore?.());await page.emulateMedia({media:'screen'});
  };
  await check(2,5);await page.locator('[data-mw-view="A-70"]').click();await check(1,6);
  await page.locator('[data-mw-view="accounts"][data-mw-active="1"]').click();await page.locator('#mwResetWidths').click();assert.equal((await measure('#mwPreview .mw-paper')).styles[2],5);
  assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});
