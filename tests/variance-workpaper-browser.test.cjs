'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core'),{PDFDocument}=require('pdf-lib');
const executablePath=process.env.CHROMIUM_PATH;
const original=fs.readFileSync(path.join(__dirname,'..','audit-google-auto.html'),'utf8');
const hook=`window.__fixtureVariance=(groups,perGroup,orientation,hasDesc,notesLen,longTitle)=>{
 const old=document.getElementById('varianceV4');if(old)old.id='variance-original';const el=document.createElement('div');el.id='varianceV4';document.body.appendChild(el);
 V.rows=[];V.notes={};for(let g=0;g<groups;g++)for(let i=0;i<(Array.isArray(perGroup)?perGroup[g]:perGroup);i++){const id=g+'-'+i;V.rows.push({id,kol:{code:String(100+g),title:longTitle&&g===1?'هزینه حقوق و مزایای کارکنان و پشتیبانی خدمات عمومی '.repeat(3):'گروه هزینه '+g},sub:{code:String(1000+g*100+i),title:'عنوان حساب نمونه شماره '+i},descs:[new Map(),new Map()],present:[true,true],complete:[true,true],amounts:[g===0?0n:BigInt(10000+g*1000+i*37),g===0?-BigInt(200+i):BigInt(14000+g*500-i*19)]});if(notesLen)V.notes[id]='توضیح نمونه '.repeat(notesLen);};V.selected=new Set(V.rows.map(x=>x.id));V.orientation=orientation;V.includeDescriptions=hasDesc;V.years=[1403,1404];vRender4();
};window.__variancePackTest=vPackAccountGroups;window.__varianceState=()=>V;\n`;
assert(original.includes('function vRender(){const s=vStage();'));
const fixture=original.replace('function vRender(){const s=vStage();',hook+'function vRender(){const s=vStage();');
async function runFixture(browser,options){
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://fixture.test/**',route=>route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:fixture}));await page.goto('https://fixture.test/');await page.evaluate(()=>document.fonts.ready);await page.evaluate(o=>window.__fixtureVariance(o.groups,o.rows,o.orientation,o.desc,o.notes||0,o.longTitle),options);await page.waitForTimeout(80);
 return {context,page,errors};
}
async function layout(page,container='#varianceV4 .variance-preview-pages'){
 return page.evaluate(root=>[...document.querySelectorAll(root+' .variance-print-page')].map(p=>{const rect=selector=>{const x=p.querySelector(selector)?.getBoundingClientRect();return x&&{top:x.top,bottom:x.bottom,left:x.left,right:x.right,width:x.width,height:x.height}};return {outer:rect('.variance-outer'),mid:rect('.variance-mid'),inner:rect('.variance-inner'),table:rect('.variance-paper-table'),footer:rect('.variance-page-number'),summary:rect('.variance-summary'),full:p.classList.contains('variance-page-full'),number:p.querySelector('.variance-page-number').textContent,meta:rect('.variance-meta'),metaLeft:rect('.variance-meta-left'),metaRightAlign:getComputedStyle(p.querySelector('.variance-meta-right .variance-line')).textAlign,separator:getComputedStyle(p.querySelector('.variance-meta-left')).borderRightStyle,rows:[...p.querySelectorAll('tbody tr.variance-data-row')].map(r=>[r.dataset.vcurrent,r.dataset.vprior]),group:p.querySelector('.variance-group-title td')?{height:p.querySelector('.variance-group-title td').getBoundingClientRect().height,font:getComputedStyle(p.querySelector('.variance-group-title td')).fontSize}:null,subtotal:p.querySelector('.variance-workpaper-subtotal td')?{height:p.querySelector('.variance-workpaper-subtotal td').getBoundingClientRect().height,font:getComputedStyle(p.querySelector('.variance-workpaper-subtotal td')).fontSize}:null};}),container);
}
function assertInside(pages){
 assert(pages.length>0,'pages rendered');pages.forEach((p,i)=>{const eps=1.6;assert.equal(p.metaRightAlign,'right','header metadata is right aligned');assert.equal(p.separator,'dotted','header separator is dotted');assert(p.metaLeft.top>p.meta.top+eps && p.metaLeft.bottom<p.meta.bottom-eps,'separator stops short of the header borders');assert(p.inner.bottom<=p.mid.bottom+eps,`page ${i+1}: inner outside frame`);assert(p.table.bottom<=p.inner.bottom+eps,`page ${i+1}: table outside inner frame`);assert(p.footer.bottom<=p.mid.bottom+eps,`page ${i+1}: footer outside frame`);assert(p.footer.top>=p.inner.bottom-eps,`page ${i+1}: footer overlaps table`);if(p.summary)assert(p.footer.top>=p.summary.bottom-eps,'footer must follow summary');assert.match(p.number,/صفحه\s*[۰-۹]+\s*از\s*[۰-۹]+/);});
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
test('transfers contain only the continuing group and grand total includes all groups', {skip:!executablePath&&'Set CHROMIUM_PATH to a Chromium executable'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{for(const orientation of ['landscape','portrait'])for(const desc of [true,false]){
  const counts=[2,38,3,30,1],{page,context,errors}=await runFixture(browser,{orientation,desc,groups:counts.length,rows:counts});
  assertInside(await layout(page));const frames=await page.evaluate(()=>[...document.querySelectorAll('#varianceV4 .variance-preview-pages .variance-print-page')].map(p=>({rows:[...p.querySelectorAll('.variance-paper-table tbody tr')].map(r=>({kind:r.className,title:r.classList.contains('variance-group-title')?r.innerText:'',groupName:r.dataset.vgroupname||'',current:r.dataset.vcurrent||r.dataset.vsubtotalcurrent,prior:r.dataset.vprior||r.dataset.vsubtotalprior,label:r.cells[0]?.innerText||'',percent:r.querySelector('.vpct')?.innerText||''})),grand:p.querySelector('.variance-grand-total')?{current:p.querySelector('.variance-grand-total').dataset.vgrandcurrent,prior:p.querySelector('.variance-grand-total').dataset.vgrandprior,percent:p.querySelector('.variance-grand-total .vpct').textContent,isLast:p.querySelector('.variance-summary-table tbody tr:last-child')?.classList.contains('variance-grand-total')}:null})));
  let lastOut=null,transfers=0,grandCount=0,allCurrent=0n,allPrior=0n,totalRows=0;const sums=new Map();
  for(let i=0;i<frames.length;i++){
   let group=null,groupName=null;if(lastOut){assert(frames[i].rows[0].kind.includes('variance-group-title'));assert.equal(frames[i].rows[0].title,lastOut.group);assert(frames[i].rows[1].kind.includes('variance-page-transfer'));}else assert(!frames[i].rows.some(r=>r.kind.includes('variance-page-transfer')),'no transfer when preceding page ended between accounts');
   lastOut=null;
   for(const r of frames[i].rows){
    if(r.kind.includes('variance-group-title')){group=r.title;groupName=r.groupName;if(!sums.has(group))sums.set(group,[0n,0n]);continue;}
    assert(group,'every row belongs to a major account');const total=sums.get(group);
    if(r.kind.includes('variance-data-row')){assert.notEqual(r.percent,'','detail percentage remains displayed');total[0]+=BigInt(r.current);total[1]+=BigInt(r.prior);allCurrent+=BigInt(r.current);allPrior+=BigInt(r.prior);totalRows++;}
    if(r.kind.includes('variance-page-carry')||r.kind.includes('variance-page-transfer')){assert.equal(BigInt(r.current),total[0],group+' current transfer');assert.equal(BigInt(r.prior),total[1],group+' prior transfer');assert.equal(r.percent,'','no percentage in either transfer');if(r.kind.includes('variance-page-carry')){assert.equal(r.label,'جمع '+groupName.trim()+' تا پایان صفحه');lastOut={group};transfers++;}else assert.match(r.label,/نقل از صفحه قبل/);}
    if(r.kind.includes('variance-workpaper-subtotal')){assert.equal(r.percent,'','no percentage in account subtotal');assert.equal(BigInt(r.current),total[0],group+' subtotal current');assert.equal(BigInt(r.prior),total[1],group+' subtotal prior');}
   }
   if(frames[i].grand){grandCount++;assert(frames[i].grand.isLast);}
  }
  assert(transfers>=2,'fixture crosses more than one page');assert.equal(totalRows,counts.reduce((a,b)=>a+b,0));assert.equal(grandCount,1);const grand=frames.find(p=>p.grand).grand;assert.equal(BigInt(grand.current),allCurrent);assert.equal(BigInt(grand.prior),allPrior);assert.equal(grand.percent,'');
  await page.evaluate(()=>{window.print=()=>{};document.querySelector('#varianceV4 [data-vprint]').click();});await page.emulateMedia({media:'print'});const printPages=await layout(page,'#printHost');assertInside(printPages);const pdf=await PDFDocument.load(await page.pdf({printBackground:true,preferCSSPageSize:true}));assert.equal(pdf.getPageCount(),printPages.length);assert.equal(errors.length,0,errors.join('\n'));await context.close();
 }}finally{await browser.close()}
});
test('a page break between completed accounts does not create a transfer', {skip:!executablePath&&'Set CHROMIUM_PATH to a Chromium executable'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{const {page,context}=await runFixture(browser,{orientation:'landscape',desc:true,groups:1,rows:1});const result=await page.evaluate(()=>{
  const make=(h,current,prior)=>({height:h,dataset:{vcurrent:String(current||0),vprior:String(prior||0)}}),a={title:make(10),details:[make(20,100,0)],subtotal:{height:10,dataset:{vsubtotalcurrent:'100',vsubtotalprior:'0'}}},b={title:make(10),details:[make(20,-10,30),make(25,15,20)],subtotal:{height:10,dataset:{vsubtotalcurrent:'5',vsubtotalprior:'50'}}};
  const result=__variancePackTest([a,b],{maxHeight:60,rowHeight:r=>r?.height||0,carryInHeight:10,carryOutHeight:10,finalHeight:0});return result.pages.map(p=>p.rows.map(x=>({kind:x.kind,values:x.values?.map(String)})));
 });assert.deepEqual(result.map(p=>p.map(r=>r.kind)),[['title','detail','subtotal'],['title','detail','carryOut'],['title','carryIn','detail','subtotal']]);assert.deepEqual(result[1].at(-1).values,['-10','30']);assert.deepEqual(result[2][1].values,['-10','30']);await context.close();}finally{await browser.close()}
});
test('account transfers preserve exact signed amounts across many page boundaries', {skip:!executablePath&&'Set CHROMIUM_PATH to a Chromium executable'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{const {page,context}=await runFixture(browser,{orientation:'landscape',desc:true,groups:1,rows:1});const outcome=await page.evaluate(()=>{
  let seed=9439;const rnd=n=>{seed=(seed*1664525+1013904223)>>>0;return seed%n};
  for(let round=0;round<200;round++){
   const groups=[];for(let k=0,n=1+rnd(7);k<n;k++){
    let current=0n,prior=0n;const details=[];for(let j=0,len=1+rnd(16);j<len;j++){const c=BigInt(rnd(20001)-10000)*10000000000n+BigInt(j),p=BigInt(rnd(20001)-10000)*10000000000n;current+=c;prior+=p;details.push({height:10+rnd(10),dataset:{vcurrent:String(c),vprior:String(p)},group:k});}
    groups.push({title:{height:10,group:k},details,subtotal:{height:10,group:k,dataset:{vsubtotalcurrent:String(current),vsubtotalprior:String(prior)}}});
   }
   const maxHeight=90+rnd(45),packed=__variancePackTest(groups,{maxHeight,rowHeight:r=>r.height,carryInHeight:10,carryOutHeight:10,finalHeight:20});if(packed.overflow)return 'unexpected overflow '+round;
   const running=new Map(),totals=[0n,0n];let last=null,detailsSeen=0;
   for(let i=0;i<packed.pages.length;i++){
    const rows=packed.pages[i].rows;let id=null;if(packed.pages[i].used>maxHeight+.01)return 'page height '+round;if(last&&(!rows[0]||rows[0].kind!=='title'||rows[0].node.group!==last||rows[1]?.kind!=='carryIn'))return 'missing carry in '+round;last=null;
    for(const r of rows){
     if(r.kind==='title'){id=r.node.group;if(!running.has(id))running.set(id,[0n,0n]);continue;}if(id===null)return 'orphan row '+round;const acc=running.get(id);
     if(r.kind==='detail'){if(r.node.group!==id)return 'detail in wrong group '+round;acc[0]+=BigInt(r.node.dataset.vcurrent);acc[1]+=BigInt(r.node.dataset.vprior);totals[0]+=BigInt(r.node.dataset.vcurrent);totals[1]+=BigInt(r.node.dataset.vprior);detailsSeen++;}
     if(r.kind==='carryIn'||r.kind==='carryOut'){if(r.values[0]!==acc[0]||r.values[1]!==acc[1])return 'wrong carry '+round;if(r.kind==='carryOut')last=id;}
     if(r.kind==='subtotal'&&(BigInt(r.node.dataset.vsubtotalcurrent)!==acc[0]||BigInt(r.node.dataset.vsubtotalprior)!==acc[1]))return 'wrong subtotal '+round;
    }
   }
   if(last!==null||totals.some((v,i)=>v!==packed.totals[i])||detailsSeen!==groups.reduce((n,g)=>n+g.details.length,0))return 'final totals '+round;
  }
  return 'ok';
 });assert.equal(outcome,'ok');await context.close();}finally{await browser.close()}
});
test('a long account name is measured in its transfer label without overflowing the frame', {skip:!executablePath&&'Set CHROMIUM_PATH to a Chromium executable'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{for(const orientation of ['landscape','portrait']){
  const {page,context,errors}=await runFixture(browser,{orientation,desc:true,groups:2,rows:[1,36],longTitle:true});const pages=await layout(page);assertInside(pages);const summaryPercents=await page.locator('#varianceV4 .variance-summary-table tbody tr:not(.variance-grand-total) .vpct').allTextContents();assert(summaryPercents.length&&summaryPercents.every(Boolean),'ordinary summary percentages remain displayed');const carries=page.locator('#varianceV4 .variance-preview-pages tr.variance-page-carry');assert(await carries.count()>=1);const labels=await carries.allTextContents();assert(labels.every(x=>x.includes('هزینه حقوق و مزایای کارکنان')&&x.includes('تا پایان صفحه')));const heights=await carries.evaluateAll(rs=>rs.map(r=>r.getBoundingClientRect().height));assert(heights.some(h=>h>32),'wrapped label height is measured');assert.equal(errors.length,0,errors.join('\n'));await context.close();
 }}finally{await browser.close()}
});
test('page metadata is proportionate and bold and column headers stay bold in preview and print', {skip:!executablePath&&'Set CHROMIUM_PATH to a Chromium executable'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{for(const orientation of ['landscape','portrait'])for(const desc of [true,false]){
  const {page,context,errors}=await runFixture(browser,{orientation,desc,groups:3,rows:5});
  async function check(root){
   const result=await page.evaluate(root=>[...document.querySelectorAll(root+' .variance-print-page')].map(p=>{
    const h=p.querySelector('.variance-paper-table thead th:first-child'),range=document.createRange();range.selectNodeContents(h);const rects=[...range.getClientRects()],box=h.getBoundingClientRect();
    const headings=[...p.querySelectorAll('.variance-paper-table thead th,.variance-summary-table thead th')].map(el=>{const r=document.createRange();r.selectNodeContents(el);const b=el.getBoundingClientRect();return [...r.getClientRects()].every(x=>x.left>=b.left-1&&x.right<=b.right+1&&x.top>=b.top-1&&x.bottom<=b.bottom+1)});
    const line=p.querySelector('.variance-meta .variance-line'),body=p.querySelector('.variance-paper-table td.vaccount'),meta=[...p.querySelectorAll('.variance-meta .variance-label,.variance-meta .variance-value,.variance-meta .variance-value-light')].map(el=>({font:parseFloat(getComputedStyle(el).fontSize),weight:+getComputedStyle(el).fontWeight}));return {text:h.textContent,box:box.toJSON(),rects:rects.map(r=>r.toJSON()),headings,font:parseFloat(getComputedStyle(line).fontSize),bodyFont:parseFloat(getComputedStyle(body).fontSize),weight:+getComputedStyle(line).fontWeight,meta,tableFont:parseFloat(getComputedStyle(h).fontSize),tableWeight:+getComputedStyle(h).fontWeight};
   }),root);
   assert(result.length);for(const p of result){assert.equal(p.text,'ردیف');assert.equal(p.rects.length,1,'row heading must not break into individual letters');assert(p.rects[0].left>=p.box.left-1&&p.rects[0].right<=p.box.right+1,'row heading fits column');assert(p.headings.every(Boolean),'header text remains within table cells');assert(p.font>=10&&p.font<=p.bodyFont&&p.weight>=700,'page header is readable, no larger than body text, and bold');assert(p.meta.every(x=>Math.abs(x.font-p.font)<.1&&x.weight>=700),'header labels and values are consistently sized and bold');assert(p.tableFont>=11&&p.tableWeight>=700,'table header is bigger and bold');}
   assertInside(await layout(page,root));
  }
  await check('#varianceV4 .variance-preview-pages');await page.evaluate(()=>{window.print=()=>{};document.querySelector('#varianceV4 [data-vprint]').click();});await page.emulateMedia({media:'print'});await check('#printHost');const pageCount=(await layout(page,'#printHost')).length;const pdf=await PDFDocument.load(await page.pdf({printBackground:true,preferCSSPageSize:true}));assert.equal(pdf.getPageCount(),pageCount);assert.deepEqual(errors,[]);await context.close();
 }}finally{await browser.close()}
});

test('manual year amounts recalculate details, totals, transfers and printed PDF without changing source amounts', {skip:!executablePath&&'Set CHROMIUM_PATH to a Chromium executable'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{
  const {page,context,errors}=await runFixture(browser,{orientation:'landscape',desc:true,groups:2,rows:[35,2]});
  const input=(id,year)=>page.locator(`.variance-preview-pages input[data-vamount="${id}"][data-vyear="${year}"]`);
  await input('0-0',1).focus();await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type('123456');
  assert.equal(await page.evaluate(()=>document.activeElement?.dataset.vamount),'0-0','focus survives typing on mobile');
  await input('0-0',1).fill('۱۲۳٬۴۵۶');
  await input('0-0',0).fill('۱۰۰٬۰۰۰');
  const row=page.locator('.variance-preview-pages tr.variance-data-row').first();
  assert.equal(await row.getAttribute('data-vcurrent'),'123456');assert.equal(await row.getAttribute('data-vprior'),'100000');assert.equal(await row.locator('td:nth-child(6)').innerText(),'۲۳٬۴۵۶');assert.equal(await row.locator('td:nth-child(7)').innerText(),'۲۳٫۵٪');
  assert.equal(await row.locator('td:nth-child(6) input,td:nth-child(7) input').count(),0);
  const source=await page.evaluate(()=>({amounts:__varianceState().rows[0].amounts.map(String),manual:__varianceState().rows[0].manualAmounts.map(String)}));assert.deepEqual(source,{amounts:['0','-200'],manual:['100000','123456']});
  let sum=await page.locator('.variance-preview-pages .variance-summary-table tbody tr').first().evaluate(el=>[el.dataset.vsummarycurrent,el.dataset.vsummaryprior]);assert.deepEqual(sum,['116061','100000']);
  const carry=page.locator('.variance-preview-pages .variance-page-carry').first();assert(await carry.count());assert(BigInt(await carry.getAttribute('data-vcurrent'))>0n);assert.equal(await carry.getAttribute('data-vprior'),'100000');
  await input('0-0',0).fill('0');assert.equal(await row.locator('td:nth-child(7)').innerText(),'—');
  await input('0-0',1).fill('-۱۲۳');assert.equal(await row.getAttribute('data-vcurrent'),'-123');assert.equal(await row.locator('td:nth-child(6)').innerText(),'(۱۲۳)');
  await input('0-0',0).fill('');assert.equal(await page.locator('[data-vprint]').isDisabled(),true);assert.equal(await input('0-0',0).getAttribute('aria-invalid'),'true');
  await page.locator('[data-vorientation]').selectOption('portrait');assert.equal(await page.locator('[data-vprint]').isDisabled(),true);assert.equal(await input('0-0',0).inputValue(),'');
  await input('0-0',0).fill('100');assert.equal(await page.locator('[data-vprint]').isDisabled(),false);
  await page.locator('[data-vdesc]').uncheck();assert.equal(await input('0-0',1).inputValue(),'(۱۲۳)');assert.equal(await input('0-0',0).inputValue(),'۱۰۰');
  await page.evaluate(()=>{window.print=()=>{};document.querySelector('#varianceV4 [data-vprint]').click();});await page.emulateMedia({media:'print'});
  const printed=page.locator('#printHost tr.variance-data-row').first();assert.equal(await printed.locator('input').count(),0);assert.equal(await printed.locator('td:nth-child(4)').innerText(),'(۱۲۳)');assert.equal(await printed.locator('td:nth-child(5)').innerText(),'۱۰۰');assert.equal(await printed.locator('td:nth-child(6)').innerText(),'(۲۲۳)');assert.equal(await printed.locator('td:nth-child(7)').innerText(),'(۲۲۳٫۰٪)');
  assertInside(await layout(page,'#printHost'));const pdf=await PDFDocument.load(await page.pdf({printBackground:true,preferCSSPageSize:true}));assert(pdf.getPageCount()>=2);assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close()}
});

test('group row sizing repaginates variance sheets and matches print', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{const {page,context,errors}=await runFixture(browser,{orientation:'landscape',desc:false,groups:8,rows:3});const panel=page.locator('#varianceV4 [data-row-size-panel]');await panel.locator('[data-row-size="title"]').fill('10');await panel.locator('[data-row-size="total"]').fill('12');await panel.locator('[data-row-size-apply]').click();await page.locator('#varianceV4 [data-row-resize="total"]').first().focus();await page.keyboard.press('ArrowDown');assert(Number(await panel.locator('[data-row-size="total"]').inputValue())>12);await panel.locator('[data-row-size="total"]').fill('12');await panel.locator('[data-row-size-apply]').click();const p=await layout(page);assertInside(p);assert(p.length>=2);const dims=await page.locator('#varianceV4 .variance-print-page .variance-paper-table tbody tr').evaluateAll(rs=>rs.map(r=>({total:r.matches('.variance-workpaper-subtotal,.variance-page-carry,.variance-page-transfer'),height:r.getBoundingClientRect().height})));assert(dims.filter(x=>x.total).every(x=>x.height>=12*96/25.4-1));assert(dims.filter(x=>!x.total).every(x=>x.height>=10*96/25.4-1));await page.evaluate(()=>{window.print=()=>{};document.querySelector('#varianceV4 [data-vprint]').click();});await page.emulateMedia({media:'print'});assertInside(await layout(page,'#printHost'));assert(await page.locator('#printHost .variance-print-page').evaluateAll(ps=>ps.every(p=>p.style.getPropertyValue('--user-total-row')==='12mm')));assert.equal(await page.locator('#printHost .group-row-handle').count(),0);assert.deepEqual(errors,[]);await context.close();}finally{await browser.close();}});
