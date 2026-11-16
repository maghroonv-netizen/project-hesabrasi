// UI regression for the expense-variance module. Run with jsdom installed:
// NODE_PATH=/path/to/node_modules node tests/expense-variance.test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, '..', 'audit-google-auto.html'), 'utf8');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', error => errors.push(error.message));
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'https://example.test/',
  virtualConsole: vc,
  beforeParse(window) {
    window.scrollTo = () => {};
    window.alert = message => { throw new Error('Unexpected alert: ' + message); };
    window.print = () => {};
  }
});
const w = dom.window;
const $ = id => w.document.getElementById(id);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function makeFile(sheetName, rows, name) {
  const wb = w.XLSX.utils.book_new();
  w.XLSX.utils.book_append_sheet(wb, w.XLSX.utils.aoa_to_sheet(rows), sheetName);
  const bytes = w.XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new w.File([bytes], name);
}
function dispatchFile(input, file) {
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  input.dispatchEvent(new w.Event('change', { bubbles: true }));
}

(async () => {
  try {
    await sleep(100);
    // Reveal the app's module picker as if the existing shared import has completed.
    w.eval(`ENTRY.phase='ready'; FULL_ROWS=[
      {'کد حساب کل':'61','عنوان حساب کل':'هزینه‌های اداری','کد حساب معین':'006101','عنوان حساب معین':'حقوق','بدهکار':1500000000,'بستانکار':0,'شرح ردیف':'  پرداخت-123  ','شرح سند':'','تاریخ':'۱۴۰۴/۰۱/۰۲'},
      {'کد حساب کل':'61','عنوان حساب کل':'هزینه‌های اداری','کد حساب معین':'6102','عنوان حساب معین':'هزینه بدون مبنا','بدهکار':0,'بستانکار':400000,'شرح ردیف':'شرح سال جاری','شرح سند':'','تاریخ':'۱۴۰۴/۰۲/۰۱'},
      {'کد حساب کل':'61','عنوان حساب کل':'هزینه‌های اداری','کد حساب معین':'6103','عنوان حساب معین':'حساب فقط در سال جاری','بدهکار':500000000,'بستانکار':0,'شرح ردیف':'','شرح سند':'','تاریخ':'۱۴۰۴/۰۳/۰۱'},
      {'کد حساب کل':'61','عنوان حساب کل':'هزینه‌های اداری','کد حساب معین':'6105','عنوان حساب معین':'حساب بدون گردش','بدهکار':0,'بستانکار':0,'شرح ردیف':'','شرح سند':'','تاریخ':'۱۴۰۴/۰۳/۱۵'},
      {'کد حساب کل':'62','عنوان حساب کل':'هزینه مالی','کد حساب معین':'6201','عنوان حساب معین':'هزینه تأمین مالی','بدهکار':250000000,'بستانکار':0,'شرح ردیف':'شرح هزینه مالی','شرح سند':'','تاریخ':'۱۴۰۴/۰۴/۰۱'},
      {'کد حساب کل':'61','عنوان حساب کل':'هزینه‌های اداری','کد حساب معین':'6104','عنوان حساب معین':'حساب موقت','بدهکار':999999999,'بستانکار':0,'شرح ردیف':'ثبت نهایی','شرح سند':'سند بستن حساب موقت','تاریخ':'۱۴۰۴/۱۲/۲۹'}
    ]; ACCOUNT_ROWS=FULL_ROWS; currentHeaders=['fixture']; renderModuleHome();`);
    assert.ok(w.document.querySelector('[data-open="variance"]'), 'expense variance appears in the module picker');
    w.document.querySelector('[data-open="variance"]').click();
    assert.equal(w.document.querySelectorAll('#varianceV1 .v-unit').length, 0, 'amount units are fixed to rial');
    assert.ok(w.document.querySelector('#varianceV1').textContent.includes('تمام مبالغ فایل‌ها به‌صورت ریال'), 'amounts are processed as rials without a million-rial option');

    assert.equal(w.document.querySelectorAll('#varianceV1 input.v-file').length, 1, 'only the prior-year file is requested here');
    assert.equal(w.document.querySelectorAll('#varianceV1 .v-year').length, 0, 'fiscal years are not entered manually');
    assert.ok(w.document.querySelector('#varianceV1').textContent.includes('بارگذاری دوباره لازم نیست'), 'the already-loaded current-year source is reused');
    const headers = ['کد حساب کل', 'عنوان حساب کل', 'کد حساب معین', 'عنوان حساب معین', 'بدهکار', 'بستانکار', 'شرح ردیف', 'شرح سند', 'تاریخ'];
    const prior = makeFile('سال قبل', [
      headers,
      ['61', 'هزینه‌های اداری', '', '', 90000000000, 0, 'جمع کل تکراری', '', '۱۴۰۳/۰۱/۰۱'],
      ['61', 'هزینه‌های اداری', '006101', 'حقوق', 1000000000, 0, 'پرداخت حقوق', '', '۱۴۰۳/۰۲/۰۱'],
      ['61', 'هزینه‌های اداری', '6102', 'هزینه بدون مبنا', 0, 0, 'شرح سال قبل', '', '۱۴۰۳/۰۳/۰۱'],
      ['61', 'هزینه‌های اداری', '6105', 'حساب بدون گردش', 0, 0, '', '', '۱۴۰۳/۰۳/۱۵'],
      ['62', 'هزینه مالی', '', '', 300000000, 0, 'جمع کل دوم', '', '۱۴۰۳/۰۴/۰۱'],
      ['62', 'هزینه مالی', '6201', 'هزینه تأمین مالی', 200000000, 0, 'شرح قبلی هزینه مالی', '', '۱۴۰۳/۰۵/۰۱'],
      ['62', 'هزینه مالی', '6202', 'حساب دائم', 888888888, 0, 'ثبت عادی', 'سند بستن حساب دائم', '۱۴۰۳/۱۲/۲۹']
    ], 'prior.xlsx');

    assert.ok(w.document.querySelector('#varianceV1').textContent.includes('۱۴۰۴'), 'current fiscal year is detected from the shared source date column');
    dispatchFile(w.document.querySelector('.v-file[data-i="0"]'), prior);
    for (let n = 0; n < 80 && !w.document.querySelector('#varianceV1 .variance-fname')?.textContent.includes('فایل خوانده شد'); n++) await sleep(25);
    assert.ok(w.document.querySelector('#varianceV1 .variance-fname').textContent.includes('فایل خوانده شد'));

    w.document.querySelector('#varianceV1 [data-vnext]').click();
    w.document.querySelector('#varianceV2 [data-vmap-confirm]').click();
    assert.equal(w.eval('CUR_STEP'), 'v3');
    assert.ok(w.document.querySelector('#varianceV3 .sr-tb-period').textContent.includes('1403') && w.document.querySelector('#varianceV3 .sr-tb-period').textContent.includes('1404'), 'both fiscal years are detected from the mapped date columns');
    assert.ok(w.document.querySelector('#varianceV3').textContent.includes('برای جلوگیری از دوباره‌شماری: 2'), 'major-level totals are ignored when detail accounts are present');
    assert.ok(w.document.querySelector('#varianceV3').textContent.includes('اسناد بستن/اختتامیهٔ حساب موقت یا دائمِ کنارگذاشته‌شده: 1 ردیف'), 'temporary and permanent closing vouchers are excluded based on document descriptions');
    const accountScroll = w.document.querySelector('#varianceV3 .variance-scroll');
    accountScroll.scrollTop = 240;
    w.document.querySelector('#varianceV3 #vSelectVisible').click();
    assert.equal(accountScroll.scrollTop, 240, 'selecting accounts does not reset the balance list scroll position');
    assert.equal(w.document.querySelectorAll('#varianceV3 [data-vaccount]:checked').length, 5);
    assert.equal(w.document.querySelectorAll('#varianceV3 [data-vcategory]').length, 0, 'accounts are grouped by their major account without manual category selection');
    w.document.querySelector('#varianceV3 [data-vconfirm]').click();

    assert.equal(w.document.querySelector('#metaSubject'), null, 'the case-information form does not request a redundant subject');
    assert.ok(w.document.querySelector('#varianceV4 .variance-meta').textContent.includes('بررسی نوسانات هزینه'), 'the module supplies its own workpaper subject');
    const thresholdInput = w.document.querySelector('#varianceV4 [data-vthreshold]');
    thresholdInput.value = '30'; thresholdInput.dispatchEvent(new w.Event('change', { bubbles: true }));
    assert.equal(w.document.querySelectorAll('#varianceV4 .variance-workpaper-source .variance-summary tbody tr')[1].lastElementChild.textContent, '۰ از ۱', 'the user-configurable fluctuation threshold controls summary counts');
    w.document.querySelector('#varianceV4 [data-vthreshold]').value = '20';
    w.document.querySelector('#varianceV4 [data-vthreshold]').dispatchEvent(new w.Event('change', { bubbles: true }));
    const paper = w.document.querySelector('#varianceV4 .variance-paper-table');
    assert.equal(paper.querySelectorAll('thead th').length, 8, 'main table has exactly eight columns');
    assert.equal([...paper.querySelectorAll('col')].reduce((total, col) => total + parseFloat(col.style.width), 0), 768.1, 'specified column widths add to 768.1 pt');
    assert.equal(w.document.querySelectorAll('#varianceV4 .variance-workpaper-source .variance-summary thead th').length, 6, 'summary has six columns, including fluctuation counts');
    assert.equal(w.document.querySelectorAll('#varianceV4 .variance-workpaper-source .variance-summary tbody tr').length, 2, 'the summary has one row for each major-account group');
    assert.ok(paper.tBodies[0].rows[0].textContent.includes('هزینه‌های اداری'), 'group heading comes from the major account title');
    assert.ok([...paper.tBodies[0].rows].some(row => row.classList.contains('variance-group-title') && row.textContent.includes('هزینه مالی')), 'a second major account becomes a separate group automatically');
    assert.equal(w.document.querySelectorAll('#varianceV4 [data-vnote]').length, 0, 'no AI or auditor note editor is mixed into source descriptions');
    const lines = [...paper.tBodies[0].rows];
    const dataRows = lines.filter(line => !line.classList.contains('variance-group-title') && !line.classList.contains('variance-workpaper-subtotal'));
    assert.equal(dataRows.length, 5);
    const first = dataRows.find(line => line.querySelector('td:nth-child(2)')?.textContent === '۰۰۶۱۰۱');
    assert.ok(first?.textContent.includes('۵۰٫۰٪'), 'percentage is calculated from current and prior rial balances with one decimal place');
    assert.equal(first.querySelector('td:nth-child(4)').textContent, '۱٬۵۰۰٬۰۰۰٬۰۰۰', 'source rial amounts are displayed and calculated without scaling');
    assert.equal(first.querySelector('td:nth-child(6)').textContent, '۵۰۰٬۰۰۰٬۰۰۰', 'change is calculated as current minus prior in rials');
    assert.ok(first.querySelector('td:nth-child(8)').textContent.includes('افزایش در حقوق و مزایا'), 'the workpaper shows a concise locally classified explanation before AI writing');
    assert.ok(first.querySelector('td:nth-child(8)').textContent.length <= 55, 'explanations remain concise');
    const printCss = [...w.document.querySelectorAll('style')].map(style => style.textContent).join('\n');
    assert.match(printCss, /td\.vdesc\{[^}]*white-space:normal!important[^}]*overflow-wrap:anywhere!important/, 'long explanation text wraps inside its own cell');
    assert.match(printCss, /td\.vaccount\{[^}]*white-space:normal!important[^}]*overflow-wrap:anywhere!important/, 'long account names wrap instead of spilling into adjacent cells');
    const currentOnly = dataRows.find(line => line.querySelector('td:nth-child(2)')?.textContent === '۶۱۰۳');
    assert.equal(currentOnly?.querySelector('td:nth-child(5)').textContent, '۰', 'a missing prior-year amount is shown as zero');
    assert.equal(currentOnly?.querySelector('td:nth-child(6)').textContent, '۵۰۰٬۰۰۰٬۰۰۰', 'change is always calculated when the prior amount is missing');
    assert.equal(currentOnly?.querySelector('td:nth-child(7)').textContent, '—', 'percentage is a dash only when the prior-year amount is zero');
    const negative = dataRows.find(line => line.querySelector('td:nth-child(2)')?.textContent === '۶۱۰۲');
    assert.ok(negative.querySelector('td:nth-child(4)').classList.contains('vnegative'), 'negative amount receives the dark-red print class');
    assert.equal(negative.querySelector('td:nth-child(4)').textContent, '(۴۰۰٬۰۰۰)', 'decimal million-rial amounts convert exactly to whole rial');
    assert.equal(negative.querySelector('td:nth-child(7)').textContent, '—', 'percentage is unavailable only when the prior-year amount is zero');
    const zeroLine = dataRows.find(line => line.querySelector('td:nth-child(2)')?.textContent === '۶۱۰۵');
    assert.deepEqual([...zeroLine.querySelectorAll('td')].slice(3, 7).map(cell => cell.textContent), ['۰', '۰', '۰', '—'], 'an account with zero in both years displays zero amounts and a dash percentage');
    assert.ok(first.querySelector('td:nth-child(7)').classList.contains('variance-high-fluctuation'), 'an absolute fluctuation above 20 percent is highlighted');
    assert.equal(lines.filter(line => line.classList.contains('variance-group-title')).length, 2, 'one group is emitted per major account');
    assert.equal(lines.filter(line => line.classList.contains('variance-workpaper-subtotal')).length, 2, 'major-account subtotals are printed');
    const adminSubtotal = lines.find(line => line.classList.contains('variance-workpaper-subtotal') && line.querySelector('td:nth-child(2)')?.textContent === '۶۱');
    assert.deepEqual([...adminSubtotal.querySelectorAll('td')].slice(3, 7).map(cell => cell.textContent), ['۱٬۹۹۹٬۶۰۰٬۰۰۰', '۱٬۰۰۰٬۰۰۰٬۰۰۰', '۹۹۹٬۶۰۰٬۰۰۰', '۱۰۰٫۰٪'], 'subtotal sums amount columns and computes percent from group totals');
    const summaryRows = [...w.document.querySelectorAll('#varianceV4 .variance-workpaper-source .variance-summary tbody tr')];
    assert.deepEqual(summaryRows.map(row => row.querySelector('td:last-child').textContent), ['۱ از ۴', '۱ از ۱'], 'summary counts accounts with absolute changes over twenty percent');
    assert.ok(!paper.textContent.includes('کنترل‌های حسابرسی') && !paper.textContent.includes('یادداشت حسابرس'));
    let printed = null;
    w.print = () => { printed = [...w.document.querySelectorAll('#printHost .variance-print-page')].map(page => ({
      headers: page.querySelectorAll('.variance-meta').length,
      mainHead: page.querySelectorAll('.variance-paper-table thead').length,
      summaryHead: page.querySelectorAll('.variance-summary-table thead th').length,
      pageNumber: page.querySelector('.variance-page-number')?.textContent || ''
    }));
      if (process.env.SAVE_VARIANCE_PRINT_FIXTURE) {
        fs.writeFileSync(process.env.SAVE_VARIANCE_PRINT_FIXTURE,
          `<!doctype html><html><head><meta charset="utf-8">${w.document.head.innerHTML}</head><body class="printing">${$('printHost').outerHTML}</body></html>`);
      }
    };
    w.document.querySelector('#varianceV4 [data-vprint]').click();
    assert.equal(printed.length, 1, 'compact major-account data and summary fit on one page');
    assert.ok(printed.every(page => page.headers === 1), 'metadata header repeats on every page');
    assert.ok(!/کنترل‌های حسابرسی|عطف|یادداشت حسابرس|حد نوسان|درصد سال/.test(w.document.querySelector('#printHost').textContent), 'removed audit-control fields remain absent while the summary fluctuation count is present');
    assert.equal(printed[0].mainHead, 1, 'main table header is present on the data page');
    assert.equal(printed[0].summaryHead, 6, 'summary uses six columns when it fits on the final page');
    const printPage = w.document.querySelector('#printHost .variance-print-page');
    assert.ok(printPage.querySelector('.variance-outer > .variance-mid > .variance-inner'), 'print page has three nested rounded frames');
    assert.ok(printPage.querySelector('.variance-mid > .variance-page-number'), 'page number sits inside the middle frame below the inner frame');
    assert.ok(printPage.querySelector('.variance-mid > .variance-summary'), 'summary is in a separate inner frame');
    assert.equal(printPage.querySelector('.variance-paper-title'), null, 'there is no separate title above the header');
    assert.equal(printPage.querySelector('.variance-group-title td').colSpan, 8, 'major-account title merges all eight columns');
    assert.ok([...w.document.head.querySelectorAll('style[data-variance-print]')].some(style => style.textContent.includes('@page{size:A4 landscape')), 'PDF print uses A4 landscape');
    assert.ok(printed[0].pageNumber.includes('از ۱'), 'pagination reports total page count');
    if (typeof w.__activePrintRestore === 'function') w.__activePrintRestore();

    const stressTitle = w.document.createElement('tr');
    stressTitle.className = 'variance-group-title';
    stressTitle.innerHTML = '<td colspan="8">گروه آزمایشی</td>';
    const stressRows = Array.from({ length: 30 }, (_, i) => {
      const row = first.cloneNode(true);
      row.querySelector('td:nth-child(1)').textContent = String(i + 1);
      row.querySelector('td:nth-child(2)').textContent = String(8000 + i);
      row.querySelector('td:nth-child(3)').textContent = 'شرح کوتاه آزمایشی';
      row.querySelector('td:nth-child(8)').textContent = 'افزایش در هزینه؛ بررسی سند لازم است.';
      return row;
    });
    const stressSubtotal = lines.find(line => line.classList.contains('variance-workpaper-subtotal')).cloneNode(true);
    w.document.querySelector('#varianceV4 .variance-workpaper-source .variance-paper-table tbody').append(stressTitle, ...stressRows, stressSubtotal);
    printed = null;
    w.document.querySelector('#varianceV4 [data-vprint]').click();
    assert.ok(printed.length >= 2, 'additional account rows paginate across pages');
    assert.ok(w.document.querySelector('#printHost .variance-paper-table tbody').rows.length >= 18, 'each measured page uses its available height for more account rows');
    const summaryPage = printed.at(-1);
    assert.equal(summaryPage.mainHead, 1, 'the main-table header repeats on continuation pages');
    assert.equal(summaryPage.summaryHead, 6, 'the continuation retains the six-column summary');
    assert.equal(summaryPage.headers, 1, 'every page repeats the metadata header');
    if (typeof w.__activePrintRestore === 'function') w.__activePrintRestore();

    w.anaAISaveKey('test-only');
    let sent = null, requests = 0;
    w.routerRequest = async messages => {
      requests++;
      sent = JSON.parse(messages[1].content.split('\n').slice(1).join('\n'));
      return { ok: true, text: JSON.stringify({ items: sent.map(item => ({
        g: item.g,
        t: item.c === 'حقوق و مزایا' ? 'افزایش حقوق و مزایا؛ تطبیق فهرست حقوق لازم است.' : `${item.d} در ${item.c}؛ بررسی اسناد مرتبط لازم است.`
      })) }) };
    };
    w.document.querySelector('#varianceV4 [data-vai]').click();
    for (let n = 0; n < 40 && !w.document.querySelector('#varianceV4 #vAiStatus')?.textContent.includes('توضیح کوتاه برای'); n++) await sleep(25);
    assert.equal(requests, 1, 'similar accounts are classified locally and analyzed in one compact AI request');
    assert.equal(sent.length, 4, 'AI receives one item per grouped expense pattern, not one per account');
    assert.ok(sent.every(item => item.g && item.c && item.d && item.p && !Object.hasOwn(item, 'id') && !Object.hasOwn(item, 'account') && !Object.hasOwn(item, 'amount')), 'the AI payload contains only local categories, direction, pattern and short evidence');
    assert.ok(sent.some(item => item.c === 'حقوق و مزایا' && item.d === 'افزایش'), 'classification is performed by code before AI writing');
    assert.ok(sent.some(item => item.c === 'حقوق و مزایا' && item.e.some(text => text.includes('پرداخت'))), 'the AI receives only a short sanitized description hint for writing');
    const aiExplanation = w.document.querySelector('#varianceV4 .variance-workpaper-source .variance-paper-table tbody tr:not(.variance-group-title):not(.variance-workpaper-subtotal) td:nth-child(8)');
    assert.equal(aiExplanation.textContent, 'افزایش حقوق و مزایا؛ تطبیق فهرست حقوق لازم است.', 'AI-written text replaces the local fallback in the explanation cell');
    assert.ok(aiExplanation.textContent.length <= 55, 'AI explanations are limited to a brief half-line');
    assert.ok(w.document.querySelector('#varianceV4 #vAiStatus').textContent.includes('مبالغ و کد حسابی برای AI ارسال نشد'));
    if (errors.length) throw new Error('jsdom errors: ' + errors.join(' | '));
    console.log('expense variance UI: passed (automatic years, rial-only amounts, local account classification, short AI explanations, zero handling, page frames and pagination)');
  } finally {
    dom.window.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
