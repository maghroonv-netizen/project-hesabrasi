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
ok(capped.sum===0&&capped.sel.length===0,'stop at the first oversized top row rather than filling with smaller rows');
const approximate=selTopApprox([{id:'48',amount:48},{id:'46',amount:46},{id:'3a',amount:3},{id:'3b',amount:3}],50,d=>d.amount,100);
ok(approximate.sum===48&&approximate.sel.map(d=>d.id).join(',')==='48','percentage selection stops before the first event that exceeds its target');
const voucher={doc:'100',debit:100,credit:0,rows:[{'بدهکار':60,'بستانکار':0},{'بدهکار':40,'بستانکار':0}]},voucherEvents=selTop(sampleEventUnits([voucher]),60,d=>d.debit,true);
ok(voucherEvents.sum===60&&voucherEvents.sel.length===1&&voucherEvents.sel[0].rows[0]['بدهکار']===60,'percentage sample must include only selected event rows, not the entire voucher');
ok(sampleCoveragePercent(579,1000)===57.9,'actual percentage rounds down to one decimal');
ok(selTop([{amount:54}],50,d=>d.amount).sum===54,'fixed-amount target keeps existing reach/overshoot behavior');
const oldSampleDocs=sampleDocs,oldSampleAccounts=WORKSHEET_ACCOUNTS,oldSampleCfg={...SAMP_CFG},pctInput=document.createElement('input');pctInput.className='samp-val';pctInput.value='50';document.body.append(pctInput);
sampleDocs=()=>capDocs.map(d=>({doc:d.id,debit:d.amount,credit:0,rows:[{'بدهکار':d.amount,'بستانکار':0,'تاریخ':'1403/01/01'}]}));WORKSHEET_ACCOUNTS=[{}];SAMP_CFG={m:'top',base:'d',tmode:'p'};const sampleResult=computeSample(0);
ok(sampleResult.res.sum===54&&sampleResult.res.count===1&&sampleResult.res.unit==='row'&&sampleResult.msg.includes('۴۲٫۸٪')&&sampleResult.msg.includes('هدف ۵۰٪'),'percentage run stops at first oversized event and reports actual coverage');
sampleDocs=()=>[{doc:'single',debit:75,credit:0,rows:[{'بدهکار':75,'بستانکار':0,'تاریخ':'1403/01/01'}]},{doc:'small',debit:25,credit:0,rows:[{'بدهکار':25,'بستانکار':0,'تاریخ':'1403/01/02'}]}];SAMP_CFG={m:'top',base:'d',tmode:'p'};const forcedMinimum=computeSample(0);
ok(forcedMinimum.res.count===1&&forcedMinimum.res.sel[0].rows[0]['بدهکار']===75&&forcedMinimum.msg.includes('بزرگ‌ترین رویداد حساب')&&forcedMinimum.msg.includes('بیشتر باشد'),'when even the largest event exceeds the percentage target, force that one event as the account minimum');
const bothRows=[
 {'شماره سند':'1','ردیف سند':'1','تاریخ':'1403/01/01','بدهکار':100,'بستانکار':0},
 {'شماره سند':'1','ردیف سند':'2','تاریخ':'1403/01/01','بدهکار':70,'بستانکار':50},
 {'شماره سند':'2','ردیف سند':'1','تاریخ':'1403/01/02','بدهکار':40,'بستانکار':40},
 {'شماره سند':'3','ردیف سند':'1','تاریخ':'1403/01/03','بدهکار':0,'بستانکار':40}
];
sampleDocs=()=>docLevelAgg(bothRows);SAMP_CFG={m:'top',base:'b',tmode:'p'};const bothResult=computeSample(0),bothSelected=bothResult.res.sel.flatMap(unit=>unit.rows);
ok(bothSelected.length===2&&bothSelected.includes(bothRows[0])&&bothSelected.includes(bothRows[1])&&!bothSelected.includes(bothRows[2])&&!bothSelected.includes(bothRows[3]),'both-side percentage samples debit and credit independently, then unions selected event identities');
ok(bothResult.msg.includes('بدهکار')&&bothResult.msg.includes('بستانکار')&&bothResult.msg.includes('۸۰٫۹٪')&&bothResult.msg.includes('۳۸٫۴٪'),'both-side result reports separate actual coverage');
const bothOversized=[
 {'شماره سند':'10','ردیف سند':'1','تاریخ':'1403/01/01','بدهکار':100,'بستانکار':0},
 {'شماره سند':'11','ردیف سند':'1','تاریخ':'1403/01/02','بدهکار':0,'بستانکار':100}
];sampleDocs=()=>docLevelAgg(bothOversized);SAMP_CFG={m:'top',base:'b',tmode:'p'};const bothMinimum=computeSample(0);
ok(bothMinimum.res.count===2&&bothMinimum.res.sel.flatMap(u=>u.rows).includes(bothOversized[0])&&bothMinimum.res.sel.flatMap(u=>u.rows).includes(bothOversized[1])&&bothMinimum.msg.includes('سمت بدهکار و بستانکار انتخاب شد'),'both-side percentage minimum is enforced independently for debit and credit');
sampleDocs=oldSampleDocs;WORKSHEET_ACCOUNTS=oldSampleAccounts;SAMP_CFG=oldSampleCfg;pctInput.remove();

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
ok(document.getElementById('anaCategorizedDocs').textContent.includes('گردش'),'categories');ok(document.getElementById('anaQuickModelSelect')&&document.querySelector('[data-rerun="nature"]')&&document.querySelector('[data-rerun="analysis"]')&&document.querySelectorAll('[data-rerun]').length===2&&!document.querySelector('[data-rerun="both"]'),'always-available model controls expose only separate nature and analysis reruns');
const o2={...o,templateRowEdits:{}};ANA.out.push(o2);HesabrasiAI.setActiveModel('openai/gpt-5');ok(ANA.out[1]===o2&&o.templateRowEdits[1].description==='شرح دستی','model preserves');
const oldLevels=ACCOUNT_LEVELS,oldRows=ACCOUNT_ROWS,oldAccounts=WORKSHEET_ACCOUNTS,oldOut=SHEET_OUT,oldTarget=SAMP_TARGET,oldCfg={...SAMP_CFG};
ACCOUNT_LEVELS=[{code:'کد حساب',title:'عنوان حساب',label:'معین'}];const sampleW={levelIdx:0,key:'100|آزمایشی',code:'100',title:'آزمایشی',keyPath:['100|آزمایشی'],pathLabel:'معین: آزمایشی'},sampleW2={levelIdx:0,key:'200|بدون انتقال',code:'200',title:'بدون انتقال',keyPath:['200|بدون انتقال'],pathLabel:'معین: بدون انتقال'};
ACCOUNT_ROWS=[50,30,20].map((amount,i)=>({'شماره سند':String(i+1),'تاریخ':'1403/01/0'+(i+1),'شرح سند':'رویداد آزمایشی','شرح ردیف':i===2?'انتقال مانده به حساب دیگر':'رویداد آزمایشی','نوع سند':'عمومی','کد حساب':'100','عنوان حساب':'آزمایشی','بدهکار':amount,'بستانکار':0})).concat([40,60].map((amount,i)=>({'شماره سند':'2'+i,'تاریخ':'1403/01/0'+(i+1),'شرح سند':'خرید مصالح','شرح ردیف':'خرید مصالح پروژه','نوع سند':'عمومی','کد حساب':'200','عنوان حساب':'بدون انتقال','بدهکار':amount,'بستانکار':0})));
const contextRowsBefore=ACCOUNT_ROWS,fullRowsBefore=FULL_ROWS;
const contextTarget={'شماره سند':'900','تاریخ':'1403/02/01','شرح سند':'خرید تجهیزات','شرح ردیف':'خرید از فروشنده','نوع سند':'عمومی','کد حساب':'100','عنوان حساب':'آزمایشی','بدهکار':100,'بستانکار':0};
const contextCounterpart={'شماره سند':'900','تاریخ':'1403/02/01','شرح سند':'خرید تجهیزات','شرح ردیف':'حساب فروشنده','نوع سند':'عمومی','کد حساب':'300','عنوان حساب':'تأمین‌کننده الف','بدهکار':0,'بستانکار':100};
const contextUnrelated={'شماره سند':'901','تاریخ':'1403/02/02','شرح سند':'دریافت وجه','شرح ردیف':'بانک','نوع سند':'عمومی','کد حساب':'400','عنوان حساب':'بانک آزمایشی','بدهکار':0,'بستانکار':100};
ACCOUNT_ROWS=[contextTarget,contextCounterpart,contextUnrelated];FULL_ROWS=ACCOUNT_ROWS;
const contextA={rows:[contextTarget],title:'آزمایشی',pathLabel:'آزمایشی',code:'100',w:{keyPath:['100|آزمایشی']}};
const counterpartPayload=anaNatureCounterpartContext(contextA),counterpartJson=JSON.stringify(counterpartPayload),enrichedNature=JSON.parse(anaNatureFactsForAI(anaTargetNatureFacts(contextA),contextA,true).facts);
ok(counterpartPayload.documents.length===1&&counterpartPayload.documents[0].events[0].opposite_accounts.some(x=>x.account==='تأمین‌کننده الف')&&!counterpartJson.includes('بانک آزمایشی')&&!counterpartJson.includes('900')&&!counterpartJson.includes('300'),'optional nature context only includes reliably matched opposite-side account titles, without voucher IDs or codes');
ok(enrichedNature.counterpart_context?.format==='nature-counterpart-context-v1'&&!JSON.parse(anaNatureFactsForAI(anaTargetNatureFacts(contextA),contextA,false).facts).counterpart_context,'counterparty context is included only when the user opts in');
ok(adNaturePacket(enrichedNature,enrichedNature.groups).counterpart_context?.documents.length===1,'optional counterpart context survives adaptive request partitioning');
ok(anaAIPanelHtml().includes('anaIncludeCounterpartsOutput')&&anaAIPanelHtml().includes('همین حساب'),'nature output exposes an opt-in counterpart control');
ok(anaNatureSystemForCounterparts(false)===NATURE_SYSTEM&&anaNatureSystemForCounterparts(true).includes('counterpart_context')&&!anaNatureSystemForCounterparts(true).includes('هیچ وابستگی به حساب مقابل (طرف‌حساب) وجود ندارد'),'nature prompt permits only scoped optional counterpart context');
ACCOUNT_ROWS=contextRowsBefore;FULL_ROWS=fullRowsBefore;
WORKSHEET_ACCOUNTS=[sampleW,sampleW2];SHEET_OUT=[];SAMP_CFG={m:'top',base:'d',tmode:'p',xfer:true};SAMP_TARGET='80';
ANA.includeCounterpartAccounts=false;renderAnalysisAccounts();const counterpartOption=document.querySelector('#anaIncludeCounterparts');ok(!!counterpartOption&&!counterpartOption.checked,'account-selection step exposes an opt-in counterpart context control');counterpartOption.checked=true;counterpartOption.dispatchEvent(new Event('change',{bubbles:true}));ok(ANA.includeCounterpartAccounts,'counterpart opt-in is stored before the AI run');ANA.includeCounterpartAccounts=false;
ensureRawPreviews();renderOutputStep();
ok(MODULE_STEPS.sample.some(s=>s.n==='4')&&MODULE_STEPS.sample.at(-1)?.n==='5'&&!MODULE_STEPS.sample.some(s=>s.n==='6')&&document.querySelector('#outputArea').closest('[data-stage="5"]'),'sample workflow has account selection followed by one combined preview stage');
ok(!document.querySelector('#sampleOutputSettings .help')&&document.querySelector('.raw-preview-banner')&&document.querySelector('[data-raw-preview="1"]'),'combined preview opens with raw account rows before sampling');
ok(document.querySelector('#sampleOutputSettings .m-sel')&&document.querySelector('#sampleOutputSettings #applyAllSamplesBtn')&&document.querySelector('#sampleOutputSettings .samp-val'),'preview includes editable sampling controls');
let sharedColumns=samplePrintLayout(SHEET_OUT[0].w).vector.slice();sharedColumns[3]+=3;sharedColumns[4]-=3;sampleSetWorksheetColumns(0,sharedColumns);
ok(SHEET_OUT.every(item=>JSON.stringify(samplePrintLayout(item.w).vector)===JSON.stringify(sharedColumns)),'manual column resizing on the first account is shared across every account');
sharedColumns=samplePrintLayout(SHEET_OUT[1].w).vector.slice();sharedColumns[3]-=2;sharedColumns[4]+=2;sampleSetWorksheetColumns(1,sharedColumns);
ok(SHEET_OUT.every(item=>JSON.stringify(samplePrintLayout(item.w).vector)===JSON.stringify(sharedColumns)),'a manual resize on another account updates the shared column widths everywhere');
ok(document.querySelector('.sheetwrap[data-view="0"] [data-open-sample-ledger]'),'account with transfer candidates has a ledger button');
ok(document.querySelector('.sheetwrap[data-view="1"] [data-open-sample-ledger]'),'ledger button remains available for an account without a detected transfer');
document.querySelector('.sheetwrap[data-view="0"] [data-open-sample-ledger]').click();
let ledger=document.querySelector('#sampleLedgerModal .sample-ledger-body table');
ok(document.querySelector('#sampleLedgerModal.open')&&ledger.querySelector('.transfer-candidate')&&ledger.querySelectorAll('tbody tr').length===3,'transfer account opens a ledger modal with flagged rows');
const ledgerHeads=[...ledger.querySelectorAll('thead th')].map(th=>th.textContent.trim().replace(/[↕▲▼]/g,'').trim());
ok(ledgerHeads.join('|')==='شماره ردیف|شماره سند|تاریخ سند|شرح سند / ردیف|بدهکار|بستانکار|انتخاب دستی در نمونه|کنارگذاری از جامعه','ledger columns follow the sample worksheet order');
document.querySelector('#sampleLedgerModal [data-ledger-sort="debit"]').click();ledger=document.querySelector('#sampleLedgerModal .sample-ledger-body table');
ok([...ledger.querySelectorAll('tbody tr')].map(r=>parseAmount(r.cells[4].textContent)).join(',')==='50,30,20','debit header sorts largest first on first click');
document.querySelector('#sampleLedgerModal [data-ledger-sort="debit"]').click();ledger=document.querySelector('#sampleLedgerModal .sample-ledger-body table');
ok([...ledger.querySelectorAll('tbody tr')].map(r=>parseAmount(r.cells[4].textContent)).join(',')==='20,30,50','second debit click sorts smallest first');
document.querySelector('#sampleLedgerClose').click();
document.querySelector('#sheetTabs [data-tab="1"]').click();ok(document.querySelector('#sampleOutputSettings .xfer-opt').style.display==='none','transfer suggestions are hidden while viewing an account with no detected transfer');
document.querySelector('.sheetwrap[data-view="1"] [data-open-sample-ledger]').click();
ledger=document.querySelector('#sampleLedgerModal .sample-ledger-body table');ok(!ledger.querySelector('.transfer-candidate')&&ledger.querySelectorAll('tbody tr').length===2,'ledger button opens the full account rows even without detected transfers');
ok(SAMPLE_LEDGER_SORT.field==='debit'&&SAMPLE_LEDGER_SORT.dir===1&&[...ledger.querySelectorAll('tbody tr')].map(r=>parseAmount(r.cells[4].textContent)).every((v,i,a)=>i===0||a[i-1]<=v),'manual ledger sorting is preserved when switching accounts');
const manualPick=document.querySelector('#sampleLedgerModal [data-manual-sample="0"]');manualPick.checked=true;manualPick.dispatchEvent(new Event('change',{bubbles:true}));
ok(SHEET_OUT[1].manualSelectedRows.includes(ACCOUNT_ROWS[3]),'user can manually add a ledger event to the sample');
document.querySelector('#sampleLedgerClose').click();
document.querySelector('#sheetTabs [data-tab="0"]').click();
document.querySelector('.sheetwrap[data-view="0"] [data-open-sample-ledger]').click();
const detectedTransfer=document.querySelector('#sampleLedgerModal [data-population-exclude="2"]');
ok(detectedTransfer.checked&&SHEET_OUT[0].rawPreview,'detected transfer is pre-excluded while the raw preview remains visible');
const ledgerBody=document.querySelector('#sampleLedgerBody'),ledgerScroll=ledgerBody.querySelector('.scrollx'),ledgerTable=ledgerBody.querySelector('table'),manualExclude=document.querySelector('#sampleLedgerModal [data-population-exclude="0"]');
ledgerBody.scrollTop=37;ledgerScroll.scrollTop=83;manualExclude.checked=true;manualExclude.dispatchEvent(new Event('change',{bubbles:true}));
ok(ledgerBody.scrollTop===37&&ledgerScroll.scrollTop===83&&ledgerBody.querySelector('table')===ledgerTable&&manualExclude.closest('tr').classList.contains('excluded'),'excluding a row does not rebuild or jump the ledger page');
manualExclude.checked=false;manualExclude.dispatchEvent(new Event('change',{bubbles:true}));
document.querySelector('#sampleLedgerClose').click();
let globalTarget=document.querySelector('#sampleOutputSettings .samp-val');globalTarget.value='80';document.querySelector('#applyAllSamplesBtn').click();
ok(SHEET_OUT[0].count===1&&SHEET_OUT[0].target==='80'&&!SHEET_OUT[0].sel.flatMap(x=>x.rows).includes(ACCOUNT_ROWS[2]),'global sampling excludes detected transfers and applies the revised target');
ok(SHEET_OUT[1].count===2&&SHEET_OUT[1].sel.flatMap(x=>x.rows).includes(ACCOUNT_ROWS[3]),'manually selected ledger row is included even when it falls outside the automatic percentage pick');
globalTarget=document.querySelector('#sampleOutputSettings .samp-val');globalTarget.value='100';document.querySelector('#applyAllSamplesBtn').click();
ok(SHEET_OUT[0].count===2&&SHEET_OUT[0].target==='100'&&!SHEET_OUT[0].sel.flatMap(x=>x.rows).includes(ACCOUNT_ROWS[2]),'global preview controls rebuild all worksheets while preserving detected transfer exclusions');
ACCOUNT_LEVELS=oldLevels;ACCOUNT_ROWS=oldRows;WORKSHEET_ACCOUNTS=oldAccounts;SHEET_OUT=oldOut;SAMP_TARGET=oldTarget;SAMP_CFG=oldCfg;
ok(typeof HesabrasiAccountBenchmark==='undefined','account model comparison and benchmark runner removed');
ok(typeof HesabrasiCapacityBenchmark?.run==='function','OpenRouter capacity probe API is available independently of an account');
ok(!document.getElementById('accountBenchmarkRun')&&!document.getElementById('accountBenchmarkReference')&&!document.getElementById('accountBenchmarkDownload'),'worksheet omits OpenRouter comparison, run, and CSV controls');
window.testResult='PASS';
}catch(e){window.testResult=e.stack;}
`;
html=html.replace('</body>',`<script>${code}</script></body>`);const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(e.message));const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://example.test',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.scrollTo=()=>{};w.confirm=()=>true;w.alert=()=>{};w.fetch=async()=>{throw new Error('offline')};}});console.log('test:',dom.window.testResult);console.log('jsdom errors:',errs.slice(0,5));if(dom.window.testResult!=='PASS'||errs.length)process.exitCode=1;dom.window.close();
