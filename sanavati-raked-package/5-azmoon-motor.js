#!/usr/bin/env node
/* آزمون‌های موتور ماژول «اقلام سنواتی و راکد»
   اجرا:  node tests/sanavati-raked/run.js
   موتور مستقیماً از audit-google-auto.html (بین نشانگرهای SR-ENGINE) استخراج و اجرا می‌شود
   تا آزمون همیشه روی همان کدی باشد که کاربر اجرا می‌کند. */
'use strict';
const fs=require('fs'), path=require('path'), vm=require('vm');
const html=fs.readFileSync(process.argv[2]||require('path').join(__dirname,'..','audit-google-auto.html'),'utf8');
const a=html.indexOf('/* <<<SR-ENGINE-BEGIN>>> */'), b=html.indexOf('/* <<<SR-ENGINE-END>>> */');
if(a<0||b<0) throw new Error('بلوک موتور در فایل HTML پیدا نشد');
const sandbox={module:{exports:{}},console};
vm.createContext(sandbox);
vm.runInContext(html.slice(a,b),sandbox);
const S=sandbox.module.exports;

let pass=0, fail=0; const failures=[];
function test(name,fn){ try{ fn(); pass++; process.stdout.write('  ✓ '+name+'\n'); }catch(e){ fail++; failures.push(name); process.stdout.write('  ✗ '+name+'\n     '+(e&&e.stack||e).split('\n').slice(0,3).join('\n     ')+'\n'); } }
function eq(actual,expected,msg){ const A=typeof actual==='bigint'?actual.toString():JSON.stringify(actual), E=typeof expected==='bigint'?expected.toString():JSON.stringify(expected); if(A!==E) throw new Error((msg||'')+' انتظار '+E+' ولی '+A); }
function ok(c,msg){ if(!c) throw new Error(msg||'شرط برقرار نیست'); }
const J=(s)=>{ const [y,m,d]=s.split('/').map(Number); return S.jalaliToDay(y,m,d); };
const n=x=>BigInt(x);

// ---------- سازندهٔ دادهٔ مصنوعی ----------
let SEQ=0;
function row(doc,date,debit,credit,o={}){ return {doc:String(doc),row:String(++SEQ),date,debit:String(debit||0),credit:String(credit||0),kol:'kol' in o?o.kol:'1',kolT:o.kolT||'دارایی',moein:o.moein||'10',moeinT:o.moeinT||'حساب‌های دریافتنی تجاری',taf:o.taf===undefined?'500':o.taf,tafT:o.tafT||'مشتری الف',descDoc:o.desc||'',descRow:o.descRow||''}; }
function year(id,y,rows,o={}){ return {id,label:String(y),start:J(y+'/01/01'),end:J(y+'/12/'+(S.isLeap(y)?30:29)),rows,keyFields:o.keyFields||['taf'],openingDocs:o.openingDocs||['1'],closingDocs:o.closingDocs||[],hasOpening:o.hasOpening!==false}; }
function run(files,auditId,settings){ const m=S.build({files,auditFileId:auditId}); return {m,r:S.analyze(m,settings||{})}; }
function key1(r,k){ return k?r.keys.find(x=>x.key===k):r.keys.find(x=>x.endSide); }
// حساب «بانک» برای سند ساده
const BANK={kol:'1',moein:'01',moeinT:'موجودی نزد بانک‌ها',taf:'',tafT:''};
const NOTES={kol:'1',moein:'20',moeinT:'اسناد دریافتنی',taf:'',tafT:''};
const roles=(extra={})=>new Map(Object.entries({'1|01':{role:'CASH',nature:'D',confirmed:true},'1|20':{role:'NOTES_R',nature:'D',confirmed:true},'1|10':{role:'PERSON',nature:'D',confirmed:true},...extra}));

console.log('\n— E1 تاریخ شمسی —');
test('T22 رفت‌وبرگشت شمسی↔روز برای ۱۳۹۰ تا ۱۴۱۰',()=>{
  for(let y=1390;y<=1410;y++) for(let m=1;m<=12;m++) for(let d=1;d<=S.monthLength(y,m);d++){
    const j=S.dayToJalali(S.jalaliToDay(y,m,d)); if(j.jy!==y||j.jm!==m||j.jd!==d) throw new Error(y+'/'+m+'/'+d);
  }
});
test('تاریخ‌های مرجع: ۱۴۰۴/۰۱/۰۱ = 2025-03-21 و کبیسه بودن ۱۴۰۳',()=>{
  eq(S.parseDate(new Date(2025,2,21)).day,J('1404/01/01'));
  eq(S.isLeap(1403),true); eq(S.isLeap(1404),false); eq(S.isLeap(1399),true);
});
test('خواندن قالب‌های تاریخ: ارقام فارسی، سریال اکسل، ۸ رقمی، میلادی، نامعتبر',()=>{
  eq(S.parseDate('۱۴۰۳/۰۵/۱۲').day,J('1403/05/12'));
  eq(S.parseDate('1403-5-2 10:30').day,J('1403/05/02'));
  eq(S.parseDate(14030512).day,J('1403/05/12'));
  eq(S.parseDate(45737).day,J('1404/01/01'));        // سریال اکسل 2025-03-21
  eq(S.parseDate('2025/03/21').day,J('1404/01/01'));
  eq(S.parseDate('1404/12/30').ok,false);              // ۱۴۰۴ کبیسه نیست
  eq(S.parseDate('abc').ok,false); eq(S.parseDate('').ok,false);
});
test('T21 تاریخ مرز: ماه تقویمی با clamp و تعداد روز ثابت',()=>{
  eq(S.formatDay(S.cutoffDay(J('1404/12/29'),6,'months')),'1404/06/29');
  eq(S.formatDay(S.cutoffDay(J('1404/06/31'),6,'months')),'1403/12/30');
  eq(S.formatDay(S.cutoffDay(J('1405/06/31'),6,'months')),'1404/12/29');
  eq(S.formatDay(S.cutoffDay(J('1404/12/29'),6,'days')),'1404/06/30');
  eq(S.formatDay(S.cutoffDay(J('1404/12/29'),24,'months')),'1402/12/29');
});

console.log('\n— E2 مبلغ —');
test('T23 خواندن مبلغ: جداکننده، فارسی/عربی، پرانتز، خط تیره، نامعتبر، اعشار، دقت',()=>{
  eq(S.parseAmount('۱٬۲۳۴').value,1234n); eq(S.parseAmount('١٢٣').value,123n); eq(S.parseAmount('1,000,000').value,1000000n);
  eq(S.parseAmount('(500)').value,-500n); eq(S.parseAmount('500-').value,-500n); eq(S.parseAmount('-').value,0n); eq(S.parseAmount('').value,0n);
  eq(S.parseAmount('abc').ok,false); eq(S.parseAmount('12.5').ok,false); eq(S.parseAmount('12.00').value,12n);
  eq(S.parseAmount(1e17).ok,false); eq(S.parseAmount('123456789012345678901').value,123456789012345678901n);
  eq(S.parseAmount(12.0000000001).value,12n);
});

console.log('\n— E3/E4 نرمال‌سازی —');
test('ردیف دارای بدهکار و بستانکار ← دو رویداد ناخالص؛ مبلغ منفی ← ستون مقابل + استثنا',()=>{
  SEQ=0;
  const m=S.build({files:[year('y',1404,[row(5,'1404/02/01',100,40),row(6,'1404/02/02',-30,0)])],auditFileId:'y'});
  eq(m.events.length,3);
  eq(m.events.filter(e=>e.side==='C').reduce((s,e)=>s+e.amount,0n),70n);
  ok(m.exceptions.some(x=>x.code==='NEGATIVE_AMOUNT'));
});
test('تاریخ نامعتبر، خارج از سال، کد خالی و مبلغ نامعتبر ← استثنا و کلید «غیرقابل اتکا»',()=>{
  SEQ=0;
  const {m,r}=run([year('y',1404,[row(1,'1404/01/01',100,0),row(5,'1404/13/01',10,0),row(6,'1405/01/05',10,0),row(7,'1404/02/02',10,0,{kol:''}),row(8,'1404/02/02','x',0)])],'y');
  const codes=m.exceptions.map(x=>x.code);
  ['INVALID_DATE','DATE_OUT_OF_YEAR','MISSING_CODE','INVALID_AMOUNT'].forEach(c=>ok(codes.includes(c),c));
  ok(key1(r).unreliable,'کلید باید غیرقابل اتکا علامت بخورد');
});
test('T26 تفصیلی ناهمگن در یک معین ← استثنای مستقل',()=>{
  SEQ=0;
  const {r}=run([year('y',1404,[row(1,'1404/01/01',1000,0,{taf:''}),row(2,'1404/03/01',0,1000,{taf:'500'})])],'y');
  ok(r.exceptions.some(x=>x.code==='MIXED_TAFSILI'));
});

console.log('\n— E7/E8 دفتر لایه‌ها و کران‌ها (مثال‌های مستند) —');
test('T6 (بند ۹-۱) ۱۰۰ بد ← ۱۵۰ بس ← ۱۵۰ بس = ۲۰۰ بستانکار',()=>{
  SEQ=0;
  const {r}=run([year('y',1404,[row(1,'1404/01/01',100,0),row(2,'1404/02/01',0,150),row(3,'1404/03/01',0,150)])],'y');
  const k=key1(r); eq(k.end,200n); eq(k.endSide,'C'); eq(k.sanavati.min,0n); eq(k.sanavati.max,0n);
});
test('T7 (بند ۹-۲) واگرایی دوبارهٔ FIFO/LIFO پس از تغییر علامت: کمینه ۰، بیشینه ۵۰',()=>{
  SEQ=0;
  const {r}=run([year('y',1404,[row(1,'1404/01/01',100,0),row(2,'1404/01/15',0,150),row(3,'1404/05/10',0,100),row(4,'1404/06/10',100,0)])],'y',{thresholds:[9]});
  const k=key1(r); eq(k.end,50n); eq(k.endSide,'C');
  eq(S.formatDay(k.stale[0].cut),'1404/03/29');      // پایان خرداد
  eq(k.stale[0].min,0n); eq(k.stale[0].max,50n);
});
test('T4 (ایراد ۲) ترتیب هم‌روز: بیشینه در هر ترتیب شمارهٔ سند ۵۰ است',()=>{
  for(const [dc,dd] of [[10,11],[11,10]]){
    SEQ=0;
    const {r}=run([year('y',1404,[row(1,'1404/01/01',50,0),row(dc,'1404/07/01',0,100),row(dd,'1404/07/01',100,0)])],'y');
    const k=key1(r); eq(k.sanavati.max,50n,'ترتیب '+dc+'/'+dd); eq(k.sanavati.min,0n);
  }
});
test('T12 (بند ۱۲) اصلاحیهٔ ۲۰۰ بدون مرجع: سنواتی ۲۰۰ تا ۴۰۰ + منبع عدم‌قطعیت',()=>{
  SEQ=0;
  const {r}=run([year('a',1403,[row(1,'1403/01/01',0,0),row(2,'1403/05/01',400,0)]),year('b',1404,[row(1,'1404/01/01',400,0),row(3,'1404/04/01',300,0),row(4,'1404/08/01',0,200,{descRow:'اصلاح ثبت اشتباه'})])],'b');
  const k=key1(r); eq(k.end,500n); eq(k.sanavati.min,200n); eq(k.sanavati.max,400n);
  ok(k.uncertainty.some(u=>u.code==='CORRECTION_NOREF'&&u.amount===200n));
});
test('T13 (بند ۱۳) گردش اخیر، قدمت ۲۸۰ را از بین نمی‌برد؛ فعالیت = FULL',()=>{
  SEQ=0;
  const rows=[row(1,'1404/01/01',400,0),row(9,'1404/10/01',0,120),row(9,'1404/10/01',120,0,BANK)];
  const {r}=run([year('a',1403,[row(1,'1403/01/01',400,0)]),year('b',1404,rows)],'b',{roles:roles()});
  const k=r.keys.find(x=>x.account==='1|10');
  eq(k.end,280n); eq(k.stale[0].min,280n); eq(k.stale[0].max,280n); eq(k.activity[0].status,'FULL');
});
test('T14 (بند ۱۴) پرداخت جزئی لایه را جوان نمی‌کند',()=>{
  SEQ=0;
  const {r}=run([year('y',1404,[row(1,'1404/01/01',0,0),row(2,'1404/02/01',1000,0),row(3,'1404/11/01',0,100)])],'y');
  const k=key1(r); eq(k.end,900n); eq(k.stale[0].min,900n); eq(k.stale[0].max,900n);
  eq(k.layers.MIN[0].day,J('1404/02/01'));
});
test('T15 (بند ۸) سند ۵۰۰ بد و ۴۰۰ بس روی یک کلید خالص نمی‌شود',()=>{
  SEQ=0;
  const {m,r}=run([year('y',1404,[row(1,'1404/01/01',300,0),row(7,'1404/09/01',500,0),row(7,'1404/09/01',0,400)])],'y');
  eq(m.events.filter(e=>e.doc==='7').length,2);
  const k=key1(r); eq(k.end,400n); eq(k.sanavati.min,0n); eq(k.sanavati.max,300n);   // خالص‌سازی بیشینه را ۳۰۰ ⇐ ۳۰۰ می‌داد ولی کمینه را نادرست ۳۰۰
});
test('T8 (بند ۹-۳) انتقال ۲۵۰ به مقصد: کمینه ۰، بیشینه ۲۵۰، «انتقال نامشخص»',()=>{
  SEQ=0;
  const src={taf:'600',tafT:'مبدأ'}, dst={taf:'700',tafT:'مقصد'};
  const y1=year('a',1402,[row(1,'1402/01/01',0,0,src),row(2,'1402/03/01',100,0,src)]);
  const y2=year('b',1403,[row(1,'1403/01/01',100,0,src)]);
  const y3=year('c',1404,[row(1,'1404/01/01',100,0,src)]);
  const y4=year('d',1405,[row(1,'1405/01/01',100,0,src),row(2,'1405/02/01',200,0,src),row(3,'1405/06/01',0,250,{...src,descRow:'انتقال به حساب مقصد'}),row(3,'1405/06/01',250,0,{...dst,descRow:'انتقال از حساب مبدأ'})]);
  const {r}=run([y1,y2,y3,y4],'d');
  const k=r.keys.find(x=>x.key==='1|10|700');
  eq(k.end,250n); eq(k.sanavati.min,0n); eq(k.sanavati.max,250n);
  ok(k.uncertainty.some(u=>u.code==='TRANSFER_UNKNOWN'&&u.amount===250n));
  const s=r.keys.find(x=>x.key==='1|10|600'); eq(s.end,50n); eq(s.sanavati.min,0n); eq(s.sanavati.max,50n);
});
test('T9 (بند ۹-۴) پیش‌پرداخت: کمینه = بیشینهٔ مدل = ۰ ، بیشینهٔ بدون فرض = ۱۰۰',()=>{
  SEQ=0;
  const {r}=run([year('y',1404,[row(1,'1404/01/01',100,0),row(2,'1404/01/20',0,100),row(3,'1404/06/10',100,0)])],'y');
  const k=key1(r); eq(k.sanavati.min,0n); eq(k.sanavati.max,0n); eq(k.sanavati.modelFreeMax,100n); eq(k.sanavati.risk,100n);
  ok(k.uncertainty.some(u=>u.code==='REBOUND'));
});
test('T16 (بند ۳) اختلاط اشخاص در سطح معین: هشدار، و کمینه ≤ حقیقت',()=>{
  SEQ=0;
  const files=[year('a',1402,[row(1,'1402/01/01',0,0,{taf:''}),row(2,'1402/02/01',1000,0,{taf:''})],{keyFields:[]})];
  [1403,1404,1405].forEach((y,i)=>files.push(year('y'+y,y,[row(1,y+'/01/01',1000,0,{taf:''}),row(2,y+'/03/01',500,0,{taf:''}),row(3,y+'/04/01',0,500,{taf:''})],{keyFields:[]})));
  const {r}=run(files,'y1405');
  const k=key1(r); eq(k.end,1000n); ok(!k.person); ok(k.sanavati.min<=1000n);
  ok(r.exceptions.some(x=>x.code==='NO_TAFSILI')); ok(k.uncertainty.some(u=>u.code==='MIXED_PERSONS'));
});

console.log('\n— زنجیرهٔ سال‌ها —');
test('T10 (بند ۹-۵) چند ردیف افتتاحیه تجمیع می‌شوند؛ اختلاف با سال قبل ← استثنا با مبلغ',()=>{
  SEQ=0;
  const {r}=run([year('a',1403,[row(1,'1403/01/01',0,0),row(2,'1403/03/01',1000,0)]),year('b',1404,[row(1,'1404/01/01',600,0),row(1,'1404/01/01',300,0),row(4,'1404/05/01',100,0)])],'b');
  const k=key1(r); eq(k.end,1000n);
  ok(r.exceptions.some(x=>x.code==='OPENING_MISMATCH'&&x.amount===100n));
  eq(k.sanavati.min,900n); eq(k.sanavati.max,900n);   // کسری ۱۰۰ از لایهٔ قدیمی کم شد و افزایش ۱۴۰۴ جدید است
});
test('T19 (بند ۴) سال مفقود: افتتاحیهٔ صفر ← پل صفر بدون استثنا؛ غیرصفر ← لایهٔ شکاف + استثنا',()=>{
  SEQ=0;
  let res=run([year('a',1402,[row(2,'1402/03/01',500,0)]),year('c',1404,[row(1,'1404/01/01',0,0),row(3,'1404/05/01',200,0)])],'c').r;
  ok(!res.exceptions.some(x=>x.code==='YEAR_GAP'),'پل صفر نباید استثنا داشته باشد'); eq(key1(res).sanavati.max,0n);
  SEQ=0;
  res=run([year('a',1402,[row(2,'1402/03/01',500,0)]),year('c',1404,[row(1,'1404/01/01',500,0),row(3,'1404/05/01',200,0)])],'c').r;
  ok(res.exceptions.some(x=>x.code==='YEAR_GAP'&&x.amount===500n)); const k=key1(res);
  eq(k.sanavati.min,500n); eq(k.unknown.max,500n);
});
test('T20 (ایراد ۸) سند اختتامیه از مانده پایان کنار گذاشته می‌شود و با مانده تطبیق می‌شود',()=>{
  SEQ=0;
  const {r}=run([year('y',1404,[row(1,'1404/01/01',700,0),row(5,'1404/04/01',300,0),row(99,'1404/12/29',0,1000,{desc:'سند اختتامیه'})],{closingDocs:['99']})],'y');
  const k=key1(r); eq(k.end,1000n); ok(!r.exceptions.some(x=>x.code==='CLOSING_MISMATCH'));
});
test('افتتاحیهٔ اولین سال اطلاعاتی ← لایهٔ «قبل از دوره/قدمت نامشخص» با تفکیک سال منشأ',()=>{
  SEQ=0;
  const {r}=run([year('a',1402,[row(1,'1402/01/01',300,0),row(2,'1402/05/01',200,0)]),year('b',1403,[row(1,'1403/01/01',500,0),row(2,'1403/05/01',100,0)]),year('c',1404,[row(1,'1404/01/01',600,0),row(2,'1404/05/01',50,0)])],'c');
  const k=key1(r); eq(k.end,650n); eq(k.sanavati.min,600n); eq(k.unknown.min,300n); eq(k.unknown.max,300n);
  eq(k.byOrigin.map(o=>o.min.toString()),['300','500','600']);
});
test('T27 (بند ۱۵) تطبیق کدینگ: عنوان یکسان + پیوستگی = پیشنهاد قوی؛ تأییدنشده = قطع زنجیره',()=>{
  SEQ=0;
  const files=[year('a',1403,[row(1,'1403/01/01',0,0,{taf:'500'}),row(2,'1403/03/01',800,0,{taf:'500',tafT:'شرکت نمونه'})]),
               year('b',1404,[row(1,'1404/01/01',800,0,{taf:'9500',tafT:'شرکت نمونه'}),row(3,'1404/09/01',0,100,{taf:'9500',tafT:'شرکت نمونه'})])];
  const m=S.build({files,auditFileId:'b'});
  const sug=S.suggestCoding(m); eq(sug.length,1); eq(sug[0].strength,'strong');
  const r0=S.analyze(m,{}); const k0=r0.keys.find(x=>x.key==='1|10|9500');
  ok(r0.exceptions.some(x=>x.code==='OPENING_MISMATCH'&&x.key==='1|10|9500'),'بدون تأیید، اختلاف افتتاحیه'); eq(k0.unknown.max,700n);
  const r1=S.analyze(m,{aliases:[{fromKey:sug[0].fromKey,toKey:sug[0].toKey,toFileId:sug[0].toFileId}]});
  const k1=r1.keys.find(x=>x.key==='1|10|9500'); eq(k1.end,700n); eq(k1.byOrigin[1].min,700n);
  ok(!r1.exceptions.some(x=>x.code==='OPENING_MISMATCH'),'پس از تأیید، زنجیره پیوسته است');
});

console.log('\n— چک، برگشت، فعالیت —');
test('T17 (ایراد ۱) برگشت چکِ متصلِ تأییدشده ← حذف جفت و محاسبه از ابتدا (کمینه ۰)',()=>{
  SEQ=0;
  const rows=[row(1,'1404/01/01',100,0),row(2,'1404/02/01',100,0),
    row(3,'1404/03/01',0,100,{descRow:'دریافت چک 778899'}),row(3,'1404/03/01',100,0,{...NOTES,descRow:'چک 778899'}),
    row(4,'1404/04/01',0,100,{descRow:'واریز نقدی'}),row(4,'1404/04/01',100,0,BANK),
    row(5,'1404/05/01',100,0,{descRow:'برگشت چک 778899'}),row(5,'1404/05/01',0,100,{...NOTES,descRow:'برگشت چک 778899'})];
  const m=S.build({files:[year('y',1404,rows)],auditFileId:'y'});
  const R=roles();
  const tagged=S.classify(m,R); const tagOf=e=>(tagged.get(e.eid)||{}).tag||'NORMAL';
  const links=S.suggestLinks(m,tagOf).filter(l=>l.key==='1|10|500');
  eq(links.length,1); eq(links[0].strength,'strong');
  const without=S.analyze(m,{roles:R}); const k0=without.keys.find(x=>x.key==='1|10|500');
  eq(k0.end,100n); eq(k0.sanavati.min,0n); eq(k0.sanavati.max,100n);       // برگشت بدون اتصال: افزایش مشکوک (بیشینه پوشش می‌دهد)
  ok(k0.uncertainty.some(u=>u.code==='BOUNCE_UNLINKED'));
  const withL=S.analyze(m,{roles:R,links:[{origEid:links[0].origEid,laterEid:links[0].laterEid}]}); const k1=withL.keys.find(x=>x.key==='1|10|500');
  eq(k1.end,100n); eq(k1.sanavati.min,0n);                                   // روش مستند (بازگرداندن مصرف) ۱۰۰ می‌داد
  eq(k1.activity[0].status,'NONE');                                         // دریافت نقدی خارج از بازهٔ ۶ ماه آخر است
  eq(k1.activity[1].status,'FULL');                                         // ولی در بازهٔ ۱۲ ماهه
});
test('چک دریافتیِ وصول‌نشده ← فعالیت محتمل (PROVISIONAL)، نه قطعی',()=>{
  SEQ=0;
  const rows=[row(1,'1404/01/01',500,0),row(3,'1404/10/01',0,200,{descRow:'دریافت چک'}),row(3,'1404/10/01',200,0,NOTES)];
  const {r}=run([year('y',1404,rows)],'y',{roles:roles()});
  const k=r.keys.find(x=>x.key==='1|10|500'); eq(k.activity[0].status,'POSSIBLE'); eq(k.activity[0].lastPossible.status,'PROVISIONAL');
});
test('T18 (بند ۱۰) سند مرکب چندشخصی ← POSSIBLE؛ سند نامتوازن ← UNKNOWN؛ هرگز FULL',()=>{
  SEQ=0;
  const rows=[row(1,'1404/01/01',500,0),row(1,'1404/01/01',500,0,{taf:'501'}),
    row(7,'1404/10/01',0,300),row(7,'1404/10/01',0,300,{taf:'501'}),row(7,'1404/10/01',400,0,BANK),row(7,'1404/10/01',200,0,{kol:'6',moein:'61',moeinT:'تخفیفات'}),
    row(8,'1404/11/01',0,100),row(8,'1404/11/01',90,0,BANK)];
  const {r}=run([year('y',1404,rows)],'y',{roles:roles()});
  const k=r.keys.find(x=>x.key==='1|10|500');
  const st=k.activityEvents.map(a=>a.status); eq(st,['POSSIBLE','UNKNOWN']);
});
test('اصلاحیه و انتقال، ساعت فعالیت را جلو نمی‌برند',()=>{
  SEQ=0;
  const rows=[row(1,'1404/01/01',500,0),row(3,'1404/10/01',0,100,{descRow:'اصلاح ثبت'}),row(3,'1404/10/01',100,0,BANK)];
  const {r}=run([year('y',1404,rows)],'y',{roles:roles()});
  eq(r.keys.find(x=>x.key==='1|10|500').activity[0].status,'NONE');
});
test('بدون تأیید حساب‌های نقد، وضعیت فعالیت «نامشخص» است نه «فاقد گردش»',()=>{
  SEQ=0;
  const rows=[row(1,'1404/01/01',500,0),row(3,'1404/10/01',0,100),row(3,'1404/10/01',100,0,BANK)];
  const {r}=run([year('y',1404,rows)],'y',{});
  eq(r.keys.find(x=>x.key==='1|10|500').activity[0].status,'UNKNOWN');
});

console.log('\n— Snapshot و سال بعد —');
test('T5 (بند ۴) حذف فایل سال بعد خروجی سال جاری را تغییر نمی‌دهد؛ اثرانگشت ثابت',()=>{
  SEQ=0;
  const a=year('a',1403,[row(1,'1403/01/01',100,0),row(2,'1403/06/01',300,0),row(3,'1403/09/01',0,50)]);
  const b=year('b',1404,[row(1,'1404/01/01',350,0),row(2,'1404/02/01',0,200),row(3,'1404/03/01',500,0),row(4,'1404/08/01',0,10,{descRow:'تعدیلات سنواتی'})]);
  const r1=run([a],'a').r, r2=run([a,b],'a').r;
  eq(r1.snapshotDigest,r2.snapshotDigest);
  const strip=r=>S.canon(r.keys.map(k=>({k:k.key,e:k.end,s:k.sanavati,t:k.stale,a:k.activity.map(x=>x.status)})));
  eq(strip(r1),strip(r2));
  eq(r2.checks.length,0);
  const k=key1(r2); eq(k.next.grossC,210n); eq(k.next.grossD,500n);
  eq(k.next.settled.min,200n); eq(k.next.settled.max,210n);                  // کاهش ۱۰ پس از فاکتور جدید: ممکن است بابت هر کدام باشد
  eq(k.next.priorAdj.length,1);
});
test('سال بعد: افزایش و کاهش ناخالص جدا گزارش می‌شوند و بازهٔ تسویه درست است',()=>{
  SEQ=0;
  const a=year('a',1403,[row(1,'1403/01/01',0,0),row(2,'1403/06/01',300,0)]);
  const b=year('b',1404,[row(1,'1404/01/01',300,0),row(2,'1404/02/01',200,0),row(3,'1404/03/01',0,250)]);
  const k=key1(run([a,b],'a').r);
  eq(k.next.inc,200n); eq(k.next.dec,250n); eq(k.next.settled.min,50n); eq(k.next.settled.max,250n);
});

console.log('\n— کنترل‌های صحت و آزمون ویژگی‌محور —');
function rng(seed){ let s=seed>>>0; return ()=>{ s=(Math.imul(s,1664525)+1013904223)>>>0; return s/4294967296; }; }
test('T1/T2/T3 دفترهای تصادفی (با تغییر علامت): جمع لایه‌ها = مانده؛ کمینه ≤ بیشینه ≤ مانده؛ جابه‌جایی هم‌روزها بی‌اثر',()=>{
  const R=rng(42);
  for(let t=0;t<300;t++){
    SEQ=0; const rows=[row(1,'1404/01/01',Math.floor(R()*5)*100,0)];
    const nEv=2+Math.floor(R()*12);
    for(let i=0;i<nEv;i++){ const mth=1+Math.floor(R()*12), d=1+Math.floor(R()*28); const amt=(1+Math.floor(R()*6))*50; rows.push(row(10+i,'1404/'+mth+'/'+d,R()<0.5?amt:0,R()<0.5?0:amt)); }
    const base=run([year('y',1404,rows)],'y').r; eq(base.checks.length,0,'کنترل‌های داخلی');
    const k=base.keys[0];
    if(k.endSide){ ok(k.sanavati.min<=k.sanavati.max&&k.sanavati.max<=k.end); k.stale.forEach(s=>ok(s.min<=s.max&&s.max<=k.end)); }
    const shuffled=rows.slice(1).map(x=>({...x,doc:String(1000-Number(x.doc))})).reverse();
    const r2=run([year('y',1404,[rows[0],...shuffled])],'y').r;
    eq(S.canon({s:r2.keys[0].sanavati,t:r2.keys[0].stale}),S.canon({s:k.sanavati,t:k.stale}),'نمونه '+t);
  }
});
// حقیقت = هر ترتیبِ درون‌روز × هر تخصیصِ کاهش به لایه‌های موجود
function bruteBounds(start,days,cut){
  let lo=Infinity, hi=-Infinity;
  const perms=a=>a.length<=1?[a]:a.flatMap((x,i)=>perms([...a.slice(0,i),...a.slice(i+1)]).map(p=>[x,...p]));
  function rec(di,L){
    if(di===days.length){ const o=L.filter(x=>x.b<=cut).reduce((s,x)=>s+x.s,0); lo=Math.min(lo,o); hi=Math.max(hi,o); return; }
    for(const p of perms(days[di].ev)) seq(p,0,L.map(x=>({...x})),di);
  }
  function seq(p,i,L,di){
    if(i===p.length){ rec(di+1,L); return; }
    const a=p[i];
    if(a>0){ seq(p,i+1,[...L,{b:days[di].day,s:a}],di); return; }
    const need=-a;
    (function dist(j,rest,cur){
      if(j===cur.length){ if(rest===0) seq(p,i+1,cur.filter(x=>x.s>0),di); return; }
      for(let c=0;c<=Math.min(rest,cur[j].s);c++){ const nx=cur.map(x=>({...x})); nx[j].s-=c; dist(j+1,rest-c,nx); }
    })(0,need,L);
  }
  rec(0,start?[{b:-1,s:start}]:[]);
  return {lo,hi};
}
test('T24 ویژگی‌محور: کمینه/بیشینهٔ موتور دقیقاً برابر کران واقعیِ همهٔ تخصیص‌ها و ترتیب‌های ممکن',()=>{
  const R=rng(7); let checked=0;
  for(let t=0;t<250;t++){
    const start=Math.floor(R()*4); let bal=start; const days=[];
    const nd=1+Math.floor(R()*4);
    for(let d=0;d<nd;d++){
      const day=J('1404/'+(1+d*3)+'/10'); const ev=[]; const k=1+Math.floor(R()*3); let decs=0;
      for(let i=0;i<k;i++){ if(R()<0.45&&bal-decs>0){ const x=1+Math.floor(R()*(bal-decs)); ev.push(-x); decs+=x; } else ev.push(1+Math.floor(R()*3)); }
      bal+=ev.reduce((s,x)=>s+x,0); days.push({day,ev});
    }
    SEQ=0; const rows=[row(1,'1404/01/01',start,0)]; let dn=10;
    days.forEach(d=>d.ev.forEach(x=>{ const j=S.dayToJalali(d.day); rows.push(row(dn++,j.jy+'/'+j.jm+'/'+j.jd,x>0?x:0,x<0?-x:0)); }));
    const res=run([year('y',1404,rows)],'y',{thresholds:[3,6,9]}).r; const k=res.keys[0];
    if(!k.endSide) continue;
    const cuts=[[J('1404/01/01')-1,k.sanavati],...res.cuts.map((c,i)=>[c.cut,k.stale[i]])];
    for(const [cut,val] of cuts){
      const bb=bruteBounds(start,days,cut);
      eq(Number(val.min),bb.lo,'کمینه نمونه '+t); eq(Number(val.max),bb.hi,'بیشینه نمونه '+t); checked++;
    }
  }
  ok(checked>200,'تعداد نمونه کافی نیست: '+checked);
});
test('T25 تزریق پیش‌پرداخت پنهان: اگر حقیقت از بیشینهٔ مدل بیرون رود، «مبلغ در معرض» > ۰ است',()=>{
  const R=rng(99);
  for(let t=0;t<200;t++){
    const old=100+Math.floor(R()*5)*100;           // ماندهٔ قدیمیِ واقعاً باز (حقیقت)
    const adv=50+Math.floor(R()*4)*50;             // پیش‌پرداختی که بعداً بابت فاکتور جدید مصرف می‌شود
    SEQ=0;
    const rows=[row(1,'1404/01/01',old,0),row(2,'1404/02/01',0,adv,{descRow:'علی‌الحساب'}),row(3,'1404/08/01',adv,0,{descRow:'فاکتور فروش'})];
    const k=key1(run([year('y',1404,rows)],'y').r);
    const truth=BigInt(old);
    if(truth>k.sanavati.max) ok(k.sanavati.risk>0n&&k.sanavati.modelFreeMax>=truth,'نمونه '+t);
    ok(k.sanavati.min<=truth,'کمینه همیشه معتبر می‌ماند');
  }
});
test('T11 (بند ۹-۶) مانده خلاف ماهیت جدا گزارش می‌شود و جمع‌ها به تفکیک سمت‌اند',()=>{
  SEQ=0;
  const rows=[row(1,'1404/01/01',500,0),row(1,'1404/01/01',0,200,{taf:'501'})];
  const {r}=run([year('y',1404,rows)],'y',{roles:roles()});
  ok(r.exceptions.some(x=>x.code==='CONTRA_BALANCE'&&x.key==='1|10|501'));
  eq(r.totals.D.end,500n); eq(r.totals.C.end,200n);
});
test('پیشنهاد نقش حساب‌ها و اسناد افتتاحیه/اختتامیه',()=>{
  eq(S.suggestRole('موجودی نزد بانک ملت').role,'CASH'); eq(S.suggestRole('اسناد دریافتنی تجاری').role,'NOTES_R');
  eq(S.suggestRole('حساب‌های پرداختنی تجاری').nature,'C'); eq(S.suggestRole('تسهیلات دریافتی از بانک').role,'OTHER');
  eq(S.suggestRole('حساب‌ها و اسناد دریافتنی تجاری').role,'NOTES_R');
  SEQ=0;
  const sug=S.suggestOpeningClosing([row(1,'1404/01/01',10,0,{desc:'سند افتتاحیه'}),row(400,'1404/12/29',0,10,{desc:'سند اختتامیه'}),row(399,'1404/12/29',0,10,{desc:'بستن حساب‌های موقت'})],J('1404/01/01'),J('1404/12/29'));
  eq(sug.opening.map(x=>x.doc),['1']); eq(sug.closing.map(x=>x.doc),['400']); eq(sug.tempClosing.map(x=>x.doc),['399']);
});

console.log('\n'+(fail?'✗':'✓')+' '+pass+' آزمون موفق، '+fail+' ناموفق');
if(fail){ console.log('ناموفق‌ها: '+failures.join(' | ')); process.exit(1); }
