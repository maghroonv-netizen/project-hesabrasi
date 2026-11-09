// Browser regression: requires playwright-core, pdf-lib and a Chromium executable.
// Example: CHROMIUM_PATH=/path/to/chromium node tests/sampling-preview.test.cjs
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { chromium } = require('playwright-core');
const { PDFDocument } = require('pdf-lib');

(async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'audit-google-auto.html'));
  const server = http.createServer((req, res) => { res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'}); res.end(html); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH, headless: true, args:['--no-sandbox', '--disable-dev-shm-usage']});
  try {
    const page = await browser.newPage({viewport:{width:1400,height:900}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    const initial = await page.evaluate(() => {
      // Build while the stage is hidden, as happens on first entering the output step.
      ACCOUNT_LEVELS=[{code:'کد حساب',title:'عنوان حساب'}];const all=[],selected=[];
      for(let i=1;i<=38;i++){
        const month=1+Math.floor((i-1)/28),day=1+(i-1)%28,base={'شماره سند':String(i),'تاریخ':'1403/'+String(month).padStart(2,'0')+'/'+String(day).padStart(2,'0'),'شرح سند':'ثبت هزینه عملیاتی شماره '+i+' بابت پرداخت و خدمات','نوع سند':'روزانه'};
        const target={...base,'کد حساب':'100','عنوان حساب':'حساب نمونه','شرح ردیف':'شرح ردیف '+i+' خدمات شرکت با اطلاعات و مدارک پشتیبان','بدهکار':i*1000000,'بستانکار':0};
        const credit={...base,'کد حساب':'200','عنوان حساب':'طرف حساب ویژه شرکت الف با شرح حساب آزمایشی '+i,'شرح ردیف':'طرف مقابل سند '+i,'بدهکار':0,'بستانکار':i*1000000};
        all.push(credit,target);selected.push({doc:String(i),rows:[target]});
      }
      selected.reverse();
      FULL_ROWS=all;ACCOUNT_ROWS=all;
      const w={keyPath:['100|حساب نمونه'],levelIdx:0,pathLabel:'حساب نمونه',title:'حساب نمونه',code:'100'};
      SHEET_OUT=[{w,sel:selected}];ACTIVE_SHEET=0;renderOutputStep();
      const canvas=document.querySelector('.sheetwrap:not(.hide) [data-sheet-canvas]');
      const hidden=canvas.dataset.paginated;
      document.body.classList.remove('meta-stage-active');document.getElementById('projectMeta').hidden=true;
      document.querySelectorAll('.stage').forEach(x=>x.classList.remove('active'));document.querySelector('[data-stage="6"]').classList.add('active');
      const markers=[...canvas.querySelectorAll('.ref-oval')],markerRects=markers.map(m=>m.getBoundingClientRect()),dates=[...canvas.querySelectorAll('tr.item .sample-date-text')].map(x=>x.textContent);
      const dateSorted=dates.every((date,i)=>i===0||sampleDateCompare(dates[i-1],date)<=0);
      return {hidden, buttons:canvas.querySelectorAll('.cp-ws-anchor button').length,refMarkers:markers.length,ellipse:markerRects.length>0&&markerRects.every(r=>r.width>r.height),atRight:markers.length>0&&markers.every(m=>{const r=m.getBoundingClientRect(),box=m.closest('.meta').getBoundingClientRect();return Math.abs(box.right-r.right)<Math.abs(r.left-box.left)}),headerNotExpanded:markers.length>0&&markers.every(m=>m.getBoundingClientRect().height<m.closest('.meta').getBoundingClientRect().height),dateSorted};
    });
    assert.equal(initial.hidden,'1');assert.equal(initial.buttons,38);assert.ok(initial.refMarkers>=1&&initial.ellipse&&initial.atRight&&initial.headerNotExpanded,'every sampling page keeps a right-aligned oval that does not expand the header');assert.ok(initial.dateSorted,'sample worksheet rows are sorted chronologically, not by amount-selection order');
    const removal=await page.evaluate(()=>{
      const wrap=document.querySelector('.sheetwrap:not(.hide)'),canvas=wrap.querySelector('[data-sheet-canvas]'),printTarget=document.getElementById('printHost');SHEET_OUT[0].unit='row';SHEET_OUT[0].count=38;
      sampleCopyPreviewForPrint(wrap,printTarget);const printHasNoDeleteControls=!printTarget.querySelector('.sample-row-remove');printTarget.replaceChildren();
      canvas.querySelector('.sample-row-remove').click();
      const remaining=SHEET_OUT[0].sel.flatMap(group=>group.rows||[]),sampleTotal=remaining.reduce((sum,row)=>sum+parseAmount(row['بدهکار']),0);
      return {printHasNoDeleteControls,remaining:remaining.length,sampleTotal,sourceRows:FULL_ROWS.length,visibleRows:document.querySelectorAll('.sheetwrap:not(.hide) tr.item').length,count:SHEET_OUT[0].count,unit:SHEET_OUT[0].unit};
    });
    assert.deepStrictEqual(removal,{printHasNoDeleteControls:true,remaining:37,sampleTotal:740000000,sourceRows:76,visibleRows:37,count:37,unit:'row'});
    await page.evaluate(() => {
      const canvas=document.querySelector('.sheetwrap:not(.hide) [data-sheet-canvas]');
      for(const anchor of canvas.querySelectorAll('.cp-ws-anchor'))if(!anchor.closest('.p'))throw Error('Evidence button is not after the account name');
      const row=canvas.querySelector('tr.item'),anchor=row.querySelector('.cp-ws-anchor'),parent=anchor.parentElement,h=row.getBoundingClientRect().height;
      anchor.remove();if(Math.abs(row.getBoundingClientRect().height-h)>0.1)throw Error('Evidence changes row height');parent.append(anchor);
      const evButton=canvas.querySelector('.cp-ws-anchor button');evButton.click();
      const dialog=document.getElementById('cpWorksheetDialog'),lines=[...dialog.querySelectorAll('.cp-ws-evidence tbody tr')],totals=[...dialog.querySelectorAll('.cp-ws-evidence tfoot td')];
      if(lines.length!==2||!lines[0].textContent.includes('حساب نمونه')||!lines[1].textContent.includes('طرف حساب'))throw Error('Evidence must place debit before credit');
      if(totals[1].textContent!=='۲٬۰۰۰٬۰۰۰'||totals[2].textContent!=='۲٬۰۰۰٬۰۰۰')throw Error('Evidence totals are incorrect');dialog.close();
      const voucher=(code,d,c)=>({'شماره سند':'900','تاریخ':'1403/01/01','شرح سند':'سند چند ردیفی','کد حساب':code,'عنوان حساب':'حساب '+code,'شرح ردیف':'ردیف '+code,'بدهکار':d,'بستانکار':c});
      const evidence=[voucher('CREDIT','0','30'),voucher('DEBIT-A','9007199254740993','0'),voucher('DEBIT-B','1','0'),voucher('MIXED','3','4'),voucher('INVALID','نامعتبر','0'),voucher('ZERO','0','0')];
      FULL_ROWS=evidence;CP_LAB_META={...CP_LAB_META,source:evidence};const ctx=cpLabContext(evidence);CP_WS_CONTEXT=ctx;cpWorksheetOpen(evidence[0],ctx);
      const body=[...document.querySelectorAll('#cpWorksheetDialog .cp-ws-evidence tbody tr')],foot=[...document.querySelectorAll('#cpWorksheetDialog .cp-ws-evidence tfoot td')];
      const ids=body.map(r=>r.cells[0].childNodes[0].textContent.trim());if(ids.join(',')!=='R2,R3,R4,R1,R5,R6')throw Error('Debit/mixed/credit/invalid evidence order is wrong: '+ids);
      if(body[0].cells[5].textContent.trim()!=='۹٬۰۰۷٬۱۹۹٬۲۵۴٬۷۴۰٬۹۹۳')throw Error('Large source integer lost precision: '+body[0].cells[5].textContent);
      if(foot[1].textContent.trim()!=='نامعتبر — قابل جمع نیست'||foot[2].textContent.trim()!=='۳۴')throw Error('Invalid amount warning or exact credit total failed: '+foot[1].textContent+' / '+foot[2].textContent);
      if(cpWorksheetExactSum(['9007199254740993','1','3'])!=='۹٬۰۰۷٬۱۹۹٬۲۵۴٬۷۴۰٬۹۹۷')throw Error('Integer totals were rounded');
      if(cpWorksheetExactText('-1234567.0500',false)!=='-۱٬۲۳۴٬۵۶۷٫۰۵۰۰'||cpWorksheetExactSum(['-1.25','3.5'])!=='۲٫۲۵')throw Error('Signed/decimal source amounts were changed');
      const firstCells=[...body[0].cells].map(c=>c.getBoundingClientRect().left);if(getComputedStyle(document.querySelector('#cpWorksheetDialog .cp-ws-evidence table')).direction!=='rtl'||firstCells[0]<=firstCells.at(-1))throw Error('Evidence columns are not visually right-to-left');document.getElementById('cpWorksheetDialog').close();
      const bundle=(code,line,d,c)=>({'شماره سند':'901','ردیف سند':String(line),'تاریخ':'1403/01/02','شرح سند':'سند یک‌به‌چند','کد حساب':code,'عنوان حساب':'حساب '+code,'شرح ردیف':'رویداد '+line,'بدهکار':d,'بستانکار':c});
      const many=[bundle('SAMPLE',1,'100','0'),...Array.from({length:10},(_,i)=>bundle('EVENT-'+i,i+2,'0','10'))];
      FULL_ROWS=many;CP_LAB_META={...CP_LAB_META,source:many};const manyCtx=cpLabContext(many);CP_WS_CONTEXT=manyCtx;cpWorksheetOpen(many[0],manyCtx);
      const summary=document.querySelector('#cpWorksheetDialog .cp-ws-reconcile'),matched=document.querySelectorAll('#cpWorksheetDialog [data-counterpart="true"]'),tail=[...document.querySelectorAll('#cpWorksheetDialog .cp-ws-evidence tfoot tr')];
      if(matched.length!==10||!summary?.textContent.includes('۱۰ ردیف')||!summary?.textContent.includes('برابر است'))throw Error('One-to-many counterparty aggregate is not clear: '+(summary?.textContent||document.getElementById('cpWorksheetDialog')?.innerHTML||'no dialog'));
      if(tail.length!==2||tail[1].cells[2].textContent.trim()!=='۱۰۰')throw Error('Counterparty side subtotal is missing or wrong');document.getElementById('cpWorksheetDialog').close();
      const ordered=(line,code,d,c)=>({'شماره سند':'902','ردیف سند':String(line),'تاریخ':'1403/01/03','شرح سند':'دو بخش پی‌درپی','کد حساب':code,'عنوان حساب':'حساب '+code,'شرح ردیف':'رویداد '+line,'بدهکار':d,'بستانکار':c});
      const blocks=[ordered(1,'SAMPLE-A','100','0'),ordered(2,'CREDIT-A1','0','60'),ordered(3,'CREDIT-A2','0','40'),ordered(4,'SAMPLE-B','50','0'),ordered(5,'CREDIT-B1','0','20'),ordered(6,'CREDIT-B2','0','30')];
      FULL_ROWS=blocks;CP_LAB_META={...CP_LAB_META,source:blocks};const blockCtx=cpLabContext(blocks);CP_WS_CONTEXT=blockCtx;cpWorksheetOpen(blocks[0],blockCtx);
      const blockSummary=document.querySelector('#cpWorksheetDialog .cp-ws-reconcile'),blockRows=document.querySelectorAll('#cpWorksheetDialog [data-counterpart="true"]');
      if(blockRows.length!==2||!blockSummary.textContent.includes('مرزبندی')||!blockSummary.textContent.includes('برابر است'))throw Error('Voucher row-number sequence was not shown as a qualified structural grouping: '+blockSummary?.textContent);document.getElementById('cpWorksheetDialog').close();
    });
    for(const [orientation,density] of [['landscape','normal'],['landscape','compact'],['portrait','normal']]){
      await page.evaluate(([orientation,density])=>{
        SHEET_CFG.orientation=orientation;SHEET_CFG.density=density;drawSheets();
        const vec=samplePrintLayout(SHEET_OUT[0].w).vector.slice();vec[3]+=5;vec[4]-=5;sampleSetWorksheetColumns(0,vec);
      },[orientation,density]);
      const screenRowHeight=await page.evaluate(()=>document.querySelector('.sheetwrap:not(.hide) tr.item').getBoundingClientRect().height);
      const expected=await page.evaluate(()=>{
        const wrap=document.querySelector('.sheetwrap:not(.hide)'),canvas=wrap.querySelector('[data-sheet-canvas]');
        if(canvas.dataset.paginated!=='1')throw Error(wrap.querySelector('[data-page-badge]').textContent);
        return [...canvas.querySelectorAll('.sample-paper-box')].map(x=>[...x.querySelectorAll('tr.item')].map(r=>r.dataset.sampleRow));
      });
      assert(expected.length>1);assert.strictEqual(expected.flat().length,37);
      // Exercise Ctrl+P first, before the explicit toolbar print path.
      const direct=await page.pdf({preferCSSPageSize:true,printBackground:true});
      assert.strictEqual((await PDFDocument.load(direct)).getPageCount(),expected.length,`${orientation}/${density}: direct PDF page count`);
      await page.evaluate(()=>{window.dispatchEvent(new Event('afterprint'));window.print=()=>{};printSheet(document.querySelector('.sheetwrap:not(.hide)'));});
      const printed=await page.evaluate(()=>[...document.querySelectorAll('#printHost .sample-paper-box')].map(x=>[...x.querySelectorAll('tr.item')].map(r=>r.dataset.sampleRow)));
      assert.deepStrictEqual(printed,expected);
      assert.strictEqual(await page.locator('#printHost .cp-ws-action,#printHost .cp-ws-status').count(),0);
      await page.emulateMedia({media:'print'});
      const measurements=await page.evaluate(()=>[...document.querySelectorAll('#printHost .sample-paper-box')].map(x=>({height:x.getBoundingClientRect().height, limit:parseFloat(x.querySelector('.sheet').style.getPropertyValue('--sample-full-height'))*96/25.4})));
      assert(measurements.every(x=>x.height<=x.limit+1),'A print page exceeds the physical paper height');
      const printRowHeight=await page.locator('#printHost tr.item').first().evaluate(e=>e.getBoundingClientRect().height);
      assert(Math.abs(screenRowHeight-printRowHeight)<0.5,`Preview/print row heights differ: ${screenRowHeight} vs ${printRowHeight}`);
      const bytes=await page.pdf({preferCSSPageSize:true,printBackground:true});
      assert.strictEqual((await PDFDocument.load(bytes)).getPageCount(),expected.length,`${orientation}/${density}: actual PDF page count`);
      await page.emulateMedia({media:null});
    }
    // A single sampled voucher with many contra-accounts can span pages. The
    // button belongs only after the final fragment, without repeating amounts.
    const split=await page.evaluate(()=>{
      SHEET_CFG.orientation='landscape';SHEET_CFG.density='normal';
      const base={'شماره سند':'991','تاریخ':'1403/01/01','شرح سند':'سند مرکب','نوع سند':'روزانه'};
      const target={...base,'کد حساب':'100','عنوان حساب':'حساب نمونه','شرح ردیف':'ثبت نمونه','بدهکار':35000000,'بستانکار':0};
      const counterparts=Array.from({length:35},(_,i)=>({...base,'کد حساب':String(200+i),'عنوان حساب':'حساب مقابل شماره '+(i+1)+' با عنوان بلند برای آزمون صفحه بندی','بدهکار':0,'بستانکار':1000000}));
      FULL_ROWS=[target,...counterparts];ACCOUNT_ROWS=FULL_ROWS;
      const w={keyPath:['100|حساب نمونه'],levelIdx:0,pathLabel:'حساب نمونه',title:'حساب نمونه',code:'100'};
      SHEET_OUT=[{w,sel:[{doc:'991',rows:[target]}]}];ACTIVE_SHEET=0;drawSheets();
      const c=document.querySelector('.sheetwrap:not(.hide) [data-sheet-canvas]'),items=[...c.querySelectorAll('tr.item')],cont=[...c.querySelectorAll('tr.sample-continuation')],btns=[...c.querySelectorAll('.cp-ws-anchor button')];
      const names=[...c.querySelectorAll('tr.item .cp-txt > .p,tr.sample-continuation .cp-txt > .p')].map(x=>x.textContent.replace('شواهد','').trim());
      return {paginated:c.dataset.paginated,items:items.length,continuations:cont.length,buttons:btns.length,names:names.length,unique:new Set(names).size,last:btns[0]?.closest('tr')===cont.at(-1),sum:c.querySelector('.sample-final-total')?.dataset.debit};
    });
    assert.strictEqual(split.paginated,'1');assert.strictEqual(split.items,1);assert(split.continuations>0);
    assert.strictEqual(split.names,35);assert.strictEqual(split.unique,35);assert.strictEqual(split.buttons,1);assert(split.last);
    assert.strictEqual(split.sum,'35000000');
    assert.deepStrictEqual(errors,[]);console.log('Sampling preview, evidence, resize and actual PDF: PASS');
  } finally { await browser.close();server.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
