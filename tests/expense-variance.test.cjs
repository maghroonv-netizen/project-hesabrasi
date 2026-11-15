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
    w.eval("ENTRY.phase='ready'; ACCOUNT_ROWS=[{}]; currentHeaders=['fixture']; renderModuleHome();");
    assert.ok(w.document.querySelector('[data-open="variance"]'), 'expense variance appears in the module picker');
    w.document.querySelector('[data-open="variance"]').click();

    const headers = ['کد حساب کل', 'عنوان حساب کل', 'کد حساب معین', 'عنوان حساب معین', 'بدهکار', 'بستانکار', 'شرح ردیف'];
    const prior = makeFile('سال قبل', [
      headers,
      ['61', 'هزینه‌های اداری', '', '', 90000, 0, 'جمع کل تکراری'],
      ['61', 'هزینه‌های اداری', '6101', 'حقوق', 1000, 0, 'پرداخت حقوق'],
      ['61', 'هزینه‌های اداری', '6102', 'هزینه بدون مبنا', 0, 0, 'شرح سال قبل']
    ], 'prior.xlsx');
    const current = makeFile('سال جاری', [
      headers,
      ['61', 'هزینه‌های اداری', '', '', 99000, 0, 'جمع کل تکراری'],
      ['61', 'هزینه‌های اداری', '6101', 'حقوق', 1500, 0, 'پرداخت حقوق'],
      ['61', 'هزینه‌های اداری', '6102', 'هزینه بدون مبنا', 400, 0, 'شرح سال جاری'],
      ['61', 'هزینه‌های اداری', '6103', 'حساب فقط در سال جاری', 500, 0, '']
    ], 'current.xlsx');

    for (const [index, year] of [[0, '۱۴۰۳'], [1, '۱۴۰۴']]) {
      const input = w.document.querySelector(`.v-year[data-i="${index}"]`);
      input.value = year;
      input.dispatchEvent(new w.Event('change', { bubbles: true }));
    }
    dispatchFile(w.document.querySelector('.v-file[data-i="0"]'), prior);
    await sleep(100);
    dispatchFile(w.document.querySelector('.v-file[data-i="1"]'), current);
    for (let n = 0; n < 80 && (w.document.querySelectorAll('#varianceV1 .variance-fname').length < 2 || ![...w.document.querySelectorAll('#varianceV1 .variance-fname')].every(el => el.textContent.includes('فایل خوانده شد'))); n++) await sleep(25);
    assert.equal(w.document.querySelectorAll('#varianceV1 .variance-fname').length, 2);
    assert.ok([...w.document.querySelectorAll('#varianceV1 .variance-fname')].every(el => el.textContent.includes('فایل خوانده شد')));

    w.document.querySelector('#varianceV1 [data-vnext]').click();
    w.document.querySelector('#varianceV2 [data-vmap-confirm]').click();
    assert.equal(w.eval('CUR_STEP'), 'v3');
    assert.ok(w.document.querySelector('#varianceV3').textContent.includes('برای جلوگیری از دوباره‌شماری: 1'), 'major-level totals are ignored when detail accounts are present');
    w.document.querySelector('#varianceV3 #vSelectVisible').click();
    assert.equal(w.document.querySelectorAll('#varianceV3 [data-vaccount]:checked').length, 3);
    w.document.querySelector('#varianceV3 [data-vconfirm]').click();

    const lines = [...w.document.querySelectorAll('#varianceV4 .variance-paper-table tbody tr')];
    assert.equal(w.document.querySelectorAll('#varianceV4 [data-vnote]').length, 3);
    assert.ok(lines[0].textContent.includes('+۵۰٫۰۰٪'), 'percentage is calculated from current and prior amounts');
    assert.ok(lines[1].textContent.includes('مبنای سال قبل صفر'), 'zero prior amount is not turned into a fabricated percentage');
    const currentOnly = lines.find(line => line.querySelector('td:nth-child(3)')?.textContent === '6103');
    assert.ok(currentOnly?.textContent.includes('اطلاعات یکی از سال‌ها در فایل نیست'), 'a missing prior-year row is not silently displayed as zero');
    assert.ok(w.document.querySelector('.variance-workpaper-subtotal'), 'major-account subtotal is printed');
    assert.ok(w.document.querySelector('.variance-total'), 'final totals are printed');

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
    assert.equal(sent.length, 3);
    assert.equal(sent.find(item => item.account.sub_code === '6103').prior_amount, null, 'AI receives missing-year as null, not a made-up zero');
    assert.ok(sent.every(item => !Object.hasOwn(item, 'description_evidence')), 'transaction descriptions are excluded unless the user opts in');
    assert.ok([...w.document.querySelectorAll('#varianceV4 [data-vnote]')].every(el => el.value.includes('علت را اثبات نمی‌کند')));
    assert.ok(w.document.querySelector('#varianceV4 #vAiStatus').textContent.includes('نیازمند بازبینی حسابرس'));

    if (errors.length) throw new Error('jsdom errors: ' + errors.join(' | '));
    console.log('expense variance UI: passed (module picker, two-file mapping, account selection, exact zero-base display, subtotal/total, explicit AI request and review note)');
  } finally {
    dom.window.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
