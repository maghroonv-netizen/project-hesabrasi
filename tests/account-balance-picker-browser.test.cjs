"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { chromium } = require("playwright-core");
const executablePath = process.env.CHROMIUM_PATH;
let html = fs.readFileSync(
  path.join(__dirname, "..", "audit-google-auto.html"),
  "utf8",
);
const common = `window.__pickerRows=Array.from({length:24},(_,i)=>({'کد حساب کل':i<12?'100':'200','عنوان حساب کل':i<12?'هزینه اداری':'هزینه فروش','کد حساب معین':String(1000+i),'عنوان حساب معین':'حساب معین '+i,'نوع سند':i%3===0?'ابتدای سال':'روزانه','بدهکار':1000+i,'بستانکار':i}));
window.__analysisPickerFixture=()=>{ACCOUNT_ROWS=window.__pickerRows;ACCOUNT_LEVELS=[{code:'کد حساب کل',title:'عنوان حساب کل',label:'کل'},{code:'کد حساب معین',title:'عنوان حساب معین',label:'معین'}];ANA.accounts=[];ANA.pickerPath=[];ANA.includeCounterpartAccounts=true;const old=document.getElementById('anaAccounts');if(old)old.id='anaAccountsOld';const host=document.createElement('div');host.id='anaAccounts';document.body.appendChild(host);renderAnalysisAccounts();};\n`;
html = html.replace(
  "function renderAnalysisAccounts(){",
  common + "function renderAnalysisAccounts(){",
);
const variance = `window.__variancePickerFixture=()=>{const old=document.getElementById('varianceV3');if(old)old.remove();const host=document.createElement('div');host.id='varianceV3';document.body.appendChild(host);V.rows=Array.from({length:24},(_,i)=>({id:'v'+i,kol:{code:i<12?'100':'200',title:i<12?'هزینه اداری':'هزینه فروش'},sub:{code:String(1000+i),title:'حساب معین '+i},amounts:[BigInt(100+i),BigInt(200+i)],descs:[new Map(),new Map()],present:[true,true],complete:[true,true]}));V.files=[{},{}];V.years=[1403,1404];V.selected=new Set();V.filter='';vBalancePickerOpen=false;vRender3();};window.__varianceSelection=()=>({ids:[...V.selected],filter:V.filter,amounts:vSelectionTotal().map(String),open:vBalancePickerOpen});window.__varianceEnableNavigation=()=>{CUR_MODULE='variance';CUR_STEP='v3';document.body.classList.remove('meta-stage-active');document.getElementById('projectMeta').hidden=true;};\n`;
html = html.replace("function vRender3(){", variance + "function vRender3(){");
const aged = `window.__agedPickerFixture=()=>{ACCOUNT_ROWS=window.__pickerRows;SR.view.accountSelection=null;SR.view.selectionConfirmed=false;SR.view.tbFilter='';SR.view.excludedWorkpaperRows=new Set();SR.nextResult={};srPreviewRows=()=>window.__pickerRows.filter(r=>!(SR.view.accountSelection instanceof Set)||SR.view.accountSelection.has(r['کد حساب کل']+'|'+r['کد حساب معین'])).map((r,i)=>({groupKey:'g'+i,kolCode:r['کد حساب کل'],kolTitle:r['عنوان حساب کل'],moeinCode:r['کد حساب معین'],moeinTitle:r['عنوان حساب معین'],tafCode:'',tafTitle:'',priorAmount:null,auditAmount:BigInt(r['بدهکار']),followUp:null,auditOffset:0n,finalAmount:BigInt(r['بدهکار'])}));const old=document.getElementById('srReport');if(old)old.id='srReportOld';const outer=document.createElement('div');outer.innerHTML='<button id="srPrint" disabled>print</button><button id="srXlsx" disabled>xlsx</button><div id="srReport" class="sr-report-shell">'+trialBalancePreviewHtml()+'<div id="srFinalPreview"></div></div>';const stage=document.querySelector('[data-stage="s6"]');document.querySelectorAll('.stage.active').forEach(el=>el.classList.remove('active'));stage.classList.add('active');document.body.classList.remove('meta-stage-active');stage.querySelector('#srS6').appendChild(outer);bindReport();};window.__agedPickerState=()=>({selected:SR.view.accountSelection instanceof Set?[...SR.view.accountSelection]:null,confirmed:SR.view.selectionConfirmed,filter:SR.view.tbFilter});\n`;
html = html.replace("function layerTable(L)", aged + "function layerTable(L)");
async function setup(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("https://fixture.test/**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: html,
    }),
  );
  await page.goto("https://fixture.test/");
  await page.evaluate(() => document.fonts.load("12px workpaper-lotus"));
  return { page, context, errors };
}
async function checkModal(page, selector) {
  const dialog = page.locator(selector);
  await dialog.waitFor({ state: "visible" });
  const dims = await dialog.locator(".modal-box").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return {
      left: r.left,
      right: r.right,
      top: r.top,
      bottom: r.bottom,
      width: innerWidth,
      height: innerHeight,
    };
  });
  assert(
    dims.left >= 0 &&
      dims.right <= dims.width + 1 &&
      dims.top >= 0 &&
      dims.bottom <= dims.height + 1,
    "modal fits mobile viewport",
  );
  assert.equal(await dialog.getAttribute("role"), "dialog");
  assert.equal(await dialog.getAttribute("aria-modal"), "true");
  const headHit = await dialog.locator(".modal-head").evaluate((el) => {
    const r = el.getBoundingClientRect(),
      hit = document.elementFromPoint(
        r.left + r.width / 2,
        r.top + r.height / 2,
      );
    return !!hit && el.contains(hit);
  });
  assert(headHit, "popup header must not be clipped by ancestors");
  if (selector !== "#anaAcctModal") {
    const footer = await dialog
      .locator(".sr-tb-footer button")
      .evaluate((el) => {
        const b = el.getBoundingClientRect(),
          box = el.closest(".modal-box").getBoundingClientRect();
        return b.top >= box.top && b.bottom <= box.bottom + 1;
      });
    assert(
      footer,
      "confirm button remains visible without scrolling the whole popup",
    );
  }
}
test(
  "variance balance opens as a mobile floating window and preserves selection and filter",
  { skip: !executablePath && "Set CHROMIUM_PATH" },
  async () => {
    const browser = await chromium.launch({
      executablePath,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    try {
      const { page, context, errors } = await setup(browser);
      await page.evaluate(() => window.__variancePickerFixture());
      const dlg = page.locator("#varianceBalanceDialog"),
        trigger = page.locator("#varianceV3 [data-balance-open]");
      assert.equal(await dlg.isVisible(), false);
      await trigger.click();
      await checkModal(page, "#varianceBalanceDialog");
      await page.keyboard.press("Shift+Tab");
      assert.equal(
        await dlg
          .locator("[data-balance-close]")
          .evaluate((el) => el === document.activeElement),
        false,
      );
      await page.keyboard.press("Tab");
      assert.equal(
        await dlg
          .locator("[data-balance-close]")
          .evaluate((el) => el === document.activeElement),
        true,
      );
      assert.equal(await trigger.getAttribute("aria-expanded"), "true");
      await dlg.locator('[data-vaccount="v0"]').check();
      assert.deepEqual(
        (await page.evaluate(() => window.__varianceSelection())).amounts,
        ["100", "200"],
      );
      await dlg.locator("#vAccountSearch").fill("حساب معین 1");
      assert(await dlg.isVisible(), "search re-render keeps modal open");
      assert.equal(
        (await page.evaluate(() => window.__varianceSelection())).filter,
        "حساب معین 1",
      );
      await dlg.locator("#vSelectVisible").check();
      let selected = await page.evaluate(() => window.__varianceSelection());
      assert(
        selected.ids.includes("v0") &&
          selected.ids.includes("v1") &&
          selected.ids.includes("v19") &&
          !selected.ids.includes("v2"),
      );
      await page.keyboard.press("Escape");
      assert.equal(await dlg.isVisible(), false);
      assert.equal(await trigger.getAttribute("aria-expanded"), "false");
      await trigger.click();
      await checkModal(page, "#varianceBalanceDialog");
      assert.equal(
        await dlg.locator("#vAccountSearch").inputValue(),
        "حساب معین 1",
      );
      assert.deepEqual(
        (await page.evaluate(() => window.__varianceSelection())).ids,
        selected.ids,
      );
      await dlg.locator("[data-balance-close]").click();
      assert.equal(await dlg.isVisible(), false);
      await page.setViewportSize({ width: 1280, height: 900 });
      await trigger.click();
      await checkModal(page, "#varianceBalanceDialog");
      assert.deepEqual(
        (await page.evaluate(() => window.__varianceSelection())).ids,
        selected.ids,
      );
      await dlg.click({ position: { x: 2, y: 2 } });
      assert.equal(await dlg.isVisible(), false);
      assert.equal(
        await page.locator("#varianceV3 [data-vconfirm]").first().isEnabled(),
        true,
      );
      await page.evaluate(() => window.__varianceEnableNavigation());
      await page.locator("#varianceV3 [data-vconfirm]").first().click();
      assert.equal(
        await page
          .locator("#varianceV4 .variance-workpaper-source .variance-data-row")
          .count(),
        selected.ids.length,
      );
      await page.evaluate(() => window.__variancePickerFixture());
      await page.locator("#varianceV3 [data-balance-open]").click();
      await page.locator('#varianceBalanceDialog [data-vaccount="v2"]').check();
      assert.equal(
        await page
          .locator("#varianceBalanceDialog [data-vconfirm]")
          .isEnabled(),
        true,
      );
      await page.locator("#varianceBalanceDialog [data-vconfirm]").click();
      assert.equal(
        await page
          .locator("#varianceV4 .variance-workpaper-source .variance-data-row")
          .count(),
        1,
      );
      assert.deepEqual(errors, []);
      await context.close();
    } finally {
      await browser.close();
    }
  },
);
test(
  "aged balance dialog keeps prior selection semantics, confirmation and totals",
  { skip: !executablePath && "Set CHROMIUM_PATH" },
  async () => {
    const browser = await chromium.launch({
      executablePath,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    try {
      const { page, context, errors } = await setup(browser);
      await page.evaluate(() => window.__agedPickerFixture());
      const trigger = page.locator("#srReport [data-balance-open]"),
        dlg = page.locator("#srBalanceDialog");
      assert.equal(await dlg.isVisible(), false);
      await trigger.click();
      await checkModal(page, "#srBalanceDialog");
      assert.equal(
        await dlg.locator("[data-pick-account]:checked").count(),
        24,
      );
      await dlg.locator('[data-pick-kol="100"]').uncheck();
      assert.equal(
        await dlg.locator("[data-pick-account]:checked").count(),
        12,
      );
      await dlg.locator("#srTbFilter").fill("حساب معین 20");
      let state = await page.evaluate(() => window.__agedPickerState());
      assert.equal(state.confirmed, false);
      assert.equal(state.selected.length, 12);
      assert.equal(state.filter, "حساب معین 20");
      await dlg.locator("[data-balance-close]").click();
      await trigger.click();
      assert.equal(
        await dlg.locator("#srTbFilter").inputValue(),
        "حساب معین 20",
      );
      await dlg.locator("#srConfirmAccounts").click();
      assert.equal(await dlg.isVisible(), false);
      state = await page.evaluate(() => window.__agedPickerState());
      assert.equal(state.confirmed, true);
      assert.equal(state.selected.length, 12);
      assert.equal(await page.locator("#srPrint").isEnabled(), true);
      assert.equal(await page.locator("#srReport .sr-data-row").count(), 12);
      const total = await page
        .locator("#srReport .sr-workpaper-total")
        .getAttribute("data-sr-total4");
      assert.equal(
        total,
        String(
          Array.from({ length: 12 }, (_, i) => 1012 + i).reduce(
            (a, b) => a + b,
            0,
          ),
        ),
      );
      await trigger.click();
      await dlg.locator("#srTbFilter").fill("");
      await dlg.locator('[data-pick-account="200|1012"]').uncheck();
      assert.equal(await page.locator("#srPrint").isDisabled(), true);
      await dlg.locator("[data-balance-close]").click();
      assert.equal(
        (await page.evaluate(() => window.__agedPickerState())).confirmed,
        false,
      );
      assert.deepEqual(errors, []);
      await context.close();
    } finally {
      await browser.close();
    }
  },
);
test(
  "account-analysis selection retains the existing sampling-style modal and options",
  { skip: !executablePath && "Set CHROMIUM_PATH" },
  async () => {
    const browser = await chromium.launch({
      executablePath,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    try {
      const { page, context, errors } = await setup(browser);
      await page.evaluate(() => window.__analysisPickerFixture());
      assert.equal(
        await page.locator("#anaIncludeCounterparts").isChecked(),
        true,
      );
      await page.locator('#anaLevels [data-ana-level="0"]').click();
      await checkModal(page, "#anaAcctModal");
      await page.locator("#anaAcctModal .ana-account-check").first().check();
      assert.match(
        await page.locator("#anaSelectedAccounts").textContent(),
        /حساب انتخاب شده/,
      );
      await page.locator("#anaAcctModalDone").click();
      assert.equal(await page.locator("#anaAcctModal").isVisible(), false);
      assert.equal(
        await page.locator("#anaIncludeCounterparts").isChecked(),
        true,
      );
      assert.equal(await page.locator("#anaBuildOutput").isEnabled(), true);
      assert.deepEqual(errors, []);
      await context.close();
    } finally {
      await browser.close();
    }
  },
);
