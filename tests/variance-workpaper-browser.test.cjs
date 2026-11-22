'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core'),{PDFDocument}=require('pdf-lib');
const executablePath=process.env.CHROMIUM_PATH;
const original=fs.readFileSync(path.join(__dirname,'..','audit-google-auto.html'),'utf8');
const hook=`window.__fixtureVariance=(groups,perGroup,orientation,hasDesc,notesLen)=>{
 const old=document.getElementById('varianceV4');if(old)old.id='variance-original';const el=document.createElement('div');el.id='varianceV4';document.body.appendChild(el);
 V.rows=[];V.notes={};for(let g=0;g<groups;g++)for(let i=0;i<perGroup;i++){const id=g+'-'+i;V.rows.push({id,kol:{code:String(100+g),title:'گروه هزینه '+g},sub:{code:String(1000+g*100+i),title:'عنوان حساب نمونه شماره '+i},descs:[new Map(),new Map()],present:[true,true],complete:[true,true],amounts:[1000n+BigInt(i),1500n+BigInt(i)]});if(notesLen)V.notes[id]='توضیح نمونه '.repeat(notesLen);};V.selected=new Set(V.rows.map(x=>x.id));V.orientation=orientation;V.includeDescriptions=hasDesc;V.years=[1403,1404];vRender4();
};\n`;
assert(original.includes('function vRender(){const s=vStage();'));
const fixture=original.replace('function vRender(){const s=vStage();',hook+'function vRender(){const s=vStage();');
async function runFixture(browser,options){
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://fixture.test/**',route=>route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:fixture}));await page.goto('https://fixture.test/');await page.evaluate(()=>document.fonts.ready);await page.evaluate(o=>window.__fixtureVariance(o.groups,o.rows,o.orientation,o.desc,o.notes||0),options);await page.waitForTimeout(80);
 return {context,page,errors};
}
async function layout(page,container='#varianceV4 .variance-preview-pages'){
 return page.evaluate(root=>[...document.querySelectorAll(root+' .variance-print-page')].map(p=>{const rect=selector=>{const x=p.querySelector(selector)?.getBoundingClientRect();return x&&{top:x.top,bottom:x.bottom,left:x.left,right:x.right,width:x.width,height:x.height}};return {outer:rect('.variance-outer'),mid:rect('.variance-mid'),inner:rect('.variance-inner'),table:rect('.variance-paper-table'),footer:rect('.variance-page-number'),summary:rect('.variance-summary'),full:p.classList.contains('variance-page-full'),number:p.querySelector('.variance-page-number').textContent,rows:[...p.querySelectorAll('tbody tr.variance-data-row')].map(r=>[r.dataset.vcurrent,r.dataset.vprior]),group:p.querySelector('.variance-group-title td')?{height:p.querySelector('.variance-group-title td').getBoundingClientRect().height,font:getComputedStyle(p.querySelector('.variance-group-title td')).fontSize}:null,subtotal:p.querySelector('.variance-workpaper-subtotal td')?{height:p.querySelector('.variance-workpaper-subtotal td').getBoundingClientRect().height,font:getComputedStyle(p.querySelector('.variance-workpaper-subtotal td')).fontSize}:null};}),container);
}
function assertInside(pages){
 assert(pages.length>0,'pages rendered');pages.forEach((p,i)=>{const eps=1.6;assert(p.inner.bottom<=p.mid.bottom+eps,`page ${i+1}: inner outside frame`);assert(p.table.bottom<=p.inner.bottom+eps,`page ${i+1}: table outside inner frame`);assert(p.footer.bottom<=p.mid.bottom+eps,`page ${i+1}: footer outside frame`);assert(p.footer.top>=p.inner.bottom-eps,`page ${i+1}: footer overlaps table`);if(p.summary)assert(p.footer.top>=p.summary.bottom-eps,'footer must follow summary');assert.match(p.number,/صفحه\s*[۰-۹]+\s*از\s*[۰-۹]+/);});
}
test('landscape/portrait preview stays inside frames with compact groups and numbered footers', {skip:!executablePath&&'Set CHROMIUM_PATH to a Chromium executable'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{
  for(const [orientation,desc,groups,rows] of [['landscape',true,12,2],['landscape',false,7,1],['portrait',true,5,3],['portrait',false,4,4]]){
   const {page,context,errors}=await runFixture(browser,{orientation,desc,groups,rows});const pages=await layout(page);if(groups===12)assert(pages.length>=2);assertInside(pages);assert.equal(pages.flatMap(p=>p.rows).length,groups*rows);const group=pages.find(p=>p.group).group,subtotal=pages.find(p=>p.subtotal).subtotal;assert(group.height<32&&parseFloat(group.font)<=12.1,'group heading is compact');assert(subtotal.height<31&&parseFloat(subtotal.font)<=11.5,'subtotal is compact');assert.equal(errors.length,0,errors.join('\n'));await context.close();
  }
 }finally{await browser.close()}
});
test('editing long notes repaginates preview and PDF keeps the numbers inside each page', {skip:!executablePath&&'Set CHROMIUM_PATH to a Chromium executable'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{const {page,context,errors}=await runFixture(browser,{orientation:'landscape',desc:true,groups:7,rows:2});const before=(await layout(page)).length,editor=page.locator('textarea[data-vnote="0-0"]').first(),text='توضیح طولانی برای بررسی نوسانات حساب و گردش مالی '.repeat(7);await editor.fill(text);await page.waitForTimeout(600);assert.equal(await page.locator('textarea[data-vnote="0-0"]').first().inputValue(),text);assert.equal(await page.evaluate(()=>document.activeElement?.dataset.vnote),'0-0');const pages=await layout(page);assertInside(pages);assert(pages.length>=before);assert.equal(pages.flatMap(p=>p.rows).length,14);
 await page.evaluate(()=>{window.print=()=>{};document.querySelector('#varianceV4 [data-vprint]').click();});await page.emulateMedia({media:'print'});const printed=await layout(page,'#printHost');assertInside(printed);assert(printed.length>=2);const pdf=await PDFDocument.load(await page.pdf({printBackground:true,preferCSSPageSize:true}));assert.equal(pdf.getPageCount(),printed.length);assert.equal(errors.length,0,errors.join('\n'));await context.close();
 }finally{await browser.close()}
});
test('oversized summary reports an error rather than printing cropped pages', {skip:!executablePath&&'Set CHROMIUM_PATH to a Chromium executable'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{const {page,context}=await runFixture(browser,{orientation:'landscape',desc:true,groups:40,rows:1});assert.match(await page.locator('#varianceV4 .variance-pagination-error').textContent(),/جا نمی‌شود/);let alert='';page.on('dialog',d=>{alert=d.message();d.dismiss()});await page.locator('#varianceV4 [data-vprint]').click();assert.match(alert,/چاپ متوقف/);assert.equal(await page.locator('#printHost .variance-print-page').count(),0);await context.close();}finally{await browser.close()}
});
