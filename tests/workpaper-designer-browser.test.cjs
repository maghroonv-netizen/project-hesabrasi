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
test('mobile touch resizes the selected row without changing page margins',{skip:!executablePath && 'Set CHROMIUM_PATH to a Chromium executable'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1,acceptDownloads:true});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+path.resolve('workpaper-designer.html'));await page.evaluate(()=>document.fonts.ready);
  await page.locator('td[data-row="5"][data-column="2"]').click();const handle=page.locator('[data-row-resize="5"]');
  for(const fraction of [0,1]){await page.locator('.preview-scroll').evaluate((el,f)=>{el.scrollLeft=(el.scrollWidth-el.clientWidth)*f;},fraction);await page.waitForTimeout(40);const bounds=await page.evaluate(()=>{const h=document.querySelector('[data-row-resize="5"]').getBoundingClientRect(),v=document.querySelector('.preview-scroll').getBoundingClientRect();return {left:h.left,right:h.right,viewLeft:v.left,viewRight:v.right}});assert(bounds.left>=bounds.viewLeft-2 && bounds.right<=bounds.viewRight+2,'handle should stay visible while horizontally scrolling');}
  await handle.scrollIntoViewIfNeeded();const box=await handle.boundingBox();const cdp=await context.newCDPSession(page),x=box.x+box.width/2,y=box.y+box.height/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+20}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const rowValue=Number(await page.locator('#rowHeight').inputValue());assert(rowValue>14&&rowValue<16,'row drag should change physical mm: '+rowValue);
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('hesabrasi.variance.designer.v1')));assert.equal(stored.rows[5].heightMm,rowValue);assert.equal(stored.rows[6].heightMm,8);assert.equal(stored.page.margins.top,10);assert.equal(stored.page.margins.bottom,10);
  const retry=page.locator('[data-row-resize="5"]');await retry.scrollIntoViewIfNeeded();const retryBox=await retry.boundingBox(),rx=retryBox.x+retryBox.width/2,ry=retryBox.y+retryBox.height/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rx,y:ry}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:rx,y:ry+20}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});assert.equal(Number(await page.locator('#rowHeight').inputValue()),rowValue);
  assert.equal(await page.locator('#marginTop').getAttribute('readonly'),'');assert.equal(await page.locator('#marginBottom').getAttribute('readonly'),'');
  await page.emulateMedia({media:'print'});assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.row-guide')).display),'none');assert.equal(errors.length,0,errors.join('\n'));await context.close();
 }finally{await browser.close()}
});
test('dragging uses physical dimensions across page orientation and preview zoom', {skip:!executablePath && 'Set CHROMIUM_PATH to a Chromium executable'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1100}});await page.goto('file://'+path.resolve('workpaper-designer.html'));
  for(const [orientation,zoom] of [['landscape',75],['portrait',50],['landscape',125]]){
   await page.locator('#orientation').selectOption(orientation);await page.locator('#zoom').fill(String(zoom));await page.locator('#zoom').dispatchEvent('change');
   await page.locator('td[data-row="5"][data-column="2"]').click();await page.locator('#rowHeight').fill('8');await page.locator('#rowHeight').dispatchEvent('change');
   const handle=page.locator('[data-row-resize="5"]');await handle.scrollIntoViewIfNeeded();const box=await handle.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2,move=10*(96/25.4)*zoom/100;
   await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+move,{steps:3});await page.mouse.up();const actual=Number(await page.locator('#rowHeight').inputValue());assert(Math.abs(actual-18)<0.3,orientation+' / '+zoom+': '+actual);
   assert.equal(await page.locator('#marginTop').inputValue(),'10');assert.equal(await page.locator('#marginBottom').inputValue(),'10');
  }
  await page.close();
 }finally{await browser.close();}
});
test('portrait default fits the physical page and touch changes the selected column', {skip:!executablePath && 'Set CHROMIUM_PATH to a Chromium executable'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1,acceptDownloads:true});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+path.resolve('workpaper-designer.html'));await page.evaluate(()=>document.fonts.ready);await page.locator('#orientation').selectOption('portrait');
  const size=await page.evaluate(()=>{const s=document.querySelector('#sheet').getBoundingClientRect(),t=document.querySelector('#sheet table').getBoundingClientRect();return {sLeft:s.left,sRight:s.right,tLeft:t.left,tRight:t.right}});assert(size.tLeft>=size.sLeft && size.tRight<=size.sRight,JSON.stringify(size));
  await page.locator('td[data-row="5"][data-column="2"]').click();const handle=page.locator('[data-column-resize="2"]');await handle.scrollIntoViewIfNeeded();const box=await handle.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2,cdp=await context.newCDPSession(page);const old=Number(await page.locator('#columnWidth').inputValue());
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-20,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const value=Number(await page.locator('#columnWidth').inputValue());assert(value>old+6&&value<old+8,'left drag increases width '+value);
  const data=await page.evaluate(()=>JSON.parse(localStorage.getItem('hesabrasi.variance.designer.v1')));assert.equal(data.columns[2].widthMm,value);assert.equal(data.page.margins.top,10);assert.equal(data.page.margins.bottom,10);
  const retry=page.locator('[data-column-resize="2"]');await retry.scrollIntoViewIfNeeded();const rb=await retry.boundingBox(),rx=rb.x+rb.width/2,ry=rb.y+rb.height/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rx,y:ry}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:rx+15,y:ry}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});assert.equal(Number(await page.locator('#columnWidth').inputValue()),value);
  await page.locator('#fitColumns').click();const pdf=await PDFDocument.load(await page.pdf({printBackground:true,preferCSSPageSize:true}));assert.equal(pdf.getPageCount(),1);const p=pdf.getPage(0).getSize();assert(Math.abs(p.width-595.28)<2&&Math.abs(p.height-841.89)<2);assert.equal(errors.length,0,errors.join('\n'));await context.close();
 }finally{await browser.close()}
});
