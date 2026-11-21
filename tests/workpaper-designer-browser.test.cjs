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
test('mobile touch dragging and manual margin changes are saved and hidden in print',{skip:!executablePath && 'Set CHROMIUM_PATH to a Chromium executable'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1,acceptDownloads:true});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+path.resolve('workpaper-designer.html'));await page.evaluate(()=>document.fonts.ready);
  const top=page.locator('[data-margin="top"]');await top.scrollIntoViewIfNeeded();const box=await top.boundingBox();const cdp=await context.newCDPSession(page);const x=box.x+box.width/2,y=box.y+box.height/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+30}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const topValue=Number(await page.locator('#marginTop').inputValue());assert(topValue>18&&topValue<23,'top drag should change physical mm: '+topValue);
  await page.locator('#marginLeft').fill('45.8');await page.locator('#marginLeft').dispatchEvent('change');assert.equal(await page.locator('[data-margin="left"]').getAttribute('aria-valuenow'),'45.8');
  const left=page.locator('[data-margin="left"]');await left.scrollIntoViewIfNeeded();const leftBox=await left.boundingBox(),lx=leftBox.x+leftBox.width/2,ly=leftBox.y+leftBox.height/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:lx,y:ly}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:lx+20,y:ly}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  assert.equal(await page.locator('#marginLeft').inputValue(),'45.8','cancel restores the old value');
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('hesabrasi.variance.designer.v1')));assert.equal(stored.page.margins.top,topValue);assert.equal(stored.page.margins.left,45.8);
  await page.emulateMedia({media:'print'});assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.margin-guides')).display),'none');assert.equal(errors.length,0,errors.join('\n'));await context.close();
 }finally{await browser.close()}
});
test('all four margin guides drag in the expected directions', {skip:!executablePath && 'Set CHROMIUM_PATH to a Chromium executable'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1100}});await page.goto('file://'+path.resolve('workpaper-designer.html'));
  assert.equal(await page.locator('.margin-guide.mg-top').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
  for(const [side,dx,dy,id,initial] of [['top',0,15,'marginTop',10],['bottom',0,-15,'marginBottom',10],['left',15,0,'marginLeft',12],['right',-15,0,'marginRight',12]]){
   const handle=page.locator('[data-margin="'+side+'"]');await handle.scrollIntoViewIfNeeded();const b=await handle.boundingBox();const x=b.x+b.width/2,y=b.y+b.height/2;
   await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:3});await page.mouse.up();
   const actual=Number(await page.locator('#'+id).inputValue());assert(actual>initial+4&&actual<initial+7,side+' margin: '+actual);
  }
  await page.close();
 }finally{await browser.close();}
});
