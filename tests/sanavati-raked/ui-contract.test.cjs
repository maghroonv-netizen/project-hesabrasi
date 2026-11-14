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
assert.match(workpaperMarkup, /const fiscalYear=String\(cfg\.year\?\?'\'\)\.trim\(\)/);
assert.doesNotMatch(workpaperMarkup, /تاریخ ترازنامه|periodEnd|SR\.result\?\.audit\?\.label/,
  'the aged worksheet does not invent a balance-sheet date or fall back to the uploaded file year');
assert.match(html, /سال مالی مورد رسیدگی :<\/span> <span class="v">\$\{esc\(sampleDisplayDigits\(c\.year\)\)\}/,
  'sampling uses the exact optional fiscal-year value from case metadata');
assert.match(workpaperMarkup, /تهیه‌کننده :/);
assert.match(workpaperMarkup, /بررسی‌کننده :/);
assert.doesNotMatch(workpaperMarkup, /sr-report-title|sr-print-title/);
assert.match(workpaperMarkup, /sr-refbox/);

const printStart = html.indexOf('function printReport(){');
const exportStart = html.indexOf('function exportXlsx(){', printStart);
const exportEnd = html.indexOf('\n}\n\n/* ------------------------------------------------------------- سبک‌ها */', exportStart);
assert(printStart >= 0 && exportStart > printStart && exportEnd > exportStart);
const printCode = html.slice(printStart, exportStart);
const exportCode = html.slice(exportStart, exportEnd);
assert.match(printCode, /selectionConfirmed/);
assert.match(printCode, /window\.print\(\)/);
assert.match(exportCode, /selectionConfirmed/);
assert.match(exportCode, /XLSX\.utils\.book_new\(\)/);
assert.match(exportCode, /XLSX\.writeFile\(/);
assert.match(exportCode, /const fiscalYear=String\(cfg\.year\?\?'\'\)\.trim\(\)/);
assert.doesNotMatch(exportCode, /periodEnd|R\.audit\.label/,
  'the XLSX workpaper does not derive fiscal-year metadata from the accounting file');
assert.match(html, /if\(!SHEET_CFG\.company\.trim\(\)\)\{[\s\S]*?سال مالی اختیاری است/,
  'the case may continue with an empty fiscal-year field');
assert.match(exportCode, /x\.code==='TRANSFER_REVIEW'&&x\.fileId===currentFileId/);
assert.doesNotMatch(exportCode, /const allResults=\[R,SR\.priorResult,SR\.nextResult\]/);
const finalRowsStart = html.indexOf('function finalWorkpaperRows(');
const finalRowsEnd = html.indexOf('\nfunction signedText(', finalRowsStart);
assert(finalRowsStart >= 0 && finalRowsEnd > finalRowsStart);
const finalRowsCode = html.slice(finalRowsStart, finalRowsEnd);
assert.match(finalRowsCode, /const visible=rows\.filter\(r=>rangeHasNonZero\(r\.finalRange\)\)/,
  'final worksheet filters by its final aged/stale balance, not intermediate activity columns');
assert.match(html, /Math\.max\(11,Math\.min\(3\.2,perCtrlMm-0\.55\)\*96\/25\.4\)/,
  'sampling control checkboxes are printed at a larger size');
assert.match(html, /\.sr-aged-page-sheet \.sr-meta-grid \.sr-refbox\{[^}]*background:#fff!important/,
  'aged worksheet reference box remains white in print');
assert.match(html, /\.sr-aged-page-number\{font-size:8pt!important/,
  'aged worksheet page number matches the sampling footer scale');
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
assert.match(workpaperMarkup, /columnTotals\.amount1403[\s\S]*columnTotals\.finalAmount/,
  'the grand total aggregates all five numeric columns');
assert.match(exportCode, /subtotalGroups\.flatMap\(group=>/,
  'the XLSX workpaper also inserts kol-level subtotals');
const subtotalHelpersStart = html.indexOf('function workpaperSubtotalGroups(');
const subtotalHelpersEnd = html.indexOf('\nfunction signedText(', subtotalHelpersStart);
const subtotalSandbox = {};
vm.createContext(subtotalSandbox);
vm.runInContext(html.slice(subtotalHelpersStart, subtotalHelpersEnd), subtotalSandbox);
const groupedRows = subtotalSandbox.workpaperSubtotalGroups([
  {kolCode:'100',kolTitle:'دریافتنی',amount1403:2n,amount1404:3n,followUp:2n,offset1404:1n,finalAmount:1n},
  {kolCode:'100',kolTitle:'دریافتنی',amount1403:4n,amount1404:5n,followUp:4n,offset1404:2n,finalAmount:2n},
  {kolCode:'200',kolTitle:'پرداختنی',amount1403:7n,amount1404:8n,followUp:7n,offset1404:0n,finalAmount:7n}
]);
assert.equal(groupedRows.length,2);
assert.equal(groupedRows[0].rows.length,2);
const firstKolTotals = subtotalSandbox.workpaperColumnTotals(groupedRows[0].rows);
assert.equal(firstKolTotals.amount1403,6n);
assert.equal(firstKolTotals.amount1404,8n);
assert.equal(firstKolTotals.followUp,6n);
assert.equal(firstKolTotals.offset1404,3n);
assert.equal(firstKolTotals.finalAmount,3n);
assert.equal(groupedRows[1].rows.length,1,'single-item kol groups still receive their own subtotal');
assert.match(exportCode, /\['جمع کل کاربرگ'[\s\S]*xval\(columnTotals\.finalAmount\)/,
  'the XLSX worksheet also includes totals for all numeric columns');
assert.match(html, /sr-paper-table\{border:1\.2px solid #475569/,
  'the whole worksheet table has a visible perimeter border');
assert.match(html, /const capacity=Math\.max\(0,available-fixedHeight-18\)/,
  'manual print pagination reserves a cross-browser layout safety margin');
assert.match(html, /\.sr-aged-page-sheet\{[^}]*padding:2mm!important[^}]*border:1\.5px solid/,
  'outer worksheet frame is separated from the inner frame');
assert.match(html, /\.sr-aged-page-sheet \.sr-rows-box\{padding:1\.5mm!important/,
  'rounded table frame has an inset so the corner strokes remain visible');
assert.match(html, /انتقال‌های حساب سال مورد رسیدگی نیازمند بررسی/);
assert.match(html, /هشدارهای نیازمند بررسی:<\/b> هشدار انتقال یا شباهت عنوان اشخاص به‌خودی‌خود از ماندهٔ دفتر/);
const bindingStart = html.indexOf('function bindReport(){');
const bindingEnd = html.indexOf('\nfunction totalsRow(', bindingStart);
const bindingCode = html.slice(bindingStart, bindingEnd);
assert.match(bindingCode, /const print=\$\('srPrint'\),xlsx=\$\('srXlsx'\);if\(print\)print\.disabled=false/);
assert.match(bindingCode, /const print=\$\('srPrint'\),xlsx=\$\('srXlsx'\);if\(print\)print\.disabled=true/);

console.log('PASS: reversed/fuzzy party-name suggestions, kol/moein-only balance, and confirmed print/XLSX paths');
