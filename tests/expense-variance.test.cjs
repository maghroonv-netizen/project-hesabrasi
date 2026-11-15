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
      {'کد حساب کل':'61','عنوان حساب کل':'هزینه‌های اداری','کد حساب معین':'006101','عنوان حساب معین':'حقوق','بدهکار':1500,'بستانکار':0,'شرح ردیف':'  پرداخت-123  '},
      {'کد حساب کل':'61','عنوان حساب کل':'هزینه‌های اداری','کد حساب معین':'6102','عنوان حساب معین':'هزینه بدون مبنا','بدهکار':0,'بستانکار':0.4,'شرح ردیف':'شرح سال جاری'},
      {'کد حساب کل':'61','عنوان حساب کل':'هزینه‌های اداری','کد حساب معین':'6103','عنوان حساب معین':'حساب فقط در سال جاری','بدهکار':500,'بستانکار':0,'شرح ردیف':''},
      {'کد حساب کل':'62','عنوان حساب کل':'هزینه مالی','کد حساب معین':'6201','عنوان حساب معین':'هزینه تأمین مالی','بدهکار':250,'بستانکار':0,'شرح ردیف':'شرح هزینه مالی'}
    ]; ACCOUNT_ROWS=FULL_ROWS; currentHeaders=['fixture']; renderModuleHome();`);
    assert.ok(w.document.querySelector('[data-open="variance"]'), 'expense variance appears in the module picker');
    w.document.querySelector('[data-open="variance"]').click();
    for (const input of w.document.querySelectorAll('.v-unit')) { input.value = 'million'; input.dispatchEvent(new w.Event('change', { bubbles: true })); }

    assert.equal(w.document.querySelectorAll('#varianceV1 input.v-file').length, 1, 'only the prior-year file is requested here');
    assert.ok(w.document.querySelector('#varianceV1').textContent.includes('بارگذاری دوباره لازم نیست'), 'the already-loaded current-year source is reused');
    const headers = ['کد حساب کل', 'عنوان حساب کل', 'کد حساب معین', 'عنوان حساب معین', 'بدهکار', 'بستانکار', 'شرح ردیف'];
    const prior = makeFile('سال قبل', [
      headers,
      ['61', 'هزینه‌های اداری', '', '', 90000, 0, 'جمع کل تکراری'],
      ['61', 'هزینه‌های اداری', '006101', 'حقوق', 1000, 0, 'پرداخت حقوق'],
      ['61', 'هزینه‌های اداری', '6102', 'هزینه بدون مبنا', 0, 0, 'شرح سال قبل'],
      ['62', 'هزینه مالی', '', '', 300, 0, 'جمع کل دوم'],
      ['62', 'هزینه مالی', '6201', 'هزینه تأمین مالی', 200, 0, 'شرح قبلی هزینه مالی']
    ], 'prior.xlsx');


    for (const [index, year] of [[0, '۱۴۰۳'], [1, '۱۴۰۴']]) {
      const input = w.document.querySelector(`.v-year[data-i="${index}"]`);
      input.value = year;
      input.dispatchEvent(new w.Event('change', { bubbles: true }));
    }
    dispatchFile(w.document.querySelector('.v-file[data-i="0"]'), prior);
    for (let n = 0; n < 80 && !w.document.querySelector('#varianceV1 .variance-fname')?.textContent.includes('فایل خوانده شد'); n++) await sleep(25);
    assert.ok(w.document.querySelector('#varianceV1 .variance-fname').textContent.includes('فایل خوانده شد'));

    w.document.querySelector('#varianceV1 [data-vnext]').click();
    w.document.querySelector('#varianceV2 [data-vmap-confirm]').click();
    assert.equal(w.eval('CUR_STEP'), 'v3');
    assert.ok(w.document.querySelector('#varianceV3').textContent.includes('برای جلوگیری از دوباره‌شماری: 2'), 'major-level totals are ignored when detail accounts are present');
    w.document.querySelector('#varianceV3 #vSelectVisible').click();
    assert.equal(w.document.querySelectorAll('#varianceV3 [data-vaccount]:checked').length, 4);
    assert.equal(w.document.querySelectorAll('#varianceV3 [data-vcategory]').length, 0, 'accounts are grouped by their major account without manual category selection');
    w.document.querySelector('#varianceV3 [data-vconfirm]').click();

    assert.equal(w.document.querySelector('#metaSubject'), null, 'the case-information form does not request a redundant subject');
    assert.ok(w.document.querySelector('#varianceV4 .variance-meta').textContent.includes('بررسی نوسانات هزینه'), 'the module supplies its own workpaper subject');
    const paper = w.document.querySelector('#varianceV4 .variance-paper-table');
    assert.equal(paper.querySelectorAll('thead th').length, 8, 'main table has exactly eight columns');
    assert.equal([...paper.querySelectorAll('col')].reduce((total, col) => total + parseFloat(col.style.width), 0), 768.1, 'specified column widths add to 768.1 pt');
    assert.equal(w.document.querySelectorAll('#varianceV4 .variance-summary thead th').length, 5, 'summary has exactly five columns');
    assert.equal(w.document.querySelectorAll('#varianceV4 .variance-summary tbody tr').length, 2, 'the summary has one row for each major-account group');
    assert.ok(paper.tBodies[0].rows[0].textContent.includes('هزینه‌های اداری'), 'group heading comes from the major account title');
    assert.ok([...paper.tBodies[0].rows].some(row => row.classList.contains('variance-group-title') && row.textContent.includes('هزینه مالی')), 'a second major account becomes a separate group automatically');
    assert.equal(w.document.querySelectorAll('#varianceV4 [data-vnote]').length, 0, 'no AI or auditor note editor is mixed into source descriptions');
    const lines = [...paper.tBodies[0].rows];
    const dataRows = lines.filter(line => !line.classList.contains('variance-group-title') && !line.classList.contains('variance-workpaper-subtotal'));
    assert.equal(dataRows.length, 4);
    const first = dataRows.find(line => line.querySelector('td:nth-child(2)')?.textContent === '۰۰۶۱۰۱');
    assert.ok(first?.textContent.includes('۵۰٫۰۰٪'), 'percentage is calculated from current and prior amounts after unit conversion');
    assert.equal(first.querySelector('td:nth-child(4)').textContent, '۱٬۵۰۰٬۰۰۰٬۰۰۰', 'million-rial input is converted to rial before display and calculation');
    assert.equal(first.querySelector('td:nth-child(6)').textContent, '۵۰۰٬۰۰۰٬۰۰۰', 'change is calculated as current minus prior after conversion');
    assert.equal(first.querySelector('td:nth-child(8)').textContent, '  پرداخت-123  ', 'source explanation is printed verbatim');
    const currentOnly = dataRows.find(line => line.querySelector('td:nth-child(2)')?.textContent === '۶۱۰۳');
    assert.ok(currentOnly?.textContent.includes('—'), 'missing-year amount and percentage are not fabricated');
    const negative = dataRows.find(line => line.querySelector('td:nth-child(2)')?.textContent === '۶۱۰۲');
    assert.ok(negative.querySelector('td:nth-child(4)').classList.contains('vnegative'), 'negative amount receives the dark-red print class');
    assert.equal(negative.querySelector('td:nth-child(4)').textContent, '(۴۰۰٬۰۰۰)', 'decimal million-rial amounts convert exactly to whole rial');
    assert.equal(negative.querySelector('td:nth-child(7)').classList.contains('vnegative'), false, 'negative percentages are not styled red');
    assert.equal(lines.filter(line => line.classList.contains('variance-group-title')).length, 2, 'one group is emitted per major account');
    assert.equal(lines.filter(line => line.classList.contains('variance-workpaper-subtotal')).length, 2, 'major-account subtotals are printed');
    assert.ok(!paper.textContent.includes('کنترل‌های حسابرسی') && !paper.textContent.includes('یادداشت حسابرس'));
    let printed = null;
    w.print = () => { printed = [...w.document.querySelectorAll('#printHost .variance-print-page')].map(page => ({
      headers: page.querySelectorAll('.variance-meta').length,
      mainHead: page.querySelectorAll('.variance-paper-table thead').length,
      summaryHead: page.querySelectorAll('.variance-print-content table:not(.variance-paper-table) thead th').length,
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
    assert.ok(printed.every(page => !/کنترل‌های حسابرسی|عطف|یادداشت حسابرس|حد نوسان|درصد سال|اقلام پرنوسان/.test(w.document.querySelector('#printHost').textContent)), 'removed audit-control fields and fluctuation-count text are absent from print');
    assert.equal(printed[0].mainHead, 1, 'main table header is present on the data page');
    assert.equal(printed[0].summaryHead, 5, 'summary uses exactly five columns when it fits on the final page');
    assert.ok(printed[0].pageNumber.includes('از ۱'), 'pagination reports total page count');
    if (typeof w.__activePrintRestore === 'function') w.__activePrintRestore();

    const stressTitle = w.document.createElement('tr');
    stressTitle.className = 'variance-group-title';
    stressTitle.innerHTML = '<td colspan="8">stress</td>';
    const stressRow = first.cloneNode(true);
    stressRow.querySelector('td:nth-child(8)').textContent = 'x'.repeat(2000);
    const stressSubtotal = lines.find(line => line.classList.contains('variance-workpaper-subtotal')).cloneNode(true);
    paper.tBodies[0].append(stressTitle, stressRow, stressSubtotal);
    printed = null;
    w.document.querySelector('#varianceV4 [data-vprint]').click();
    assert.ok(printed.length >= 2, 'long wrapped descriptions cause pagination');
    const summaryPage = printed.at(-1);
    assert.equal(summaryPage.mainHead, 0, 'standalone summary continuation omits the main-table header');
    assert.equal(summaryPage.summaryHead, 5, 'standalone continuation retains the five-column summary');
    assert.equal(summaryPage.headers, 1, 'standalone summary page repeats the metadata header');
    if (typeof w.__activePrintRestore === 'function') w.__activePrintRestore();

    w.anaAISaveKey('test-only');
    let sent = null;
    w.routerRequest = async messages => {
      sent = JSON.parse(messages[1].content.split('\n').slice(1).join('\n'));
      return { ok: true, text: JSON.stringify({ items: sent.map(item => ({
        id: item.id,
        explanation: 'دادهٔ مبلغی به‌تنهایی علت را اثبات نمی‌کند؛ بررسی مستندات لازم است.'
      })) }) };
    };
    w.document.querySelector('#varianceV4 [data-vai]').click();
    for (let n = 0; n < 40 && !w.document.querySelector('#varianceV4 #vAiStatus')?.textContent.includes('پیشنهاد دریافت شد'); n++) await sleep(25);
    assert.equal(sent.length, 4);
    assert.equal(sent.find(item => item.account.sub_code === '6103').prior_amount, null, 'AI receives missing-year as null, not a made-up zero');
    assert.equal(sent.find(item => item.account.sub_code === '006101').current_amount, '1500000000', 'AI receives converted rial amounts from the already-loaded workbook');
    assert.ok(sent.every(item => !Object.hasOwn(item, 'description_evidence')), 'transaction descriptions are excluded unless the user opts in');
    assert.ok(w.document.querySelector('#varianceV4 #vAiStatus').textContent.includes('نیازمند بازبینی حسابرس'));

    if (errors.length) throw new Error('jsdom errors: ' + errors.join(' | '));
    console.log('expense variance UI: passed (prior-year mapping, reuse of initial current-year data, account-grouping, units, exact table layout, computations, verbatim descriptions and explicit AI request)');
  } finally {
    dom.window.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
