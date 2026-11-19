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
    const packRow = (kind, h, value) => ({ kind, h, value, cloneNode() { return { ...this }; } });
    const packTitle = packRow('title', 20);
    const packDetails = [packRow('detail', 20, 1), packRow('detail', 20, 2)];
    const packSubtotal = packRow('subtotal', 35);
    const packedSplit = w.paginateMeasuredWorkpaperGroups({
      groups: [
        { title: packTitle, details: packDetails, subtotal: packSubtotal },
        { title: packRow('title', 10), details: [packRow('detail', 10, 4)], subtotal: packRow('subtotal', 10) }
      ],
      maxBodyHeight: 100, carryHeight: 10, carryInHeight: 0, finalHeight: 10, allowSubtotalSplit: true,
      rowHeight: row => row.h, readValues: row => [row.value], expectedTotals: [7]
    });
    assert.equal(packedSplit.pages[0].details.length, 2, 'a detail row from the next page moves upward when it fits, even when its subtotal must follow');
    assert.equal(packedSplit.pages[0].rows.map(row => row.kind).join(','), 'title,detail,detail', 'the upper page is filled with real workpaper rows, not decorative lines');
    assert.equal(packedSplit.pages[1].rows.map(row => row.kind).join(','), 'title,subtotal,title,detail,subtotal', 'the split subtotal stays with its heading while following account details still fill that page');

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
      ['61', 'هزینه‌های اداری', '6102', 'هزینه بدون مبنا', 600000, 0, 'شرح سال قبل', '', '۱۴۰۳/۰۳/۰۱'],
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
    w.eval("SHEET_CFG.date='ابان 1405'");
    w.document.querySelector('#varianceV3 [data-vconfirm]').click();

    assert.equal(w.document.querySelector('#metaSubject'), null, 'the case-information form does not request a redundant subject');
    assert.equal(w.document.querySelector('#varianceV4 .variance-meta-right .variance-line:nth-child(2) .variance-value').textContent, 'کاربرگ بررسی نوسانات هزینه', 'the workpaper subject uses exactly the requested wording');
    assert.ok(w.document.querySelector('#varianceV4 .variance-meta').textContent.includes('آبان ۱۴۰۵'), 'preparation month uses the hamza spelling and Persian digits');
    assert.ok(w.document.querySelector('#varianceV4 .variance-meta').textContent.includes('سال مالی منتهی به ۲۹ اسفند ۱۴۰۴'), 'the audit year-end is stated explicitly in the header');
    assert.equal(w.document.querySelector('#varianceV4 [data-vthreshold]'), null, 'the user-configurable fluctuation threshold is removed');
    assert.equal(w.document.querySelector('#varianceV4 .variance-threshold-control'), null, 'there is no threshold selector in the workpaper controls');
    const paper = w.document.querySelector('#varianceV4 .variance-paper-table');
    assert.equal(paper.querySelectorAll('thead th').length, 8, 'main table has exactly eight columns');
    assert.equal([...paper.querySelectorAll('col')].reduce((total, col) => total + parseFloat(col.style.width), 0), 100, 'responsive column percentages fill the printable width exactly');
    assert.deepEqual([...paper.querySelectorAll('col')].map(col => parseFloat(col.style.width)), [3, 6, 17, 13, 13, 13, 8, 27], 'subtotal label span uses the slightly narrower row/code/account columns');
    assert.equal(w.document.querySelectorAll('#varianceV4 .variance-workpaper-source .variance-summary thead th').length, 5, 'summary contains only major account and year/change totals');
    assert.ok(!w.document.querySelector('#varianceV4 .variance-workpaper-source .variance-summary').textContent.includes('نوسان بیش از حد'), 'the fluctuation-count metric is removed from the summary');
    assert.equal(w.document.querySelectorAll('#varianceV4 .variance-workpaper-source .variance-summary tbody tr').length, 2, 'the summary has one row for each major-account group');
    assert.ok(paper.tBodies[0].rows[0].textContent.includes('هزینه‌های اداری'), 'group heading comes from the major account title');
    assert.ok([...paper.tBodies[0].rows].some(row => row.classList.contains('variance-group-title') && row.textContent.includes('هزینه مالی')), 'a second major account becomes a separate group automatically');
    assert.equal(w.document.querySelectorAll('#varianceV4 [data-vnote]').length, 10, 'notes are editable in both the source table and paginated preview');
    assert.equal(w.document.querySelector('#varianceV4 .variance-preview-pages textarea[data-vnote]').style.height, '12px', 'description editors begin at a compact one-line height');
    const lines = [...paper.tBodies[0].rows];
    const dataRows = lines.filter(line => !line.classList.contains('variance-group-title') && !line.classList.contains('variance-workpaper-subtotal'));
    assert.equal(dataRows.length, 5);
    const first = dataRows.find(line => line.querySelector('td:nth-child(2)')?.textContent === '۰۰۶۱۰۱');
    assert.ok(first?.textContent.includes('۵۰٫۰٪'), 'percentage is calculated from current and prior rial balances with one decimal place');
    assert.equal(first.querySelector('td:nth-child(4)').textContent, '۱٬۵۰۰٬۰۰۰٬۰۰۰', 'source rial amounts are displayed and calculated without scaling');
    assert.equal(first.querySelector('td:nth-child(6)').textContent, '۵۰۰٬۰۰۰٬۰۰۰', 'change is calculated as current minus prior in rials');
    assert.equal(first.querySelector('td:nth-child(8) textarea')?.value, '', 'editable explanation starts blank until written by AI or entered by the user');
    const printCss = [...w.document.querySelectorAll('style')].map(style => style.textContent).join('\n');
    assert.match(printCss, /td\.vdesc\{[^}]*white-space:normal!important[^}]*overflow-wrap:anywhere!important/, 'long explanation text wraps inside its own cell');
    assert.match(printCss, /variance-page-full \.variance-outer\{height:541\.7pt!important/, 'filled variance pages retain the full 541.7-point frame height');
    assert.match(printCss, /td\.vaccount\{[^}]*white-space:normal!important[^}]*overflow-wrap:anywhere!important/, 'long account names wrap instead of spilling into adjacent cells');
    const currentOnly = dataRows.find(line => line.querySelector('td:nth-child(2)')?.textContent === '۶۱۰۳');
    assert.equal(currentOnly?.querySelector('td:nth-child(5)').textContent, '۰', 'a missing prior-year amount is shown as zero');
    assert.equal(currentOnly?.querySelector('td:nth-child(6)').textContent, '۵۰۰٬۰۰۰٬۰۰۰', 'change is always calculated when the prior amount is missing');
    assert.equal(currentOnly?.querySelector('td:nth-child(7)').textContent, '—', 'percentage is a dash only when the prior-year amount is zero');
    const negative = dataRows.find(line => line.querySelector('td:nth-child(2)')?.textContent === '۶۱۰۲');
    assert.ok(negative.querySelector('td:nth-child(4)').classList.contains('vnegative'), 'negative amount receives the dark-red print class');
    assert.equal(negative.querySelector('td:nth-child(4)').textContent, '(۴۰۰٬۰۰۰)', 'decimal million-rial amounts convert exactly to whole rial');
    assert.equal(negative.querySelector('td:nth-child(7)').textContent, '(۱۶۶٫۷٪)', 'negative percentage is shown in parentheses with Persian digits');
    assert.ok(negative.querySelector('td:nth-child(7)').classList.contains('variance-negative'), 'negative percentages use dark-red emphasis');
    assert.ok(negative.querySelector('td:nth-child(7)').classList.contains('variance-over-threshold'), 'absolute percentage changes above twenty percent use the dark-red emphasis class');
    const zeroLine = dataRows.find(line => line.querySelector('td:nth-child(2)')?.textContent === '۶۱۰۵');
    assert.deepEqual([...zeroLine.querySelectorAll('td')].slice(3, 7).map(cell => cell.textContent), ['۰', '۰', '۰', '—'], 'an account with zero in both years displays zero amounts and a dash percentage');
    assert.equal(lines.filter(line => line.classList.contains('variance-group-title')).length, 2, 'one group is emitted per major account');
    assert.equal(lines.filter(line => line.classList.contains('variance-workpaper-subtotal')).length, 2, 'major-account subtotals are printed');
    const adminSubtotal = lines.find(line => line.classList.contains('variance-workpaper-subtotal'));
    assert.equal(adminSubtotal.querySelector('td:first-child').colSpan, 3, 'the subtotal label merges row, code, and account-name cells into one continuous cell');
    assert.equal(adminSubtotal.querySelector('td:first-child').textContent.trim(), 'جمع');
    assert.deepEqual([...adminSubtotal.querySelectorAll('td.vamount')].map(cell => cell.textContent), ['۱٬۹۹۹٬۶۰۰٬۰۰۰', '۱٬۰۰۰٬۶۰۰٬۰۰۰', '۹۹۹٬۰۰۰٬۰۰۰'], 'subtotal sums amount columns without separating the label cell');
    assert.equal(adminSubtotal.querySelector('td.vpct').textContent, '۹۹٫۸٪', 'subtotal percentage is calculated from group totals');
    const summaryRows = [...w.document.querySelectorAll('#varianceV4 .variance-workpaper-source .variance-summary tbody tr')];
    assert.deepEqual([...w.document.querySelectorAll('#varianceV4 .variance-workpaper-source .variance-summary-table col')].map(col => parseFloat(col.style.width)), [30, 17.5, 17.5, 17.5, 17.5], 'the summary account-information column is narrower and numeric columns remain balanced');
    assert.deepEqual(summaryRows.map(row => row.querySelectorAll('td').length), [5, 5], 'each summary row contains no fluctuation count');
    assert.ok(!paper.textContent.includes('کنترل‌های حسابرسی') && !paper.textContent.includes('یادداشت حسابرس'));
    let printed = null;
    w.print = () => { printed = [...w.document.querySelectorAll('#printHost .variance-print-page')].map(page => ({
      headers: page.querySelectorAll('.variance-meta').length,
      mainHead: page.querySelectorAll('.variance-paper-table thead').length,
      summaryHead: page.querySelectorAll('.variance-summary-table thead th').length,
      carryOut: [...page.querySelectorAll('tr.variance-page-carry')].map(row => [...row.querySelectorAll('td')].slice(1, 4).map(cell => cell.textContent)),
      carryIn: [...page.querySelectorAll('tr.variance-page-transfer')].map(row => [...row.querySelectorAll('td')].slice(1, 4).map(cell => cell.textContent)),
      fullFrame: page.classList.contains('variance-page-full'),
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
    assert.ok(!/کنترل‌های حسابرسی|عطف|یادداشت حسابرس|حد نوسان|درصد سال|نوسان بیش از حد|تعداد اقلام/.test(w.document.querySelector('#printHost').textContent), 'threshold selector and over-threshold counts are absent from print');
    assert.equal(printed[0].mainHead, 1, 'main table header is present on the data page');
    assert.equal(printed[0].summaryHead, 5, 'summary uses five columns when it fits on the final page');
    const printPage = w.document.querySelector('#printHost .variance-print-page');
    assert.ok(printPage.querySelector('.variance-outer > .variance-mid > .variance-inner'), 'print page has three nested rounded frames');
    assert.ok(printPage.querySelector('.variance-mid > .variance-page-number'), 'page number sits inside the middle frame below the inner frame');
    assert.ok(printPage.querySelector('.variance-mid > .variance-summary'), 'summary is in a separate inner frame');
    assert.equal(printPage.querySelector('.variance-workpaper-filler'), null, 'no decorative lines are inserted in place of account rows');
    assert.equal(printPage.querySelectorAll('textarea[data-vnote]').length, 0, 'editable description controls are not printed');
    assert.equal(printPage.querySelectorAll('tr.variance-page-transfer').length, 0, 'the transfer-from-previous-page bar is removed from printed output');
    assert.equal(printPage.querySelectorAll('.variance-note-print-text').length, 5, 'description text remains visible in the printed workpaper');
    assert.equal(printPage.querySelector('.variance-paper-title'), null, 'there is no separate title above the header');
    assert.equal(printPage.querySelector('.variance-group-title td').colSpan, 8, 'major-account title merges all eight columns');
    assert.equal(printPage.querySelector('.variance-workpaper-subtotal td:first-child').colSpan, 3, 'the subtotal label stays merged in print output');
    assert.ok([...w.document.head.querySelectorAll('style[data-variance-print]')].some(style => style.textContent.includes('@page{size:A4 landscape')), 'PDF print uses A4 landscape');
    assert.ok(printed[0].pageNumber.includes('از ۱'), 'pagination reports total page count');
    if (typeof w.__activePrintRestore === 'function') w.__activePrintRestore();

    const descriptionToggle = w.document.querySelector('#varianceV4 [data-vdesc]');
    descriptionToggle.checked = false;
    descriptionToggle.dispatchEvent(new w.Event('change', { bubbles: true }));
    const withoutDescriptions = w.document.querySelector('#varianceV4 .variance-paper-table');
    assert.equal(withoutDescriptions.querySelectorAll('thead th').length, 7, 'turning descriptions off removes the column rather than leaving it blank');
    assert.equal(withoutDescriptions.querySelector('tbody .variance-group-title td').colSpan, 7, 'group headings span the reduced column count');
    assert.equal(withoutDescriptions.querySelector('tbody .variance-workpaper-subtotal td:first-child').colSpan, 3, 'merged subtotal labels remain continuous when descriptions are disabled');
    assert.equal(w.document.querySelectorAll('#varianceV4 [data-vnote]').length, 0, 'description editors are removed from both source and preview when disabled');
    const orientationControl = w.document.querySelector('#varianceV4 [data-vorientation]');
    orientationControl.value = 'portrait';
    orientationControl.dispatchEvent(new w.Event('change', { bubbles: true }));
    assert.ok(w.document.querySelector('#varianceV4 .variance-preview-pages .variance-print-page[data-orientation="portrait"]'), 'portrait orientation is reflected in the paginated preview');
    const portraitCols = [...w.document.querySelector('#varianceV4 .variance-paper-table colgroup').children];
    assert.equal(portraitCols.length, 7, 'portrait layout retains the same reduced column count');
    assert.equal(portraitCols.reduce((sum, col) => sum + parseFloat(col.style.width), 0), 100, 'portrait columns fill the printable width without overflow');
    w.document.querySelector('#varianceV4 [data-vprint]').click();
    const portraitPrintCss = [...w.document.head.querySelectorAll('style[data-variance-print]')].map(style => style.textContent).join('\n');
    assert.match(portraitPrintCss, /@page\{size:A4 portrait/ , 'print stylesheet selects A4 portrait');
    assert.match(portraitPrintCss, /width:595\.28pt!important;height:841\.89pt!important/ , 'portrait print pages use A4 portrait dimensions');
    assert.equal(w.document.querySelector('#printHost .variance-print-page').dataset.orientation, 'portrait', 'printed pages carry the selected orientation');
    assert.equal(w.document.querySelectorAll('#printHost .variance-paper-table thead th').length, 7, 'portrait print output keeps the descriptions column fully removed');
    if (typeof w.__activePrintRestore === 'function') w.__activePrintRestore();
    const descriptionToggleAgain = w.document.querySelector('#varianceV4 [data-vdesc]');
    descriptionToggleAgain.checked = true;
    descriptionToggleAgain.dispatchEvent(new w.Event('change', { bubbles: true }));
    const orientationLandscape = w.document.querySelector('#varianceV4 [data-vorientation]');
    orientationLandscape.value = 'landscape';
    orientationLandscape.dispatchEvent(new w.Event('change', { bubbles: true }));

    const stressTitle = w.document.createElement('tr');
    stressTitle.className = 'variance-group-title';
    stressTitle.innerHTML = '<td colspan="8">گروه آزمایشی</td>';
    const stressRows = Array.from({ length: 30 }, (_, i) => {
      const row = first.cloneNode(true);
      row.querySelector('td:nth-child(1)').textContent = String(i + 1);
      row.querySelector('td:nth-child(2)').textContent = String(8000 + i);
      row.querySelector('td:nth-child(3)').textContent = 'شرح کوتاه آزمایشی';
      row.querySelector('td:nth-child(8)').textContent = 'افزایش در هزینه؛ بررسی سند لازم است.';
      row.dataset.vcurrent = '0'; row.dataset.vprior = '0'; row.dataset.vdelta = '0';
      row.querySelectorAll('td.vamount').forEach(cell => { cell.textContent = '۰'; });
      return row;
    });
    const stressSubtotal = lines.find(line => line.classList.contains('variance-workpaper-subtotal')).cloneNode(true);
    stressSubtotal.dataset.vsubtotalcurrent = '0'; stressSubtotal.dataset.vsubtotalprior = '0';
    stressSubtotal.querySelectorAll('td.vamount').forEach(cell => { cell.textContent = '۰'; });
    stressSubtotal.querySelector('td.vpct').textContent = '—';
    w.document.querySelector('#varianceV4 .variance-workpaper-source .variance-paper-table tbody').append(stressTitle, ...stressRows, stressSubtotal);
    printed = null;
    w.document.querySelector('#varianceV4 [data-vprint]').click();
    assert.ok(printed.length >= 2, 'additional account rows paginate across pages');
    assert.ok(printed.slice(0, -1).every(page => page.carryOut.length === 1 && page.fullFrame), 'every non-final page has the full 541.7pt frame and ends with a cumulative page total');
    assert.ok(printed.every(page => page.carryIn.length === 0), 'no page contains a transfer-from-previous-page bar');
    assert.ok(printed.slice(1).every(page => page.carryIn.length === 0), 'continuation pages do not show a transfer-from-previous-page bar');
    assert.equal(printed.at(-1).carryOut.length, 0, 'the final page has no page-total row');
    assert.ok(w.document.querySelector('#printHost .variance-paper-table tbody').rows.length >= 20, 'each measured page uses its available height for more account rows');
    const summaryPage = printed.at(-1);
    const lastPrintPage = w.document.querySelectorAll('#printHost .variance-print-page').item(printed.length - 1);
    assert.ok(lastPrintPage.querySelectorAll('.variance-paper-table tbody tr:not(.variance-group-title):not(.variance-workpaper-subtotal)').length > 0, 'the summary shares remaining page space with continuation account rows instead of being stranded alone');
    assert.equal(summaryPage.mainHead, 1, 'the main-table header repeats on continuation pages');
    assert.equal(summaryPage.summaryHead, 5, 'the continuation retains the five-column summary');
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
    const manualEditor = w.document.querySelector('#varianceV4 .variance-preview-pages textarea[data-vnote]');
    manualEditor.value = 'یادداشت دستی برای بررسی چاپ';
    manualEditor.dispatchEvent(new w.Event('input', { bubbles: true }));
    assert.equal(w.document.querySelector(`#varianceV4 .variance-workpaper-source textarea[data-vnote="${manualEditor.dataset.vnote}"]`).value, manualEditor.value, 'preview edits remain synchronized to the saved note value');
    w.document.querySelector('#varianceV4 [data-vprint]').click();
    const manualPrintedText = [...w.document.querySelectorAll('#printHost .variance-note-print-text')].find(node => node.textContent === manualEditor.value);
    assert.ok(manualPrintedText, 'print keeps the explanation text without printing an editable textbox');
    assert.equal(w.document.querySelectorAll('#printHost textarea[data-vnote]').length, 0, 'no description textbox frame appears in print output');
    if (typeof w.__activePrintRestore === 'function') w.__activePrintRestore();
    if (errors.length) throw new Error('jsdom errors: ' + errors.join(' | '));
    console.log('expense variance UI: passed (automatic years, rial-only amounts, local account classification, short AI explanations, zero handling, page frames and pagination)');
  } finally {
    dom.window.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
