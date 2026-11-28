'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core'),{PDFDocument}=require('pdf-lib');
const executablePath=process.env.CHROMIUM_PATH;
let html=fs.readFileSync(path.join(__dirname,'..','audit-google-auto.html'),'utf8');
const analysisHook=`window.__analysisFixture=()=>{
 Object.assign(SHEET_CFG,{company:'شرکت نمونه حسابرسی',year:'سال مالی منتهی به ۲۹ اسفند ۱۴۰۴',date:'۲۹ اسفند ۱۴۰۴',prep:'علی رضایی',rev:'محمد حسینی'});
 const a={'شماره سند':'۱','تاریخ':'1404/01/01','شرح سند':'خرید خدمات','شرح ردیف':'هزینه خدمات','بدهکار':1200000,'بستانکار':0};
 const A={rows:[a],openingBalance:0,debit:1200000,credit:0,closingBalance:1200000,title:'هزینه خدمات و پشتیبانی',code:'123'};
 const o={a:{title:A.title,code:'123'},A,sec:{'ماهیت':{text:'شرح ماهیت مستند '.repeat(250)}}};ANA.out=[o];ANA.active=0;ANA.aiBy={};
 const host=document.createElement('div');host.id='analysisFixture';document.body.appendChild(host);auditTemplatePaint(o,host);window.__analysisPrint=()=>auditTemplatePrint(host);
};\n`;
const agedHook=`window.__agedFixture=(fixtureRows=null)=>{
 Object.assign(SHEET_CFG,{company:'شرکت نمونه حسابرسی',year:'سال مالی منتهی به ۲۹ اسفند ۱۴۰۴',date:'۲۹ اسفند ۱۴۰۴',prep:'علی رضایی',rev:'محمد حسینی'});
 SR.view.selectionConfirmed=true;SR.nextResult={};
 srPreviewRows=()=>fixtureRows||Array.from({length:50},(_,i)=>({groupKey:'k'+i,kolCode:i<25?'100':'200',kolTitle:i<25?'حسابهای دریافتنی':'حسابهای پرداختنی',moeinCode:String(i),moeinTitle:'حساب معین نمونه '+i,tafCode:String(i+10),tafTitle:i%9===0?'طرف حساب نمونه با عنوان چندبخشی و طولانی برای بررسی شکست متن و صفحه‌بندی شماره '+i:'طرف حساب نمونه شماره '+i,priorAmount:null,auditAmount:1000000n,followUp:100n,auditOffset:0n,finalAmount:999900n}));
 const old=document.getElementById('srFinalPreview');if(old)old.id='srFinalPreviewOld';const host=document.createElement('div');host.id='srFinalPreview';host.innerHTML=workpaperHtml();document.body.appendChild(host);paginateWorkpaperPreview(host);window.__agedPrint=()=>printReport();
};\n`;
const agedHiddenStepHook=`window.__agedHiddenStep=()=>{
 document.getElementById('projectMeta').hidden=true;document.body.classList.remove('meta-stage-active');
 Object.assign(SHEET_CFG,{company:'شرکت نمونه حسابرسی',year:'۱۴۰۴',date:'۱۴۰۴/۱۲/۲۹',prep:'تهیه کننده',rev:'بررسی کننده'});
 FULL_ROWS=[];ACCOUNT_ROWS=[{'کد حساب کل':'1','عنوان حساب کل':'دریافتنی','کد حساب معین':'10','عنوان حساب معین':'حساب','بدهکار':'100','بستانکار':'0'}];
 SR.files=[];SR.model={};SR.result={checks:[],exceptions:[],audit:{id:'audit',label:'۱۴۰۴'},settings:{thresholds:[12]}};SR.priorResult=null;SR.priorWorkpaper=null;SR.nextResult=null;SR.view.tab='work';SR.view.selectionConfirmed=true;SR.view.accountSelection=null;
 srPreviewRows=()=>Array.from({length:5},(_,i)=>({groupKey:'h'+i,kolCode:'1',kolTitle:'دریافتنی',moeinCode:'10',moeinTitle:'حساب',tafCode:String(i),tafTitle:'طرف حساب '+i,priorAmount:null,auditAmount:1000n,followUp:null,auditOffset:0n,finalAmount:null}));
 CUR_MODULE='sr';CUR_STEP='s5';paint();gotoStep('s6');
};\n`;
const agedImportHook=`window.__agedRawPriorXlsx=async()=>{
 Object.assign(SHEET_CFG,{year:'۱۴۰۴'});
 const headers=['شماره سند','تاریخ','بدهکار','بستانکار','کد حساب کل','عنوان حساب کل','کد حساب معین','عنوان حساب معین','کد حساب تفصیلی','عنوان حساب تفصیلی'];
 const values=[[1,'1403/01/01',100,0,'1','حساب های دریافتنی','10','حساب های دریافتنی تجاری','500','شرکت الف'],[2,'1403/12/30',0,0,'1','حساب های دریافتنی','10','حساب های دریافتنی تجاری','500','شرکت الف']];
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([headers,...values]),'اسناد');
 const file=new File([XLSX.write(wb,{type:'array',bookType:'xlsx'})],'1403.xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
 const d=s=>SRE.parseDate(s).day;
 const common={kol:'1',kolT:'حساب های دریافتنی',moein:'10',moeinT:'حساب های دریافتنی تجاری',taf:'500',tafT:'شرکت الف'};
 const audit={id:'audit',name:'1404.xlsx',label:'1404',status:'ok',isMain:true,periodRole:'audit',data:[],start:d('1404/01/01'),end:d('1404/12/29'),keyFields:['taf'],hasOpening:true,openingDocs:new Set(['1']),closingDocs:new Set(),canon:[{...common,doc:'1',date:'1404/01/01',debit:100,credit:0},{...common,doc:'2',date:'1404/02/01',debit:0,credit:30}]};
 SR.files=[audit];SR.auditId='audit';await addFiles([file],'prior');const prior=SR.files.find(f=>f.periodRole==='prior');if(prior.status!=='ok')throw Error(prior.error);
 prior.start=d('1403/01/01');prior.end=d('1403/12/30');prior.canon=canonRows(prior);prior.keyFields=['taf'];prior.openingDocs=new Set(['1']);prior.closingDocs=new Set();prior.hasOpening=true;
 buildModel();SR.roles.set('1|10',{role:'PERSON',nature:'D',confirmed:true,selected:true});runAnalysis();
 SR.view.selectionConfirmed=true;const rows=finalWorkpaperRows();const host=document.createElement('div');host.id='realPriorResult';host.innerHTML=workpaperHtml();document.body.appendChild(host);
 return {file:prior.name,priorNext:SR.priorResult.next?.fileId,prior:rows[0]?.priorAmount?.toString(),audit:rows[0]?.auditAmount?.toString(),final:rows[0]?.finalAmount?.toString()||null,header:host.textContent};
};\n`;
assert(html.includes('function auditTemplateRoot()'));html=html.replace('function auditTemplateRoot()',analysisHook+'function auditTemplateRoot()');
assert(html.includes('function layerTable(L)'));html=html.replace('function layerTable(L)',agedHook+agedImportHook+agedHiddenStepHook+'function layerTable(L)');
async function setup(browser){const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage(),errors=[],dialogs=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>{dialogs.push(d.message());d.dismiss()});await page.route('https://fixture.test/**',r=>r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html}));await page.goto('https://fixture.test/');await page.evaluate(()=>document.fonts.load('12px workpaper-lotus'));return{context,page,errors,dialogs};}
async function headerInfo(page,selector,type){return page.evaluate(({selector,type})=>[...document.querySelectorAll(selector)].map(root=>{const head=root.querySelector(type==='aged'?'.sr-meta-grid':'.head'),ref=head.querySelector(type==='aged'?'.sr-refbox':'.refbox'),main=head.querySelector(type==='aged'?'.sr-head-company':'.hl.right'),prep=head.querySelector(type==='aged'?'.sr-head-prep':'.hl:not(.right)'),lines=main.querySelectorAll('div'),m=head.getBoundingClientRect(),r=ref.getBoundingClientRect(),a=main.getBoundingClientRect(),b=prep.getBoundingClientRect(),st=getComputedStyle(main),ls=getComputedStyle(lines[0]);const rects=[...main.querySelectorAll('div'),...prep.querySelectorAll('div')].flatMap(el=>{const range=document.createRange();range.selectNodeContents(el);const box=el.getBoundingClientRect();return [...range.getClientRects()].map(x=>x.left>=box.left-1&&x.right<=box.right+1&&x.top>=box.top-1&&x.bottom<=box.bottom+1)});return {text:head.textContent,font:ls.fontFamily,weight:+ls.fontWeight,size:parseFloat(ls.fontSize),align:st.textAlign,separator:getComputedStyle(prep).borderRightStyle,radius:getComputedStyle(ref).borderRadius,ordered:r.left>=a.right-1&&a.left>=b.right-1,short:b.top>m.top+1&&b.bottom<m.bottom-1,rects};}),{selector,type});}
function assertHeaders(infos){assert(infos.length);for(const p of infos){for(const str of ['شرکت نمونه حسابرسی','۱۴۰۴','علی رضایی','محمد حسینی'])assert(p.text.includes(str),str);assert(p.font.includes('workpaper-lotus'));assert(p.weight>=700&&p.size>=12&&p.align==='right');assert(p.separator==='dotted'&&parseFloat(p.radius)>0&&p.ordered&&p.short,'metadata alignment');assert(p.rects.every(Boolean),'header text remains within its block');}}
test('aged worksheet uses matching header and Lotus in multi-page preview and PDF', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{const {page,context,errors,dialogs}=await setup(browser);await page.evaluate(()=>window.__agedFixture());const root='#srFinalPreview .sr-aged-page';await page.waitForSelector(root);const count=await page.locator(root).count();assert(count>1);assertHeaders(await headerInfo(page,root,'aged'));let v=await page.evaluate(()=>({rows:document.querySelectorAll('#srFinalPreview .sr-data-row').length,total:document.querySelector('#srFinalPreview .sr-workpaper-total')?.dataset.srTotal4,overflow:document.querySelectorAll('#srFinalPreview .sr-aged-page-overflow').length,font:getComputedStyle(document.querySelector('#srFinalPreview .sr-data-row td')).fontFamily}));assert.deepEqual([v.rows,v.total,v.overflow],[50,'49995000',0]);assert(v.font.includes('workpaper-lotus'));
 const preview=await page.evaluate(()=>[...document.querySelectorAll('#srFinalPreview .sr-aged-page-sheet')].map(p=>{const a=p.getBoundingClientRect(),b=p.querySelector('.sr-paper-table').getBoundingClientRect(),f=p.querySelector('.sr-aged-page-number').getBoundingClientRect();return {ok:b.bottom<=a.bottom+1&&f.bottom<=a.bottom+1&&b.right<=a.right+1&&b.left>=a.left-1,header:p.querySelector('.sr-meta-grid').getBoundingClientRect().height,rows:[...p.querySelectorAll('.sr-data-row')].map(r=>r.dataset.srAmount1),heights:[...p.querySelectorAll('.sr-data-row')].map(r=>r.getBoundingClientRect().height)}}));assert(preview.every(x=>x.ok),'preview remains inside frame');
 await page.evaluate(()=>{window.print=()=>{};window.__agedPrint();});await page.emulateMedia({media:'print'});assertHeaders(await headerInfo(page,'#printHost .sr-aged-page','aged'));const bounds=await page.evaluate(()=>[...document.querySelectorAll('#printHost .sr-aged-page-sheet')].map(p=>{const a=p.getBoundingClientRect(),b=p.querySelector('.sr-paper-table').getBoundingClientRect(),f=p.querySelector('.sr-aged-page-number').getBoundingClientRect();return {header:p.querySelector('.sr-meta-grid').getBoundingClientRect().height,rows:[...p.querySelectorAll('.sr-data-row')].map(r=>r.dataset.srAmount1),heights:[...p.querySelectorAll('.sr-data-row')].map(r=>r.getBoundingClientRect().height),a:a.toJSON(),b:b.toJSON(),f:f.toJSON(),ok:b.bottom<=a.bottom+1&&f.bottom<=a.bottom+1&&b.right<=a.right+1&&b.left>=a.left-1}}));assert(bounds.every(x=>x.ok),'no clipped table or page number: '+JSON.stringify(bounds));assert.deepEqual(bounds.map(x=>x.rows),preview.map(x=>x.rows));assert(bounds.every((x,i)=>Math.abs(x.header-preview[i].header)<1),'header size stays consistent between preview and print');assert(bounds.every((x,i)=>x.heights.every((h,j)=>Math.abs(h-preview[i].heights[j])<1)),'row height stays consistent between preview and print '+JSON.stringify(bounds.map((x,i)=>[x.heights,preview[i].heights])));const doc=await PDFDocument.load(await page.pdf({printBackground:true,preferCSSPageSize:true}));assert.equal(doc.getPageCount(),count);assert.deepEqual(errors,[]);assert.deepEqual(dialogs,[]);await context.close();}finally{await browser.close()}});
test('account analysis header and Lotus carry into every printed page', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{const {page,context,errors,dialogs}=await setup(browser);await page.evaluate(()=>window.__analysisFixture());assertHeaders(await headerInfo(page,'#analysisFixture .audit-template','analysis'));await page.evaluate(()=>{window.print=()=>{};window.__analysisPrint();});await page.emulateMedia({media:'print'});const selector='#printHost .template-print-page',count=await page.locator(selector).count();assert(count>1);assertHeaders(await headerInfo(page,selector,'analysis'));const result=await page.evaluate(()=>[...document.querySelectorAll('#printHost .template-print-page')].map(p=>{const b=p.querySelector('.template-page-body'),a=p.getBoundingClientRect(),c=b.getBoundingClientRect(),f=p.querySelector('footer').getBoundingClientRect();return {fit:b.scrollHeight<=b.clientHeight+1&&c.bottom<=a.bottom+1&&f.bottom<=a.bottom+1,font:getComputedStyle(b.querySelector('.body')||b).fontFamily,text:p.textContent}}));assert(result.every(x=>x.fit&&x.font.includes('workpaper-lotus')));assert(result.some(x=>x.text.includes('۱٬۲۰۰٬۰۰۰')));const doc=await PDFDocument.load(await page.pdf({printBackground:true,preferCSSPageSize:true}));assert.equal(doc.getPageCount(),count);assert.deepEqual(errors,[]);assert.deepEqual(dialogs,[]);await context.close();}finally{await browser.close()}});
test('aged pagination and analysis printing wait for the embedded font', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{const {page,context,errors}=await setup(browser);
 const waitFont=()=>{const f=document.fonts,check=f.check.bind(f),load=f.load.bind(f);window.__restoreFont=()=>{f.check=check;f.load=load};f.check=()=>false;f.load=()=>new Promise(resolve=>window.__releaseFont=()=>resolve([{}]));};
 await page.evaluate(waitFont);await page.evaluate(()=>window.__agedFixture());assert.equal(await page.locator('#srFinalPreview .sr-aged-page').count(),0);await page.evaluate(()=>{window.__restoreFont();window.__releaseFont()});await page.waitForSelector('#srFinalPreview .sr-aged-page');
 await page.evaluate(()=>window.__analysisFixture());await page.evaluate(waitFont);await page.evaluate(()=>{window.print=()=>{};window.__analysisPrint()});assert.equal(await page.locator('#printHost .template-print-page').count(),0);await page.evaluate(()=>{window.__restoreFont();window.__releaseFont()});await page.waitForSelector('#printHost .template-print-page',{state:'attached'});assert.deepEqual(errors,[]);await context.close();}finally{await browser.close()}});

test('aged frame and grid survive grouped multipage preview and actual PDF', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{
  const {page,context,errors,dialogs}=await setup(browser);await page.evaluate(()=>{const rows=Array.from({length:48},(_,i)=>({groupKey:'item'+i,kolCode:i<24?'195':'320',kolTitle:i<24?'سفارشات و پیش پرداختها':'حسابهای پرداختنی غیرتجاری',moeinCode:i<24?'19520':'32006',moeinTitle:i<24?'پیش پرداخت خرید کالا':'جاری سهامداران',tafCode:String(21000+i),tafTitle:i%7?'حساب شخص شماره '+i:'عنوان طولانی حساب شخص جهت آزمون خوانایی و خط کشی '+i,priorAmount:null,auditAmount:i<24?10700000000n:-501900170019n,followUp:i<24?10700000000n:-501900170019n,auditOffset:0n,finalAmount:i<24?10700000000n:-501900170019n}));window.__agedFixture(rows);});await page.waitForSelector('#srFinalPreview .sr-aged-page');const count=await page.locator('#srFinalPreview .sr-aged-page').count();assert(count>=2);assert(await page.locator('#srFinalPreview td[rowspan]').count()>0,'grouped account cells stay merged');
  const info=async(selector)=>page.evaluate(selector=>[...document.querySelectorAll(selector)].map(sheet=>{const outer=sheet,mid=sheet.querySelector('.inner'),inside=sheet.querySelector('.sr-aged-content'),table=sheet.querySelector('.sr-paper-table'),foot=sheet.querySelector('.sr-aged-page-number'),rect=el=>el.getBoundingClientRect(),o=rect(outer),m=rect(mid),i=rect(inside),t=rect(table),f=rect(foot),sty=el=>{const x=getComputedStyle(el);return {color:x.borderTopColor,style:x.borderTopStyle,width:parseFloat(x.borderTopWidth)}};return {frames:[sty(outer),sty(mid),sty(inside)],nested:m.left>o.left&&i.left>m.left&&i.right<m.right&&m.right<o.right,fit:t.left>=i.left-1&&t.right<=i.right+1&&t.bottom<=i.bottom+1&&f.bottom<=i.bottom+1&&i.bottom<=m.bottom+1&&m.bottom<=o.bottom+1,overflow:[...sheet.querySelectorAll('td.num')].filter(x=>x.scrollWidth>x.clientWidth+1).map(x=>x.textContent),grid:[...sheet.querySelectorAll('tr.sr-data-row td')].every(c=>getComputedStyle(c).borderBottomStyle==='solid'&&(c===c.parentElement.lastElementChild||getComputedStyle(c).borderLeftStyle==='solid')),titleBg:getComputedStyle(sheet.querySelector('.sr-group-head th')).backgroundColor,totalBg:(sheet.querySelector('.sr-workpaper-subtotal td')||sheet.querySelector('.sr-workpaper-total td'))?getComputedStyle(sheet.querySelector('.sr-workpaper-subtotal td')||sheet.querySelector('.sr-workpaper-total td')).backgroundColor:null};}),selector);
  const preview=await info('#srFinalPreview .sr-aged-page-sheet');for(const x of preview){assert(x.nested&&x.fit&&x.grid,JSON.stringify(x));assert.deepEqual(x.overflow,[]);assert(x.frames.every(f=>f.style==='solid'&&f.width>0));assert.equal(x.frames[0].color,'rgb(158, 0, 0)');assert.equal(x.frames[1].color,'rgb(100, 116, 139)');assert.equal(x.frames[2].color,'rgb(158, 0, 0)');assert.equal(x.titleBg,'rgb(255, 242, 204)');if(x.totalBg)assert.equal(x.totalBg,'rgb(251, 227, 160)');}
  const values=await page.locator('#srFinalPreview .sr-data-row').evaluateAll(xs=>xs.map(x=>x.dataset.srAmount4));assert.equal(values.length,48);await page.evaluate(()=>{window.print=()=>{};window.__agedPrint();});await page.emulateMedia({media:'print'});const printed=await info('#printHost .sr-aged-page-sheet');assert.deepEqual(printed,preview);assert.deepEqual(await page.locator('#printHost .sr-data-row').evaluateAll(xs=>xs.map(x=>x.dataset.srAmount4)),values);const doc=await PDFDocument.load(await page.pdf({printBackground:true,preferCSSPageSize:true}));assert.equal(doc.getPageCount(),count);
  const {PDFArray,decodePDFRawStream}=require('pdf-lib');for(const pdfPage of doc.getPages()){const contents=pdfPage.node.Contents(),streams=contents instanceof PDFArray?contents.asArray().map(x=>doc.context.lookup(x)):[doc.context.lookup(contents)],text=streams.map(x=>Buffer.from(decodePDFRawStream(x).decode()).toString('latin1')).join('\n');assert((text.match(/\.6196 0 0 RG/g)||[]).length>=2,'PDF contains both red frame borders');assert.match(text,/\.2(?:0+)? \.2549/,'PDF contains grid strokes');}
  assert.deepEqual(errors,[]);assert.deepEqual(dialogs,[]);await context.close();
 }finally{await browser.close();}
});

test('oversized aged amounts remain marked but no longer block test printing', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{const {page,context,errors,dialogs}=await setup(browser);await page.evaluate(()=>window.__agedFixture([{groupKey:'long',kolCode:'1',kolTitle:'حساب',moeinCode:'1',moeinTitle:'معین',tafCode:'1',tafTitle:'تفصیلی',priorAmount:null,auditAmount:123456789012345678901234567890n,followUp:null,auditOffset:0n,finalAmount:null}]));assert(await page.locator('#srFinalPreview .sr-aged-page-overflow').count()>0);assert.equal(await page.locator('#srFinalPreview .sr-pagination-error').count(),0);await page.evaluate(()=>{window.__printAttempted=false;window.print=()=>window.__printAttempted=true;window.__agedPrint();});assert.equal(await page.evaluate(()=>window.__printAttempted),true);await page.emulateMedia({media:'print'});assert.equal(await page.locator('#printHost .sr-data-row').count(),1);const pdf=await PDFDocument.load(await page.pdf({printBackground:true,preferCSSPageSize:true}));assert.ok(pdf.getPageCount()>=1);assert.deepEqual(dialogs,[]);assert.deepEqual(errors,[]);await context.close();}finally{await browser.close();}
});

test('oversized aged account title is reduced only as needed in preview and printed PDF', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{
  const {page,context,errors,dialogs}=await setup(browser);
  const title='عنوان حساب شخص برای کنترل کامل چاپ '.repeat(70)+'انتهای عنوان';
  await page.evaluate(title=>window.__agedFixture([{groupKey:'long-title',kolCode:'1',kolTitle:'حساب',moeinCode:'1',moeinTitle:'معین',tafCode:'1',tafTitle:title,priorAmount:12n,auditAmount:1000000000n,followUp:100n,auditOffset:0n,finalAmount:999999900n}]),title);
  assert.equal(await page.locator('#srFinalPreview .sr-aged-page-overflow').count(),0);
  const preview=await page.locator('#srFinalPreview .sr-data-row').evaluate(r=>({title:r.querySelector('.sr-account-title').textContent,font:getComputedStyle(r.querySelector('.sr-account-title')).fontSize,money:getComputedStyle(r.querySelector('.num').nextElementSibling).fontSize}));
  assert.equal(preview.title,title);assert(parseFloat(preview.font)<parseFloat(preview.money));
  await page.evaluate(()=>{window.print=()=>{};window.__agedPrint();});await page.emulateMedia({media:'print'});
  const printed=await page.locator('#printHost .sr-data-row .sr-account-title').evaluate(el=>({text:el.textContent,font:getComputedStyle(el).fontSize}));
  assert.equal(printed.text,title);assert.equal(printed.font,preview.font);
  const pdf=await PDFDocument.load(await page.pdf({printBackground:true,preferCSSPageSize:true}));assert.equal(pdf.getPageCount(),1);
  assert.deepEqual(dialogs,[]);assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('unavoidably oversized aged title remains marked while test printing is allowed', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{
  const {page,context,errors,dialogs}=await setup(browser);const title='نام طولانی طرف حساب '.repeat(500)+'پایان';
  await page.evaluate(title=>window.__agedFixture([{groupKey:'huge-title',kolCode:'1',kolTitle:'حساب',moeinCode:'1',moeinTitle:'معین',tafCode:'1',tafTitle:title,priorAmount:10n,auditAmount:1000n,followUp:100n,auditOffset:0n,finalAmount:900n}]),title);
  assert.equal(await page.locator('#srFinalPreview .sr-aged-page-overflow').count(),1);
  assert.equal(await page.locator('#srFinalPreview .sr-pagination-error').count(),0);
  assert.equal(await page.locator('#srFinalPreview .sr-data-row .sr-account-title').innerText(),title);
  await page.evaluate(()=>{window.__printAttempted=false;window.print=()=>window.__printAttempted=true;window.__agedPrint();});
  assert.equal(await page.evaluate(()=>window.__printAttempted),true);assert.deepEqual(dialogs,[]);assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});


test('real 1403 XLSX upload feeds 1404 follow-up and displays comparative amount', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{
  const {page,context,errors}=await setup(browser);const result=await page.evaluate(()=>window.__agedRawPriorXlsx());
  assert.equal(result.file,'1403.xlsx');assert.equal(result.priorNext,'audit');assert.equal(result.prior,'70');assert.equal(result.audit,'70');assert.equal(result.final,null);
  assert.match(result.header,/۱۴۰۳/);assert.equal(await page.locator('#realPriorResult .sr-data-row').count(),1);assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});


test('aged workpaper returning from another step waits until the stage is visible before pagination', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{const {page,context,errors,dialogs}=await setup(browser);await page.evaluate(()=>window.__agedHiddenStep());
 await page.waitForSelector('#srFinalPreview .sr-aged-page');assert.equal(await page.locator('#srFinalPreview .sr-aged-page').count(),1);assert.equal(await page.locator('#srFinalPreview .sr-aged-page-overflow').count(),0);assert.equal(await page.locator('#srFinalPreview .sr-data-row').count(),5);
 await page.evaluate(()=>{window.print=()=>{};});await page.locator('#srPrint').click();await page.emulateMedia({media:'print'});assert.equal(await page.locator('#printHost .sr-data-row').count(),5);const pdf=await PDFDocument.load(await page.pdf({printBackground:true,preferCSSPageSize:true}));assert.equal(pdf.getPageCount(),1);assert.deepEqual(dialogs,[]);assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});


test('aged pagination measures consistently under inherited page zoom and marks real overflow', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{const {page,context,errors,dialogs}=await setup(browser);
 let baseline;
 for(const zoom of [1,0.8,1.25]){
  await page.evaluate(z=>{document.body.style.zoom=z;window.__agedFixture();},zoom);
  const result=await page.evaluate(()=>[...document.querySelectorAll('#srFinalPreview .sr-aged-page')].map(b=>({rows:b.querySelectorAll('.sr-data-row').length,overflow:b.classList.contains('sr-aged-page-overflow')})));
  assert.ok(result.length>1);assert.ok(result.every(p=>!p.overflow),`zoom ${zoom}: ${JSON.stringify(result)}`);
  if(!baseline)baseline=result.map(p=>p.rows);else assert.deepEqual(result.map(p=>p.rows),baseline);
 }
 await page.evaluate(()=>{document.body.style.zoom='1';window.print=()=>{};window.__agedPrint();});await page.emulateMedia({media:'print'});assert.equal(await page.locator('#printHost .sr-data-row').count(),50);const pdf=await PDFDocument.load(await page.pdf({printBackground:true,preferCSSPageSize:true}));assert.equal(pdf.getPageCount(),baseline.length);
 await page.emulateMedia({media:'screen'});await page.evaluate(()=>{document.body.style.zoom='0.8';window.__agedFixture([{groupKey:'1',kolCode:'1',kolTitle:'حساب',moeinCode:'1',moeinTitle:'حساب',tafCode:'1',tafTitle:'طرف حساب',priorAmount:null,auditAmount:111111111111111111111111111111111111111111111n,followUp:null,auditOffset:0n,finalAmount:null}]);window.__agedPrint();});
 assert.ok(await page.locator('#srFinalPreview .sr-aged-page-overflow').count()>0);assert.deepEqual(dialogs,[]);assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});


test('aged row height and space before page numbers match in preview and PDF print', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{
  const {page,context,errors,dialogs}=await setup(browser);await page.evaluate(()=>window.__agedFixture());
  const inspect=selector=>page.evaluate(selector=>[...document.querySelectorAll(selector)].map(sheet=>{
   const table=sheet.querySelector('.sr-paper-table').getBoundingClientRect(),footer=sheet.querySelector('.sr-aged-page-number'),range=document.createRange();range.selectNodeContents(footer);const text=range.getBoundingClientRect(),frame=sheet.querySelector('.sr-aged-content').getBoundingClientRect();
   return {gap:text.top-table.bottom,footerBottom:footer.getBoundingClientRect().bottom,frameBottom:frame.bottom,heights:[...sheet.querySelectorAll('.sr-data-row')].map(r=>r.getBoundingClientRect().height),amounts:[...sheet.querySelectorAll('.sr-data-row')].map(r=>r.dataset.srAmount1)};
  }),selector);
  const preview=await inspect('#srFinalPreview .sr-aged-page-sheet');assert.ok(preview.length>1);for(const p of preview){assert.ok(p.gap>=7,JSON.stringify(p));assert.ok(p.footerBottom<=p.frameBottom+1);assert.ok(p.heights.every(h=>h>=24.5),JSON.stringify(p));}
  await page.evaluate(()=>{window.print=()=>{};window.__agedPrint();});await page.emulateMedia({media:'print'});const printed=await inspect('#printHost .sr-aged-page-sheet');assert.deepEqual(printed.map(p=>p.amounts),preview.map(p=>p.amounts));for(let i=0;i<printed.length;i++){assert.ok(printed[i].gap>=7,JSON.stringify(printed[i]));assert.ok(printed[i].footerBottom<=printed[i].frameBottom+1);for(let j=0;j<printed[i].heights.length;j++)assert.ok(Math.abs(printed[i].heights[j]-preview[i].heights[j])<1);}
  const pdf=await PDFDocument.load(await page.pdf({printBackground:true,preferCSSPageSize:true}));assert.equal(pdf.getPageCount(),preview.length);assert.deepEqual(dialogs,[]);assert.deepEqual(errors,[]);await context.close();
 }finally{await browser.close();}
});

test('aged alternating data, merged accounts and special rows retain preview colors in printed PDF', {skip:!executablePath&&'Set CHROMIUM_PATH'},async()=>{
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});try{
  const {page,context,errors,dialogs}=await setup(browser);await page.evaluate(()=>{
   const rows=Array.from({length:70},(_,i)=>({groupKey:'key'+i,kolCode:String(Math.floor(i/14)),kolTitle:'گروه '+Math.floor(i/14),moeinCode:String(Math.floor(i/4)),moeinTitle:'معین '+Math.floor(i/4),tafCode:String(i),tafTitle:'طرف حساب '+i,priorAmount:null,auditAmount:1234567n,followUp:100n,auditOffset:0n,finalAmount:1234467n}));window.__agedFixture(rows);
  });
  const colors=selector=>page.evaluate(selector=>[...document.querySelectorAll(selector+' .sr-paper-table tbody tr')].map(row=>({kind:row.className,cells:[...row.cells].map(cell=>({span:cell.rowSpan,color:getComputedStyle(cell).backgroundColor}))})),selector);
  const preview=await colors('#srFinalPreview');assert.ok(preview.some(r=>r.cells.some(c=>c.span>1)));const data=preview.filter(r=>r.kind.includes('sr-data-row'));assert.equal(data.length,70);
  data.forEach((r,i)=>{assert.equal(r.cells.find(c=>c.span===1).color,i%2?'rgb(255, 252, 242)':'rgb(255, 255, 255)');});
  await page.evaluate(()=>{window.print=()=>{};window.__agedPrint();});await page.emulateMedia({media:'print'});const printed=await colors('#printHost');assert.deepEqual(printed,preview,'each cell keeps exactly the same background including merged, subtotal and carry rows');
  const {PDFArray,decodePDFRawStream}=require('pdf-lib'),doc=await PDFDocument.load(await page.pdf({printBackground:false,preferCSSPageSize:true}));assert.ok(doc.getPageCount()>1);
  let streams='';for(const p of doc.getPages()){const content=p.node.Contents(),parts=content instanceof PDFArray?content.asArray().map(x=>doc.context.lookup(x)):[doc.context.lookup(content)];streams+=parts.map(x=>Buffer.from(decodePDFRawStream(x).decode()).toString('latin1')).join('\n');}
  assert.match(streams,/1 \.9882 \.949(?:0)? rg/,'stripe color is present in actual PDF even without background setting');assert.doesNotMatch(streams,/\.9686 \.9686 \.9686 rg/,'generic grey table striping is absent');assert.deepEqual(errors,[]);assert.deepEqual(dialogs,[]);await context.close();
 }finally{await browser.close();}
});
