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
ok(root.querySelector('[data-unit-header]').textContent.includes('میلیون'),'unit');ok(root.querySelectorAll('.descs tbody tr').length===9,'rows');ok(root.querySelector('[data-account-code]').textContent==='123','code');
ok([...root.querySelectorAll('.compact-note .body')].map(e=>e.dataset.field).join(',')==='issues,follow-up,conclusion','order');
let x=root.querySelector('[data-row-index="1"][data-amount="dr"]');x.textContent='۲٬۰۰۰';x.dispatchEvent(new Event('input',{bubbles:true}));ok(root.querySelector('[data-amount="sumdr"]').textContent==='۲٬۰۰۰','sum');ok(root.querySelector('[data-amount="baldr"]').textContent==='۲٬۰۰۰','balance');
let total=root.querySelector('[data-amount="sumdr"]');total.textContent='۳۰۰۰';total.dispatchEvent(new Event('input',{bubbles:true}));ok(root.querySelector('[data-amount="baldr"]').textContent==='۳٬۰۰۰','editable total updates balance');
let desc=root.querySelector('[data-row-description="1"]');desc.textContent='شرح دستی';desc.dispatchEvent(new Event('input',{bubbles:true}));anaPaintSheet();ok(document.querySelector('[data-row-description="1"]').textContent==='شرح دستی','persist');
document.querySelector('#anaUnitMode').value='rial';document.querySelector('#anaUnitMode').dispatchEvent(new Event('change',{bubbles:true}));ok(document.querySelector('[data-row-index="1"][data-amount="dr"]').textContent==='۲٬۰۰۰٬۰۰۰٬۰۰۰','rial conversion');
document.querySelector('#anaAddRow').click();ok(document.querySelectorAll('#anaSheet .descs tbody tr').length===10,'add row');
let ev=auditVoucherTable(data,[...data.rowMap.keys()]);let t=document.createElement('div');t.innerHTML=ev;ok(t.querySelector('tbody tr td.v-doc').textContent==='۲','sort');ok(t.textContent.includes('پرداخت اول')&&t.textContent.includes('جزئیات ردیف'),'descriptions');ok(t.querySelector('tfoot').textContent.includes('۱٬۲۰۰٬۰۰۰'),'voucher total');
let target=document.createElement('div');document.body.appendChild(target);const pages=auditTemplatePrintPages(o,document.querySelector('#anaSheet .audit-template'),target);ok(pages.length===1,'print pages jsdom');ok(target.textContent.includes('شرح دستی')&&target.textContent.includes('۲٬۰۰۰٬۰۰۰٬۰۰۰'),'print edits');ok(target.querySelector('.acct-meta-strip'),'print metadata');
ok(document.getElementById('anaCategorizedDocs').textContent.includes('گردش'),'categories');ok(document.getElementById('anaQuickModelSelect')&&document.querySelectorAll('[data-rerun]').length===3,'controls');
const o2={...o,templateRowEdits:{}};ANA.out.push(o2);HesabrasiAI.setActiveModel('openai/gpt-5');ok(ANA.out[1]===o2&&o.templateRowEdits[1].description==='شرح دستی','model preserves');
window.testResult='PASS';
}catch(e){window.testResult=e.stack;}
`;
html=html.replace('</body>',`<script>${code}</script></body>`);const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(e.message));const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://example.test',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.scrollTo=()=>{};w.confirm=()=>true;w.alert=()=>{};w.fetch=async()=>{throw new Error('offline')};}});console.log('test:',dom.window.testResult);console.log('jsdom errors:',errs.slice(0,5));if(dom.window.testResult!=='PASS'||errs.length)process.exitCode=1;dom.window.close();
