// Run with Node and jsdom 26 installed (the application itself has no dependency on jsdom).
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const path=require('path');let html=fs.readFileSync(path.join(__dirname,'..','audit-google-auto.html'),'utf8');
const code=`
try {
const row1={'شماره سند':'۱۰','تاریخ':'۱۴۰۳/۰۲/۰۲','شرح سند':'','شرح ردیف':'پرداخت اول','بدهکار':1200000,'بستانکار':0};
const row2={'شماره سند':'۲','تاریخ':'۱۴۰۳/۰۱/۰۱','شرح سند':'توضیح سند','شرح ردیف':'جزئیات ردیف','بدهکار':0,'بستانکار':400000};
ACCOUNT_ROWS=[row1,row2]; const A={rows:[row1,row2],openingBalance:0,debit:1200000,credit:400000,closingBalance:800000,title:'آزمایشی',code:'123'};
const o={a:{title:'آزمایشی',code:'123'},A,sec:{'ماهیت':{text:'شرح'}}};const data=reportBuild(A);
const cats=reportAggregate({groups:[{category:'گردش',basis:'شرح',refs:data.groups.map(x=>x.id)}]},data);o.report={data,categories:cats,prepared:true,busy:false};ANA.out=[o];ANA.active=0;ANA.aiBy={};
renderAnalysisOutput();const root=document.querySelector('#anaSheet .audit-template');
function ok(v,msg){if(!v)throw Error(msg)}
const capDocs=[{id:'54',amount:54},{id:'47',amount:47},{id:'20',amount:20},{id:'5',amount:5}],capped=selTop(capDocs,50,d=>d.amount,true);
ok(capped.sum===47&&capped.sel.map(d=>d.id).join(',')==='47','cap fallback provides the closest lower sample');
const approximate=selTopApprox([{id:'48',amount:48},{id:'46',amount:46},{id:'3a',amount:3},{id:'3b',amount:3}],50,d=>d.amount,100);
ok(approximate.sum===51&&approximate.sel.map(d=>d.id).join(',')==='48,3a','percentage selection may choose a closer slightly-higher event total');
const voucher={doc:'100',debit:100,credit:0,rows:[{'بدهکار':60,'بستانکار':0},{'بدهکار':40,'بستانکار':0}]},voucherEvents=selTop(sampleEventUnits([voucher]),60,d=>d.debit,true);
ok(voucherEvents.sum===60&&voucherEvents.sel.length===1&&voucherEvents.sel[0].rows[0]['بدهکار']===60,'percentage sample must include only selected event rows, not the entire voucher');
ok(sampleCoveragePercent(579,1000)===57.9,'actual percentage rounds down to one decimal');
ok(selTop([{amount:54}],50,d=>d.amount).sum===54,'fixed-amount target keeps existing reach/overshoot behavior');
const oldSampleDocs=sampleDocs,oldSampleAccounts=WORKSHEET_ACCOUNTS,oldSampleCfg={...SAMP_CFG},pctInput=document.createElement('input');pctInput.className='samp-val';pctInput.value='50';document.body.append(pctInput);
sampleDocs=()=>capDocs.map(d=>({doc:d.id,debit:d.amount,credit:0,rows:[{'بدهکار':d.amount,'بستانکار':0,'تاریخ':'1403/01/01'}]}));WORKSHEET_ACCOUNTS=[{}];SAMP_CFG={m:'top',base:'d',tmode:'p'};const sampleResult=computeSample(0);
ok(sampleResult.res.sum===59&&sampleResult.res.count===2&&sampleResult.res.unit==='row'&&sampleResult.msg.includes('۴۶٫۸٪')&&sampleResult.msg.includes('هدف ۵۰٪'),'percentage run samples event rows under cap and reports rounded-down actual coverage');
sampleDocs=oldSampleDocs;WORKSHEET_ACCOUNTS=oldSampleAccounts;SAMP_CFG=oldSampleCfg;pctInput.remove();
ok(!METHOD_HELP.top.li[2].includes('تا رسیدن به ۶۰٪')&&METHOD_HELP.top.li[2].includes('پوشش واقعی می‌تواند کمی کمتر یا بیشتر باشد'),'percentage help describes a cap');
ok(root.querySelector('[data-unit-header]').textContent.includes('ریال'),'rial header');ok(root.querySelectorAll('.descs tbody tr').length===9,'rows');ok(!root.querySelector('.acct-meta-strip')&&!root.querySelector('[data-account-code]'),'removed account metadata');ok(!root.querySelector('.c-id')&&!root.textContent.includes('عطف'),'removed analysis reference column');ok(o.unitMode==='rial','rial default');ok(!document.querySelector('#anaUnitMode'),'no million-rial option');
ok([...root.querySelectorAll('.compact-note .body')].map(e=>e.dataset.field).join(',')==='issues,follow-up,conclusion','order');
let x=root.querySelector('[data-row-index="1"][data-amount="dr"]');x.textContent='۲٬۰۰۰٬۰۰۰';x.dispatchEvent(new Event('input',{bubbles:true}));ok(root.querySelector('[data-amount="sumdr"]').textContent==='۲٬۰۰۰٬۰۰۰','sum in full rials');ok(root.querySelector('[data-amount="baldr"]').textContent==='۱٬۶۰۰٬۰۰۰','balance in full rials');
let total=root.querySelector('[data-amount="sumdr"]');total.textContent='۳٬۰۰۰٬۰۰۰';total.dispatchEvent(new Event('input',{bubbles:true}));ok(root.querySelector('[data-amount="baldr"]').textContent==='۲٬۶۰۰٬۰۰۰','editable total updates balance');
let desc=root.querySelector('[data-row-description="1"]');desc.textContent='شرح دستی';desc.dispatchEvent(new Event('input',{bubbles:true}));anaPaintSheet();ok(document.querySelector('[data-row-description="1"]').textContent==='شرح دستی','persist');
ok(root.querySelector('[data-row-index="1"][data-amount="dr"]').textContent==='۲٬۰۰۰٬۰۰۰','edit stays in rials');
document.querySelector('#anaAddRow').click();ok(document.querySelectorAll('#anaSheet .descs tbody tr').length===10,'add row');
let ev=auditVoucherTable(data,[...data.rowMap.keys()]);let t=document.createElement('div');t.innerHTML=ev;ok(t.querySelector('tbody tr td.v-doc').textContent==='۲','sort');ok(t.textContent.includes('پرداخت اول')&&t.textContent.includes('جزئیات ردیف'),'descriptions');ok(t.querySelector('tfoot').textContent.includes('۱٬۲۰۰٬۰۰۰'),'voucher total');
let target=document.createElement('div');document.body.appendChild(target);const pages=auditTemplatePrintPages(o,document.querySelector('#anaSheet .audit-template'),target);ok(pages.length===1,'print pages jsdom');ok(target.textContent.includes('شرح دستی')&&target.textContent.includes('۲٬۰۰۰٬۰۰۰'),'print edits');ok(!target.querySelector('.acct-meta-strip')&&!target.querySelector('.c-id'),'print metadata/reference removed');
ok(adNatureText('رویدادهای فروش و دریافت وجه در این حساب ثبت شده است.').startsWith('طی بررسی‌های به‌عمل‌آمده، '),'nature lead-in');ok(adNatureText('حسب رسیدگی‌های انجام‌شده، رویدادهای فروش و دریافت وجه ثبت شده است.').startsWith('حسب رسیدگی‌های'),'nature lead-in not duplicated');
ok(ROUTER_MODEL==='anthropic/claude-haiku-4.5'&&HesabrasiAI.catalog.find(x=>x.id==='open_router').model==='anthropic/claude-haiku-4.5'&&HesabrasiAI.catalog.find(x=>x.id==='anthropic').model==='claude-haiku-4-5-20251001','Claude Haiku default');ok(HesabrasiAI.pickBestAnalyticalModel([{id:'openai/gpt-5-mini'},{id:'anthropic/claude-haiku-4.5'}])==='anthropic/claude-haiku-4.5','Claude default preference');
ok(document.getElementById('anaCategorizedDocs').textContent.includes('گردش'),'categories');ok(document.getElementById('anaQuickModelSelect')&&document.querySelectorAll('[data-rerun]').length===3,'controls');
const o2={...o,templateRowEdits:{}};ANA.out.push(o2);HesabrasiAI.setActiveModel('openai/gpt-5');ok(ANA.out[1]===o2&&o.templateRowEdits[1].description==='شرح دستی','model preserves');
window.testResult='PASS';
}catch(e){window.testResult=e.stack;}
`;
html=html.replace('</body>',`<script>${code}</script></body>`);const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(e.message));const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://example.test',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.scrollTo=()=>{};w.confirm=()=>true;w.alert=()=>{};w.fetch=async()=>{throw new Error('offline')};}});console.log('test:',dom.window.testResult);console.log('jsdom errors:',errs.slice(0,5));if(dom.window.testResult!=='PASS'||errs.length)process.exitCode=1;dom.window.close();
