'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs/promises'),os=require('node:os');
const {chromium}=require('playwright-core'),{PDFDocument}=require('pdf-lib');
const executablePath=process.env.CHROMIUM_PATH;
test('mobile file editing, JSON download/import and A4 PDF', {skip:!executablePath && 'Set CHROMIUM_PATH to a Chromium executable'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'workpaper-design-'));
 try {
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,acceptDownloads:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url='file://'+path.resolve('workpaper-designer.html');await page.goto(url);await page.evaluate(()=>document.fonts.ready);
  await page.locator('td[data-row="5"][data-column="2"]').click();
  await page.locator('#columnWidth').fill('40');await page.locator('#columnWidth').dispatchEvent('change');
  await page.locator('#cellText').fill('شرح سفارشی');await page.locator('#cellText').dispatchEvent('change');
  const pending=page.waitForEvent('download');await page.locator('#saveFile').click();const download=await pending,filename=path.join(dir,'design.json');await download.saveAs(filename);
  const data=JSON.parse(await fs.readFile(filename,'utf8'));assert.equal(data.columns[2].widthMm,40);assert.equal(data.cells[5][2].text,'شرح سفارشی');
  const other=await browser.newPage({viewport:{width:1200,height:900}});other.on('dialog',dialog=>dialog.accept());other.on('pageerror',e=>errors.push(e.message));await other.goto(url);
  await other.locator('#fileInput').setInputFiles(filename);await other.waitForFunction(()=>document.querySelector('td[data-row="5"][data-column="2"]').textContent==='شرح سفارشی');
  const doc=await PDFDocument.load(await other.pdf({printBackground:true,preferCSSPageSize:true}));assert.equal(doc.getPageCount(),1);const {width,height}=doc.getPage(0).getSize();assert(Math.abs(width-841.89)<2&&Math.abs(height-595.28)<2);
  assert.equal(errors.length,0,errors.join('\n'));await page.close();await other.close();
 } finally {await browser.close();await fs.rm(dir,{recursive:true,force:true});}
});
