/* Focused contract tests for the aged-workpaper UI behavior.
   Run: node tests/sanavati-raked/ui-contract.test.cjs */
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(require('node:path').join(__dirname, '..', '..', 'audit-google-auto.html'), 'utf8');

const helperStart = html.indexOf('function partyNameMatchCandidates(){');
const helperEnd = html.indexOf('\nfunction renderAccounts(){', helperStart);
assert(helperStart >= 0 && helperEnd > helperStart, 'party name matching helper exists');
const normalize = value => String(value ?? '').replace(/\u200c/g, ' ').replace(/ي/g, 'ی').replace(/ك/g, 'ک')
  .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim().toLowerCase();
function similarity(a, b) {
  a = normalize(a); b = normalize(b);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const bigrams = text => Array.from({length: Math.max(0, text.length - 1)}, (_, i) => text.slice(i, i + 2));
  const left = bigrams(a), pool = bigrams(b);
  let hits = 0;
  for (const gram of left) { const index = pool.indexOf(gram); if (index >= 0) { hits++; pool.splice(index, 1); } }
  const rightLength = bigrams(b).length;
  return 2 * hits / (left.length + rightLength);
}
function match(accounts) {
  const context = { srTrialBalanceData: () => accounts, SR: {}, SRE: {normText: normalize, similarity} };
  vm.createContext(context);
  vm.runInContext(html.slice(helperStart, helperEnd), context);
  return context.partyNameMatchCandidates();
}

const swapped = match([
  {kolT: 'حساب‌های دریافتنی', accounts: [{id: 'r1', moein: '1101', moeinT: 'علی رضایی'}]},
  {kolT: 'حساب‌های پرداختنی', accounts: [{id: 'p1', moein: '2101', moeinT: 'رضایی علی'}]}
]);
assert.equal(swapped.length, 1);
assert.equal(swapped[0].exact, true, 'same name is found despite reversed token order');

const near = match([
  {kolT: 'حساب‌های دریافتنی', accounts: [{id: 'r1', moein: '1101', moeinT: 'علی رضایی'}]},
  {kolT: 'حساب‌های پرداختنی', accounts: [{id: 'p1', moein: '2101', moeinT: 'علی رضای'}]}
]);
assert.equal(near.length, 1, 'likely typo is surfaced as a suggestion');
assert.equal(near[0].exact, false);

const unrelated = match([
  {kolT: 'حساب‌های دریافتنی', accounts: [{id: 'r1', moein: '1101', moeinT: 'علی رضایی'}]},
  {kolT: 'حساب‌های پرداختنی', accounts: [{id: 'p1', moein: '2101', moeinT: 'حسن کاظمی'}]}
]);
assert.equal(unrelated.length, 0, 'unrelated parties are not suggested');
const accountHeadings = match([
  {kolT: 'حساب‌های دریافتنی', accounts: [{id: 'r1', moein: '1101', moeinT: 'حساب‌های دریافتنی'}]},
  {kolT: 'حساب‌های پرداختنی', accounts: [{id: 'p1', moein: '2101', moeinT: 'حساب‌های پرداختنی'}]}
]);
assert.equal(accountHeadings.length, 0, 'category-only account titles are not treated as person names');

const balanceStart = html.indexOf('function trialBalancePreviewHtml(){');
const balanceEnd = html.indexOf('\nfunction tabHtml(', balanceStart);
assert(balanceStart >= 0 && balanceEnd > balanceStart);
const balanceMarkup = html.slice(balanceStart, balanceEnd);
assert.doesNotMatch(balanceMarkup, /data-tb-kind="detail"|data-pick-detail|تفصیلی<\/small>/);
assert.match(balanceMarkup, /data-pick-kol/);
assert.match(balanceMarkup, /data-pick-account/);
assert.ok(balanceMarkup.includes("return x<0?'('+fmtB(-x)+')':(x>0?fmtB(x):'۰')"));
assert.doesNotMatch(balanceMarkup, /\(بستانکار\)|\(بدهکار\)/);

const workpaperStart = html.indexOf('function workpaperHtml(){');
const workpaperEnd = html.indexOf('\nfunction layerTable(', workpaperStart);
const workpaperMarkup = html.slice(workpaperStart, workpaperEnd);
assert.match(workpaperMarkup, /نام واحد مورد رسیدگی/);
assert.match(workpaperMarkup, /موضوع :/);
assert.match(workpaperMarkup, /سال مالی مورد رسیدگی/);
assert.match(workpaperMarkup, /amountHead\('سال',yearPlan\?\.prior\)/,
  'the comparative column label is calculated from the configured case year');
assert.doesNotMatch(workpaperMarkup, /<th>۱۴۰۳<\/th>|<th>۱۴۰۴<\/th>/,
  'the printed worksheet does not hard-code annual column headings');
assert.match(workpaperMarkup, /fiscalYear=String\(cfg\.year\?\?'\'\)\.trim\(\)/);
assert.doesNotMatch(workpaperMarkup, /تاریخ ترازنامه|periodEnd|SR\.result\?\.audit\?\.label/,
  'the aged worksheet does not invent a balance-sheet date or fall back to the uploaded file year');
assert.match(html, /سال مالی مورد رسیدگی :<\/span> <span class="v">\$\{esc\(sampleDisplayDigits\(c\.year\)\)\}/,
  'sampling uses the exact optional fiscal-year value from case metadata');
assert.match(workpaperMarkup, /تهیه‌کننده :/);
assert.match(workpaperMarkup, /بررسی‌کننده :/);
assert.doesNotMatch(workpaperMarkup, /sr-report-title|sr-print-title/);
assert.match(workpaperMarkup, /data-sr-exclude/,
  'the auditor can exclude a suggested aged/stale item from the workpaper preview');
assert.match(workpaperMarkup, /قضاوت حسابرس/,
  'a manual exclusion is explicitly presented as auditor judgment, not an automatic classification');
assert.match(workpaperMarkup, /بازگرداندن اقلام حذف‌شده/,
  'excluded workpaper items can be restored');
assert.match(html, /function withoutWorkpaperExclusions\(rows\)/,
  'manual exclusions are applied to the output rows without changing the underlying aging calculations');
assert.match(workpaperMarkup, /sr-refbox/);

const printStart = html.indexOf('function printReport(){');
const exportStart = html.indexOf('function exportXlsx(){', printStart);
const exportEnd = html.indexOf('\n}\n\n/* ------------------------------------------------------------- سبک‌ها */', exportStart);
assert(printStart >= 0 && exportStart > printStart && exportEnd > exportStart);
const printCode = html.slice(printStart, exportStart);
const exportCode = html.slice(exportStart, exportEnd);
assert.match(printCode, /selectionConfirmed/);
assert.match(printCode, /window\.print\(\)/);
assert.match(printCode, /sr-workpaper-exclude.*\.remove\(\)/,
  'auditor review buttons are excluded from the printed copy');
assert.match(exportCode, /selectionConfirmed/);
assert.match(exportCode, /withoutWorkpaperExclusions/,
  'manual auditor exclusions are honored by the XLSX workpaper too');
assert.match(exportCode, /XLSX\.utils\.book_new\(\)/);
assert.match(exportCode, /XLSX\.writeFile\(/);
assert.match(exportCode, /const fiscalYear=String\(cfg\.year\?\?'\'\)\.trim\(\)/);
assert.doesNotMatch(exportCode, /periodEnd|R\.audit\.label/,
  'the XLSX workpaper does not derive fiscal-year metadata from the accounting file');
assert.doesNotMatch(exportCode, /today|new Date\(\)/,
  'the XLSX date field never falls back to the current date');
assert.match(exportCode, /yearPlan\?yearPlan\.audit:'بدون-سال'/,
  'the XLSX output filename follows the configured fiscal year');
assert.doesNotMatch(html, /if\(!SHEET_CFG\.date\)/,
  'the application does not auto-fill the case preparation date');
const yearHelpersStart = html.indexOf('function srCaseYear(){');
const yearHelpersEnd = html.indexOf("const REQUIRED=", yearHelpersStart);
assert(yearHelpersStart >= 0 && yearHelpersEnd > yearHelpersStart, 'fiscal-year planning helpers exist');
const engineStart = html.indexOf('/* <<<SR-ENGINE-BEGIN>>> */');
const engineEnd = html.indexOf('/* <<<SR-ENGINE-END>>> */', engineStart);
const engineSandbox = {module:{exports:{}},console};
vm.createContext(engineSandbox);
vm.runInContext(html.slice(engineStart, engineEnd), engineSandbox);
const yearSandbox = {SRE:engineSandbox.module.exports,SHEET_CFG:{year:'۲۹ اسفند سال ۱۴۰۴'},window:{},fa:String,SR:{},CUR_MODULE:'home',CUR_STEP:'s1',paint(){}};
vm.createContext(yearSandbox);
vm.runInContext(html.slice(yearHelpersStart, yearHelpersEnd), yearSandbox);
assert.equal(yearSandbox.srCaseYear(), 1404, 'Persian month-name date text resolves to its Jalali year');
assert.deepEqual({...yearSandbox.srYearPlan()}, {audit:1404,history:1402,prior:1403,next:1405});
yearSandbox.SHEET_CFG.year='۱۴۰۴/۱۲/۲۹';
assert.equal(yearSandbox.srCaseYear(), 1404, 'numeric Jalali dates resolve to their year');
yearSandbox.SHEET_CFG.year='۱۴۰۴';
assert.equal(yearSandbox.srCaseYear(), 1404, 'a year-only value is not mistaken for an Excel date serial');
yearSandbox.SHEET_CFG.year='';
assert.equal(yearSandbox.srCaseYear(), null, 'an empty case year is never inferred from ledger dates');
assert.match(html, /role:'prior',year:plan\?\.prior,title:'اسناد خام سال قبل'/,
  'raw Y−1 ledger upload is available as an alternative to the prior workpaper');
assert.match(html, /role:'history',year:plan\?\.history,title:'اسناد خام دو سال قبل',required:false/,
  'raw Y−2 ledger is optional');
assert.match(html, /role:'next',year:plan\?\.next,title:'اسناد خام سال بعد برای پیگیری',required:false/,
  'Y+1 follow-up ledger is optional');
assert.match(html, /id="srPick_\$\{spec\.role\}"/,
  'year-role file input ids are generated dynamically from the selected fiscal year roles');
assert.match(html, /if\(prior\)\{[\s\S]*?SR\.priorResult=SRE\.analyze/,
  'Y−1 is independently rebuilt from raw ledger evidence when available');
assert.match(html, /SR\.priorWorkpaper&&!SR\.priorResult/,
  'prior workpaper import is not added again when raw Y−1 analysis exists');
assert.match(html, /SR\.priorComparison=\{\.\.\.stats\}/,
  'the raw Y−1 calculation and prior workpaper are compared without double counting');
assert.match(html, /if\(!SHEET_CFG\.company\.trim\(\)\)\{[\s\S]*?سال مالی اختیاری است/,
  'the case may continue with an empty fiscal-year field');
assert.match(exportCode, /x\.code==='TRANSFER_REVIEW'&&x\.fileId===currentFileId/);
assert.doesNotMatch(exportCode, /const allResults=\[R,SR\.priorResult,SR\.nextResult\]/);
const finalRowsStart = html.indexOf('function finalWorkpaperRows(');
const finalRowsEnd = html.indexOf('\nfunction signedText(', finalRowsStart);
assert(finalRowsStart >= 0 && finalRowsEnd > finalRowsStart);
const finalRowsCode = html.slice(finalRowsStart, finalRowsEnd);
assert.match(finalRowsCode, /!r\.finalRange&&\(rangeHasNonZero\(r\.auditAmountRange\)/,
  'current-year aged items stay visible when next-year follow-up is unavailable');
assert.match(workpaperMarkup, /amountHead\('سال',yearPlan\?\.prior\)\}\$\{amountHead\('سال',yearPlan\?\.audit\)/,
  'workpaper headings identify the prior and audit fiscal years directly');
assert.match(workpaperMarkup, /amountHead\('پیگیری سال مالی بعد',yearPlan\?\.next\)\}\$\{amountHead\('تهاتر',yearPlan\?\.audit\)/,
  'workpaper headings clearly name next-year follow-up and offset columns');
assert.match(html, /Array\.from\(\{length:n\},\(\)=>'<td class="ctl"><\/td>'\)/,
  'sampling audit-control cells remain while their checkbox marks are omitted');
assert.doesNotMatch(html, /\.sampling-template \.box\{display:inline-block/,
  'sampling audit-control checkbox styling is removed');
assert.doesNotMatch(html, /sample-page-bottom|sample-page-ref/,
  'sampling page footer retains its compact original layout without an oversized blank box');
assert.match(html, /صفحه \$\{faNum\(i\+1\)\} از \$\{faNum\(pages\.length\)\}/,
  'sampling page numbers use the unified Persian wording without the small hamza');
assert.match(html, /\.sr-aged-page-sheet \.sr-meta-grid \.sr-refbox\{[^}]*background:#fff!important/,
  'aged worksheet reference box remains white in print');
assert.match(html, /\.sr-aged-page-number\{font-family:workpaper-lotus,serif!important;font-size:10\.5px!important/,
  'aged worksheet page number uses the unified font and size');
assert.match(html, /grid-template-columns:18mm minmax\(0,1fr\) minmax\(0,92mm\)!important/,
  'aged worksheet preparation fields have a stable-width column at the left edge');
assert.doesNotMatch(html, /class="side sr-head-prep"/,
  'preparation metadata does not inherit the vertical green side-label style');
assert.match(html, /sr-head-prep\{position:static!important;inset:auto!important/,
  'preparation metadata is reset from the legacy absolute-positioned side style');
assert.match(html, /sr-head-prep \.v\{[^}]*overflow-wrap:normal/,
  'preparer values remain intact and wrap at spaces rather than within Persian words');
assert.doesNotMatch(html, /sr-meta-grid \.sr-head-prep>div\{[^}]*overflow-wrap:anywhere/,
  'Persian preparation-field text is not allowed to break letter-by-letter');
assert.match(workpaperMarkup, /class="sr-workpaper-subtotal"/,
  'the aged workpaper inserts a subtotal for every represented kol group');
assert.match(workpaperMarkup, /class="sr-workpaper-total"/,
  'the aged workpaper includes a grand-total row');
assert.match(workpaperMarkup, /subtotalGroups\.map\(group=>/,
  'kol subtotals are emitted even when a group has only one detail row');
assert.match(workpaperMarkup, /columnTotals\.priorAmount[\s\S]*columnTotals\.finalAmount/,
  'the grand total aggregates all five numeric columns');
assert.match(exportCode, /subtotalGroups\.flatMap\(group=>/,
  'the XLSX workpaper also inserts kol-level subtotals');
const subtotalHelpersStart = html.indexOf('function workpaperSubtotalGroups(');
const subtotalHelpersEnd = html.indexOf('\nfunction signedText(', subtotalHelpersStart);
const subtotalSandbox = {};
vm.createContext(subtotalSandbox);
vm.runInContext(html.slice(subtotalHelpersStart, subtotalHelpersEnd), subtotalSandbox);
const groupedRows = subtotalSandbox.workpaperSubtotalGroups([
  {kolCode:'100',kolTitle:'دریافتنی',priorAmount:2n,auditAmount:3n,followUp:2n,auditOffset:1n,finalAmount:1n},
  {kolCode:'100',kolTitle:'دریافتنی',priorAmount:4n,auditAmount:5n,followUp:4n,auditOffset:2n,finalAmount:2n},
  {kolCode:'200',kolTitle:'پرداختنی',priorAmount:7n,auditAmount:8n,followUp:7n,auditOffset:0n,finalAmount:7n}
]);
assert.equal(groupedRows.length,2);
assert.equal(groupedRows[0].rows.length,2);
const firstKolTotals = subtotalSandbox.workpaperColumnTotals(groupedRows[0].rows);
assert.equal(firstKolTotals.priorAmount,6n);
assert.equal(firstKolTotals.auditAmount,8n);
assert.equal(firstKolTotals.followUp,6n);
assert.equal(firstKolTotals.auditOffset,3n);
assert.equal(firstKolTotals.finalAmount,3n);
assert.equal(groupedRows[1].rows.length,1,'single-item kol groups still receive their own subtotal');
assert.match(exportCode, /\['جمع کل کاربرگ'[\s\S]*xval\(columnTotals\.finalAmount\)/,
  'the XLSX worksheet also includes totals for all numeric columns');
assert.match(workpaperMarkup, /const widths=\[40,104,44,150\.1,86,86,86,86,86\]/,
  'the worksheet uses the nine fixed right-to-left widths totaling 768.1pt');
assert.match(workpaperMarkup, /class=\"sr-major-title\"/,
  'every kol group starts with a merged major-account title row');
assert.match(workpaperMarkup, /sr-data-even|sr-data-odd/,
  'zebra striping is counted only on actual data rows');
assert.match(html, /function paginateMeasuredWorkpaperGroups\(/,
  'both workpaper modules share measured row-based pagination with group titles and subtotals');
assert.match(html, /first\.cells\[0\]\.rowSpan=span/,
  'consecutive identical moein codes and titles are vertically merged');
assert.match(html, /maxBodyHeight=Math\.max\(0,available-fixedHeight-1\)/,
  'pagination measures available body height after the frame and headers');
assert.match(html, /max-height:541\.7pt!important/,
  'the outer worksheet frame is capped at 541.7 points');
assert.match(html, /sr-aged-page-sheet\.sr-aged-page-full\{height:541\.7pt!important\}/,
  'every non-final aged-workpaper page uses the full 541.7-point outer frame');
assert.match(html, /padding:1\.6pt 2pt!important;line-height:1\.2!important/,
  'aged-workpaper rows have a little extra vertical breathing room');
assert.match(html, /td\.sr-account-title\{text-align:right!important;font-size:8pt!important\}/,
  'aged-workpaper account text is slightly larger for readability');
assert.match(html, /font-size:8pt!important;padding:1\.6pt 2pt!important;line-height:1\.2!important/,
  'printed aged-workpaper rows use the same slightly roomier typography');
assert.match(html, /const totalWidth=widths\.reduce\([\s\S]*100\*w\/totalWidth/,
  'the printable table scales the nine established column proportions to the inner frame');
assert.match(html, /sr-aged-content[\s\S]*border:1\.5px solid #9e0000/,
  'the workpaper restores the red inner frame');
assert.match(html, /#fbe3a0!important/,
  'kol and grand total rows use the specified amber fill');
assert.match(html, /sr-page-carry[\s\S]*sr-page-transfer/ ,
  'non-final pages end in a cumulative total and following pages start with its carry-forward');
assert.match(html, /expectedTotals&&totals\.some\(\(v,i\)=>v!==BigInt\(expectedTotals\[i\]\?\?0\)\)/,
  'the shared page engine refuses to produce output when carried totals do not equal the worksheet total');
assert.match(html, /#0b4f8a!important[\s\S]*#9e0000!important/,
  'positive amounts are blue and negative amounts red');
assert.doesNotMatch(workpaperMarkup, /class=\"frame sr-rows-box\"/,
  'the obsolete nested fourth frame is removed');
const pagerStart=html.indexOf('function paginateMeasuredWorkpaperGroups('),pagerEnd=html.indexOf('\nwindow.paginateMeasuredWorkpaperGroups=',pagerStart);
const pagerContext={window:{}};vm.createContext(pagerContext);vm.runInContext(html.slice(pagerStart,pagerEnd),pagerContext);
const mockRow=(kind,values={})=>({kind,dataset:values,cloneNode(){return mockRow(kind,{...values});}});
const pagesTest=pagerContext.paginateMeasuredWorkpaperGroups({groups:[
  {title:mockRow('title'),details:[mockRow('detail',{a:'3',b:'4'}),mockRow('detail',{a:'5',b:'6'})],subtotal:mockRow('subtotal')},
  {title:mockRow('title'),details:[mockRow('detail',{a:'7',b:'8'}),mockRow('detail',{a:'9',b:'10'})],subtotal:mockRow('subtotal')}
],maxBodyHeight:35,carryHeight:8,rowHeight:row=>row.kind==='title'||row.kind==='subtotal'?5:10,readValues:row=>[row.dataset.a||0,row.dataset.b||0],expectedTotals:[24n,28n]});
assert.ok(pagesTest.pages.length>1,'row-by-row measured packing creates continuation pages');
assert.equal(pagesTest.pages[0].details.length,1,'a group can continue to another page rather than forcing large blank space');
assert.deepEqual(pagesTest.pages[1].carryInTotals,[3n,4n],'carry-forward totals contain data rows only');
assert.deepEqual(pagesTest.pages[1].carryInTotals,pagesTest.pages[0].carryOutTotals,'the next page receives the exact previous-page cumulative totals');
assert.throws(()=>pagerContext.paginateMeasuredWorkpaperGroups({groups:[{title:mockRow('title'),details:[mockRow('detail',{a:'2'})],subtotal:mockRow('subtotal')}],maxBodyHeight:100,carryHeight:8,rowHeight:()=>1,readValues:row=>[row.dataset.a||0],expectedTotals:[3n]}),/جمع انتقالی/,'the pagination engine blocks inconsistent control totals');
assert.match(html, /tr\.sr-page-carry td\{background:#fbe3a0!important/,
  'the aged workpaper styles page-end cumulative rows in amber');
assert.match(html, /tr\.sr-page-transfer td\{background:#fff2cc!important/,
  'the aged workpaper styles next-page carry-forward rows in pale yellow');
assert.match(html, /انتقال از صفحات قبل/);
assert.match(html, /انتقال‌های حساب سال مورد رسیدگی نیازمند بررسی/);
assert.match(html, /هشدارهای نیازمند بررسی:<\/b> هشدار انتقال یا شباهت عنوان اشخاص به‌خودی‌خود از ماندهٔ دفتر/);
const bindingStart = html.indexOf('function bindReport(){');
const bindingEnd = html.indexOf('\nfunction totalsRow(', bindingStart);
const bindingCode = html.slice(bindingStart, bindingEnd);
assert.match(bindingCode, /const print=\$\('srPrint'\),xlsx=\$\('srXlsx'\);if\(print\)print\.disabled=false/);
assert.match(bindingCode, /const print=\$\('srPrint'\),xlsx=\$\('srXlsx'\);if\(print\)print\.disabled=true/);

console.log('PASS: reversed/fuzzy party-name suggestions, kol/moein-only balance, and confirmed print/XLSX paths');
