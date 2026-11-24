// Browser-level checks: CHROMIUM_PATH=/path/to/chromium node tests/ui-theme.test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {chromium} = require('playwright-core');
(async()=>{
  if(!process.env.CHROMIUM_PATH) throw Error('Set CHROMIUM_PATH to a Chromium executable');
  const root=path.join(__dirname,'..');
  const server=http.createServer((req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    const allowed={'/':'audit-google-auto.html','/assets/fonts/Vazirmatn-variable.woff2':'assets/fonts/Vazirmatn-variable.woff2'};
    if(!allowed[pathname]){res.writeHead(404);return res.end();}
    res.writeHead(200,{'content-type':pathname.endsWith('.woff2')?'font/woff2':'text/html; charset=utf-8'});res.end(fs.readFileSync(path.join(root,allowed[pathname])));
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  try{
    for(const width of [1440,390,320]){
      const page=await browser.newPage({viewport:{width,height:900},colorScheme:'light'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.evaluate(()=>document.fonts.ready);
      assert.equal(await page.locator('#projectMeta').isVisible(),true);
      assert.equal(await page.evaluate(()=>document.fonts.check('400 14px HesabrasiVazir')),true,'Persian font should load');
      await page.locator('#metaContinue').click();assert.match(await page.locator('#metaStatus').innerText(),/نام واحد/);
      await page.locator('#metaCompany').fill('شرکت آزمایشی');await page.locator('#metaYear').fill('۱۴۰۴');await page.locator('#metaContinue').click();
      assert.equal(await page.locator('#homeDrop').isVisible(),true);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`upload overflow at ${width}`);
      await page.locator('#editProjectMeta').click();assert.equal(await page.locator('#metaCompany').inputValue(),'شرکت آزمایشی');await page.locator('#metaContinue').click();
      const csv='شماره سند,ردیف سند,تاریخ,شرح سند,شرح ردیف,بدهکار,بستانکار,کد حساب کل,عنوان حساب کل,کد حساب معین,عنوان حساب معین,کد حساب تفصیلی,عنوان حساب تفصیلی\n1,1,1404/01/01,نمونه,نمونه,100,0,1,کل,11,معین,111,تفصیلی\n1,2,1404/01/01,نمونه,نمونه,0,100,2,بستانکار,22,معین,222,تفصیلی';
      await page.locator('#homeFile').setInputFiles({name:'sample.csv',mimeType:'text/csv',buffer:Buffer.from('\ufeff'+csv)});
      await page.locator('#confirmBtn').waitFor();assert.equal(await page.locator('#mapRowsHost .map-row').count(),17);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`mapping overflow at ${width}`);
      await page.locator('#entryBack').click();assert.equal(await page.locator('#homeDrop').isVisible(),true);
      await page.locator('#routerPanel summary').first().click();await page.locator('#routerDialog').waitFor({state:'visible'});
      await page.locator('#aihubSearch').fill('NextRouter');assert.equal(await page.locator('[data-aihub-card="next_router"]').getAttribute('hidden'),null);assert.notEqual(await page.locator('[data-aihub-card="tokenrouter"]').getAttribute('hidden'),null);
      await page.locator('#routerDismiss').click();await page.locator('#themeBtn').click();assert.equal(await page.evaluate(()=>document.documentElement.getAttribute('data-theme')),'dark');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`dark upload overflow at ${width}`);
      await page.evaluate(()=>{ACCOUNT_ROWS=[{'شماره سند':'1'}];currentHeaders=['شماره سند'];ENTRY.phase='ready';renderModuleHome();paint();});
      assert.equal(await page.locator('.entry-tile').count(),5);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`modules overflow at ${width}`);
      assert.equal(await page.locator('.entry-tile svg').count(),4);await page.locator('[data-open="analysis"]').click();assert.equal(await page.evaluate(()=>CUR_MODULE),'analysis');
      assert.deepEqual(errors,[]);await page.close();
    }
    console.log('UI theme: desktop/mobile layouts, font, form, navigation, provider search and dark mode PASS');
  }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
