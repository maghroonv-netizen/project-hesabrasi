/* آزمون سرتاسری رابط کاربری در مرورگر شبیه‌سازی‌شده (jsdom).
   اجرا:  npm i --no-save jsdom@24 && node tests/sanavati-raked/e2e-browser.js
   سه فایل اکسل (۱۴۰۲ با تاریخ سریالی اکسل، ۱۴۰۳، ۱۴۰۴) ساخته و همهٔ ۶ مرحله طی می‌شود. */
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','..','audit-google-auto.html'),'utf8');
const vc=new VirtualConsole(); const errs=[]; vc.on('jsdomError',e=>errs.push(e.message)); vc.on('error',e=>errs.push(String(e)));
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,url:'http://localhost/'});
const w=dom.window; w.alert=m=>{console.log('ALERT',m)}; w.print=()=>{console.log('PRINT called')}; w.confirm=()=>true;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const $=id=>w.document.getElementById(id);
const H=['شماره سند','ردیف','تاریخ سند','شرح سند','شرح ردیف','کد کل','عنوان کل','کد معین','عنوان معین','کد تفصیلی','عنوان تفصیلی','بدهکار','بستانکار'];
function mk(y,rows,dateAsSerial){
  const aoa=[H,...rows.map((r,i)=>[r[0],i+1,dateAsSerial?{t:'n',v:serial(r[1])}:r[1],r[2]||'',r[3]||'',r[4],r[5],r[6],r[7],r[8]||'',r[9]||'',r[10],r[11]])];
  const ws=w.XLSX.utils.aoa_to_sheet(aoa.map(row=>row.map(c=>c&&c.t?c.v:c)));
  if(dateAsSerial) rows.forEach((r,i)=>{ const a=w.XLSX.utils.encode_cell({r:i+1,c:2}); ws[a]={t:'n',v:serial(r[1]),z:'m/d/yy'}; });
  const wb=w.XLSX.utils.book_new(); w.XLSX.utils.book_append_sheet(wb,ws,'اسناد'); return w.XLSX.write(wb,{type:'array',bookType:'xlsx'});
}
function serial(j){ const S=w.SRE; const p=S.parseDate(j); const g=S.dayToGregorian?null:null; return p.day-2415019; }
const P=(t,s)=>['1','دارایی','10','حساب‌های دریافتنی تجاری','500','شرکت الف'];
const C=(taf,name)=>['1','دارایی','10','حساب‌های دریافتنی تجاری',taf,name];
const B=['1','دارایی','01','موجودی نزد بانک‌ها','',''];
const SAL=['6','درآمد','61','فروش','',''];
const r=(doc,date,d1,d2,acc,deb,cr)=>[doc,date,d1,d2,...acc,deb,cr];
const y1402=[r(1,'1402/01/01','سند افتتاحیه','',C('500','شرکت الف'),5000000,0), r(1,'1402/01/01','سند افتتاحیه','',SAL,0,5000000),
  r(20,'1402/05/10','فروش','',C('500','شرکت الف'),3000000,0), r(20,'1402/05/10','فروش','',SAL,0,3000000),
  r(30,'1402/09/01','دریافت','',C('500','شرکت الف'),0,2000000), r(30,'1402/09/01','دریافت','',B,2000000,0),
  r(31,'1402/10/01','فروش','',C('501','شرکت ب'),700000,0), r(31,'1402/10/01','فروش','',SAL,0,700000)];
const y1403=[r(1,'1403/01/01','سند افتتاحیه','',C('500','شرکت الف'),6000000,0),r(1,'1403/01/01','سند افتتاحیه','',C('501','شرکت ب'),700000,0),r(1,'1403/01/01','سند افتتاحیه','',SAL,0,6700000),
  r(15,'1403/03/15','فروش','',C('500','شرکت الف'),1000000,0), r(15,'1403/03/15','فروش','',SAL,0,1000000),
  r(40,'1403/11/20','دریافت','وصول',C('500','شرکت الف'),0,1500000), r(40,'1403/11/20','دریافت','',B,1500000,0),
  r(99,'1403/12/30','سند اختتامیه','',C('500','شرکت الف'),0,5500000), r(99,'1403/12/30','سند اختتامیه','',C('501','شرکت ب'),0,700000), r(99,'1403/12/30','سند اختتامیه','',SAL,6200000,0)];
const y1404=[r(1,'1404/01/01','سند افتتاحیه','',C('500','شرکت الف'),5500000,0),r(1,'1404/01/01','سند افتتاحیه','',C('501','شرکت ب'),700000,0),r(1,'1404/01/01','سند افتتاحیه','',SAL,0,6200000),
  r(5,'1404/02/01','دریافت','',C('500','شرکت الف'),0,500000), r(5,'1404/02/01','',' ',B,500000,0)];
(async()=>{
  await sleep(300);
  console.log('init errors:',errs.length?errs:'none');
  // ورود به ماژول از صفحهٔ اول
  const btn=w.document.querySelector('[data-open="sr"]'); btn.click(); await sleep(50);
  console.log('module',w.eval('CUR_MODULE'),'step',w.eval('CUR_STEP'),'stage active:',w.document.querySelector('.stage.active').dataset.stage);
  const files=[['1402.xlsx',mk(1402,y1402,true)],['1403.xlsx',mk(1403,y1403)],['1404.xlsx',mk(1404,y1404)]].map(([n,b])=>new w.File([b],n));
  const SR=w.SR_STATE;
  // افزودن فایل‌ها از طریق رویداد واقعی change
  const inp=$('srFile'); Object.defineProperty(inp,'files',{value:files,configurable:true}); inp.dispatchEvent(new w.Event('change'));
  for(let i=0;i<60&&!(SR.files.length===3&&SR.files.every(f=>f.status!=='reading'));i++) await sleep(100);
  SR.files.forEach(f=>console.log(f.name,f.status,f.error||'',f.data&&f.data.length,'start',f.start&&w.SRE.formatDay(f.start),'end',f.end&&w.SRE.formatDay(f.end),'keys',f.keyFields,'map date',f.mapping&&f.mapping.date, 'sample date', f.data&&f.data[0][2]));
  // سال رسیدگی = 1403
  w.document.querySelector(`input[name=srAudit][value="${SR.files[1].id}"]`).click(); await sleep(20);
  $('srS1').querySelector('[data-next]').click(); await sleep(50);
  console.log('step',w.eval('CUR_STEP'));
  $('srS2').querySelector('[data-next]').click(); await sleep(50);
  console.log('step',w.eval('CUR_STEP'), 'errs:',[...$('srS2').querySelectorAll('.err')].map(e=>e.textContent));
  SR.files.forEach(f=>console.log(' oc',f.label,[...f.openingDocs],[...f.closingDocs],f.hasOpening));
  $('srS3').querySelector('[data-next]').click(); await sleep(300);
  console.log('step',w.eval('CUR_STEP'),'accounts',SR.model&&SR.model.accounts.size);
  $('srAccAll').click(); await sleep(30);
  $('srS4').querySelector('[data-next]').click(); await sleep(50);
  console.log('step',w.eval('CUR_STEP'));
  $('srS5').querySelector('[data-next]').click(); await sleep(400);
  console.log('step',w.eval('CUR_STEP'),'checks',SR.result&&SR.result.checks.length);
  const R=SR.result; R.keys.filter(k=>k.endSide).forEach(k=>console.log(' ',k.title,String(k.end),k.endSide,'san',String(k.sanavati.min),String(k.sanavati.max),'stale6',String(k.stale[0].min),String(k.stale[0].max),k.activity[0].status,'next',k.next&&String(k.next.dec)));
  console.log('exceptions',R.exceptions.map(x=>x.code).join(','));
  for(const t of ['san','stale','exc','next','detail','help']){ w.document.querySelector(`[data-tab="${t}"]`).click(); await sleep(30); console.log('tab',t,'len',$('srReport').innerHTML.length); }
  w.document.querySelector('[data-tab="san"]').click(); await sleep(20);
  console.log($('srReport').textContent.replace(/\s+/g,' ').slice(0,700));
  // خروجی اکسل
  let wrote=null; const orig=w.XLSX.writeFile; w.XLSX.writeFile=(wb,n)=>{ wrote=[n,wb.SheetNames]; };
  $('srXlsx').click(); console.log('xlsx',wrote);
  $('srPrint').click(); console.log('printing class',w.document.body.classList.contains('printing'),'printHost len',$('printHost').innerHTML.length);
  // stepper and back
  console.log('stepper', $('stepper').textContent.replace(/\s+/g,' ').slice(0,200));
  w.eval("gotoModule('home')"); await sleep(20); console.log('home ok', w.eval('CUR_MODULE'));
  console.log('runtime errors:',errs.length?errs.slice(0,5):'none');
})().catch(e=>{console.error('FAIL',e); process.exit(1)});
